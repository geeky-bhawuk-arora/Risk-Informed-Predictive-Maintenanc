import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Radar, AlertTriangle, User, MessageSquare, ArrowRight, Zap, Target } from 'lucide-react';
import { assistantApi } from '../api';

const starterQuestions = [
  { text: 'Give me a fleet summary.', icon: Target },
  { text: 'What are the top 5 highest-risk components right now?', icon: AlertTriangle },
  { text: 'Which aircraft type has the highest average risk?', icon: Radar },
  { text: 'Show system exposure by category.', icon: Zap },
];

export default function FleetCopilot() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: "Hello! I'm your Fleet Copilot. I have real-time access to all maintenance telemetry and risk projections. How can I help you optimize your fleet today?",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const submitQuestion = async (nextQuestion?: string) => {
    const prompt = (nextQuestion ?? question).trim();
    if (!prompt) return;

    setMessages((current) => [...current, { role: 'user', text: prompt }]);
    setLoading(true);
    setQuestion('');
    
    try {
      const response = await assistantApi.ask(prompt);
      setMessages((current) => [...current, { role: 'assistant', text: response.answer }]);
      setResponseData(response);
    } catch (error) {
      console.error(error);
      setMessages((current) => [...current, { role: 'assistant', text: "I'm sorry, I encountered an error while analyzing the fleet data. Please try again or rephrase your request." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_400px]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-200">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 leading-none">Fleet Copilot</h1>
              <p className="mt-2 text-slate-500 font-medium">Interactive intelligence for predictive maintenance.</p>
            </div>
          </div>
        </div>

        <section className="flex flex-col rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden h-[700px]">
          {/* Chat Area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth"
          >
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                  message.role === 'user' ? 'bg-slate-900 text-white' : 'bg-sky-100 text-sky-600'
                }`}>
                  {message.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-6 py-4 text-sm font-medium leading-relaxed shadow-sm ${
                  message.role === 'user'
                    ? 'bg-sky-600 text-white rounded-tr-none'
                    : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none'
                }`}>
                  {message.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 animate-pulse">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none px-6 py-4 text-sm font-bold text-slate-400 animate-pulse">
                  Analyzing real-time fleet telemetry...
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-100 p-6 bg-slate-50/50">
            <div className="relative flex items-center">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitQuestion();
                  }
                }}
                placeholder="Ask about aircraft health, risk trends, or specific components..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-6 py-4 pr-16 text-sm font-medium outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 shadow-sm resize-none h-16"
              />
              <button 
                onClick={() => submitQuestion()} 
                disabled={loading || !question.trim()} 
                className="absolute right-3 h-10 w-10 flex items-center justify-center rounded-xl bg-sky-600 text-white shadow-lg shadow-sky-200 transition-all hover:bg-sky-700 disabled:opacity-50 disabled:shadow-none"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest">
              Copilot 2.4 • Powered by Predictive Risk Engine
            </p>
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Suggested</h2>
          </div>
          <div className="space-y-3">
            {starterQuestions.map((item) => (
              <button
                key={item.text}
                onClick={() => submitQuestion(item.text)}
                className="group flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-4 text-left transition hover:bg-white hover:border-sky-200 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-400 group-hover:bg-sky-50 group-hover:text-sky-600 shadow-sm transition-colors">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900">{item.text}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-sky-600 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <Target className="h-5 w-5 text-sky-600" />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">System Context</h2>
          </div>
          {!responseData ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
              <MessageSquare className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest">No active session</p>
              <p className="mt-2 text-xs font-medium">Ask a question to see structured data analysis here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Determined Intent</div>
                <div className="mt-2 text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  {responseData.intent}
                </div>
              </div>
              
              {responseData.data?.components && (
                <div className="rounded-2xl border border-slate-100 p-4">
                  <div className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Identified Components</div>
                  <div className="space-y-4">
                    {responseData.data.components.map((item: any) => (
                      <div key={item.component_id} className="group flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors uppercase tracking-tight">{item.name}</div>
                          <div className="text-[10px] font-bold text-slate-400 capitalize">{item.system_category}</div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="text-xs font-black text-sky-700">{item.risk_score.toFixed(3)}</div>
                          <div className="text-[8px] font-black text-slate-300 uppercase">Score</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {responseData.data?.overview && (
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Health" value={`${responseData.data.overview.fleet_health_score}%`} />
                  <MiniStat label="High Risk" value={`${responseData.data.overview.high_risk_components}`} />
                </div>
              )}
              
              <button className="w-full rounded-2xl bg-slate-900 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-slate-800">
                Export Analysis
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50/50 p-4 ring-1 ring-slate-100">
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-2 text-lg font-black text-slate-900">{value}</div>
    </div>
  );
}
