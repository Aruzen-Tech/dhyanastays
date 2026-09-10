import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CrmActivityType,
  CrmAutomationAction,
  CrmAutomationTrigger,
  CrmTaskPriority,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrmOutreachService } from './crm-outreach.service';
import { CreateAutomationRuleDto, UpdateAutomationRuleDto } from './dto/automation.dto';

const DAY = 24 * 60 * 60 * 1000;

interface FireContext {
  userId: string;
  stageId?: string | null;
  tagId?: string | null;
  actorId: string;
}

interface AutomationConfig {
  title?: string;
  priority?: CrmTaskPriority;
  dueInDays?: number;
  assigneeId?: string;
  channels?: ('EMAIL' | 'SMS')[];
  subject?: string;
  body?: string;
  tagId?: string;
  ownerId?: string;
}

/**
 * CRM automation (Phase 4). If-this-then-that rules over lifecycle events:
 * moving a contact into a stage or adding a tag can auto-create a task, send
 * outreach, add another tag, or assign an owner.
 *
 * Firing is best-effort and isolated: a rule that errors is logged and skipped,
 * never surfaced to the user action that triggered it. Actions write directly
 * (or via OutreachService) and never re-enter `fire`, so rules don't cascade.
 * Only single-contact events fire rules — bulk actions deliberately don't.
 */
@Injectable()
export class CrmAutomationService {
  private readonly logger = new Logger(CrmAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outreach: CrmOutreachService,
  ) {}

  // ── CRUD ─────────────────────────────────────────────────────────────────
  list() {
    return this.prisma.crmAutomationRule.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreateAutomationRuleDto, actorId: string) {
    this.validateConfig(dto.action as CrmAutomationAction, dto.config as AutomationConfig);
    return this.prisma.crmAutomationRule.create({
      data: {
        name: dto.name.trim(),
        enabled: dto.enabled ?? true,
        trigger: dto.trigger as CrmAutomationTrigger,
        stageId: dto.trigger === 'STAGE_CHANGED' ? dto.stageId ?? null : null,
        tagId: dto.trigger === 'TAG_ADDED' ? dto.tagId ?? null : null,
        action: dto.action as CrmAutomationAction,
        config: (dto.config ?? {}) as Prisma.InputJsonValue,
        createdById: actorId,
      },
    });
  }

  async update(id: string, dto: UpdateAutomationRuleDto) {
    const existing = await this.prisma.crmAutomationRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Rule not found');

    const action = (dto.action ?? existing.action) as CrmAutomationAction;
    const trigger = (dto.trigger ?? existing.trigger) as CrmAutomationTrigger;
    if (dto.config !== undefined) this.validateConfig(action, dto.config as AutomationConfig);

    return this.prisma.crmAutomationRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.trigger !== undefined ? { trigger } : {}),
        ...(dto.action !== undefined ? { action } : {}),
        ...(dto.config !== undefined
          ? { config: dto.config as Prisma.InputJsonValue }
          : {}),
        // Stage/tag filters are only meaningful for their matching trigger.
        stageId: trigger === 'STAGE_CHANGED' ? dto.stageId ?? existing.stageId : null,
        tagId: trigger === 'TAG_ADDED' ? dto.tagId ?? existing.tagId : null,
      },
    });
  }

  async remove(id: string) {
    const r = await this.prisma.crmAutomationRule.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Rule not found');
    await this.prisma.crmAutomationRule.delete({ where: { id } });
    return { ok: true };
  }

  // ── Firing ───────────────────────────────────────────────────────────────
  /**
   * Evaluate + run every enabled rule matching this trigger. Never throws —
   * failures are logged so the originating action still succeeds.
   */
  async fire(trigger: CrmAutomationTrigger, ctx: FireContext): Promise<void> {
    try {
      const rules = await this.prisma.crmAutomationRule.findMany({
        where: { trigger, enabled: true },
      });
      for (const rule of rules) {
        // Optional narrowing by the specific stage/tag.
        if (trigger === 'STAGE_CHANGED' && rule.stageId && rule.stageId !== ctx.stageId) continue;
        if (trigger === 'TAG_ADDED' && rule.tagId && rule.tagId !== ctx.tagId) continue;
        // Don't re-add the very tag that triggered the rule.
        const config = (rule.config ?? {}) as AutomationConfig;
        if (rule.action === 'ADD_TAG' && config.tagId && config.tagId === ctx.tagId) continue;

        try {
          await this.execute(rule.action, config, ctx, rule.name, rule.createdById);
          await this.prisma.crmAutomationRule.update({
            where: { id: rule.id },
            data: { timesFired: { increment: 1 }, lastFiredAt: new Date() },
          });
        } catch (err) {
          this.logger.warn(`Automation rule "${rule.name}" (${rule.id}) failed: ${String(err)}`);
        }
      }
    } catch (err) {
      this.logger.warn(`Automation fire(${trigger}) failed: ${String(err)}`);
    }
  }

  private async execute(
    action: CrmAutomationAction,
    config: AutomationConfig,
    ctx: FireContext,
    ruleName: string,
    ruleOwnerId: string,
  ): Promise<void> {
    const via = ` · via automation "${ruleName}"`;

    switch (action) {
      case 'CREATE_TASK': {
        const dueAt =
          typeof config.dueInDays === 'number'
            ? new Date(Date.now() + config.dueInDays * DAY)
            : null;
        await this.prisma.crmTask.create({
          data: {
            userId: ctx.userId,
            title: config.title ?? 'Follow up',
            priority: (config.priority as CrmTaskPriority) ?? CrmTaskPriority.MEDIUM,
            dueAt,
            assigneeId: config.assigneeId ?? null,
            createdById: ruleOwnerId,
          },
        });
        await this.log(ctx.userId, CrmActivityType.TASK_CREATED, `Task "${config.title ?? 'Follow up'}" created${via}`);
        break;
      }
      case 'SEND_OUTREACH': {
        // OutreachService respects do-not-contact + logs OUTREACH_SENT itself.
        await this.outreach.send(
          {
            userId: ctx.userId,
            channels: config.channels ?? ['EMAIL'],
            subject: config.subject,
            body: config.body ?? '',
          },
          ruleOwnerId,
        );
        break;
      }
      case 'ADD_TAG': {
        if (!config.tagId) return;
        await this.prisma.crmContactTag.upsert({
          where: { userId_tagId: { userId: ctx.userId, tagId: config.tagId } },
          create: { userId: ctx.userId, tagId: config.tagId },
          update: {},
        });
        const tag = await this.prisma.crmTag.findUnique({
          where: { id: config.tagId },
          select: { name: true },
        });
        await this.log(ctx.userId, CrmActivityType.TAG_ADDED, `Tagged "${tag?.name ?? config.tagId}"${via}`);
        break;
      }
      case 'ASSIGN_OWNER': {
        if (!config.ownerId) return;
        await this.prisma.crmContactProfile.upsert({
          where: { userId: ctx.userId },
          create: { userId: ctx.userId, ownerId: config.ownerId },
          update: { ownerId: config.ownerId },
        });
        await this.log(ctx.userId, CrmActivityType.CONTACT_UPDATED, `Owner assigned${via}`);
        break;
      }
    }
  }

  private log(userId: string, type: CrmActivityType, summary: string) {
    return this.prisma.crmActivity.create({
      data: { userId, type, summary, actorId: null, metadata: { automation: true } },
    });
  }

  /** Ensure the config carries what the chosen action needs. */
  private validateConfig(action: CrmAutomationAction, config: AutomationConfig) {
    switch (action) {
      case 'CREATE_TASK':
        if (!config.title?.trim()) throw new BadRequestException('Task automations need a title');
        break;
      case 'SEND_OUTREACH':
        if (!config.channels?.length)
          throw new BadRequestException('Outreach automations need at least one channel');
        if (!config.body?.trim())
          throw new BadRequestException('Outreach automations need a message body');
        break;
      case 'ADD_TAG':
        if (!config.tagId) throw new BadRequestException('Tag automations need a tag');
        break;
      case 'ASSIGN_OWNER':
        if (!config.ownerId) throw new BadRequestException('Owner automations need an owner');
        break;
    }
  }
}
