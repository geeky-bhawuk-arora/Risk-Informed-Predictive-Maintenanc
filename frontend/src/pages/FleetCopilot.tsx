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
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.85fr] pb-12">
      <section className="surface-card overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 p-6 md:p-8">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                <Sparkles className="h-3.5 w-3.5" />
                Fleet Copilot
              </div>
              <h1 className="page-title">Ask your maintenance data in plain language.</h1>
              <p className="page-subtitle max-w-2xl">
                Use Copilot to summarize fleet conditions, identify top-risk items, compare aircraft types, or explain a specific component.
              </p>
            </div>
            <div className="hidden md:flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-600 text-white">
              <Bot className="h-7 w-7" />
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-5">
          <div className="max-h-[28rem] space-y-4 overflow-y-auto pr-2">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.role === 'user'
                    ? 'ml-auto bg-sky-600 text-white'
                    : 'border border-slate-200 bg-slate-50 text-slate-800'
                }`}
              >
                {message.text}
              </div>
            ))}
            {loading && (
              <div className="max-w-[90%] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Analyzing the current fleet state...
              </div>
            )}
          </div>

          <div className="surface-muted p-3">
            <div className="flex flex-col gap-3 md:flex-row">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about fleet risk, top components, aircraft types, tier changes, or a component ID..."
                className="input-clean min-h-[96px] resize-none"
              />
              <button onClick={() => submitQuestion()} disabled={loading} className="button-primary md:self-stretch">
                <Send className="h-4 w-4" />
                Ask
              </button>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-6">
        <div className="surface-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <Radar className="h-5 w-5 text-sky-600" />
            <h2 className="text-lg font-semibold text-slate-900">Suggested Questions</h2>
          </div>
          <div className="space-y-3">
            {starterQuestions.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setQuestion(item);
                  submitQuestion(item);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-slate-900">Latest Structured Output</h2>
          </div>
          {!responseData ? (
            <p className="text-sm text-slate-600">The latest answer will also appear here in structured form for quick review.</p>
          ) : (
            <div className="space-y-3">
              <div className="surface-muted px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Intent</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{responseData.intent}</div>
              </div>
              {responseData.data?.components && (
                <div className="surface-muted p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Top Components</div>
                  <div className="space-y-2">
                    {responseData.data.components.map((item: any) => (
                      <div key={item.component_id} className="flex items-center justify-between gap-4 text-sm">
                        <div>
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          <div className="text-slate-500">{item.system_category}</div>
                        </div>
                        <div className="font-mono text-sky-700">{item.risk_score.toFixed(3)}</div>
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
    <div className="surface-muted px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}
