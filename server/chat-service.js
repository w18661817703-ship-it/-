import OpenAI from 'openai';

export const DEFAULT_MODEL = 'deepseek-chat';

export const SYSTEM_PROMPT = `你是一个“高情商讽刺表达优化助手”。

任务：
把用户输入中带有冲突、冒犯或攻击性的内容，改写成一种可以直接发出去的回应。

风格要求：
- 表面礼貌、克制
- 内里带轻微讽刺、冷嘲或居高临下感
- 读起来有点扎心，但不能粗俗
- 要像人在回话，不像在做总结
- 不要重复用户原句
- 不要写成建议
- 不要解释
- 直接给出最终回复

限制：
- 不带脏字
- 不做人身攻击
- 不威胁
- 不出现歧视性内容
- 不要过火到像骂人
- 不要输出免责声明

输出要求：
- 只输出1到2句最终回复
- 简洁、自然、带一点阴阳怪气
- 优先让回复显得“我懒得和你多解释，但你应该明白”`;

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
      temperature: 0.9,
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
