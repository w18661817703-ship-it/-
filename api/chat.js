import { generateReply } from '../server/chat-service.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const result = await generateReply(request.body?.message);

  if (!result.ok) {
    return response.status(result.status).json({ error: result.error });
  }

  return response.status(200).json({ result: result.result, model: result.model });
}
