import { useEffect, useState } from 'react';
import { getComponent } from '../api';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ArrowLeft, Target, ShieldAlert, Cpu } from 'lucide-react';

interface ComponentData {
    component_id: number;
    type: string;
    criticality: string;
    risk_profile: {
        score: number;
        level: string;
        probability: number;
        driver: string;
    };
    recent_sensors: Array<{
        parameter: string;
        value: number;
        timestamp: string;
    }>;
}

export default function ComponentHealth({ componentId, onBack }: { componentId: number | null, onBack: () => void }) {
    const [data, setData] = useState<ComponentData | null>(null);

    useEffect(() => {
        if (componentId) {
            getComponent(componentId).then(res => setData(res.data));
        }
    }, [componentId]);

    if (!componentId) return <div className="text-slate-400">No component selected.</div>;
    if (!data) return <div className="text-slate-400 animate-pulse">Loading component telemetry...</div>;

    const vibData = data.recent_sensors.filter(s => s.parameter === 'vibration').reverse().map(s => ({
        time: new Date(s.timestamp).toLocaleDateString(),
        vibration: s.value
    }));

    const tempData = data.recent_sensors.filter(s => s.parameter === 'temperature').reverse().map(s => ({
        time: new Date(s.timestamp).toLocaleDateString(),
        temperature: s.value
    }));

    const rp = data.risk_profile;

    return (
        <div className="space-y-6">
            <header className="mb-6 flex items-center space-x-4">
                <button
                    onClick={onBack}
                    className="p-2 bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        {data.type} <span className="text-slate-500 text-lg font-normal">#{data.component_id}</span>
                    </h2>
                    <p className="text-slate-400 mt-1">Detailed health breakdown and real-time telemetry.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-panel p-6">
                    <div className="text-slate-400 mb-2 flex items-center gap-2 font-medium">
                        <Cpu size={18} /> Criticality Class
                    </div>
                    <div className="text-2xl font-bold text-white">{data.criticality}</div>
                </div>

                <div className="glass-panel p-6 ring-1 ring-primary/20">
                    <div className="text-slate-400 mb-2 flex items-center gap-2 font-medium">
                        <Target size={18} /> Failure Probability
                    </div>
                    <div className="text-2xl font-bold text-white">{(rp.probability * 100).toFixed(1)}%</div>
                    <div className="text-xs text-slate-500 mt-1">30-day horizon</div>
                </div>

                <div className={`glass-panel p-6 ring-1 ${rp.level === 'High' ? 'ring-red-500/50' : 'ring-emerald-500/20'}`}>
                    <div className="text-slate-400 mb-2 flex items-center gap-2 font-medium">
                        <ShieldAlert size={18} /> Risk Level
                    </div>
                    <div className={`text-2xl font-bold ${rp.level === 'High' ? 'text-red-400' : rp.level === 'Medium' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                        {rp.level}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Score: {rp.score.toFixed(3)}</div>
                </div>

                <div className="glass-panel p-6">
                    <div className="text-slate-400 mb-2 font-medium">Dominant Driver</div>
                    <div className="text-2xl font-bold text-white">{rp.driver}</div>
                    <div className="text-xs text-slate-500 mt-1">Greatest impact source</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Vibration Trend */}
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-semibold text-white mb-6">Vibration Signal (g)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={vibData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickMargin={10} />
                                <YAxis stroke="#94a3b8" fontSize={12} domain={['auto', 'auto']} />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                />
                                <Line type="monotone" dataKey="vibration" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Temperature Trend */}
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-semibold text-white mb-6">Temperature Trend (°C)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={tempData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickMargin={10} />
                                <YAxis stroke="#94a3b8" fontSize={12} domain={['auto', 'auto']} />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                />
                                <Line type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
