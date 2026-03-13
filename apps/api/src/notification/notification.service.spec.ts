/**
 * NotificationService — Unit Tests
 *
 * Tests all 6 provider branches (stub/resend/sendgrid/smtp/msg91/twilio),
 * fallback-to-stub when credentials are missing, error swallowing (non-fatal),
 * and all 5 notification template methods.
 *
 * No real network calls — global fetch is mocked via jest.spyOn.
 * nodemailer is fully mocked via jest.mock.
 */

import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import * as nodemailer from 'nodemailer';

// ─── Mock nodemailer (CJS module) ────────────────────────────────────────────
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-msg-id' });
const mockCreateTransport = nodemailer.createTransport as jest.Mock;

// ─── Helper: build a ConfigService stub ──────────────────────────────────────
function makeConfig(overrides: Record<string, string | number> = {}): ConfigService {
  const defaults: Record<string, string | number> = {
    EMAIL_PROVIDER: 'stub',
    SMS_PROVIDER: 'stub',
    EMAIL_FROM: 'noreply@dhyanastays.com',
    WEB_URL: 'http://localhost:3000',
    RESEND_API_KEY: '',
    SENDGRID_API_KEY: '',
    SMTP_HOST: '',
    SMTP_PORT: 587,
    SMTP_USER: '',
    SMTP_PASS: '',
    MSG91_AUTH_KEY: '',
    MSG91_SENDER_ID: 'DHYANA',
    MSG91_BOOKING_TEMPLATE_ID: '',
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    TWILIO_FROM_NUMBER: '',
    ...overrides,
  };
  return {
    get: jest.fn(<T>(key: string, fallback?: T): T => {
      const val = defaults[key];
      return (val !== undefined ? val : fallback) as T;
    }),
  } as unknown as ConfigService;
}

// ─── Shared fetch mock ────────────────────────────────────────────────────────
function mockFetchOk(): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    text: jest.fn().mockResolvedValue(''),
  } as unknown as Response);
}

function mockFetchFail(status = 422, body = 'Unprocessable'): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: false,
    status,
    text: jest.fn().mockResolvedValue(body),
  } as unknown as Response);
}

// ─── Suite ────────────────────────────────────────────────────────────────────
describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateTransport.mockReturnValue({ sendMail: mockSendMail });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // EMAIL — stub
  // ══════════════════════════════════════════════════════════════════════════

  describe('sendEmail — stub provider', () => {
    it('resolves without calling fetch', async () => {
      const fetchSpy = mockFetchOk();
      const svc = new NotificationService(makeConfig({ EMAIL_PROVIDER: 'stub' }));
      await svc.sendEmail({ to: 'a@b.com', subject: 'Test', html: '<p>Hi</p>' });
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it('resolves for any input without throwing', async () => {
      const svc = new NotificationService(makeConfig());
      await expect(
        svc.sendEmail({ to: 'x@y.com', subject: 'S', html: 'H', text: 'plain' }),
      ).resolves.toBeUndefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // EMAIL — resend
  // ══════════════════════════════════════════════════════════════════════════

  describe('sendEmail — resend provider', () => {
    it('calls Resend API with Bearer token and correct body', async () => {
      const fetchSpy = mockFetchOk();
      const svc = new NotificationService(makeConfig({
        EMAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 're_test_key_abc',
      }));
      await svc.sendEmail({ to: 'guest@test.com', subject: 'Booking Confirmed', html: '<p>Hi</p>' });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.resend.com/emails');
      expect(opts.method).toBe('POST');
      expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer re_test_key_abc');
      const body = JSON.parse(opts.body as string);
      expect(body.to).toEqual(['guest@test.com']);
      expect(body.subject).toBe('Booking Confirmed');
      fetchSpy.mockRestore();
    });

    it('falls back to stub (no fetch) when RESEND_API_KEY is empty', async () => {
      const fetchSpy = mockFetchOk();
      const svc = new NotificationService(makeConfig({
        EMAIL_PROVIDER: 'resend',
        RESEND_API_KEY: '',
      }));
      await svc.sendEmail({ to: 'a@b.com', subject: 'Test', html: '<p>Hi</p>' });
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it('swallows error when Resend returns non-ok (non-fatal)', async () => {
      const fetchSpy = mockFetchFail(422, 'Unprocessable Entity');
      const svc = new NotificationService(makeConfig({
        EMAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 're_test_key_abc',
      }));
      await expect(
        svc.sendEmail({ to: 'a@b.com', subject: 'Test', html: '<p>Hi</p>' }),
      ).resolves.toBeUndefined();
      fetchSpy.mockRestore();
    });

    it('swallows network error (non-fatal)', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
      const svc = new NotificationService(makeConfig({
        EMAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 're_test_key_abc',
      }));
      await expect(
        svc.sendEmail({ to: 'a@b.com', subject: 'Test', html: '<p>Hi</p>' }),
      ).resolves.toBeUndefined();
      fetchSpy.mockRestore();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // EMAIL — sendgrid
  // ══════════════════════════════════════════════════════════════════════════

  describe('sendEmail — sendgrid provider', () => {
    it('calls SendGrid API with Bearer token and personalizations body', async () => {
      const fetchSpy = mockFetchOk();
      const svc = new NotificationService(makeConfig({
        EMAIL_PROVIDER: 'sendgrid',
        SENDGRID_API_KEY: 'SG.test_key_xyz',
      }));
      await svc.sendEmail({ to: 'host@test.com', subject: 'Listing Approved', html: '<p>Live!</p>', text: 'Live!' });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.sendgrid.com/v3/mail/send');
      expect(opts.method).toBe('POST');
      expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer SG.test_key_xyz');
      const body = JSON.parse(opts.body as string);
      expect(body.personalizations[0].to[0].email).toBe('host@test.com');
      expect(body.subject).toBe('Listing Approved');
      fetchSpy.mockRestore();
    });

    it('falls back to stub when SENDGRID_API_KEY is empty', async () => {
      const fetchSpy = mockFetchOk();
      const svc = new NotificationService(makeConfig({
        EMAIL_PROVIDER: 'sendgrid',
        SENDGRID_API_KEY: '',
      }));
      await svc.sendEmail({ to: 'a@b.com', subject: 'Test', html: '<p>Hi</p>' });
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it('swallows error when SendGrid returns non-ok (non-fatal)', async () => {
      const fetchSpy = mockFetchFail(400, 'Bad Request');
      const svc = new NotificationService(makeConfig({
        EMAIL_PROVIDER: 'sendgrid',
        SENDGRID_API_KEY: 'SG.test_key_xyz',
      }));
      await expect(
        svc.sendEmail({ to: 'a@b.com', subject: 'Test', html: '<p>Hi</p>' }),
      ).resolves.toBeUndefined();
      fetchSpy.mockRestore();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // EMAIL — smtp
  // ══════════════════════════════════════════════════════════════════════════

  describe('sendEmail — smtp provider', () => {
    it('calls nodemailer.createTransport with SMTP config and sendMail', async () => {
      const svc = new NotificationService(makeConfig({
        EMAIL_PROVIDER: 'smtp',
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: 587,
        SMTP_USER: 'user@gmail.com',
        SMTP_PASS: 'app-password',
      }));
      await svc.sendEmail({ to: 'a@b.com', subject: 'Test', html: '<p>Hi</p>' });

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.gmail.com',
          port: 587,
          auth: expect.objectContaining({ user: 'user@gmail.com' }),
        }),
      );
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'a@b.com', subject: 'Test' }),
      );
    });

    it('falls back to stub when SMTP_HOST is empty', async () => {
      const svc = new NotificationService(makeConfig({
        EMAIL_PROVIDER: 'smtp',
        SMTP_HOST: '',
      }));
      await svc.sendEmail({ to: 'a@b.com', subject: 'Test', html: '<p>Hi</p>' });
      expect(mockCreateTransport).not.toHaveBeenCalled();
    });

    it('swallows error when nodemailer sendMail throws (non-fatal)', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP connection refused'));
      const svc = new NotificationService(makeConfig({
        EMAIL_PROVIDER: 'smtp',
        SMTP_HOST: 'smtp.gmail.com',
      }));
      await expect(
        svc.sendEmail({ to: 'a@b.com', subject: 'Test', html: '<p>Hi</p>' }),
      ).resolves.toBeUndefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SMS — stub
  // ══════════════════════════════════════════════════════════════════════════

  describe('sendSms — stub provider', () => {
    it('resolves without calling fetch', async () => {
      const fetchSpy = mockFetchOk();
      const svc = new NotificationService(makeConfig({ SMS_PROVIDER: 'stub' }));
      await svc.sendSms({ to: '+919876543210', body: 'Test SMS' });
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SMS — msg91
  // ══════════════════════════════════════════════════════════════════════════

  describe('sendSms — msg91 provider', () => {
    it('calls MSG91 Flow API with authkey header', async () => {
      const fetchSpy = mockFetchOk();
      const svc = new NotificationService(makeConfig({
        SMS_PROVIDER: 'msg91',
        MSG91_AUTH_KEY: 'msg91_test_key_abc',
        MSG91_SENDER_ID: 'DHYANA',
      }));
      await svc.sendSms({ to: '+919876543210', body: 'Booking confirmed' });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.msg91.com/api/v5/flow/');
      expect(opts.method).toBe('POST');
      expect((opts.headers as Record<string, string>)['authkey']).toBe('msg91_test_key_abc');
      const body = JSON.parse(opts.body as string);
      expect(body.sender).toBe('DHYANA');
      // Phone number should have + stripped
      expect(body.mobiles).toBe('919876543210');
      fetchSpy.mockRestore();
    });

    it('falls back to stub when MSG91_AUTH_KEY is empty', async () => {
      const fetchSpy = mockFetchOk();
      const svc = new NotificationService(makeConfig({
        SMS_PROVIDER: 'msg91',
        MSG91_AUTH_KEY: '',
      }));
      await svc.sendSms({ to: '+919876543210', body: 'Test SMS' });
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it('swallows error when MSG91 returns non-ok (non-fatal)', async () => {
      const fetchSpy = mockFetchFail(400, 'Bad Request');
      const svc = new NotificationService(makeConfig({
        SMS_PROVIDER: 'msg91',
        MSG91_AUTH_KEY: 'msg91_test_key_abc',
      }));
      await expect(
        svc.sendSms({ to: '+919876543210', body: 'Test SMS' }),
      ).resolves.toBeUndefined();
      fetchSpy.mockRestore();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SMS — twilio
  // ══════════════════════════════════════════════════════════════════════════

  describe('sendSms — twilio provider', () => {
    it('calls Twilio Messages API with Basic auth and form-encoded body', async () => {
      const fetchSpy = mockFetchOk();
      const svc = new NotificationService(makeConfig({
        SMS_PROVIDER: 'twilio',
        TWILIO_ACCOUNT_SID: 'ACtest123abc',
        TWILIO_AUTH_TOKEN: 'auth_token_test',
        TWILIO_FROM_NUMBER: '+15005550006',
      }));
      await svc.sendSms({ to: '+919876543210', body: 'Booking confirmed' });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('api.twilio.com');
      expect(url).toContain('ACtest123abc');
      expect(opts.method).toBe('POST');
      const authHeader = (opts.headers as Record<string, string>)['Authorization'];
      expect(authHeader).toMatch(/^Basic /);
      // Verify Basic auth decodes to accountSid:authToken
      const decoded = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
      expect(decoded).toBe('ACtest123abc:auth_token_test');
      // Body should be URL-encoded
      expect(opts.body).toContain('To=%2B919876543210');
      expect(opts.body).toContain('From=%2B15005550006');
      fetchSpy.mockRestore();
    });

    it('falls back to stub when TWILIO_ACCOUNT_SID is empty', async () => {
      const fetchSpy = mockFetchOk();
      const svc = new NotificationService(makeConfig({
        SMS_PROVIDER: 'twilio',
        TWILIO_ACCOUNT_SID: '',
        TWILIO_AUTH_TOKEN: '',
      }));
      await svc.sendSms({ to: '+919876543210', body: 'Test SMS' });
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it('swallows error when Twilio returns non-ok (non-fatal)', async () => {
      const fetchSpy = mockFetchFail(400, 'Bad Request');
      const svc = new NotificationService(makeConfig({
        SMS_PROVIDER: 'twilio',
        TWILIO_ACCOUNT_SID: 'ACtest123abc',
        TWILIO_AUTH_TOKEN: 'auth_token_test',
        TWILIO_FROM_NUMBER: '+15005550006',
      }));
      await expect(
        svc.sendSms({ to: '+919876543210', body: 'Test SMS' }),
      ).resolves.toBeUndefined();
      fetchSpy.mockRestore();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TEMPLATE METHODS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Template methods', () => {
    let svc: NotificationService;
    let emailSpy: jest.SpyInstance;
    let smsSpy: jest.SpyInstance;

    beforeEach(() => {
      svc = new NotificationService(makeConfig({ EMAIL_PROVIDER: 'stub', SMS_PROVIDER: 'stub' }));
      emailSpy = jest.spyOn(svc, 'sendEmail').mockResolvedValue(undefined);
      smsSpy = jest.spyOn(svc, 'sendSms').mockResolvedValue(undefined);
    });

    describe('sendBookingConfirmed', () => {
      const base = {
        guestName: 'Arjun Sharma',
        guestEmail: 'arjun@test.com',
        bookingId: 'bk-test-001',
        listingTitle: 'Zen Cottage',
        checkIn: '2026-06-01',
        checkOut: '2026-06-03',
        totalAmount: 1155000, // paise
        plan: 'FULL' as const,
      };

      it('calls sendEmail with booking subject containing listing title', async () => {
        await svc.sendBookingConfirmed(base);
        expect(emailSpy).toHaveBeenCalledTimes(1);
        const payload = emailSpy.mock.calls[0][0];
        expect(payload.to).toBe('arjun@test.com');
        expect(payload.subject).toContain('Zen Cottage');
        expect(payload.html).toContain('confirmed');
      });

      it('does NOT call sendSms when guestPhone is absent', async () => {
        await svc.sendBookingConfirmed(base);
        expect(smsSpy).not.toHaveBeenCalled();
      });

      it('calls sendSms when guestPhone is provided', async () => {
        await svc.sendBookingConfirmed({ ...base, guestPhone: '+919876543210' });
        expect(smsSpy).toHaveBeenCalledTimes(1);
        expect(smsSpy.mock.calls[0][0].to).toBe('+919876543210');
      });

      it('includes deposit note in HTML for DEPOSIT_50 plan', async () => {
        await svc.sendBookingConfirmed({
          ...base,
          plan: 'DEPOSIT_50',
          depositAmount: 577500,
        });
        const html = emailSpy.mock.calls[0][0].html as string;
        expect(html).toContain('Balance');
      });

      it('does NOT include deposit note for FULL plan', async () => {
        await svc.sendBookingConfirmed(base);
        const html = emailSpy.mock.calls[0][0].html as string;
        // The deposit note paragraph should not appear for FULL plan
        expect(html).not.toContain('Balance of');
      });
    });

    describe('sendHostListingApproved', () => {
      it('calls sendEmail with "live" in subject', async () => {
        await svc.sendHostListingApproved({
          hostName: 'Priya', hostEmail: 'priya@test.com',
          listingTitle: 'Zen Cottage', listingId: 'listing-1',
        });
        expect(emailSpy).toHaveBeenCalledTimes(1);
        const payload = emailSpy.mock.calls[0][0];
        expect(payload.to).toBe('priya@test.com');
        expect(payload.subject).toContain('live');
        expect(payload.html).toContain('approved');
      });

      it('includes listing URL in HTML', async () => {
        await svc.sendHostListingApproved({
          hostName: 'Priya', hostEmail: 'priya@test.com',
          listingTitle: 'Zen Cottage', listingId: 'listing-abc',
        });
        const html = emailSpy.mock.calls[0][0].html as string;
        expect(html).toContain('listing-abc');
      });
    });

    describe('sendHostListingRejected', () => {
      it('calls sendEmail with listing title in subject', async () => {
        await svc.sendHostListingRejected({
          hostName: 'Priya', hostEmail: 'priya@test.com',
          listingTitle: 'Zen Cottage',
        });
        expect(emailSpy).toHaveBeenCalledTimes(1);
        const payload = emailSpy.mock.calls[0][0];
        expect(payload.to).toBe('priya@test.com');
        expect(payload.subject).toContain('Zen Cottage');
      });

      it('includes rejection note in HTML when provided', async () => {
        await svc.sendHostListingRejected({
          hostName: 'Priya', hostEmail: 'priya@test.com',
          listingTitle: 'Zen Cottage', note: 'Missing amenities list',
        });
        const html = emailSpy.mock.calls[0][0].html as string;
        expect(html).toContain('Missing amenities list');
      });

      it('omits note block when note is not provided', async () => {
        await svc.sendHostListingRejected({
          hostName: 'Priya', hostEmail: 'priya@test.com',
          listingTitle: 'Zen Cottage',
        });
        const html = emailSpy.mock.calls[0][0].html as string;
        expect(html).not.toContain('Reason:');
      });
    });

    describe('sendBalanceDueReminder', () => {
      const base = {
        guestName: 'Arjun', guestEmail: 'arjun@test.com',
        bookingId: 'bk-001', listingTitle: 'Zen Cottage',
        balanceAmount: 577500, dueDate: '2026-05-25',
      };

      it('calls sendEmail with "Balance" in subject', async () => {
        await svc.sendBalanceDueReminder(base);
        expect(emailSpy).toHaveBeenCalledTimes(1);
        expect(emailSpy.mock.calls[0][0].subject).toContain('Balance');
      });

      it('does NOT call sendSms when guestPhone is absent', async () => {
        await svc.sendBalanceDueReminder(base);
        expect(smsSpy).not.toHaveBeenCalled();
      });

      it('calls sendSms when guestPhone is provided', async () => {
        await svc.sendBalanceDueReminder({ ...base, guestPhone: '+919876543210' });
        expect(smsSpy).toHaveBeenCalledTimes(1);
        expect(smsSpy.mock.calls[0][0].to).toBe('+919876543210');
      });

      it('includes due date in HTML', async () => {
        await svc.sendBalanceDueReminder(base);
        const html = emailSpy.mock.calls[0][0].html as string;
        expect(html).toContain('2026-05-25');
      });
    });

    describe('sendBookingCancelled', () => {
      it('calls sendEmail with "cancelled" in subject', async () => {
        await svc.sendBookingCancelled({
          guestName: 'Arjun', guestEmail: 'arjun@test.com',
          bookingId: 'bk-001', listingTitle: 'Zen Cottage', refundAmount: 577500,
        });
        expect(emailSpy).toHaveBeenCalledTimes(1);
        expect(emailSpy.mock.calls[0][0].subject).toContain('cancelled');
      });

      it('includes refund amount in HTML when refundAmount > 0', async () => {
        await svc.sendBookingCancelled({
          guestName: 'Arjun', guestEmail: 'arjun@test.com',
          bookingId: 'bk-001', listingTitle: 'Zen Cottage', refundAmount: 577500,
        });
        const html = emailSpy.mock.calls[0][0].html as string;
        expect(html).toContain('refund');
      });

      it('shows no-refund message when refundAmount is 0', async () => {
        await svc.sendBookingCancelled({
          guestName: 'Arjun', guestEmail: 'arjun@test.com',
          bookingId: 'bk-001', listingTitle: 'Zen Cottage', refundAmount: 0,
        });
        const html = emailSpy.mock.calls[0][0].html as string;
        expect(html).toContain('No refund');
      });
    });
  });
});
