import OpenAI from 'openai';

export const DEFAULT_MODEL = 'deepseek-chat';

export const SYSTEM_PROMPT = `你是一个“表达重写器”。

任务：
将用户输入的一句话，在不改变核心意思和情绪强度的前提下，改写成一个可以在平台发布、不容易被屏蔽的版本。

输出要求：
- 保留原句的攻击性、讽刺感或不满情绪
- 替换掉明显的脏话或敏感词
- 可以使用隐喻、反问、轻微阴阳表达
- 不要弱化语气
- 不要变得过于礼貌
- 不要解释
- 不要回复对方
- 输出必须像原话的“改写版”，而不是新的一句话

输出：
- 只输出改写后的句子
- 1句话
- 不要添加任何说明`;

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

export async function rewriteMessage(message) {
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
      temperature: 0.9,
    });

    const rewritten = result.choices?.[0]?.message?.content?.trim();

    if (!rewritten) {
      return { ok: false, status: 502, error: 'DeepSeek 返回了空结果。' };
    }

    return {
      ok: true,
      status: 200,
      result: rewritten,
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
