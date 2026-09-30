'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { ChatMessage, GenerateResponse, NoteItem } from '@/lib/types';
import { type Lang, t } from '@/lib/i18n';
import { boothMaterials } from '@/data/ingredients';

function displayName(name: string, lang: Lang) {
  if (lang !== 'en') return name;
  return boothMaterials.find((item) => item.nameZh === name)?.nameEn || name;
}

export default function HomePage() {
  const [lang, setLang] = useState<Lang>('zh');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<(GenerateResponse & { debug?: string }) | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const [dispatchStatus, setDispatchStatus] = useState<'' | 'sending' | 'sent' | 'error'>('');
  const [dispatchMode, setDispatchMode] = useState<'hardware' | 'simulated'>('simulated');
  const qrCanvas = useRef<HTMLCanvasElement>(null);

  const quickPrompts = t.quickPrompts[lang];
  const scrollingPrompts = [...quickPrompts, ...quickPrompts];

  useEffect(() => {
    if (!qrCanvas.current) return;
    QRCode.toCanvas(qrCanvas.current, window.location.origin, {
      width: 104,
      margin: 1,
      color: { dark: '#3f394b', light: '#fffaf4' }
    });
  }, []);

  function tr(key: Exclude<keyof typeof t, 'quickPrompts'>) {
    return t[key][lang];
  }

  async function handleGenerate(nextInput?: string) {
    const message = (nextInput ?? input).trim();
    if (!message) return;

    const userMessage: ChatMessage = { role: 'user', content: message };
    const nextHistory = [...history, userMessage];

    setLoading(true);
    setError('');
    setFeedbackStatus('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, sessionId, currentFormula: result?.formula, lang })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Generation failed');

      const reply = data.mode === 'fallback' && !data.replyText ? tr('fallbackReply') : (data.replyText || '');
      const assistantMessage: ChatMessage = { role: 'assistant', content: reply };

      setHistory([...nextHistory, assistantMessage]);
      setResult(data);
      setSessionId(data.sessionId || sessionId);
      setInput('');
      setRating(0);
      setComment('');
      setDispatchStatus('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  /** 确定：把当前配方发送给硬件自动调配 */
  async function handleConfirm() {
    if (!result || dispatchStatus === 'sending') return;
    setDispatchStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: result.sessionId, formula: result.formula })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Dispatch failed');
      setDispatchMode(data?.mode === 'hardware' ? 'hardware' : 'simulated');
      setDispatchStatus('sent');
    } catch (e) {
      setDispatchStatus('error');
      setError(e instanceof Error ? e.message : 'Dispatch failed');
    }
  }

  function handleReset() {
    setHistory([]);
    setResult(null);
    setSessionId('');
    setError('');
    setInput('');
    setRating(0);
    setComment('');
    setFeedbackStatus('');
    setDispatchStatus('');
  }

  async function handleFeedback() {
    if (!result || !rating) return;
    setFeedbackStatus('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: result.sessionId,
          rating,
          comment
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Feedback failed');
      setFeedbackStatus(tr('feedbackThanks'));
    } catch (e) {
      setFeedbackStatus(e instanceof Error ? e.message : 'Feedback failed');
    }
  }

  return (
    <main className="booth-page">
      <div className="paper-grain" aria-hidden="true" />
      <div className="doodle doodle-orbit" aria-hidden="true" />
      <div className="doodle doodle-spark" aria-hidden="true">✦</div>

      <div className="booth-shell">
        <header className="site-header">
          <div className="brand-lockup">
            <img src="/brand/team-logo-westlake.png" alt="Westlake iGEM" className="brand-logo" />
            <div>
              <p className="brand-name">{tr('siteTitle')}</p>
              <p className="brand-team">Westlake iGEM · Aromacell</p>
            </div>
          </div>
          <div className="header-actions">
            <span className="mode-pill">
              <span className="mode-dot" />
              {result?.mode === 'enum' ? tr('modeEnum') : result?.mode === 'explain' ? tr('modeExplain') : tr('modeHeuristic')}
            </span>
            <div className="language-switch" aria-label="Language">
              <button onClick={() => setLang('zh')} className={lang === 'zh' ? 'is-active' : ''}>中文</button>
              <button onClick={() => setLang('en')} className={lang === 'en' ? 'is-active' : ''}>EN</button>
            </div>
          </div>
        </header>

        <section className="hero-card">
          <div className="hero-copy">
            <p className="eyebrow">{lang === 'en' ? 'Perfume Agent' : '定制香水 Agent'}</p>
            <h1>{tr('heroTitle')}</h1>
            <p className="hero-description">{tr('heroDesc')}</p>
            <div className="hand-line" aria-hidden="true" />
          </div>
          <div className="qr-card"><canvas ref={qrCanvas} /><p>{tr('qrHint')}</p></div>
        </section>

        <section className="workspace-grid">
          <div className="left-column">
            <Panel>
              <div className="panel-heading-row">
                <div><p className="section-kicker">01 · 灵感</p><h2>{tr('quickTitle')}</h2></div>
                <span className="panel-hint">{tr('quickHint')}</span>
              </div>
              <div className="quick-prompt-rail">
                <div className="quick-prompt-track">
                  {scrollingPrompts.map((prompt, idx) => (
                    <button
                      key={`${prompt}-${idx}`}
                      onClick={() => handleGenerate(prompt)}
                      disabled={loading}
                      className="quick-prompt-chip"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel>
              <p className="section-kicker">02 · 你的需求</p>
              <label className="input-label">{tr('inputLabel')}</label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                className="idea-input"
                placeholder={tr('inputPlaceholder')}
              />
              <div className="form-actions">
                {!result ? (
                  <button
                    onClick={() => handleGenerate()}
                    disabled={loading || !input.trim()}
                    className="primary-button"
                  >
                    {loading ? tr('btnLoading') : tr('btnFirst')}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleConfirm}
                      disabled={loading || dispatchStatus === 'sending'}
                      className="dispatch-button"
                    >
                      {dispatchStatus === 'sending' ? tr('btnDispatchSending') : tr('btnConfirm')}
                    </button>
                    <button
                      onClick={() => handleGenerate()}
                      disabled={loading || !input.trim()}
                      className="primary-button"
                    >
                      {loading ? tr('btnLoading') : tr('btnContinue')}
                    </button>
                    <button
                      onClick={handleReset}
                      className="secondary-button"
                    >
                      {tr('btnRegenerate')}
                    </button>
                  </>
                )}
                {dispatchStatus === 'sent' ? (
                  <span className="status-message success">
                    {tr('btnDispatched')}{dispatchMode === 'simulated' ? `（${tr('dispatchSimulated')}）` : ''}
                  </span>
                ) : dispatchStatus === 'error' ? (
                  <span className="status-message error">{tr('dispatchFailed')}</span>
                ) : result ? (
                  <span className="status-message">{tr('dispatchHint')}</span>
                ) : null}
              </div>
              {result ? <p className="follow-up-hint">{tr('hintFollowUp')}</p> : null}
              {error ? <p className="error-message">{error}</p> : null}
              {result?.debug ? (
                <div className="debug-card"><strong>{tr('debugTitle')}</strong><span>{result.debug}</span></div>
              ) : null}
            </Panel>

            <Panel>
              <p className="section-kicker">03 · 调整记录</p>
              <h2>{tr('historyTitle')}</h2>
              <div className="history-list">
                {history.length === 0 ? (
                  <p className="empty-copy">{tr('historyEmpty')}</p>
                ) : (
                  history.map((msg, idx) => (
                    <div key={idx} className={`message-card ${msg.role === 'user' ? 'message-user' : 'message-agent'}`}>
                      <p className="message-role">{msg.role === 'user' ? tr('roleYou') : tr('roleAgent')}</p>
                      <p>{msg.content}</p>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </div>

          <section className="right-column">
            <Panel className="result-panel">
              <div className="result-heading">
                <div><p className="section-kicker">{tr('resultTitle')}</p><h2>{tr('resultTitle')}</h2></div>
                <span className="bottle-doodle" aria-hidden="true">♧</span>
              </div>
              <p className="result-hint">{tr('resultHint')}</p>
              {loading ? (
                <div className="loading-stack">{[0, 1, 2, 3].map((item) => <div key={item} />)}</div>
              ) : !result ? (
                <div className="result-empty"><img src="/brand/floral-mascot.gif" alt="" aria-hidden="true" /><p>{tr('resultEmpty')}</p></div>
              ) : (
                <div className="result-content">
                  <Block title={tr('blockAIReply')}>
                    <p>{result.replyText}</p>
                  </Block>

                  <Block title={tr('blockBlending')}>
                    <div className="step-list">
                      <FormulaRatioBar
                        topNotes={result.formula.formula.topNotes}
                        heartNotes={result.formula.formula.heartNotes}
                        baseNotes={result.formula.formula.baseNotes}
                        labels={{ top: tr('topNotes'), heart: tr('heartNotes'), base: tr('baseNotes') }}
                        lang={lang}
                      />
                    </div>
                    <p className="safety-note">{result.formula.safetyNote}</p>
                  </Block>

                  <div className="two-up">
                    <Block title={tr('blockPositioning')}>
                      <Line label={tr('labelStyle')} value={result.formula.fragrancePositioning.style} />
                      <Line label={tr('labelKeywords')} value={result.formula.fragrancePositioning.keywords.join('、')} />
                      <Line label={tr('labelScenarios')} value={result.formula.fragrancePositioning.suitableScenarios.join('、')} />
                    </Block>

                    <Block title={tr('blockEffect')}>
                      <Line label={tr('labelOpening')} value={result.formula.finalEffect.opening} />
                      <Line label={tr('labelHeart')} value={result.formula.finalEffect.heart} />
                      <Line label={tr('labelDrydown')} value={result.formula.finalEffect.drydown} />
                      <Line label={tr('labelSillage')} value={result.formula.finalEffect.sillage} />
                      <Line label={tr('labelLongevity')} value={result.formula.finalEffect.longevity} />
                    </Block>
                  </div>

                  <Block title={tr('blockFormula')}>
                    <div className="notes-grid">
                      <NotesSection title={tr('topNotes')} items={result.formula.formula.topNotes} lang={lang} />
                      <NotesSection title={tr('heartNotes')} items={result.formula.formula.heartNotes} lang={lang} />
                      <NotesSection title={tr('baseNotes')} items={result.formula.formula.baseNotes} lang={lang} />
                    </div>
                  </Block>

                  {result.formula.error ? (
                    <Block title={tr('errorTitle')}>
                      <p className="panel-hint">{tr('errorHint')}</p>
                      <div className="error-dimensions">
                        {result.formula.error.perDimension.map((item) => (
                          <div key={item.dim} className="error-dimension">
                            <div><span>{item.label}</span><span>{item.target} → {item.actual}（差 {item.diff}）</span></div>
                            <div className="comparison-bars">
                              <i style={{ width: `${Math.min(100, (item.target / 5) * 100)}%` }} />
                              <b style={{ width: `${Math.min(100, (item.actual / 5) * 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="error-total">{tr('labelTotalError')} = {result.formula.error.total} · {tr('labelL1Error')} = {result.formula.error.l1}</p>
                    </Block>
                  ) : null}
                </div>
              )}
            </Panel>

            {result ? (
              <Panel>
                <p className="section-kicker">04 · 反馈</p>
                <h2>{tr('feedbackTitle')}</h2>
                <p className="panel-hint feedback-hint">{tr('feedbackHint')}</p>
                <div className="rating-row">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      onClick={() => setRating(score)}
                      className={score <= rating ? 'is-selected' : ''}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="feedback-input"
                  placeholder={tr('feedbackPlaceholder')}
                />
                <div className="feedback-actions">
                  <button
                    onClick={handleFeedback}
                    disabled={!rating}
                    className="primary-button small"
                  >
                    {tr('feedbackSubmit')}
                  </button>
                  {feedbackStatus ? <span>{feedbackStatus}</span> : null}
                </div>
              </Panel>
            ) : null}
          </section>
        </section>
      </div>
    </main>
  );
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`paper-panel ${className}`}>{children}</div>;
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="result-block"><h3>{title}</h3>{children}</section>;
}

/** 香水比例展示：一条 100% 堆叠比例条 + 逐原料图例（前/中/后调用不同色） */
function FormulaRatioBar({ topNotes, heartNotes, baseNotes, labels, lang }: {
  topNotes: NoteItem[];
  heartNotes: NoteItem[];
  baseNotes: NoteItem[];
  labels: { top: string; heart: string; base: string };
  lang: Lang;
}) {
  const segments = [
    ...topNotes.map((note) => ({ ...note, role: labels.top, color: '#F472B6' })),
    ...heartNotes.map((note) => ({ ...note, role: labels.heart, color: '#A78BFA' })),
    ...baseNotes.map((note) => ({ ...note, role: labels.base, color: '#38BDF8' }))
  ];
  if (segments.length === 0) return null;

  return (
    <div>
      <div className="ratio-track">
        {segments.map((seg) => (
          <div key={seg.name} style={{ width: `${seg.percentage}%`, background: seg.color }}>
            <span>{seg.percentage}%</span>
          </div>
        ))}
      </div>
      <div className="ratio-legend">
        {segments.map((seg) => (
          <div key={seg.name}>
            <span className="legend-dot" style={{ background: seg.color }} />
            <strong>{displayName(seg.name, lang)}</strong>
            <small>{seg.role}</small>
            <span>{seg.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <p className="detail-line">
      <span>{label}</span>
      <span>{value || '-'}</span>
    </p>
  );
}

function NotesSection({ title, items, lang }: { title: string; items: NoteItem[]; lang: Lang }) {
  return (
    <div className="notes-section">
      <p className="notes-title">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={`${title}-${item.name}`} className="note-card">
            <strong>{displayName(item.name, lang)}</strong>
            <span>{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
