import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageBreak, TabStopPosition, TabStopType, convertInchesToTwip,
  Header, Footer, PageNumber, NumberFormat,
} from 'docx';
import { writeFileSync } from 'fs';

// ── Brand colors ──
const BRAND = '2E7D32';       // Deep green
const BRAND_LIGHT = 'E8F5E9'; // Light green bg
const ACCENT = '1565C0';      // Blue accent
const DARK = '212121';
const GRAY = '616161';
const LIGHT_GRAY = 'F5F5F5';
const WHITE = 'FFFFFF';
const TABLE_HEADER_BG = '2E7D32';
const TABLE_ALT_BG = 'F1F8E9';

// ── Helpers ──
const br = () => new Paragraph({ spacing: { after: 120 } });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

const heading1 = (text, num) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 400, after: 200 },
  children: [
    new TextRun({ text: num ? `${num}. ` : '', bold: true, size: 32, color: BRAND }),
    new TextRun({ text, bold: true, size: 32, color: BRAND }),
  ],
});

const heading2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 300, after: 150 },
  children: [new TextRun({ text, bold: true, size: 26, color: ACCENT })],
});

const heading3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 200, after: 100 },
  children: [new TextRun({ text, bold: true, size: 22, color: DARK })],
});

const para = (text, opts = {}) => new Paragraph({
  spacing: { after: 120, line: 276 },
  children: [new TextRun({ text, size: 21, color: DARK, ...opts })],
});

const bullet = (text, level = 0) => new Paragraph({
  bullet: { level },
  spacing: { after: 80, line: 276 },
  children: [new TextRun({ text, size: 21, color: DARK })],
});

const boldPara = (label, value) => new Paragraph({
  spacing: { after: 100, line: 276 },
  children: [
    new TextRun({ text: label, bold: true, size: 21, color: DARK }),
    new TextRun({ text: value, size: 21, color: GRAY }),
  ],
});

const codePara = (text) => new Paragraph({
  spacing: { after: 60, line: 240 },
  shading: { type: ShadingType.SOLID, color: LIGHT_GRAY },
  indent: { left: convertInchesToTwip(0.3), right: convertInchesToTwip(0.3) },
  children: [new TextRun({ text, font: 'Consolas', size: 18, color: DARK })],
});

const codeBlock = (lines) => lines.map(l => codePara(l));

const tableCell = (text, opts = {}) => new TableCell({
  shading: opts.bg ? { type: ShadingType.SOLID, color: opts.bg } : undefined,
  margins: { top: 60, bottom: 60, left: 100, right: 100 },
  width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
  children: [new Paragraph({
    children: [new TextRun({
      text,
      size: opts.headerSize || 20,
      bold: !!opts.bold,
      color: opts.color || DARK,
      font: opts.mono ? 'Consolas' : 'Calibri',
    })],
  })],
});

const makeTable = (headers, rows) => {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h => tableCell(h, { bg: TABLE_HEADER_BG, bold: true, color: WHITE, headerSize: 20 })),
  });
  const dataRows = rows.map((row, i) => new TableRow({
    children: row.map(cell => tableCell(cell, { bg: i % 2 === 1 ? TABLE_ALT_BG : WHITE })),
  }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
};

// ── Callout / info box ──
const infoBox = (title, text) => [
  new Paragraph({
    spacing: { before: 150, after: 80 },
    shading: { type: ShadingType.SOLID, color: BRAND_LIGHT },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
    children: [
      new TextRun({ text: `  ${title}: `, bold: true, size: 20, color: BRAND }),
      new TextRun({ text, size: 20, color: DARK }),
    ],
  }),
];

// ──────────────────────────────────────────────────────────────
//  DOCUMENT SECTIONS
// ──────────────────────────────────────────────────────────────

const children = [];

// ── COVER PAGE ──
children.push(
  br(), br(), br(), br(), br(), br(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: 'DHYANA STAYS', bold: true, size: 56, color: BRAND })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: 'Wellness Retreat Booking Platform', size: 32, color: GRAY, italics: true })],
  }),
  br(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', size: 20, color: BRAND })],
  }),
  br(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: 'Complete Application Architecture & Workflow Documentation', size: 24, color: DARK })],
  }),
  br(), br(), br(), br(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Tech Stack: NestJS  ·  Next.js 15  ·  PostgreSQL  ·  Redis  ·  Razorpay  ·  BullMQ', size: 20, color: ACCENT })],
  }),
  br(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'pnpm Monorepo: apps/api  ·  apps/web  ·  packages/shared', size: 20, color: GRAY })],
  }),
  br(), br(), br(), br(), br(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: `Document Version 1.0  ·  ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`, size: 18, color: GRAY })],
  }),
  pageBreak(),
);

// ── TABLE OF CONTENTS ──
children.push(
  heading1('Table of Contents'),
  br(),
);
const tocItems = [
  'High-Level Architecture',
  'Authentication System',
  'Database Schema & Models',
  'Guest Booking Flow',
  'Payment System (Razorpay)',
  'Pricing Engine',
  'Cancellation & Refund Policy',
  'Payout System',
  'Background Jobs (BullMQ)',
  'Messaging System',
  'Notification Service',
  'Host Management',
  'Admin Platform',
  'Guest Experience',
  'API Endpoints Reference',
  'Frontend Pages Reference',
  'Guards, Decorators & Middleware',
  'Storage & Media Uploads',
  'Infrastructure & DevOps',
  'Environment Configuration',
];
tocItems.forEach((item, i) => {
  children.push(new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${i + 1}.  `, bold: true, size: 22, color: BRAND }),
      new TextRun({ text: item, size: 22, color: DARK }),
    ],
  }));
});
children.push(pageBreak());

// ── 1. HIGH-LEVEL ARCHITECTURE ──
children.push(heading1('High-Level Architecture', 1));
children.push(para('Dhyana Stays is a full-stack vacation rental platform purpose-built for wellness retreats across India. The application follows a monorepo architecture with clear separation between the API server, web frontend, and shared utilities.'));
children.push(br());
children.push(heading2('System Components'));
children.push(
  makeTable(
    ['Component', 'Technology', 'Port', 'Purpose'],
    [
      ['Web Frontend', 'Next.js 15 (App Router)', '3000', 'Server-rendered React UI with client components'],
      ['API Server', 'NestJS (TypeScript)', '3001', 'RESTful API with dependency injection'],
      ['Database', 'PostgreSQL 16', '5432', 'Primary data store via Prisma ORM'],
      ['Cache / Queue', 'Redis 7', '6379', 'BullMQ job queues and rate limiting'],
      ['Search Engine', 'Meilisearch v1.12', '7700', 'Full-text listing search'],
    ],
  ),
);
children.push(br());
children.push(heading2('Request Flow'));
children.push(para('All frontend API calls go through the Next.js proxy. The next.config.js rewrites /api/* requests to the NestJS backend at port 3001. This means the browser never directly contacts the API server, simplifying CORS and cookie handling.'));
children.push(br());
children.push(boldPara('1. ', 'Browser makes request to Next.js dev server (port 3000)'));
children.push(boldPara('2. ', '/api/* routes are proxied to NestJS (port 3001) via next.config.js'));
children.push(boldPara('3. ', 'JwtAuthGuard validates the JWT token (unless endpoint is @Public)'));
children.push(boldPara('4. ', 'RolesGuard checks @Roles() decorator against user.role'));
children.push(boldPara('5. ', 'Controller delegates to Service, which uses Prisma to query PostgreSQL'));
children.push(boldPara('6. ', 'Response flows back through the same chain to the browser'));
children.push(br());
children.push(heading2('Module Architecture'));
children.push(para('The NestJS backend is organized into 19 feature modules, each self-contained with its own controller, service, and DTOs. All modules are registered in the root AppModule.'));
children.push(
  makeTable(
    ['Module', 'Responsibility'],
    [
      ['AuthModule', 'User registration, login, JWT issuance, Auth0 sync'],
      ['ListingModule', 'Property CRUD, media, seasonal rates, availability blocks'],
      ['BookingModule', 'Booking creation, state machine, cancellation'],
      ['PaymentModule', 'Razorpay integration, webhook handling, refunds'],
      ['PricingModule', 'Quote calculation, seasonal pricing, refund computation'],
      ['HoldModule', '15-minute booking locks with signed price snapshots'],
      ['PayoutModule', 'Host payout eligibility, weekly batching, statements'],
      ['GuestModule', 'Guest profiles, preferences, wishlists, reviews, notifications'],
      ['AdminModule', 'Platform stats, user management, audit, analytics, bulk ops'],
      ['MessagingModule', 'Guest-Host and Host-Admin conversations'],
      ['NotificationModule', 'Email/SMS delivery (Resend, SendGrid, SMTP, MSG91, Twilio)'],
      ['StorageModule', 'Presigned uploads to S3/R2, stub mode for dev'],
      ['HostAnalyticsModule', 'Host revenue, performance, calendar data'],
      ['JobsModule', 'BullMQ background job scheduling and processing'],
    ],
  ),
);
children.push(pageBreak());

// ── 2. AUTHENTICATION SYSTEM ──
children.push(heading1('Authentication System', 2));
children.push(para('Dhyana Stays supports dual-mode authentication, configurable at deploy time based on environment variables. This allows using a simple custom JWT system during development while switching to Auth0 for production.'));
children.push(br());
children.push(heading2('Mode 1: Custom JWT (Development Default)'));
children.push(para('Active when AUTH0_DOMAIN is not set. Uses HS256 symmetric signing.'));
children.push(br());
children.push(
  makeTable(
    ['Token', 'Algorithm', 'Payload', 'Expiry'],
    [
      ['Access Token', 'HS256', '{ sub, email, role }', '15 minutes'],
      ['Refresh Token', 'HS256', '{ sub, type: "refresh" }', '7 days'],
    ],
  ),
);
children.push(br());
children.push(bullet('User registers with email, password, fullName, and role (GUEST or HOST)'));
children.push(bullet('Password is hashed with bcrypt and stored in User.passwordHash'));
children.push(bullet('Login returns an access + refresh token pair'));
children.push(bullet('Token rotation: each refresh call invalidates the old refresh token and issues a new pair'));
children.push(bullet('Rate limiting: 5 failed login attempts per 15 minutes triggers a temporary lockout'));
children.push(br());
children.push(heading2('Mode 2: Auth0 (Production)'));
children.push(para('Active when AUTH0_DOMAIN and AUTH0_AUDIENCE are set. Uses RS256 asymmetric signing with JWKS verification.'));
children.push(br());
children.push(bullet('Tokens are validated against Auth0\'s JWKS endpoint'));
children.push(bullet('Custom claims: https://dhyanastays.in/role, https://dhyanastays.in/email'));
children.push(bullet('On first Auth0 login, syncUser() creates a local User record'));
children.push(bullet('Audience validation ensures tokens are issued specifically for this API'));
children.push(br());
children.push(heading2('Role Model'));
children.push(
  makeTable(
    ['Role', 'Capabilities'],
    [
      ['GUEST', 'Browse listings, book stays, manage profile, wishlist, reviews, messaging with hosts'],
      ['HOST', 'Create and edit listings, view bookings for their properties, analytics, payouts, messaging'],
      ['ADMIN', 'Approve listings and hosts, manage all users, payouts, refunds, platform settings'],
    ],
  ),
);
children.push(br());
children.push(heading2('Frontend Token Management'));
children.push(para('The API client in apps/web/lib/api.ts manages tokens automatically:'));
children.push(bullet('Tokens stored in localStorage (custom JWT mode)'));
children.push(bullet('On 401 response, the client automatically attempts a token refresh'));
children.push(bullet('If refresh succeeds, the original request is retried transparently'));
children.push(bullet('If refresh fails, localStorage is cleared and the user is redirected to login'));
children.push(pageBreak());

// ── 3. DATABASE SCHEMA ──
children.push(heading1('Database Schema & Models', 3));
children.push(para('The database uses PostgreSQL 16 with Prisma ORM. All models are defined in apps/api/prisma/schema.prisma. There are 22 models organized into domain groups.'));
children.push(br());
children.push(heading2('Core Domain Models'));
children.push(
  makeTable(
    ['Model', 'Purpose', 'Key Fields'],
    [
      ['User', 'Platform user account', 'id, email, fullName, role (GUEST/HOST/ADMIN), passwordHash?, auth0Sub?'],
      ['Host', 'Host profile (linked to User)', 'userId, verificationStatus (PENDING/APPROVED/REJECTED), payoutAccountRef?'],
      ['Listing', 'Rental property', 'title, description, city, state, country, status, timezone, preparationGuide?'],
      ['RateRule', 'Pricing configuration', 'listingId, baseNightlyRate, cleaningFee, minNights, maxGuests'],
      ['SeasonalRate', 'Date-range price overrides', 'listingId, startDate, endDate, nightlyRate'],
      ['AvailabilityBlock', 'Blocked date ranges', 'listingId, startDate, endDate, reason'],
      ['ListingMedia', 'Property images/videos', 'listingId, url, type, sortOrder'],
      ['Tag', 'Amenity/feature labels', 'category, name (unique pair)'],
      ['ListingTag', 'Many-to-many join', 'listingId, tagId'],
    ],
  ),
);
children.push(br());
children.push(heading2('Booking & Payment Models'));
children.push(
  makeTable(
    ['Model', 'Purpose', 'Key Fields'],
    [
      ['Hold', '15-min booking reservation', 'listingId, guestId, startsAt, endsAt, priceSnapshot, expiresAt, idempotencyKey'],
      ['Booking', 'Confirmed reservation', 'listingId, guestId, holdId, status, plan (FULL/DEPOSIT_50), priceSnapshot, balanceDueAt?'],
      ['Payment', 'Payment transaction record', 'bookingId, gateway, gatewayOrderId, amount, status (INITIATED/CAPTURED/FAILED/REFUNDED), type'],
      ['Refund', 'Cancellation refund', 'bookingId, amount, reason, gatewayRefundId?'],
    ],
  ),
);
children.push(br());
children.push(heading2('Financial Models'));
children.push(
  makeTable(
    ['Model', 'Purpose', 'Key Fields'],
    [
      ['PayoutLine', 'Host payout per booking', 'hostId, bookingId, amount, status, eligibleAt'],
      ['PayoutBatch', 'Weekly payout collection', 'hostId, totalAmount, status (SCHEDULED/PAID)'],
      ['LedgerEvent', 'Financial audit trail', 'type, amount, bookingId, metadata'],
      ['AuditLog', 'Action history', 'actorId, action, resourceType, resourceId, metadata'],
      ['IdempotencyKey', 'Duplicate prevention', 'key, userId, path, responseHash, cachedResponse'],
    ],
  ),
);
children.push(br());
children.push(heading2('Guest & Communication Models'));
children.push(
  makeTable(
    ['Model', 'Purpose', 'Key Fields'],
    [
      ['GuestPreference', 'Wellness preferences', 'userId, dietaryNeeds[], wellnessInterests[], accessibility?, experienceLevel?'],
      ['Wishlist', 'Saved listings', 'userId, listingId (unique pair)'],
      ['Review', 'Booking reviews', 'bookingId (unique), guestId, rating, comment'],
      ['Conversation', 'Messaging thread', 'userOneId, userTwoId, type (GUEST_HOST/HOST_ADMIN), listingId?, bookingId?'],
      ['Message', 'Individual chat message', 'conversationId, senderId, senderRole, body, isRead'],
      ['GuestNotification', 'Guest alerts', 'userId, type, title, body, isRead'],
      ['HostNotification', 'Host alerts', 'hostId, type, title, body, isRead'],
      ['AdminNotification', 'Admin alerts', 'type, title, body, isRead'],
      ['SystemConfig', 'Platform settings', 'key, value (JSON)'],
    ],
  ),
);
children.push(br());
children.push(heading2('Booking Status Lifecycle'));
children.push(para('The booking status field follows a strict state machine:'));
children.push(br());
children.push(
  makeTable(
    ['Status', 'Meaning', 'Transitions To'],
    [
      ['PAYMENT_PENDING', 'Booking created, awaiting payment', 'CONFIRMED_DEPOSIT, CONFIRMED_PAID, CANCELLED'],
      ['CONFIRMED_DEPOSIT', '50% deposit paid', 'BALANCE_DUE, CANCELLED, REFUNDED'],
      ['BALANCE_DUE', 'Balance payment window open (48h before check-in)', 'CONFIRMED_PAID, CANCELLED (auto after 24h grace)'],
      ['CONFIRMED_PAID', 'Fully paid', 'COMPLETED, CANCELLED, REFUNDED'],
      ['COMPLETED', 'Guest checked out', 'Terminal state'],
      ['CANCELLED', 'Cancelled with no refund', 'Terminal state'],
      ['REFUNDED', 'Cancelled with refund issued', 'Terminal state'],
    ],
  ),
);
children.push(pageBreak());

// ── 4. GUEST BOOKING FLOW ──
children.push(heading1('Guest Booking Flow', 4));
children.push(para('The complete guest journey from discovery to confirmed booking involves six steps, each backed by a dedicated API endpoint and service method.'));
children.push(br());

children.push(heading2('Step 1: Discover'));
children.push(para('Guests browse approved listings on the public listings page. Listings can be filtered by location and viewed in detail. No authentication required.'));
children.push(bullet('Public endpoint: GET /listings (paginated, approved only)'));
children.push(bullet('Detail endpoint: GET /listings/:id (includes rate rules, media, reviews, host info)'));
children.push(br());

children.push(heading2('Step 2: Get a Price Quote'));
children.push(para('The guest selects check-in/check-out dates and number of guests. The pricing engine calculates a detailed breakdown.'));
children.push(bullet('Endpoint: POST /pricing/quote'));
children.push(bullet('Input: { listingId, checkIn, checkOut, guests }'));
children.push(bullet('Returns: nightly breakdown with seasonal rates, subtotal, cleaning fee, platform fee (10%), total, deposit amount (50%), balance amount'));
children.push(bullet('All monetary values are in paise (100 paise = 1 INR) for precision'));
children.push(br());

children.push(heading2('Step 3: Create a Hold (15-Minute Lock)'));
children.push(para('When the guest proceeds to book, a 15-minute hold is placed on the dates to prevent double-booking.'));
children.push(bullet('Endpoint: POST /holds (requires GUEST auth)'));
children.push(bullet('Validates no overlapping confirmed bookings or active holds'));
children.push(bullet('Price snapshot is HMAC-signed to prevent tampering between quote and payment'));
children.push(bullet('Hold expires automatically after 15 minutes (background job runs every minute)'));
children.push(bullet('Idempotency key prevents duplicate holds on network retries'));
children.push(br());

children.push(heading2('Step 4: Create the Booking'));
children.push(para('The guest confirms the booking by choosing a payment plan and providing guest details.'));
children.push(bullet('Endpoint: POST /bookings'));
children.push(bullet('Input: { holdId, plan: "FULL" | "DEPOSIT_50", guestDetails }'));
children.push(bullet('Validates hold is still active and belongs to the guest'));
children.push(bullet('Creates Booking in PAYMENT_PENDING status'));
children.push(bullet('For DEPOSIT_50 plan: sets balanceDueAt = check-in date minus 48 hours'));
children.push(bullet('Idempotent on holdId (returns existing booking if replayed)'));
children.push(br());

children.push(heading2('Step 5: Payment'));
children.push(para('Payment is processed through Razorpay (or stub mode in development).'));
children.push(bullet('Frontend calls POST /payments/init with { bookingId, type, idempotencyKey }'));
children.push(bullet('API verifies the price snapshot HMAC signature'));
children.push(bullet('Creates a Razorpay order and returns { orderId, key, amount }'));
children.push(bullet('Frontend opens the Razorpay checkout modal'));
children.push(bullet('After payment, Razorpay sends a webhook to POST /payments/webhook'));
children.push(bullet('Webhook is verified using HMAC-SHA256 signature'));
children.push(br());

children.push(heading2('Step 6: Confirmation'));
children.push(para('On successful payment capture, the booking transitions to a confirmed state.'));
children.push(bullet('FULL payment plan: PAYMENT_PENDING becomes CONFIRMED_PAID'));
children.push(bullet('DEPOSIT_50 plan: PAYMENT_PENDING becomes CONFIRMED_DEPOSIT'));
children.push(bullet('A PayoutLine is created for the host (eligible 24h after check-in)'));
children.push(bullet('LedgerEvent is recorded for financial audit trail'));
children.push(bullet('Email and SMS confirmation sent to the guest'));
children.push(bullet('Guest is redirected to /bookings/:id to see confirmation details'));
children.push(pageBreak());

// ── 5. PAYMENT SYSTEM ──
children.push(heading1('Payment System (Razorpay)', 5));
children.push(para('The payment system integrates with Razorpay, India\'s leading payment gateway, for processing credit cards, debit cards, UPI, net banking, and wallet payments. A stub mode is available for local development without a Razorpay account.'));
children.push(br());
children.push(heading2('Payment Types'));
children.push(
  makeTable(
    ['Type', 'When Used', 'Amount'],
    [
      ['FULL', 'Guest selects full payment at booking', 'priceSnapshot.total (100%)'],
      ['DEPOSIT', 'Guest selects 50% deposit at booking', 'priceSnapshot.depositAmount (50%)'],
      ['BALANCE', 'Deposit guest pays remaining balance', 'priceSnapshot.balanceAmount (50%)'],
    ],
  ),
);
children.push(br());
children.push(heading2('Security Measures'));
children.push(bullet('Price Snapshot HMAC: The price snapshot is cryptographically signed when the hold is created. Before initiating payment, the API verifies this signature to ensure the amount has not been tampered with on the client side.'));
children.push(bullet('Webhook Signature Verification: Every Razorpay webhook is verified using HMAC-SHA256 with the RAZORPAY_WEBHOOK_SECRET. Invalid signatures are rejected immediately.'));
children.push(bullet('Idempotency: The IdempotencyKey model and interceptor prevent duplicate payment initiations from network retries or double-clicks.'));
children.push(br());
children.push(heading2('Stub Mode (Development)'));
children.push(para('When RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are empty, the system operates in stub mode:'));
children.push(bullet('Order IDs are prefixed with stub_order_ (no real Razorpay calls)'));
children.push(bullet('Manual confirmation via POST /payments/stub-confirm/:paymentId'));
children.push(bullet('Webhook signature verification is skipped'));
children.push(bullet('Full booking flow still works end-to-end for testing'));
children.push(br());
children.push(heading2('Webhook Events Handled'));
children.push(
  makeTable(
    ['Event', 'Action'],
    [
      ['payment.captured', 'Update Payment to CAPTURED, transition Booking to CONFIRMED_*, create PayoutLine, record LedgerEvent, send notification'],
      ['payment.failed', 'Update Payment to FAILED, booking remains in PAYMENT_PENDING'],
      ['refund.processed', 'Update Payment to REFUNDED, link to Refund record'],
    ],
  ),
);
children.push(pageBreak());

// ── 6. PRICING ENGINE ──
children.push(heading1('Pricing Engine', 6));
children.push(para('The pricing engine calculates the total cost for a stay, accounting for seasonal rate variations, cleaning fees, and a platform service fee.'));
children.push(br());
children.push(heading2('Calculation Formula'));
children.push(br());
children.push(boldPara('For each night: ', 'Check SeasonalRate for that date. If found, use it. Otherwise, use RateRule.baseNightlyRate.'));
children.push(br());
children.push(
  makeTable(
    ['Component', 'Formula', 'Example (3 nights)'],
    [
      ['Subtotal', 'Sum of all nightly rates', '150000 + 150000 + 200000 = 500000 paise (Rs 5,000)'],
      ['Cleaning Fee', 'Fixed from RateRule', '50000 paise (Rs 500)'],
      ['Platform Fee', 'round((subtotal + cleaning) x 0.10)', 'round(550000 x 0.10) = 55000 paise (Rs 550)'],
      ['Total', 'subtotal + cleaning + platform fee', '605000 paise (Rs 6,050)'],
      ['Deposit (50%)', 'round(total x 0.50)', '302500 paise (Rs 3,025)'],
      ['Balance', 'total - deposit', '302500 paise (Rs 3,025)'],
    ],
  ),
);
children.push(br());
children.push(...infoBox('Important', 'All monetary amounts are stored and transmitted in paise (1 INR = 100 paise). The frontend utility formatINR(paise) converts to display format.'));
children.push(br());
children.push(heading2('Revenue Split'));
children.push(
  makeTable(
    ['Recipient', 'Share', 'From Example'],
    [
      ['Host', '90% of (subtotal + cleaning fee)', 'Rs 4,950'],
      ['Platform', '10% platform fee + remaining', 'Rs 1,100'],
      ['Guest Pays', 'Total', 'Rs 6,050'],
    ],
  ),
);
children.push(pageBreak());

// ── 7. CANCELLATION & REFUND ──
children.push(heading1('Cancellation & Refund Policy', 7));
children.push(para('The refund amount depends on how far in advance the cancellation is made relative to the check-in date. This policy balances guest flexibility with host protection.'));
children.push(br());
children.push(
  makeTable(
    ['Time Before Check-in', 'Refund Percentage', 'Rationale'],
    [
      ['48 hours or more', '100% full refund', 'Ample time for host to rebook the dates'],
      ['10 to 48 hours', '50% partial refund', 'Short notice, partial compensation to host'],
      ['Less than 10 hours', '0% no refund', 'Last-minute cancellation, host cannot rebook'],
    ],
  ),
);
children.push(br());
children.push(heading2('Cancellation Process'));
children.push(boldPara('1. ', 'Guest or Admin calls POST /bookings/:id/cancel with a cancellation reason'));
children.push(boldPara('2. ', 'System validates the booking is in a cancellable status (PAYMENT_PENDING, CONFIRMED_DEPOSIT, CONFIRMED_PAID, or BALANCE_DUE)'));
children.push(boldPara('3. ', 'Refund amount is calculated based on the time-based policy above'));
children.push(boldPara('4. ', 'In a single database transaction: booking status updated, Refund record created (if refund > 0), LedgerEvent recorded, AuditLog written'));
children.push(boldPara('5. ', 'Cancellation email and SMS sent to the guest (non-blocking)'));
children.push(br());
children.push(heading2('Auto-Cancellation'));
children.push(para('A background job runs every 15 minutes to auto-cancel bookings where:'));
children.push(bullet('Status is BALANCE_DUE (deposit was paid but balance is now due)'));
children.push(bullet('The balanceDueAt timestamp is more than 24 hours ago (grace period exceeded)'));
children.push(bullet('Reason recorded: "Balance not paid within grace period"'));
children.push(pageBreak());

// ── 8. PAYOUT SYSTEM ──
children.push(heading1('Payout System', 8));
children.push(para('The payout system ensures hosts receive their earnings in a structured, auditable manner. A deliberate 24-hour delay after check-in protects the platform from immediate refund requests.'));
children.push(br());
children.push(heading2('Payout Timeline'));
children.push(br());
children.push(boldPara('Day 0 — Booking Confirmed: ', 'PayoutLine created with status NOT_ELIGIBLE. The eligibleAt timestamp is set to check-in date plus 24 hours.'));
children.push(br());
children.push(boldPara('Check-in + 24 Hours: ', 'Background job (runs hourly) transitions PayoutLine from NOT_ELIGIBLE to ELIGIBLE.'));
children.push(br());
children.push(boldPara('Next Monday 09:00 IST: ', 'Weekly batch job groups all ELIGIBLE lines by host, creates a PayoutBatch record per host, transitions lines to SCHEDULED, and records PAYOUT_SCHEDULED ledger events.'));
children.push(br());
children.push(boldPara('Admin Confirms Transfer: ', 'After completing the bank transfer, admin calls POST /admin/payouts/batches/:id/mark-paid. Batch and all lines transition to PAID. PAYOUT_SENT ledger events are recorded.'));
children.push(br());
children.push(heading2('Host Earnings Calculation'));
children.push(para('When a payment is captured, the host share is calculated as 90% of the captured amount. The platform retains 10% as its service fee. This split is applied per payment, so deposit and balance payments each generate their own payout line.'));
children.push(pageBreak());

// ── 9. BACKGROUND JOBS ──
children.push(heading1('Background Jobs (BullMQ)', 9));
children.push(para('Four background jobs run on scheduled intervals using BullMQ with Redis as the queue backend. Each job has its own dedicated queue and processor.'));
children.push(br());
children.push(
  makeTable(
    ['Job', 'Schedule', 'Purpose'],
    [
      ['Hold Expiry', 'Every 1 minute', 'Finds holds past their expiresAt timestamp and releases the dates for other guests to book'],
      ['Balance Due', 'Every 15 minutes', 'Transitions CONFIRMED_DEPOSIT bookings to BALANCE_DUE when 48h before check-in arrives; sends reminder emails; auto-cancels if 24h grace period exceeded'],
      ['Payout Eligibility', 'Every 1 hour', 'Marks PayoutLine records as ELIGIBLE when 24 hours have passed since check-in'],
      ['Weekly Payout', 'Monday 03:30 UTC (09:00 IST)', 'Batches all ELIGIBLE payout lines by host into PayoutBatch records for admin disbursement'],
    ],
  ),
);
children.push(br());
children.push(heading2('Dead Letter Queue'));
children.push(para('Failed jobs are routed to a Dead Letter Queue (DLQ) via the DlqService. Failed job metadata (queue name, job ID, error, timestamp) is stored for manual investigation by administrators.'));
children.push(pageBreak());

// ── 10. MESSAGING ──
children.push(heading1('Messaging System', 10));
children.push(para('The platform includes a built-in messaging system that enables direct communication between guests and hosts, as well as between hosts and administrators.'));
children.push(br());
children.push(heading2('Conversation Types'));
children.push(
  makeTable(
    ['Type', 'Participants', 'Initiated From'],
    [
      ['GUEST_HOST', 'Guest and the listing\'s Host', 'Listing detail page, booking detail page'],
      ['HOST_ADMIN', 'Host and a Platform Admin', 'Host messages page'],
    ],
  ),
);
children.push(br());
children.push(heading2('Key Features'));
children.push(bullet('Thread-based conversations linked to specific listings or bookings for context'));
children.push(bullet('Deduplication: Unique constraint on [userOneId, userTwoId, listingId] with consistent participant ordering by role priority (GUEST < HOST < ADMIN)'));
children.push(bullet('Unread count badges in the navbar for all three roles'));
children.push(bullet('Polling-based updates: 15-second interval on conversation thread pages'));
children.push(bullet('Mark-as-read: All unread messages from the other party are marked read when opening a thread'));
children.push(bullet('Shared UI components: ConversationList and MessageThread are reused across all role pages'));
children.push(br());
children.push(heading2('Architecture'));
children.push(para('Three role-specific controllers (GuestMessagingController, HostMessagingController, AdminMessagingController) all delegate to a single shared MessagingService. The frontend uses a factory function createMessagingApi(prefix) to generate typed API clients for each role prefix.'));
children.push(pageBreak());

// ── 11. NOTIFICATION SERVICE ──
children.push(heading1('Notification Service', 11));
children.push(para('The notification service handles both email and SMS delivery through a pluggable provider architecture. In development, all notifications are logged to the console via stub providers.'));
children.push(br());
children.push(heading2('Channels & Providers'));
children.push(
  makeTable(
    ['Channel', 'Providers', 'Dev Mode'],
    [
      ['Email', 'Resend, SendGrid, SMTP', 'EMAIL_PROVIDER=stub (logs to console)'],
      ['SMS', 'MSG91, Twilio', 'SMS_PROVIDER=stub (logs to console)'],
    ],
  ),
);
children.push(br());
children.push(heading2('Notification Templates'));
children.push(
  makeTable(
    ['Template', 'Trigger Event', 'Content'],
    [
      ['Booking Confirmed', 'Payment captured (webhook)', 'Booking ID, dates, amount, payment plan'],
      ['Balance Due Reminder', 'Balance due transition (job)', 'Outstanding amount, due date'],
      ['Booking Cancelled', 'Guest/admin cancellation', 'Refund amount (if any)'],
      ['Listing Approved', 'Admin approves listing', 'Listing is now live'],
      ['Listing Rejected', 'Admin rejects listing', 'Rejection reason'],
      ['Host Notification', 'Booking/payout events', 'Event-specific details'],
      ['Admin Notification', 'System events', 'Event-specific details'],
    ],
  ),
);
children.push(br());
children.push(heading2('In-App Notifications'));
children.push(para('Three separate notification models (GuestNotification, HostNotification, AdminNotification) store role-specific alerts. Each role has a notification bell component in the navbar showing unread count.'));
children.push(pageBreak());

// ── 12. HOST MANAGEMENT ──
children.push(heading1('Host Management', 12));
children.push(heading2('Host Onboarding Flow'));
children.push(br());
children.push(boldPara('Step 1 — Registration: ', 'User registers with role HOST. A Host record is created with verificationStatus: PENDING.'));
children.push(boldPara('Step 2 — Admin Approval: ', 'Admin reviews pending hosts at /admin/hosts. Can approve (APPROVED) or reject (REJECTED) with reason.'));
children.push(boldPara('Step 3 — Create Listing: ', 'Approved host creates a listing at /host/listings/new. Listing starts as DRAFT, then moves to PENDING_APPROVAL.'));
children.push(boldPara('Step 4 — Listing Review: ', 'Admin reviews at /admin/listings. Can approve (APPROVED — visible to guests), reject (REJECTED), or request changes (CHANGES_REQUESTED).'));
children.push(br());
children.push(heading2('Host Dashboard Features'));
children.push(
  makeTable(
    ['Feature', 'Route', 'Description'],
    [
      ['My Listings', '/dashboard (HOST view)', 'All listings with status badges, edit and view buttons'],
      ['Bookings', '/host/bookings', 'Incoming reservations for all host properties'],
      ['Calendar', '/host/calendar', 'Visual availability and booking calendar'],
      ['Analytics', '/host/analytics', 'Revenue trends and booking count charts'],
      ['Performance', '/host/performance', 'Ratings, occupancy rate, response time metrics'],
      ['Payouts', '/host/payouts', 'Payout history, batch details, and earnings statements'],
      ['Messages', '/host/messages', 'Conversations with guests and platform admins'],
    ],
  ),
);
children.push(br());
children.push(heading2('Listing Configuration'));
children.push(para('Hosts can configure the following for each listing:'));
children.push(bullet('Basic Info: Title, description, city, state, country'));
children.push(bullet('Rate Rules: Base nightly rate, cleaning fee, minimum nights, maximum guests'));
children.push(bullet('Seasonal Rates: Override pricing for specific date ranges (e.g., holiday premium)'));
children.push(bullet('Availability Blocks: Block dates for maintenance, renovations, or personal use'));
children.push(bullet('Media: Upload property images via presigned URLs (S3/R2)'));
children.push(bullet('Preparation Guide: Packing list, daily schedule, dietary info, arrival instructions for guests'));
children.push(pageBreak());

// ── 13. ADMIN PLATFORM ──
children.push(heading1('Admin Platform', 13));
children.push(para('The admin platform provides comprehensive tools for managing the entire Dhyana Stays marketplace, from user approvals to financial reporting.'));
children.push(br());
children.push(heading2('Admin Dashboard'));
children.push(para('The main admin page (/admin) displays platform-wide KPIs: total revenue, total bookings, registered users, active hosts, and pending approval counts.'));
children.push(br());
children.push(heading2('Management Pages'));
children.push(
  makeTable(
    ['Page', 'Route', 'Capabilities'],
    [
      ['Listings', '/admin/listings', 'Review pending listings, approve/reject/request changes'],
      ['Listing Detail', '/admin/listings/:id', 'Full property review with images, rates, and approval controls'],
      ['Hosts', '/admin/hosts', 'Approve/reject host applications, deactivate verified hosts'],
      ['Host Performance', '/admin/hosts/performance', 'Compare host metrics across properties'],
      ['Bookings', '/admin/bookings', 'View all platform bookings, mark as completed'],
      ['Users', '/admin/users', 'Search users, deactivate accounts, bulk operations'],
      ['Payouts', '/admin/payouts', 'Run weekly batch, view eligible lines, mark batches as paid'],
      ['Refunds', '/admin/refunds', 'Issue manual refunds, view refund history'],
      ['Messages', '/admin/messages', 'Monitor and respond to host-admin conversations'],
      ['Audit Trail', '/admin/audit', 'Full action log with filters by actor, action, resource'],
      ['Analytics', '/admin/analytics', 'Revenue charts by day, week, and month'],
      ['Forecast', '/admin/forecast', 'Revenue projections based on historical data'],
      ['Activity Log', '/admin/activity', 'Track recent admin actions'],
      ['Calendar', '/admin/calendar', 'All bookings on a calendar view'],
      ['Rate Limits', '/admin/rate-limits', 'IP-level throttle statistics'],
      ['Settings', '/admin/settings', 'Key-value system configuration store'],
    ],
  ),
);
children.push(br());
children.push(heading2('Bulk Operations'));
children.push(bullet('Bulk Approve Listings: Mass-approve multiple pending listings at once'));
children.push(bullet('Bulk Deactivate Users: Mass-deactivate user accounts'));
children.push(bullet('Bulk Complete Bookings: Mass-complete past bookings'));
children.push(pageBreak());

// ── 14. GUEST EXPERIENCE ──
children.push(heading1('Guest Experience', 14));
children.push(para('The guest experience is designed around the wellness retreat journey — from discovering a retreat to post-stay reflection.'));
children.push(br());
children.push(heading2('Guest Journey'));
children.push(br());
children.push(boldPara('Discover: ', 'Browse approved listings on the homepage and search results. View detailed property pages with rates, photos, reviews, and host information.'));
children.push(boldPara('Quote & Book: ', 'Select dates and guests to get a price quote. Create a 15-minute hold, choose a payment plan (full or 50% deposit), and complete payment via Razorpay.'));
children.push(boldPara('Prepare: ', 'Access the retreat preparation guide (confirmed bookings only) with packing lists, daily schedules, dietary information, and arrival instructions.'));
children.push(boldPara('Communicate: ', 'Message the host directly about yoga styles, dietary needs, health conditions, or arrival logistics.'));
children.push(boldPara('Stay: ', 'Enjoy the wellness retreat experience.'));
children.push(boldPara('Review: ', 'After checkout, leave a rating and review for the property.'));
children.push(br());
children.push(heading2('Guest Features'));
children.push(
  makeTable(
    ['Feature', 'Route', 'Description'],
    [
      ['Dashboard', '/dashboard', 'Booking stats, upcoming stays, preference prompts, quick action links'],
      ['Booking Detail', '/bookings/:id', 'Status tracking, payment info, host contact, cancellation option'],
      ['Preparation Guide', '/bookings/:id/preparation', 'Host-provided retreat prep (confirmed bookings only)'],
      ['Profile', '/guest/profile', 'Edit name, email, profile photo'],
      ['Preferences', '/guest/preferences', 'Dietary needs, wellness interests, accessibility, experience level, emergency contact'],
      ['Wishlist', '/guest/wishlist', 'Grid of saved favorite listings'],
      ['Reviews', '/guest/reviews', 'All reviews written by the guest'],
      ['Messages', '/guest/messages', 'Conversations with property hosts'],
      ['Notifications', 'Bell icon in navbar', 'Booking updates, balance reminders, system alerts'],
    ],
  ),
);
children.push(br());
children.push(heading2('Wellness Preferences'));
children.push(para('The preferences form captures wellness-specific information unique to the retreat platform:'));
children.push(bullet('Dietary Needs: Vegetarian, Vegan, Gluten-free, Ayurvedic, and more'));
children.push(bullet('Wellness Interests: Yoga, Meditation, Ayurveda, Detox, Sound Healing'));
children.push(bullet('Experience Level: Beginner, Intermediate, or Advanced'));
children.push(bullet('Room Preference: Ground floor, Quiet corner, Garden view'));
children.push(bullet('Arrival Preference: Early morning, Afternoon, Evening'));
children.push(bullet('Accessibility Requirements: Free-text field for specific needs'));
children.push(bullet('Emergency Contact: Name, phone number, and relationship'));
children.push(pageBreak());

// ── 15. API ENDPOINTS ──
children.push(heading1('API Endpoints Reference', 15));

children.push(heading2('Public Endpoints (No Authentication)'));
children.push(
  makeTable(
    ['Method', 'Path', 'Purpose'],
    [
      ['GET', '/health', 'Service health check'],
      ['POST', '/auth/register', 'Create new account'],
      ['POST', '/auth/login', 'Sign in and receive tokens'],
      ['POST', '/auth/refresh', 'Refresh access token'],
      ['GET', '/listings', 'Browse approved listings'],
      ['GET', '/listings/:id', 'View listing detail'],
      ['POST', '/pricing/quote', 'Calculate price for dates'],
      ['POST', '/payments/webhook', 'Razorpay webhook receiver'],
    ],
  ),
);
children.push(br());
children.push(heading2('Guest Endpoints'));
children.push(
  makeTable(
    ['Method', 'Path', 'Purpose'],
    [
      ['POST', '/holds', 'Create 15-minute booking hold'],
      ['POST', '/bookings', 'Create booking from hold'],
      ['GET', '/bookings/mine', 'List my bookings'],
      ['GET', '/bookings/:id', 'Booking detail'],
      ['POST', '/bookings/:id/cancel', 'Cancel booking'],
      ['GET', '/bookings/:id/preparation', 'Retreat preparation guide'],
      ['POST', '/payments/init', 'Initialize payment'],
      ['POST', '/payments/pay-balance', 'Pay remaining balance'],
      ['GET', '/guest/profile', 'Get profile'],
      ['PATCH', '/guest/profile', 'Update profile'],
      ['GET', '/guest/preferences', 'Get wellness preferences'],
      ['PUT', '/guest/preferences', 'Save preferences'],
      ['GET', '/guest/wishlist', 'Get saved listings'],
      ['POST', '/guest/wishlist/:listingId', 'Add to wishlist'],
      ['DELETE', '/guest/wishlist/:listingId', 'Remove from wishlist'],
      ['GET', '/guest/reviews', 'My reviews'],
      ['POST', '/guest/reviews', 'Write a review'],
      ['GET', '/guest/conversations', 'Message threads'],
      ['POST', '/guest/conversations', 'Start conversation with host'],
      ['GET', '/guest/conversations/:id', 'View messages'],
      ['POST', '/guest/conversations/:id/messages', 'Send message'],
      ['POST', '/guest/conversations/:id/read', 'Mark thread as read'],
      ['GET', '/guest/conversations/unread-count', 'Unread message count'],
    ],
  ),
);
children.push(br());
children.push(heading2('Host Endpoints'));
children.push(
  makeTable(
    ['Method', 'Path', 'Purpose'],
    [
      ['POST', '/host/listings', 'Create new listing'],
      ['GET', '/host/listings', 'My listings'],
      ['PATCH', '/host/listings/:id', 'Update listing details'],
      ['POST', '/host/listings/:id/media', 'Upload property media'],
      ['POST', '/host/listings/:id/seasonal-rates', 'Add seasonal pricing'],
      ['POST', '/host/listings/:id/availability-blocks', 'Block dates'],
      ['GET', '/host/listings/:id/preparation', 'Get preparation guide'],
      ['PATCH', '/host/listings/:id/preparation', 'Update preparation guide'],
      ['GET', '/host/bookings', 'Bookings for my properties'],
      ['GET', '/host/analytics/*', 'Stats, revenue, bookings, performance, calendar'],
      ['GET', '/host/payouts/statements', 'Payout history'],
      ['GET/POST', '/host/conversations/*', 'Messaging (same pattern as guest)'],
    ],
  ),
);
children.push(br());
children.push(heading2('Admin Endpoints'));
children.push(
  makeTable(
    ['Method', 'Path', 'Purpose'],
    [
      ['GET', '/admin/stats', 'Platform-wide statistics'],
      ['GET', '/admin/users', 'User management list'],
      ['POST', '/admin/users/:id/deactivate', 'Deactivate user account'],
      ['POST', '/admin/users/:id/activate', 'Reactivate user account'],
      ['POST', '/admin/listings/:id/review', 'Approve or reject listing'],
      ['POST', '/admin/hosts/:id/approve', 'Approve host application'],
      ['POST', '/admin/hosts/:id/reject', 'Reject host application'],
      ['GET', '/admin/bookings', 'All bookings (paginated)'],
      ['POST', '/admin/bookings/:id/complete', 'Mark booking completed'],
      ['GET', '/admin/payouts/*', 'Eligible lines, batches'],
      ['POST', '/admin/payouts/run-batch', 'Trigger weekly payout batch'],
      ['POST', '/admin/payouts/batches/:id/mark-paid', 'Confirm bank transfer'],
      ['GET', '/admin/refunds', 'Refund history'],
      ['POST', '/admin/refunds', 'Issue manual refund'],
      ['GET', '/admin/audit', 'Audit trail'],
      ['GET', '/admin/analytics/*', 'Revenue, forecast, activity'],
      ['GET/PATCH', '/admin/settings', 'System configuration'],
      ['POST', '/admin/bulk/*', 'Bulk approve, deactivate, complete'],
      ['GET/POST', '/admin/conversations/*', 'Admin messaging'],
    ],
  ),
);
children.push(pageBreak());

// ── 16. FRONTEND PAGES ──
children.push(heading1('Frontend Pages Reference', 16));
children.push(para('The web application uses Next.js 15 App Router with 41 pages organized by role. All pages use client-side rendering with the "use client" directive.'));
children.push(br());
children.push(heading2('Public Pages'));
children.push(
  makeTable(
    ['Route', 'Description'],
    [
      ['/', 'Homepage with featured listings and search'],
      ['/auth/login', 'Sign-in form (custom JWT or Auth0)'],
      ['/auth/register', 'Account creation with role selection'],
      ['/auth/callback', 'Auth0 OAuth redirect handler'],
      ['/listings/:id', 'Listing detail with booking panel, photos, reviews'],
    ],
  ),
);
children.push(br());
children.push(heading2('Guest Pages (9 pages)'));
children.push(
  makeTable(
    ['Route', 'Description'],
    [
      ['/dashboard', 'Stats, upcoming bookings, preference prompts, quick links'],
      ['/bookings/:id', 'Booking detail with payment, cancellation, host messaging'],
      ['/bookings/:id/preparation', 'Retreat preparation guide (confirmed only)'],
      ['/guest/profile', 'Edit personal information'],
      ['/guest/preferences', 'Wellness preferences form'],
      ['/guest/wishlist', 'Saved listings grid'],
      ['/guest/reviews', 'Reviews authored by guest'],
      ['/guest/messages', 'Conversation list with hosts'],
      ['/guest/messages/:id', 'Message thread with a host'],
    ],
  ),
);
children.push(br());
children.push(heading2('Host Pages (10 pages)'));
children.push(
  makeTable(
    ['Route', 'Description'],
    [
      ['/dashboard', 'Listings grid with status badges and actions'],
      ['/host/listings/new', 'Create a new property listing'],
      ['/host/listings/:id/edit', 'Edit listing details, rates, media, availability'],
      ['/host/bookings', 'Incoming guest reservations'],
      ['/host/calendar', 'Visual availability and booking calendar'],
      ['/host/analytics', 'Revenue trend charts'],
      ['/host/performance', 'Ratings, occupancy, response time'],
      ['/host/payouts', 'Payout history and statements'],
      ['/host/messages', 'Conversations with guests and admins'],
      ['/host/messages/:id', 'Message thread'],
    ],
  ),
);
children.push(br());
children.push(heading2('Admin Pages (18 pages)'));
children.push(
  makeTable(
    ['Route', 'Description'],
    [
      ['/admin', 'Platform dashboard with KPIs'],
      ['/admin/listings', 'Listing approval queue'],
      ['/admin/listings/:id', 'Full listing review'],
      ['/admin/hosts', 'Host application management'],
      ['/admin/hosts/performance', 'Host metrics comparison'],
      ['/admin/bookings', 'All platform bookings'],
      ['/admin/users', 'User search and management'],
      ['/admin/payouts', 'Payout batch management'],
      ['/admin/refunds', 'Refund issuance and history'],
      ['/admin/messages', 'Admin messaging hub'],
      ['/admin/messages/:id', 'Admin message thread'],
      ['/admin/audit', 'Action audit trail'],
      ['/admin/analytics', 'Revenue by period'],
      ['/admin/forecast', 'Revenue projections'],
      ['/admin/activity', 'Admin action history'],
      ['/admin/calendar', 'Booking calendar view'],
      ['/admin/rate-limits', 'Throttle statistics'],
      ['/admin/settings', 'System configuration'],
    ],
  ),
);
children.push(pageBreak());

// ── 17. GUARDS & MIDDLEWARE ──
children.push(heading1('Guards, Decorators & Middleware', 17));
children.push(br());
children.push(heading2('Guards (Applied Globally)'));
children.push(
  makeTable(
    ['Guard', 'Scope', 'Purpose'],
    [
      ['JwtAuthGuard', 'Global (all routes)', 'Validates JWT token; skips endpoints decorated with @Public()'],
      ['RolesGuard', 'Global (all routes)', 'Checks @Roles() decorator against user.role; allows if no roles specified'],
      ['LoginThrottleGuard', '/auth/login only', '5 failed login attempts per 15 minutes triggers temporary lockout'],
    ],
  ),
);
children.push(br());
children.push(heading2('Decorators'));
children.push(
  makeTable(
    ['Decorator', 'Target', 'Purpose'],
    [
      ['@Public()', 'Method or Controller', 'Marks endpoint as unauthenticated (bypasses JWT guard)'],
      ['@Roles(UserRole.HOST, ...)', 'Method or Controller', 'Requires user to have one of the specified roles'],
      ['@CurrentUser()', 'Parameter', 'Injects { sub, email, role } from JWT payload into handler parameter'],
    ],
  ),
);
children.push(br());
children.push(heading2('Interceptors'));
children.push(
  makeTable(
    ['Interceptor', 'Scope', 'Purpose'],
    [
      ['ThrottleTrackerInterceptor', 'Global', 'Tracks request rates per IP address for admin monitoring dashboard'],
      ['IdempotencyInterceptor', 'Per-route (opt-in)', 'Caches responses for duplicate requests sharing the same idempotency key'],
    ],
  ),
);
children.push(pageBreak());

// ── 18. STORAGE ──
children.push(heading1('Storage & Media Uploads', 18));
children.push(para('The storage service supports direct browser-to-cloud uploads using presigned URLs. This avoids routing large files through the API server.'));
children.push(br());
children.push(heading2('Upload Flow'));
children.push(br());
children.push(boldPara('1. ', 'Frontend requests a presigned URL: POST /storage/presigned-upload with { fileName, contentType, folder }'));
children.push(boldPara('2. ', 'API generates a presigned PUT URL using AWS SigV4 signing'));
children.push(boldPara('3. ', 'Frontend uploads the file directly to S3/R2 using the presigned URL'));
children.push(boldPara('4. ', 'Frontend saves the public URL to the listing media record'));
children.push(br());
children.push(heading2('Storage Providers'));
children.push(
  makeTable(
    ['Provider', 'Configuration', 'Use Case'],
    [
      ['stub', 'Default (dev)', 'Returns localhost URLs, no actual file upload'],
      ['s3', 'AWS S3', 'Production storage with S3_ENDPOINT, S3_BUCKET, S3_REGION'],
      ['r2', 'Cloudflare R2', 'S3-compatible storage with optional CDN_URL for public access'],
    ],
  ),
);
children.push(pageBreak());

// ── 19. INFRASTRUCTURE ──
children.push(heading1('Infrastructure & DevOps', 19));
children.push(heading2('Development Infrastructure'));
children.push(para('Local development uses Docker Compose to run supporting services:'));
children.push(
  makeTable(
    ['Service', 'Image', 'Port', 'Purpose'],
    [
      ['PostgreSQL', 'postgres:16', '5432', 'Primary database'],
      ['Redis', 'redis:6.2.0', '6379', 'BullMQ job queues'],
      ['Meilisearch', 'getmeili/meilisearch:v1.12', '7700', 'Full-text search'],
    ],
  ),
);
children.push(br());
children.push(heading2('Production Infrastructure'));
children.push(para('The production docker-compose.prod.yml includes health checks and data persistence:'));
children.push(bullet('PostgreSQL 16 Alpine with pg_isready health checks'));
children.push(bullet('Redis 7 Alpine with RDB snapshot persistence'));
children.push(bullet('Meilisearch with health checks enabled'));
children.push(bullet('API container built from apps/api/Dockerfile (multi-stage Node.js)'));
children.push(bullet('Web container built from apps/web/Dockerfile (Next.js standalone output)'));
children.push(br());
children.push(heading2('CI/CD Pipeline'));
children.push(para('GitHub Actions workflow (.github/workflows/ci.yml) triggered on pushes to main/develop and all pull requests:'));
children.push(br());
children.push(
  makeTable(
    ['Job', 'Trigger', 'Steps'],
    [
      ['API', 'Push/PR', 'Install deps, generate Prisma client, run tests, build'],
      ['Web', 'Push/PR', 'Install deps, build'],
      ['Docker', 'Push to main only', 'Build API and Web Docker images (after API + Web jobs pass)'],
    ],
  ),
);
children.push(br());
children.push(heading2('Development Commands'));
children.push(br());
children.push(codePara('pnpm infra:up                         # Start Docker services'));
children.push(codePara('pnpm --filter @dhyana/api start:dev   # API server (watch mode, port 3001)'));
children.push(codePara('pnpm --filter @dhyana/web dev         # Web server (hot reload, port 3000)'));
children.push(codePara('pnpm --filter @dhyana/api prisma:generate  # Regenerate Prisma client'));
children.push(codePara('pnpm --filter @dhyana/api prisma:migrate   # Apply database migrations'));
children.push(codePara('pnpm --filter @dhyana/api prisma:studio    # Visual database browser'));
children.push(pageBreak());

// ── 20. ENVIRONMENT CONFIGURATION ──
children.push(heading1('Environment Configuration', 20));
children.push(heading2('API Environment Variables'));
children.push(
  makeTable(
    ['Variable', 'Required', 'Default', 'Description'],
    [
      ['NODE_ENV', 'No', 'development', 'Environment mode'],
      ['PORT', 'No', '3001', 'API server port'],
      ['DATABASE_URL', 'Yes', '—', 'PostgreSQL connection string'],
      ['JWT_ACCESS_SECRET', 'Yes', '—', 'HS256 signing secret (min 16 chars, 32 in prod)'],
      ['JWT_REFRESH_SECRET', 'Yes', '—', 'Refresh token signing secret'],
      ['JWT_ACCESS_EXPIRES_IN', 'No', '15m', 'Access token time-to-live'],
      ['JWT_REFRESH_EXPIRES_IN', 'No', '7d', 'Refresh token time-to-live'],
      ['REDIS_HOST', 'No', 'localhost', 'Redis host for BullMQ queues'],
      ['REDIS_PORT', 'No', '6379', 'Redis port'],
      ['RAZORPAY_KEY_ID', 'No', '—', 'Razorpay API key (empty = stub mode)'],
      ['RAZORPAY_KEY_SECRET', 'No', '—', 'Razorpay secret key'],
      ['RAZORPAY_WEBHOOK_SECRET', 'No', '—', 'Webhook HMAC verification secret'],
      ['EMAIL_PROVIDER', 'No', 'stub', 'stub / resend / sendgrid / smtp'],
      ['SMS_PROVIDER', 'No', 'stub', 'stub / msg91 / twilio'],
      ['STORAGE_PROVIDER', 'No', 'stub', 'stub / s3 / r2'],
      ['AUTH0_DOMAIN', 'No', '—', 'Auth0 tenant domain (empty = custom JWT)'],
      ['AUTH0_AUDIENCE', 'No', '—', 'Auth0 API audience identifier'],
      ['PRICE_SNAPSHOT_SECRET', 'Yes', '—', 'HMAC signing key (min 32 chars)'],
      ['MEILI_URL', 'No', '—', 'Meilisearch server URL'],
      ['MEILI_MASTER_KEY', 'No', '—', 'Meilisearch API key'],
      ['THROTTLE_TTL', 'No', '60000', 'Rate limit window in milliseconds'],
      ['THROTTLE_LIMIT', 'No', '100', 'Max requests per rate limit window'],
    ],
  ),
);
children.push(br());
children.push(heading2('Web Environment Variables'));
children.push(
  makeTable(
    ['Variable', 'Required', 'Default', 'Description'],
    [
      ['NEXT_PUBLIC_API_URL', 'No', 'http://localhost:3001', 'Backend API base URL'],
      ['NEXT_PUBLIC_AUTH0_DOMAIN', 'No', '—', 'Auth0 domain (absent = custom JWT mode)'],
      ['NEXT_PUBLIC_AUTH0_CLIENT_ID', 'No', '—', 'Auth0 SPA client ID'],
      ['NEXT_PUBLIC_AUTH0_AUDIENCE', 'No', '—', 'Auth0 API audience'],
    ],
  ),
);
children.push(br(), br());

// ── SUMMARY ──
children.push(heading1('Summary Statistics'));
children.push(br());
children.push(
  makeTable(
    ['Metric', 'Count'],
    [
      ['Prisma Database Models', '22'],
      ['NestJS Feature Modules', '19'],
      ['API Services', '20+'],
      ['API Endpoints', '90+'],
      ['Frontend Pages', '41'],
      ['Background Jobs', '4'],
      ['Database Migrations', '8'],
      ['Notification Templates', '7'],
      ['Email/SMS Providers', '5 (Resend, SendGrid, SMTP, MSG91, Twilio)'],
      ['Storage Providers', '3 (S3, R2, Stub)'],
    ],
  ),
);
children.push(br(), br());
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 400 },
  children: [new TextRun({ text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', size: 20, color: BRAND })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 100 },
  children: [new TextRun({ text: 'Dhyana Stays — Wellness Retreat Booking Platform', size: 20, color: GRAY, italics: true })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 60 },
  children: [new TextRun({ text: 'End of Document', size: 18, color: GRAY })],
}));

// ──────────────────────────────────────────────────────────────
//  BUILD DOCUMENT
// ──────────────────────────────────────────────────────────────

const doc = new Document({
  creator: 'Dhyana Stays',
  title: 'Dhyana Stays — Complete Application Architecture',
  description: 'Full-stack wellness retreat booking platform documentation',
  styles: {
    default: {
      document: {
        run: { font: 'Calibri', size: 22, color: DARK },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(1),
          bottom: convertInchesToTwip(0.8),
          left: convertInchesToTwip(1),
          right: convertInchesToTwip(1),
        },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: 'Dhyana Stays — Architecture Document', size: 16, color: GRAY, italics: true })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Page ', size: 16, color: GRAY }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GRAY }),
          ],
        })],
      }),
    },
    children,
  }],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync('Dhyana_Stays_Architecture.docx', buffer);
console.log('Document generated: Dhyana_Stays_Architecture.docx');
