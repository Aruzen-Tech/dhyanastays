import { ListingStatus, PrismaClient } from '@prisma/client';
import { toMeiliListingDocument } from '../listing/meili-listing-document';

const prisma = new PrismaClient();

const meiliUrl = process.env.MEILI_URL?.replace(/\/$/, '');
const meiliKey = process.env.MEILI_MASTER_KEY;

type MeiliTask = {
  taskUid: number;
};

type MeiliTaskStatus = {
  status: 'enqueued' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  error?: {
    message?: string;
  };
};

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${meiliKey}`,
};

async function waitForTask(taskUid: number): Promise<void> {
  const startedAt = Date.now();
  const timeoutMs = 60_000;

  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetch(`${meiliUrl}/tasks/${taskUid}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Unable to read Meilisearch task ${taskUid}: ${response.status}`,
      );
    }

    const task = (await response.json()) as MeiliTaskStatus;

    if (task.status === 'succeeded') {
      return;
    }

    if (task.status === 'failed' || task.status === 'canceled') {
      throw new Error(
        task.error?.message ??
          `Meilisearch task ${taskUid} ended with status ${task.status}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Meilisearch task ${taskUid} timed out`);
}

async function ensureListingsIndex(): Promise<void> {
  const response = await fetch(`${meiliUrl}/indexes/listings`, {
    headers,
  });

  if (response.ok) {
    return;
  }

  if (response.status !== 404) {
    const body = await response.text();

    throw new Error(
      `Unable to inspect Meilisearch index (${response.status}): ${body}`,
    );
  }

  const createResponse = await fetch(`${meiliUrl}/indexes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      uid: 'listings',
      primaryKey: 'id',
    }),
  });

  if (!createResponse.ok) {
    const body = await createResponse.text();

    throw new Error(
      `Unable to create Meilisearch index (${createResponse.status}): ${body}`,
    );
  }

  const task = (await createResponse.json()) as MeiliTask;
  await waitForTask(task.taskUid);

  console.log('Created Meilisearch index: listings');
}

async function runTask(
  path: string,
  init: RequestInit,
  allowNotFound = false,
): Promise<void> {
  const response = await fetch(`${meiliUrl}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...init.headers,
    },
  });

  if (allowNotFound && response.status === 404) {
    return;
  }

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Meilisearch request failed (${response.status}): ${body}`,
    );
  }

  const task = (await response.json()) as MeiliTask;
  await waitForTask(task.taskUid);
}

async function main(): Promise<void> {
  if (!meiliUrl || !meiliKey) {
    throw new Error(
      'MEILI_URL and MEILI_MASTER_KEY must be configured before reindexing',
    );
  }

  const listings = await prisma.listing.findMany({
    where: {
      status: ListingStatus.APPROVED,
    },
    include: {
      rateRules: {
        orderBy: {
          createdAt: 'asc',
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const documents = listings.map(toMeiliListingDocument);

  console.log(`Preparing to index ${documents.length} approved listings...`);

  await ensureListingsIndex();

  await runTask(
    '/indexes/listings/documents',
    {
      method: 'DELETE',
    },
    true,
  );

  if (documents.length > 0) {
    await runTask('/indexes/listings/documents?primaryKey=id', {
      method: 'POST',
      body: JSON.stringify(documents),
    });
  }

  await runTask('/indexes/listings/settings', {
    method: 'PATCH',
    body: JSON.stringify({
      searchableAttributes: [
        'title',
        'city',
        'state',
        'country',
        'experienceTags',
        'propertyType',
        'dietaryOptions',
        'description',
      ],
      filterableAttributes: [
        'city',
        'state',
        'country',
        'experienceTags',
        'propertyType',
        'dietaryOptions',
        'baseNightlyRate',
        'maxGuests',
      ],
      sortableAttributes: [
        'baseNightlyRate',
        'createdAt',
      ],
    }),
  });

  console.log(
    `Meilisearch reindex completed successfully: ${documents.length} listings indexed.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error
        ? error.message
        : 'Unknown Meilisearch reindex error',
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
