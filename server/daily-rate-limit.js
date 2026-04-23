const DEFAULT_DAILY_CHAT_LIMIT = 20;
const DEFAULT_DAILY_CHAT_LIMIT_TIMEZONE = 'Asia/Shanghai';
const ONE_HOUR_MS = 60 * 60 * 1000;

const usageByClient = new Map();

let lastCleanupAt = 0;
let cachedFormatter = null;
let cachedTimeZone = null;

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);

  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  return fallback;
}

function getDayFormatter() {
  const configuredTimeZone = process.env.DAILY_CHAT_LIMIT_TIMEZONE?.trim() || DEFAULT_DAILY_CHAT_LIMIT_TIMEZONE;

  if (cachedFormatter && cachedTimeZone === configuredTimeZone) {
    return cachedFormatter;
  }

  try {
    cachedFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: configuredTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    cachedTimeZone = configuredTimeZone;
    return cachedFormatter;
  } catch {
    cachedFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: DEFAULT_DAILY_CHAT_LIMIT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    cachedTimeZone = DEFAULT_DAILY_CHAT_LIMIT_TIMEZONE;
    return cachedFormatter;
  }
}

function getDayKey(date = new Date()) {
  const parts = getDayFormatter().formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

function getClientKey(request) {
  return request.ip || request.socket?.remoteAddress || 'anonymous';
}

function cleanupUsage(currentDayKey) {
  const now = Date.now();

  if (now - lastCleanupAt < ONE_HOUR_MS) {
    return;
  }

  lastCleanupAt = now;

  for (const [clientKey, bucket] of usageByClient.entries()) {
    if (bucket.dayKey !== currentDayKey && bucket.reserved === 0) {
      usageByClient.delete(clientKey);
    }
  }
}

function getUsageBucket(clientKey, dayKey) {
  const now = Date.now();
  const existingBucket = usageByClient.get(clientKey);

  if (!existingBucket) {
    const bucket = {
      dayKey,
      used: 0,
      reserved: 0,
      lastSeenAt: now,
    };

    usageByClient.set(clientKey, bucket);
    return bucket;
  }

  if (existingBucket.dayKey !== dayKey) {
    existingBucket.dayKey = dayKey;
    existingBucket.used = 0;
    existingBucket.reserved = 0;
  }

  existingBucket.lastSeenAt = now;
  return existingBucket;
}

function buildLimitReachedMessage(limit) {
  return `\u4eca\u65e5\u4ea4\u4e92\u6b21\u6570\u5df2\u8fbe\u4e0a\u9650\uff08${limit}\u6b21\uff09\uff0c\u8bf7\u660e\u5929\u518d\u8bd5\u3002`;
}

export function getDailyChatLimit() {
  return normalizePositiveInteger(process.env.DAILY_CHAT_LIMIT, DEFAULT_DAILY_CHAT_LIMIT);
}

export function dailyChatLimit(request, response, next) {
  const message = typeof request.body?.message === 'string' ? request.body.message.trim() : '';

  if (!message) {
    return next();
  }

  const dayKey = getDayKey();
  const limit = getDailyChatLimit();
  const clientKey = getClientKey(request);

  cleanupUsage(dayKey);

  const bucket = getUsageBucket(clientKey, dayKey);
  const activeUsage = bucket.used + bucket.reserved;

  if (activeUsage >= limit) {
    response.setHeader('X-Daily-Limit', String(limit));
    response.setHeader('X-Daily-Remaining', '0');

    return response.status(429).json({
      error: buildLimitReachedMessage(limit),
      limit,
      remaining: 0,
    });
  }

  bucket.reserved += 1;
  bucket.lastSeenAt = Date.now();

  response.setHeader('X-Daily-Limit', String(limit));
  response.setHeader('X-Daily-Remaining', String(Math.max(limit - (bucket.used + bucket.reserved), 0)));

  let finalized = false;

  const finalize = (shouldCountUsage) => {
    if (finalized) {
      return;
    }

    finalized = true;
    bucket.reserved = Math.max(bucket.reserved - 1, 0);

    if (shouldCountUsage) {
      bucket.used += 1;
    }

    bucket.lastSeenAt = Date.now();

    if (bucket.used === 0 && bucket.reserved === 0 && bucket.dayKey !== dayKey) {
      usageByClient.delete(clientKey);
    }
  };

  response.once('finish', () => {
    finalize(response.statusCode < 400);
  });

  response.once('close', () => {
    finalize(false);
  });

  return next();
}
