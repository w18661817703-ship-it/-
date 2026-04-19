/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCheck,
  Clock3,
  Copy,
  Gauge,
  History,
  RefreshCcw,
  Send,
  Shield,
  Sparkles,
} from 'lucide-react';

type ApiResponse = {
  error?: string;
  model?: string;
  result?: string;
};

type HistoryItem = {
  createdAt: number;
  id: number;
  input: string;
  output: string;
};

const MIN_LOADING_MS = 1200;

const PRINCIPLES = [
  {
    detail: '只处理失控表达，不把原本的批评态度洗成空话。',
    title: '保留原意',
  },
  {
    detail: '优先删掉容易升级冲突的成分，让句子更稳也更清楚。',
    title: '降低摩擦',
  },
  {
    detail: '尽量控制在短句或单段，适合直接发出，不拖泥带水。',
    title: '保持利落',
  },
];

const PIPELINE_STEPS = [
  {
    detail: '先识别原句里的观点、态度和真正想打到的点。',
    title: '抽取核心立场',
  },
  {
    detail: '压住情绪噪音，保留批评方向和表达力度。',
    title: '收束攻击性',
  },
  {
    detail: '整理成更克制、更清晰、更适合公开发布的版本。',
    title: '输出最终改写',
  },
];

const QUICK_EXAMPLES = [
  {
    label: '观点站不住',
    text: '你的结论下得太快了，论据完全撑不住。',
  },
  {
    label: '先把事实讲清楚',
    text: '别急着扣帽子，把事实讲完整再下判断。',
  },
  {
    label: '语气收一收',
    text: '内容本身有讨论空间，但你现在的语气只会削弱说服力。',
  },
];

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function ensureMinimumLoading(startedAt: number) {
  const elapsed = Date.now() - startedAt;
  const remaining = MIN_LOADING_MS - elapsed;

  if (remaining > 0) {
    await delay(remaining);
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getLineCount(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\n+/).filter(Boolean).length;
}

function getIntensityScore(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return 0;
  }

  const punctuationCount = (trimmed.match(/[!?！？]/g) || []).length;
  const repeatedPunctuationCount = (trimmed.match(/[!?！？]{2,}/g) || []).length;
  const uppercaseChunks = (trimmed.match(/[A-Z]{3,}/g) || []).length;
  const lineCount = getLineCount(trimmed);

  const score =
    12 +
    Math.min(trimmed.length * 0.45, 36) +
    punctuationCount * 7 +
    repeatedPunctuationCount * 12 +
    uppercaseChunks * 10 +
    Math.max(0, lineCount - 1) * 8;

  return clamp(Math.round(score), 0, 100);
}

function getIntensityLabel(score: number) {
  if (score >= 75) {
    return '高压';
  }

  if (score >= 45) {
    return '紧绷';
  }

  if (score > 0) {
    return '平稳';
  }

  return '待分析';
}

function getProjectedMode(charCount: number) {
  if (charCount >= 120) {
    return '长段梳理';
  }

  if (charCount >= 48) {
    return '单段重写';
  }

  if (charCount > 0) {
    return '短句精修';
  }

  return '等待输入';
}

function getToneRecommendation(score: number) {
  if (score >= 75) {
    return '先压强度，再保留观点';
  }

  if (score >= 45) {
    return '适合单段重写';
  }

  if (score > 0) {
    return '轻度润色即可';
  }

  return '输入后生成建议';
}

function getInputSignals(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return ['等待输入', '支持多段文本', '结果会保留原意'];
  }

  const signals: string[] = [];
  const lineCount = getLineCount(trimmed);
  const punctuationCount = (trimmed.match(/[!?！？]/g) || []).length;

  if (trimmed.length >= 120) {
    signals.push('长段内容');
  } else if (trimmed.length >= 48) {
    signals.push('单段展开');
  } else {
    signals.push('短句表达');
  }

  if (lineCount > 1) {
    signals.push('多段输入');
  }

  if (punctuationCount >= 3) {
    signals.push('情绪标点密集');
  }

  if (/[A-Z]{3,}/.test(trimmed)) {
    signals.push('含大写强调');
  }

  if (!signals.includes('多段输入') && lineCount === 1) {
    signals.push('结构集中');
  }

  signals.push('保留批评方向');

  return signals.slice(0, 4);
}

function formatTime(value: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

export default function App() {
  const [input, setInput] = useState('');
  const [submittedInput, setSubmittedInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'failed'>('idle');
  const [modelLabel, setModelLabel] = useState('等待调用');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const trimmedInput = input.trim();
  const charCount = trimmedInput.replace(/\s+/g, '').length;
  const lineCount = getLineCount(input);
  const intensityScore = getIntensityScore(input);
  const intensityLabel = getIntensityLabel(intensityScore);
  const projectedMode = getProjectedMode(charCount);
  const toneRecommendation = getToneRecommendation(intensityScore);
  const signals = getInputSignals(input);

  const handlePurify = async () => {
    const message = input.trim();

    if (!message) {
      return;
    }

    const startedAt = Date.now();

    setLoading(true);
    setError(null);
    setCopyState('idle');
    setSubmittedInput(message);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      const data = (await response.json()) as ApiResponse;

      if (data.model) {
        setModelLabel(data.model);
      }

      if (!response.ok || !data.result) {
        throw new Error(data.error || '改写失败，请稍后重试。');
      }

      await ensureMinimumLoading(startedAt);
      setResult(data.result);
      setLastUpdatedAt(Date.now());
      setHistory((current) => [
        {
          createdAt: Date.now(),
          id: Date.now(),
          input: message,
          output: data.result,
        },
        ...current,
      ].slice(0, 4));
    } catch (caughtError) {
      await ensureMinimumLoading(startedAt);

      if (caughtError instanceof Error) {
        setError(caughtError.message);
      } else {
        setError('请求失败，请稍后重试。');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInput('');
    setSubmittedInput('');
    setResult(null);
    setError(null);
    setCopyState('idle');
  };

  const handleCopy = async () => {
    if (!result) {
      return;
    }

    try {
      await navigator.clipboard.writeText(result);
      setCopyState('done');
    } catch {
      setCopyState('failed');
    }

    window.setTimeout(() => {
      setCopyState('idle');
    }, 1800);
  };

  const handleLoadHistory = (item: HistoryItem) => {
    setInput(item.input);
    setSubmittedInput(item.input);
    setResult(item.output);
    setError(null);
    setCopyState('idle');
    setLastUpdatedAt(item.createdAt);
  };

  const copyLabel =
    copyState === 'done' ? '已复制' : copyState === 'failed' ? '复制失败' : '复制结果';

  return (
    <div className="app-shell">
      <div className="orb orb--one" />
      <div className="orb orb--two" />

      <main className="dashboard">
        <motion.section
          className="panel hero-panel"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <div>
            <span className="eyebrow">Calm Rewrite Console</span>
            <h1 className="hero-title">把情绪收住，把表达抬高。</h1>
            <p className="hero-subtitle">
              输入原句，系统会保留核心立场和批评方向，把它改写成更克制、更清晰、也更适合公开发布的版本。
            </p>

            <div className="hero-badges">
              <span className="badge-pill">
                <Shield size={16} />
                克制但不失锋芒
              </span>
              <span className="badge-pill">
                <Sparkles size={16} />
                多面板工作台
              </span>
              <span className="badge-pill">
                <Gauge size={16} />
                实时输入分析
              </span>
            </div>
          </div>

          <div className="hero-meta">
            <article className="meta-card">
              <span className="meta-label">当前模型</span>
              <div className="meta-value">{modelLabel}</div>
              <div className="meta-copy">接口返回后会自动同步展示本次调用的模型。</div>
            </article>

            <article className="meta-card">
              <span className="meta-label">服务模式</span>
              <div className="meta-value">不限额</div>
              <div className="meta-copy">当前版本已解除每日调用次数限制。</div>
            </article>

            <article className="meta-card">
              <span className="meta-label">当前强度</span>
              <div className="meta-value">{intensityLabel}</div>
              <div className="meta-copy">根据字数、段落和标点密度做即时估算。</div>
            </article>

            <article className="meta-card">
              <span className="meta-label">最近产出</span>
              <div className="meta-value">{lastUpdatedAt ? formatTime(lastUpdatedAt) : '--:--'}</div>
              <div className="meta-copy">
                {history.length > 0
                  ? `本地已缓存 ${history.length} 条最近结果，可在右侧直接回填。`
                  : '成功生成后，这里会显示最近一次完成时间。'}
              </div>
            </article>
          </div>
        </motion.section>

        <div className="workspace-grid">
          <div className="main-column">
            <motion.section
              className="panel editor-panel"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: 'easeOut' }}
            >
              <div className="editor-stack">
                <div className="section-top">
                  <div>
                    <span className="section-kicker">Input Deck</span>
                    <h2>原始表达</h2>
                    <p>这里输入你准备发出的原句。系统会先识别表达强度，再按更稳的方式重写。</p>
                  </div>

                  <div className="mini-stats">
                    <div className="mini-card">
                      <span>字数</span>
                      <strong>{charCount}</strong>
                    </div>
                    <div className="mini-card">
                      <span>段落</span>
                      <strong>{lineCount}</strong>
                    </div>
                    <div className="mini-card">
                      <span>模式</span>
                      <strong>{projectedMode}</strong>
                    </div>
                  </div>
                </div>

                <div className="signal-row">
                  {signals.map((signal) => (
                    <span className="signal-chip" key={signal}>
                      {signal}
                    </span>
                  ))}
                </div>

                <label className="editor-frame">
                  <div className="editor-frame__inner">
                    <textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder="输入原始评论、回复或你准备发出去的那句话……"
                      className="editor-textarea"
                    />
                  </div>
                </label>

                <div className="example-block">
                  <span className="example-label">快速填充</span>
                  <div className="example-row">
                    {QUICK_EXAMPLES.map((example) => (
                      <button
                        type="button"
                        key={example.label}
                        className="example-button"
                        onClick={() => setInput(example.text)}
                      >
                        {example.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="action-row">
                  <div className="action-note">
                    {trimmedInput
                      ? `当前建议：${toneRecommendation}，预计按“${projectedMode}”节奏输出。`
                      : '先输入一句话，右侧会同步生成强度判断和处理建议。'}
                  </div>

                  <div className="button-row">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={handleReset}
                      disabled={loading && !trimmedInput}
                    >
                      <RefreshCcw size={16} />
                      清空
                    </button>

                    <button
                      type="button"
                      className="primary-button"
                      onClick={handlePurify}
                      disabled={loading || !trimmedInput}
                    >
                      {loading ? (
                        <>
                          <Sparkles size={16} className="spin" />
                          正在重写
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          开始改写
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section
              className="panel result-panel"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16, ease: 'easeOut' }}
            >
              <div className="section-top">
                <div>
                  <span className="section-kicker">Output Board</span>
                  <h2>改写结果</h2>
                  <p>结果区会展示原句和改写后的版本，方便你在发出前做最后一轮判断。</p>
                </div>

                <div className="button-row">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleCopy}
                    disabled={!result}
                  >
                    {copyState === 'done' ? <CheckCheck size={16} /> : <Copy size={16} />}
                    {copyLabel}
                  </button>
                </div>
              </div>

              {error ? <div className="message-banner message-banner--error">{error}</div> : null}

              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    className="loading-panel"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.24 }}
                  >
                    <div className="loading-head">
                      <Sparkles size={18} className="spin" />
                      正在整理表达
                    </div>
                    <div className="loading-sub">
                      系统会先抓住核心立场，再把情绪噪音压下去，最后输出更稳的公开表达。
                    </div>

                    <div className="pipeline-grid">
                      {PIPELINE_STEPS.map((step) => (
                        <div className="pipeline-card" key={step.title}>
                          <strong>{step.title}</strong>
                          <span>{step.detail}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : result ? (
                  <motion.div
                    key="result"
                    className="result-grid"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.24 }}
                  >
                    <article className="result-card result-card--source">
                      <div className="result-label">
                        <span>原句</span>
                        <span>{submittedInput.replace(/\s+/g, '').length} 字</span>
                      </div>
                      <p>{submittedInput}</p>
                    </article>

                    <article className="result-card result-card--output">
                      <div className="result-label">
                        <span>改写输出</span>
                        <span>可直接调整后使用</span>
                      </div>

                      <div className="result-meta">
                        <span className="meta-pill">{intensityLabel}</span>
                        <span className="meta-pill">{projectedMode}</span>
                        {modelLabel !== '等待调用' ? (
                          <span className="meta-pill">{modelLabel}</span>
                        ) : null}
                      </div>

                      <p>{result}</p>
                    </article>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    className="empty-state"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.24 }}
                  >
                    <strong>结果区已准备好。</strong>
                    <p>
                      点击“开始改写”之后，这里会切换成双栏对照布局，左边保留原句，右边显示处理后的版本，并支持一键复制。
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="footer-note">结果建议人工再过一遍，确认语气和事实判断都符合你的本意。</div>
            </motion.section>
          </div>

          <aside className="insights-panel">
            <motion.section
              className="panel side-card"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
            >
              <span className="section-kicker">Signal Board</span>
              <h3>输入强度</h3>
              <p>这不是模型输出，而是前端根据文本长度、段落和标点即时做的粗略判断。</p>

              <div className="gauge-row">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div
                    className={`gauge-bar ${intensityScore >= (index + 1) * 20 ? 'is-active' : ''}`}
                    key={index}
                  >
                    <span />
                  </div>
                ))}
              </div>

              <div className="metric-list">
                <div>
                  <span>强度标签</span>
                  <strong>{intensityLabel}</strong>
                </div>
                <div>
                  <span>处理节奏</span>
                  <strong>{projectedMode}</strong>
                </div>
                <div>
                  <span>当前建议</span>
                  <strong>{toneRecommendation}</strong>
                </div>
              </div>
            </motion.section>

            <motion.section
              className="panel side-card"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.14, ease: 'easeOut' }}
            >
              <span className="section-kicker">Rules</span>
              <h3>处理原则</h3>
              <p>界面虽然更复杂了，但底层目标还是明确的：稳住表达，不丢掉态度。</p>

              <ul className="principle-list">
                {PRINCIPLES.map((item) => (
                  <li className="principle-item" key={item.title}>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </li>
                ))}
              </ul>
            </motion.section>

            <motion.section
              className="panel side-card"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18, ease: 'easeOut' }}
            >
              <span className="section-kicker">History</span>
              <h3>最近结果</h3>
              <p>保留最近 4 条成功生成的记录，点一下就能把原句和结果回填到工作区。</p>

              {history.length > 0 ? (
                <ul className="history-list">
                  {history.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="history-item"
                        onClick={() => handleLoadHistory(item)}
                      >
                        <strong>
                          <span>{formatTime(item.createdAt)}</span>
                          <History size={16} />
                        </strong>
                        <p>{item.output}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-inline">这里还没有记录。生成一条结果后，历史区会自动启用。</div>
              )}
            </motion.section>
          </aside>
        </div>
      </main>
    </div>
  );
}
