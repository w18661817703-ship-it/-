import { getModel } from '../server/chat-service.js';

export default function handler(_request, response) {
  return response.status(200).json({ ok: true, model: getModel() });
}
