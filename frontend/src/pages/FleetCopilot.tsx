import { useState } from 'react';
import { Bot, Send, Sparkles, Radar, AlertTriangle } from 'lucide-react';
import { assistantApi } from '../api';

const starterQuestions = [
  'Give me a fleet summary.',
  'What are the top 5 highest-risk components right now?',
  'Which aircraft type has the highest average risk?',
  'Show system exposure by category.',
  'Explain component 42.',
];

export default function FleetCopilot() {
  const [question, setQuestion] = useState(starterQuestions[0]);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Ask me about fleet health, top-risk components, aircraft model exposure, tier changes, or a component by ID.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState<any>(null);

  const submitQuestion = async (nextQuestion?: string) => {
    const prompt = (nextQuestion ?? question).trim();
    if (!prompt) return;

    setMessages((current) => [...current, { role: 'user', text: prompt }]);
    setLoading(true);
    try {
      const response = await assistantApi.ask(prompt);
      setMessages((current) => [...current, { role: 'assistant', text: response.answer }]);
      setResponseData(response);
      setQuestion('');
    } catch (error) {
      console.error(error);
      setMessages((current) => [...current, { role: 'assistant', text: 'I could not answer that question right now.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.8fr] gap-8 pb-16">
      <section className="rounded-[2rem] border border-white/10 bg-slate-950/80 backdrop-blur-2xl overflow-hidden shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.92))] p-8">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1 text-xs font-black uppercase tracking-[0.28em] text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" />
                Fleet Copilot
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white">Ask your maintenance data like an analyst.</h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300">
                This copilot reads the live RBAMPS fleet, risk, and component data and answers operational questions in plain language.
              </p>
            </div>
            <div className="hidden md:flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-cyan-300">
              <Bot className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6 md:p-8">
          <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-2">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[90%] rounded-3xl px-5 py-4 text-sm leading-6 ${
                  message.role === 'user'
                    ? 'ml-auto bg-cyan-500 text-slate-950'
                    : 'bg-slate-900/80 text-slate-100 border border-white/10'
                }`}
              >
                {message.text}
              </div>
            ))}
            {loading && (
              <div className="max-w-[90%] rounded-3xl border border-white/10 bg-slate-900/80 px-5 py-4 text-sm text-slate-300">
                Analyzing the current fleet state...
              </div>
            )}
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-3">
            <div className="flex flex-col gap-3 md:flex-row">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about fleet risk, top components, aircraft types, tier changes, or a component ID..."
                className="min-h-[88px] flex-1 resize-none rounded-[1.25rem] border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
              />
              <button
                onClick={() => submitQuestion()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-cyan-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60 md:self-stretch"
              >
                <Send className="h-4 w-4" />
                Ask
              </button>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 backdrop-blur-2xl">
          <div className="mb-4 flex items-center gap-3 text-white">
            <Radar className="h-5 w-5 text-cyan-300" />
            <h2 className="text-lg font-bold">Suggested Questions</h2>
          </div>
          <div className="space-y-3">
            {starterQuestions.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setQuestion(item);
                  submitQuestion(item);
                }}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 backdrop-blur-2xl">
          <div className="mb-4 flex items-center gap-3 text-white">
            <AlertTriangle className="h-5 w-5 text-amber-300" />
            <h2 className="text-lg font-bold">Latest Structured Output</h2>
          </div>
          {!responseData ? (
            <p className="text-sm leading-6 text-slate-400">Your latest answer will also appear here in structured form for quick review.</p>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Intent</div>
                <div className="mt-2 text-sm font-semibold text-white">{responseData.intent}</div>
              </div>
              {responseData.data?.components && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Top Components</div>
                  <div className="space-y-2">
                    {responseData.data.components.map((item: any) => (
                      <div key={item.component_id} className="flex items-center justify-between gap-4 text-sm">
                        <div>
                          <div className="font-semibold text-white">{item.name}</div>
                          <div className="text-slate-400">{item.system_category}</div>
                        </div>
                        <div className="font-mono text-cyan-300">{item.risk_score.toFixed(3)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {responseData.data?.overview && (
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Fleet Health" value={`${responseData.data.overview.fleet_health_score}%`} />
                  <MiniStat label="High Risk" value={`${responseData.data.overview.high_risk_components}`} />
                  <MiniStat label="Medium Risk" value={`${responseData.data.overview.medium_risk_components}`} />
                  <MiniStat label="Low Risk" value={`${responseData.data.overview.low_risk_components}`} />
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-bold text-white">{value}</div>
    </div>
  );
}
