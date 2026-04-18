/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Send, Sparkles } from 'lucide-react';

const MIN_LOADING_MS = 1200;

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

export default function App() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePurify = async () => {
    const message = input.trim();

    if (!message) {
      return;
    }

    const startedAt = Date.now();

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      const data = (await response.json()) as { error?: string; result?: string };

      if (!response.ok || !data.result) {
        throw new Error(data.error || 'AI 回复失败，请稍后重试。');
      }

      await ensureMinimumLoading(startedAt);
      setResult(data.result);
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

  const feedback = error || result;

  return (
    <div
      className="min-h-screen bg-black text-white flex items-center justify-center p-4 font-sans"
      style={{ backgroundImage: 'radial-gradient(circle at 50% -20%, #1a1a1a 0%, #000 70%)' }}
    >
      <main className="w-full max-w-[600px] bg-[rgba(255,255,255,0.05)] backdrop-blur-[24px] border border-[rgba(255,255,255,0.1)] p-12 rounded-[24px] shadow-2xl flex flex-col gap-6 text-center">
        <header className="flex flex-col items-center">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-black">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
            </svg>
          </div>
          <h1 className="text-[32px] font-bold tracking-[-0.02em] bg-clip-text text-transparent bg-linear-to-b from-white to-[#aaa] mb-2">
            情绪净化盾
          </h1>
          <p className="text-[#888888] text-[14px] leading-6">
            把刺耳攻击重构成优雅、礼貌、但足够扎心的高情商回击。
          </p>
        </header>

        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="输入那些让你不舒服的话..."
          className="w-full h-[120px] bg-[rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.1)] rounded-[12px] p-4 text-[14px] text-white resize-none outline-none focus:border-[rgba(255,255,255,0.3)] transition-colors"
        />

        <button
          onClick={handlePurify}
          disabled={loading || !input.trim()}
          className="bg-white text-black font-semibold rounded-[12px] px-6 py-3.5 cursor-pointer transition-all flex items-center justify-center gap-2 hover:bg-[#e0e0e0] disabled:bg-[#333] disabled:text-[#777] disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              AI 正在重构情绪...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              执行净化
            </>
          )}
        </button>

        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="border-t border-[rgba(255,255,255,0.1)] pt-6 flex flex-col items-center justify-center"
            >
              <div className="text-[11px] uppercase tracking-[0.1em] text-[#888888] mb-3">
                {error ? '请求状态' : '净化结果'}
              </div>
              <p className={`text-[16px] leading-7 ${error ? 'text-[#ffb4b4]' : 'text-white'}`}>
                {feedback}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
