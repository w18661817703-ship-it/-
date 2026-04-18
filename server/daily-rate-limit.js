const DAILY_LIMIT = 30;
const requestCounts = new Map();

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function buildStorageKey(ip, dateKey) {
  return `${dateKey}:${ip}`;
}

function cleanupExpiredEntries(todayKey) {
  for (const key of requestCounts.keys()) {
    if (!key.startsWith(`${todayKey}:`)) {
      requestCounts.delete(key);
    }
  }
}

export function getClientIp(request) {
  const forwardedFor = request.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0].split(',')[0].trim();
  }

  return request.ip || request.socket.remoteAddress || 'unknown';
}

export function consumeDailyQuota(ip) {
  const todayKey = formatDateKey(new Date());
  cleanupExpiredEntries(todayKey);

  const storageKey = buildStorageKey(ip, todayKey);
  const currentCount = requestCounts.get(storageKey) || 0;

  if (currentCount >= DAILY_LIMIT) {
    return {
      allowed: false,
      remainingCount: 0,
    };
  }

  const nextCount = currentCount + 1;
  requestCounts.set(storageKey, nextCount);

  return {
    allowed: true,
    remainingCount: DAILY_LIMIT - nextCount,
  };
}

export function getDailyLimit() {
  return DAILY_LIMIT;
}
