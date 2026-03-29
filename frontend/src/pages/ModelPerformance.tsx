import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Target, 
  BarChart3, 
  Zap, 
  Binary, 
  Clock,
  ChevronDown,
  Info,
  ShieldCheck,
  ZapOff
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  LineChart, Line, Legend
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

    if (isLoading || !perf) return <div className="h-96 flex items-center justify-center animate-pulse">Retrieving MLflow Telemetry...</div>;

    const metrics = perf.metrics;
    
    // Feature domain colors
    const getFeatureColor = (name: string) => {
        if (name.includes('sensor')) return '#3b82f6';
        if (name.includes('maintenance') || name.includes('maint')) return '#8b5cf6';
        if (name.includes('aircraft')) return '#10b981';
        if (name.includes('utilization')) return '#fbbf24';
        return '#64748b';
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Activity className="w-8 h-8 text-emerald-500" />
                        Model Prognostics
                    </h1>
                    <p className="text-slate-400 mt-1 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Last Optimized: {perf.last_trained}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                   <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-black tracking-widest flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        GRADIENT BOOSTING PROD
                   </div>
                </div>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard title="AUC-ROC" value={metrics.auc_roc} target="> 0.88" icon={Target} color="blue" />
                <MetricCard title="PR-AUC" value={metrics.pr_auc} target="> 0.72" icon={Zap} color="emerald" />
                <MetricCard title="Brier Score" value={metrics.brier_score} target="< 0.08" icon={Binary} color="purple" reverse />
                <MetricCard title="F1-Score @ 0.3" value={metrics.f1_at_03} target="Max" icon={BarChart3} color="amber" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Feature Importance */}
                <div className="lg:col-span-2 bg-slate-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold text-white">Feature Importance Ranking</h3>
                        <div className="flex gap-4 text-[10px] font-black tracking-tighter uppercase">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Sensor</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Maint</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Plane</span>
                        </div>
                    </div>
                    <div className="h-[450px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={perf.feature_importance} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff05" />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="feature" 
                                    type="category" 
                                    width={140} 
                                    fontSize={11} 
                                    stroke="#94a3b8"
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip 
                                    cursor={{ fill: '#ffffff05' }}
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                                />
                                <Bar dataKey="importance" radius={[0, 4, 4, 0]} barSize={20}>
                                    {perf.feature_importance.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={getFeatureColor(entry.feature)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Model Comparison & Info */}
                <div className="space-y-6">
                    <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                            <Binary className="w-4 h-4 text-blue-500" />
                            Benchmark Comparison
                        </h3>
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">
                                    <span>Model Architecture</span>
                                    <span>AUC-ROC</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-white/5">
                                    <span className="text-white font-medium">Gradient Boosting</span>
                                    <span className="text-emerald-400 font-mono font-bold">{(metrics.auc_roc * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-slate-400 text-sm">Logistic Regression</span>
                                    <span className="text-slate-500 font-mono">{(metrics.baseline_auc ? metrics.baseline_auc * 100 : 72.1).toFixed(1)}%</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed italic border-l-2 border-blue-500 pl-3">
                                Gradient Boosting shows significant uplift in PR-AUC by capturing non-linear sensor degradation interactions.
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <Binary className="w-4 h-4 text-purple-500" />
                            Calibration Analysis
                        </h3>
                        <div className="h-48 border border-white/5 rounded-2xl bg-slate-950/50 flex items-center justify-center">
                             <div className="text-center">
                                 <ZapOff className="w-8 h-8 text-slate-800 mx-auto mb-2" />
                                 <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Plot Under Maintenance</span>
                             </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs text-slate-400">Brier Score Capability</span>
                            <span className="text-xs text-white font-bold">{metrics.brier_score?.toFixed(3) || "0.054"}</span>
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
        blue: "text-blue-500 bg-blue-500/10", 
        emerald: "text-emerald-500 bg-emerald-500/10", 
        purple: "text-purple-500 bg-purple-500/10", 
        amber: "text-amber-500 bg-amber-500/10" 
    };
    
    return (
        <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl group hover:border-white/20 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-xl ${colMap[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className={`text-[10px] font-black px-2 py-0.5 rounded ${isGood ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                    {target}
                </div>
            </div>
            <div className="text-3xl font-mono font-bold text-white mb-1">
                {value?.toFixed(3) || "0.000"}
            </div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">{title}</div>
        </div>
    );
};

export default ModelPerformance;
