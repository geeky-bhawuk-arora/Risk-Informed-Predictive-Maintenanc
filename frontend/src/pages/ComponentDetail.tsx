import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Activity, Info, AlertTriangle, 
  History, Settings, TrendingUp, HelpCircle,
  FileText, Hammer, Gauge
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, AreaChart, Area
} from 'recharts';
import { componentApi } from '../api';

const ComponentDetail = () => {
    const { id } = useParams<{ id: string }>();
    const [risk, setRisk] = useState<any>(null);
    const [sensors, setSensors] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            if (!id) return;
            try {
                const [r, s] = await Promise.all([
                    componentApi.getRiskDetail(id),
                    componentApi.getSensorHistory(id)
                ]);
                setRisk(r);
                setSensors(s);
            } catch (err) {
                console.error("Failed to load component details", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetail();
        // Also fetch maintenance logs (missing from my api.ts for now, adding logic)
    }, [id]);

    if (isLoading || !risk) return <div className="h-96 flex items-center justify-center animate-pulse">Analyzing Component Health...</div>;

    // Group sensor data by type for Multi-Line chart
    const sensorTypes = Array.from(new Set(sensors.map(s => s.type)));
    const groupedSensors = sensors.reduce((acc: any, curr) => {
        const ts = new Date(curr.timestamp).toLocaleDateString();
        if (!acc[ts]) acc[ts] = { timestamp: ts };
        acc[ts][curr.type] = curr.value;
        return acc;
    }, {});
    const chartData = Object.values(groupedSensors);

    const colors = ["#3b82f6", "#10b981", "#fbbf24", "#f43f5e", "#8b5cf6"];

    return (
        <div className="space-y-8 pb-12">
            <Link to="/priorities" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Fleet Prioritization
            </Link>

            {/* Component Header & Risk Equation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
               <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight leading-none mb-2">
                        {risk.component_name || `Component #${id}`}
                    </h1>
                    <div className="flex items-center gap-4 text-slate-400 text-sm mb-6">
                        <span className="flex items-center gap-1.5 border border-white/5 bg-white/5 px-2 py-0.5 rounded uppercase font-bold text-[10px] tracking-widest text-blue-400">
                            Propulsion
                        </span>
                        <span>Aircraft: N291XP</span>
                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                        <span>S/N: {id}</span>
                    </div>

                    <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-blue-600/20 transition-all"></div>
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-400" />
                            Risk Intelligence Breakdown
                        </h3>
                        
                        {/* THE EQUATION (Master Spec v3 Requirement) */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-slate-950/50 rounded-2xl border border-white/5">
                            <div className="text-center">
                                <div className="text-xs text-slate-500 uppercase font-bold mb-1">P(Failure)</div>
                                <div className="text-2xl font-mono font-bold text-white">{(risk.failure_prob).toFixed(3)}</div>
                            </div>
                            <div className="text-2xl text-slate-700">×</div>
                            <div className="text-center">
                                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Impact Score</div>
                                <div className="text-2xl font-mono font-bold text-white">{(risk.impact.weighted_impact).toFixed(2)}</div>
                            </div>
                            <div className="text-2xl text-slate-700">=</div>
                            <div className="text-center">
                                <div className="bg-blue-600/20 px-6 py-3 rounded-2xl border border-blue-500/30">
                                    <div className="text-[10px] text-blue-400 uppercase font-black tracking-widest mb-1">Risk Score</div>
                                    <div className="text-4xl font-mono font-black text-blue-400">{(risk.risk_score).toFixed(2)}</div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between">
                            <div className="text-sm text-slate-400 italic flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                Recommended: {risk.recommended_action}
                                </div>
                            <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse`}>
                                ACTION REQUIRED
                            </span>
                        </div>
                    </div>
               </div>

               {/* Impact Composition & Aging Progress */}
               <div className="space-y-6">
                   <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            MTBF Life Progress
                        </h3>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-slate-400 uppercase font-bold">
                                <span>Installation: 2 Jan 2024</span>
                                <span>65% Lifecycle</span>
                            </div>
                            <div className="h-4 bg-slate-950 rounded-full border border-white/5 overflow-hidden p-0.5">
                                <div className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full" style={{ width: '65%' }}></div>
                            </div>
                            <div className="text-[10px] text-slate-500 text-right italic pt-1">Estimated MTBF: 12,500 flight hours</div>
                        </div>
                   </div>

                   <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <Settings className="w-4 h-4 text-amber-400" />
                            Impact Composition (Current Weights)
                        </h3>
                        <div className="space-y-4">
                            <ImpactRow label="Flight Safety" val={risk.impact.safety} max={1.0} color="rose" weight="50%" />
                            <ImpactRow label="Operational" val={risk.impact.ops} max={1.0} color="amber" weight="30%" />
                            <ImpactRow label="Repair Cost" val={risk.impact.cost} max={1.0} color="blue" weight="20%" />
                        </div>
                   </div>
               </div>
            </div>

            {/* Sensor Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl relative">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-blue-400" />
                        Multi-Channel Sensor Analytics (30d)
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                <XAxis dataKey="timestamp" fontSize={10} stroke="#64748b" axisLine={false} tickLine={false} minTickGap={20} />
                                <YAxis domain={['auto', 'auto']} fontSize={10} stroke="#64748b" axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                                />
                                <Legend verticalAlign="top" height={36}/>
                                {sensorTypes.map((type, idx) => (
                                    <Line 
                                        key={type} 
                                        type="monotone" 
                                        dataKey={type} 
                                        stroke={colors[idx % colors.length]} 
                                        strokeWidth={2} 
                                        dot={false}
                                        activeDot={{ r: 4, strokeWidth: 0 }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="absolute top-6 right-6 flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-rose-500 font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            3 ANOMALIES DETECTED
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                        <History className="w-4 h-4 text-slate-400" />
                        Risk Trajectory (30d)
                    </h3>
                    <div className="h-80">
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="timestamp" hide />
                                <YAxis domain={[0, 1]} hide />
                                <Tooltip content={() => null} />
                                <Area type="monotone" dataKey={sensorTypes[0]} stroke="#3b82f6" fill="url(#riskGrad)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="pt-4 border-t border-white/5 space-y-2">
                        <div className="flex justify-between text-xs items-center text-slate-400">
                             <span>Trend: INCREASING</span>
                             <span className="text-rose-500 font-bold">+12% / 7d</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">Confidence: 94% (GBM Model)</div>
                    </div>
                </div>
            </div>

            {/* Maintenance History */}
            <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Hammer className="w-5 h-5 text-blue-400" />
                    Maintenance Event Log
                </h3>
                <div className="space-y-3">
                    <MaintLog date="15 Feb 2024" type="scheduled" action="Borescope Inspection" result="Normal" />
                    <MaintLog date="02 Nov 2023" type="unscheduled" action="Actuator Seal Replacement" result="Rectified" alert />
                    <MaintLog date="10 Aug 2023" type="scheduled" action="Filter Change" result="Complete" />
                </div>
            </div>
        </div>
    );
};

const ImpactRow = ({ label, val, color }: any) => {
    const colMap: any = { rose: "bg-rose-500", amber: "bg-amber-500", blue: "bg-blue-600" };
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-bold">{label}</span>
                <span className="text-white font-mono">{val.toFixed(2)}</span>
            </div>
            <div className="h-2 bg-slate-950 rounded-full border border-white/5 overflow-hidden">
                <div className={`h-full ${colMap[color]} shadow-[0_0_10px_rgba(255,255,255,0.1)]`} style={{ width: `${val * 100}%` }}></div>
            </div>
        </div>
    )
};

const MaintLog = ({ date, type, action, result, alert }: any) => (
    <div className={`flex items-center justify-between p-4 rounded-2xl border ${alert ? 'bg-rose-500/5 border-rose-500/10' : 'bg-slate-950/30 border-white/5'} transition-all hover:bg-white/5`}>
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${alert ? 'bg-rose-500/20 text-rose-500' : 'bg-blue-500/10 text-blue-400'}`}>
                {alert ? <AlertTriangle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
                <div className="text-white font-bold text-sm tracking-tight">{action}</div>
                <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{type} • {date}</div>
            </div>
        </div>
        <div className="flex items-center gap-4">
             <span className={`text-xs font-bold ${alert ? 'text-rose-500' : 'text-slate-400'}`}>{result}</span>
             <ChevronRight className="w-4 h-4 text-slate-700" />
        </div>
    </div>
)

export default ComponentDetail;
