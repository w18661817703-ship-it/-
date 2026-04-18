import { generateReply } from '../server/chat-service.js';
import { consumeDailyQuota, getClientIp } from '../server/daily-rate-limit.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const clientIp = getClientIp(request);
  const quota = consumeDailyQuota(clientIp);

  if (!quota.allowed) {
    return response.status(429).json({
      error: '今日可用次数已用完，请明天再试',
      remainingCount: quota.remainingCount,
    });
  }

  const result = await generateReply(request.body?.message);

  if (!result.ok) {
    return response.status(result.status).json({
      error: result.error,
      remainingCount: quota.remainingCount,
    });
  }

  return response.status(200).json({
    result: result.result,
    model: result.model,
    remainingCount: quota.remainingCount,
  });
}
