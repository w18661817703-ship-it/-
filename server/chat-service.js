import OpenAI from 'openai';

export const DEFAULT_MODEL = 'deepseek-chat';

export const SYSTEM_PROMPT = `你是一个“高情商表达优化助手”。

任务：
将用户输入中带有情绪、冲突感或攻击性的表达，改写为：
- 不带脏字
- 冷静、克制、清晰
- 保留立场
- 可以表达不满，但不做人身攻击
- 更适合公开平台发布

要求：
- 控制在1到2句话
- 自然像真人表达
- 不要说教
- 不要输出免责声明`;

function resolveStatus(error) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status;
  }

  return 500;
}

export function getModel() {
  return process.env.MODEL_NAME?.trim() || DEFAULT_MODEL;
}

export function getClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();

  return apiKey
    ? new OpenAI({
        apiKey,
        baseURL: 'https://api.deepseek.com/v1',
      })
    : null;
}

export async function generateReply(message) {
  const normalizedMessage = typeof message === 'string' ? message.trim() : '';

  if (!normalizedMessage) {
    return { ok: false, status: 400, error: 'message 不能为空。' };
  }

  const client = getClient();

  if (!client) {
    return {
      ok: false,
      status: 500,
      error: '缺少 DEEPSEEK_API_KEY 环境变量。',
    };
  }

  try {
    const result = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: normalizedMessage },
      ],
      max_tokens: 120,
      temperature: 0.8,
    });

    const output = result.choices?.[0]?.message?.content?.trim();

    if (!output) {
      return { ok: false, status: 502, error: 'DeepSeek 返回了空结果。' };
    }

    return {
      ok: true,
      status: 200,
      result: output,
      model: getModel(),
    };
  } catch (error) {
    const status = resolveStatus(error);

    if (status === 401) {
      return { ok: false, status, error: 'DEEPSEEK_API_KEY 无效，或当前账号没有接口权限。' };
    }

    if (status === 402) {
      return {
        ok: false,
        status,
        error: 'DeepSeek 账户余额不足，请先充值或确认当前 key 可用。',
      };
    }

    if (status === 429) {
      return {
        ok: false,
        status,
        error: 'DeepSeek 请求过于频繁，或账号当前额度受限，请稍后再试。',
      };
    }

    if (error instanceof Error) {
      return { ok: false, status, error: error.message };
    }

    return { ok: false, status, error: '服务端请求失败。' };
  }
}
