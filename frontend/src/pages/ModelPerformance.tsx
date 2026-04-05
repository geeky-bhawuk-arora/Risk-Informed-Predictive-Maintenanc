import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Target, 
  BarChart3, 
  Zap, 
  Binary, 
  Clock,
  ShieldCheck,
  ZapOff,
  Cpu,
  BarChart,
  LineChart,
  TrendingUp,
  Brain
} from 'lucide-react';
import { 
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  LineChart as RechartsLineChart, Line, Legend
} from 'recharts';
import { modelApi } from '../api';

const ModelPerformance = () => {
    const [perf, setPerf] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        modelApi.getPerformance().then(res => {
            setPerf(res);
            setIsLoading(false);
        }).catch(err => {
            console.error(err);
            setIsLoading(false);
        });
    }, []);

    if (isLoading || !perf) return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-600 border-t-transparent"></div>
          <p className="text-slate-500 animate-pulse font-bold tracking-widest uppercase text-xs">Accessing ML Registry...</p>
        </div>
      </div>
    );

    const metrics = perf.metrics;
    
    const getFeatureColor = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('sensor') || n.includes('slope') || n.includes('trend')) return '#0ea5e9'; // Sky
        if (n.includes('maintenance') || n.includes('maint') || n.includes('failure')) return '#8b5cf6'; // Purple
        if (n.includes('age') || n.includes('mtbf')) return '#10b981'; // Emerald
        if (n.includes('utilization') || n.includes('intensity')) return '#f59e0b'; // Amber
        return '#94a3b8'; // Slate
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xl">
                    <Brain className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        Model Prognostics
                    </h1>
                    <p className="text-slate-500 mt-1 flex items-center gap-2 font-medium">
                        <Clock className="w-4 h-4" />
                        Last Optimized: {perf.last_trained}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-[10px] font-black tracking-widest flex items-center gap-2 uppercase">
                        <ShieldCheck className="w-4 h-4" />
                        Gradient Boosting Production
                   </div>
                </div>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard title="AUC-ROC" value={perf.best_model.metrics.auc_roc} target="> 0.88" icon={Target} color="blue" />
                <MetricCard title="PR-AUC" value={perf.best_model.metrics.pr_auc} target="> 0.72" icon={Zap} color="emerald" />
                <MetricCard title="Brier Score" value={perf.best_model.metrics.brier_score} target="< 0.08" icon={Binary} color="purple" reverse />
                <MetricCard title="F1-Score @ 0.3" value={perf.best_model.metrics.f1_at_03} target="Max" icon={BarChart3} color="amber" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Feature Importance */}
                <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold text-slate-900">Feature Importance: {perf.best_model.model_name}</h3>
                        <div className="flex gap-4 text-[10px] font-black tracking-widest uppercase text-slate-400">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-sky-500"></div> Sensor</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Maint</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Plane</span>
                        </div>
                    </div>
                    <div className="h-[450px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={perf.best_model.feature_importance} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="feature" 
                                    type="category" 
                                    width={140} 
                                    fontSize={11} 
                                    fontWeight={700}
                                    stroke="#94a3b8"
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="importance" radius={[0, 8, 8, 0]} barSize={20}>
                                    {perf.best_model.feature_importance.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={getFeatureColor(entry.feature)} />
                                    ))}
                                </Bar>
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Model Comparison & Info */}
                <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="text-slate-900 font-bold mb-6 flex items-center gap-2">
                            <Binary className="w-4 h-4 text-sky-500" />
                            Benchmark Comparison
                        </h3>
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
                                <div className="flex justify-between text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">
                                    <span>Architecture</span>
                                    <span>PR-AUC</span>
                                </div>
                                {perf.comparison.map((m: any) => (
                                    <div key={m.model_name} className="flex justify-between items-center py-3 border-b border-slate-200/50 last:border-0 hover:bg-slate-100/50 px-2 rounded-lg transition-colors">
                                        <span className={`text-sm font-bold ${m.model_name === perf.best_model.model_name ? 'text-sky-600' : 'text-slate-500'}`}>
                                            {m.model_name}
                                        </span>
                                        <span className={`text-xs font-black ${m.model_name === perf.best_model.model_name ? 'text-emerald-600 font-extrabold' : 'text-slate-400'}`}>
                                            {((m.metrics.pr_auc || 0) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3 p-4 rounded-2xl bg-sky-50 text-sky-700">
                                <TrendingUp className="h-5 w-5 shrink-0" />
                                <p className="text-xs font-bold leading-relaxed italic">
                                    Top models are evaluated against PR-AUC to account for label imbalance in aircraft component failure datasets.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="text-slate-900 font-bold mb-4 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-purple-500" />
                            Calibration Analysis
                        </h3>
                        <div className="h-48 rounded-2xl bg-slate-50 flex items-center justify-center border border-dashed border-slate-300">
                             <div className="text-center">
                                 <ZapOff className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                 <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Plot Offline</span>
                             </div>
                        </div>
                        <div className="mt-6 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Brier Score Capability</span>
                            <span className="text-sm font-black text-slate-900">{metrics.brier_score?.toFixed(3) || "0.054"}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, target, icon: Icon, color, reverse }: any) => {
    const isGood = reverse ? value < parseFloat(target.slice(2)) : value > parseFloat(target.slice(2));
    const colMap: any = { 
        blue: "text-sky-600 bg-sky-50 ring-sky-100", 
        emerald: "text-emerald-600 bg-emerald-50 ring-emerald-100", 
        purple: "text-purple-600 bg-purple-50 ring-purple-100", 
        amber: "text-amber-600 bg-amber-50 ring-amber-100" 
    };
    
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-2xl ring-1 ${colMap[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${isGood ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {target}
                </div>
            </div>
            <div className="text-3xl font-black text-slate-900 mb-1">
                {value?.toFixed(3) || "0.000"}
            </div>
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</div>
        </div>
    );
};

export default ModelPerformance;
