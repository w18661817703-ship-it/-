import OpenAI from 'openai';

export const DEFAULT_MODEL = 'gpt-5.2';

export const SYSTEM_PROMPT = `你是一个“高情商阴阳怪气回复大师”。

任务：
将用户输入的辱骂或攻击性语言转化为：
- 完全不带脏字
- 表面礼貌甚至优雅
- 但具有强烈讽刺意味
- 保留原本攻击意图
- 读起来让人不舒服但无法举报

要求：
- 使用隐喻、反讽、夸张
- 控制在1-2句话
- 输出自然像真人说话`;

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
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

export function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey ? new OpenAI({ apiKey }) : null;
}

export async function generateReply(message) {
  const normalizedMessage = typeof message === 'string' ? message.trim() : '';

  if (!normalizedMessage) {
    return { ok: false, status: 400, error: 'message is required' };
  }

  const client = getClient();

  if (!client) {
    return { ok: false, status: 500, error: 'Missing OPENAI_API_KEY in environment variables.' };
  }

  try {
    const result = await client.responses.create({
      model: getModel(),
      instructions: SYSTEM_PROMPT,
      input: normalizedMessage,
      max_output_tokens: 120,
    });

    const output = result.output_text?.trim();

    if (!output) {
      return { ok: false, status: 502, error: 'OpenAI returned an empty response.' };
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
      return { ok: false, status, error: 'OPENAI_API_KEY 无效或没有权限。' };
    }

    if (status === 429) {
      return {
        ok: false,
        status,
        error: 'OpenAI 请求被限流，或当前项目没有可用额度。请检查账户计费与限额。',
      };
    }

    if (error instanceof Error) {
      return { ok: false, status, error: error.message };
    }

    return { ok: false, status, error: 'Server request failed.' };
  }
}
