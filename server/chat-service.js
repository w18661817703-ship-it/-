import OpenAI from 'openai';

export const DEFAULT_MODEL = 'deepseek-chat';

export const SYSTEM_PROMPT = `你是一个“高情商表达过滤器”。

任务：
将用户输入中的辱骂、攻击性语言、脏字、容易被举报或无法过审的内容，
改写成：
- 不带脏字
- 不包含人身侮辱、歧视、威胁或恶意诅咒
- 保留用户原本的不满、批评和否定态度
- 语气克制、冷静、略带讽刺，但不过界
- 能通过常见平台审核，更像成年人表达不爽

要求：
- 优先保留原意，而不是洗白成鸡汤
- 保留明显的不满、否定、反驳和批评力度，不要改成温和劝说
- 可以冷淡、尖锐、带轻微反讽，但不能越界成人身羞辱
- 批评对象优先落在观点、逻辑、表达方式、行为，而不是人格、智力、外貌或身份
- 如果输入包含脏字、缩写脏话、谐音脏话、屏蔽词、变体辱骂或故意拆写的过激表达，要先识别其真实语义，再改写成合规版本
- 这些内容改写后必须不含脏字和屏蔽词，但仍然保留原本的否定、反驳和批评方向
- 控制在 1-2 句话
- 输出自然，像真人会发的评论
- 不要使用威胁、羞辱、辱骂、恶意引战
- 如果原文已经基本合规，就只做轻微润色
- 不要写成“我尊重你的表达权利”“希望你好好说话”这类过于软化的句子

参考风格：
- “你的观点站不住脚，情绪倒是先一步到了；先把逻辑理顺，再谈说服力。”
- “内容没什么分量，语气倒挺满，建议先补上事实再来下结论。”`;

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
  return process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;
}

export function getClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY;

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
    return { ok: false, status: 400, error: 'message is required' };
  }

  const client = getClient();

  if (!client) {
    return {
      ok: false,
      status: 500,
      error: 'Missing DEEPSEEK_API_KEY in environment variables.',
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
      temperature: 1.1,
    });

    const output = result.choices?.[0]?.message?.content?.trim();

    if (!output) {
      return { ok: false, status: 502, error: 'DeepSeek returned an empty response.' };
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
      return { ok: false, status, error: 'DEEPSEEK_API_KEY 无效或没有权限。' };
    }

    if (status === 402) {
      return {
        ok: false,
        status,
        error: 'DeepSeek 账户余额不足，当前 key 已接入，但需要先充值或开通可用额度。',
      };
    }

    if (status === 429) {
      return {
        ok: false,
        status,
        error: 'DeepSeek 请求被限流，或当前账号额度不足。请检查账户余额与调用限制。',
      };
    }

    if (error instanceof Error) {
      return { ok: false, status, error: error.message };
    }

    return { ok: false, status, error: 'Server request failed.' };
  }
}
