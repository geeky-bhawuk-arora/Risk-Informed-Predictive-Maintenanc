import { useEffect, useState } from 'react';
import { getFleetRisk, getFleet } from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { AlertCircle, Plane, CheckCircle2 } from 'lucide-react';

interface FleetRisk {
    distribution: { Low: number; Medium: number; High: number };
    probabilities: number[];
}

interface Aircraft {
    aircraft_id: number;
    tail_number: string;
    aircraft_model: string;
    status: string;
    high_risk_components: number;
}

export default function FleetOverview() {
    const [risk, setRisk] = useState<FleetRisk | null>(null);
    const [fleet, setFleet] = useState<Aircraft[]>([]);

    useEffect(() => {
        getFleetRisk().then(res => setRisk(res.data));
        getFleet().then(res => setFleet(res.data));
    }, []);

    if (!risk) return <div className="text-slate-400 animate-pulse">Loading fleet telemetry...</div>;

    const distData = [
        { name: 'Low Risk', value: risk.distribution.Low, color: '#10b981' }, // green-500
        { name: 'Medium Risk', value: risk.distribution.Medium, color: '#f59e0b' }, // amber-500
        { name: 'High Risk', value: risk.distribution.High, color: '#ef4444' } // red-500
    ];

    const totalAircraft = fleet.length;
    const aircraftWithHighRisk = fleet.filter(a => a.high_risk_components > 0).length;

    return (
        <div className="space-y-6">
            <header className="mb-8">
                <h2 className="text-3xl font-bold text-white tracking-tight">Fleet Overview</h2>
                <p className="text-slate-400 mt-2">Real-time risk assessment and predictive analytics for the total fleet.</p>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 flex flex-col">
                    <div className="flex items-center justify-between">
                        <h3 className="text-slate-400 font-medium">Total Aircraft</h3>
                        <Plane className="text-primary" size={24} />
                    </div>
                    <div className="text-4xl font-bold text-white mt-4">{totalAircraft}</div>
                </div>

                <div className="glass-panel p-6 flex flex-col ring-1 ring-red-500/20">
                    <div className="flex items-center justify-between">
                        <h3 className="text-slate-400 font-medium">Aircraft at Risk</h3>
                        <AlertCircle className="text-red-500" size={24} />
                    </div>
                    <div className="text-4xl font-bold text-white mt-4">{aircraftWithHighRisk}</div>
                    <p className="text-sm text-red-400/80 mt-2">{((aircraftWithHighRisk / (totalAircraft || 1)) * 100).toFixed(1)}% of fleet requires immediate attention</p>
                </div>

                <div className="glass-panel p-6 flex flex-col">
                    <div className="flex items-center justify-between">
                        <h3 className="text-slate-400 font-medium">System Status</h3>
                        <CheckCircle2 className="text-emerald-500" size={24} />
                    </div>
                    <div className="text-4xl font-bold text-white mt-4">Optimal</div>
                    <p className="text-sm text-emerald-400/80 mt-2">Risk engine is continuously monitoring</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {/* Risk Distribution Chart */}
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-semibold text-white mb-6">Component Risk Distribution</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={distData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {distData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0)" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* High Risk Aircraft List */}
                <div className="glass-panel p-6 flex flex-col">
                    <h3 className="text-lg font-semibold text-white mb-6">Aircraft Needing Attention</h3>
                    <div className="flex-1 overflow-y-auto">
                        {fleet.filter(a => a.high_risk_components > 0).map(a => (
                            <div key={a.aircraft_id} className="flex items-center justify-between p-3 border-b border-slate-700/30 last:border-0 hover:bg-slate-700/20 transition-colors rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                    <div>
                                        <div className="font-medium text-slate-200">{a.tail_number}</div>
                                        <div className="text-xs text-slate-400">{a.aircraft_model}</div>
                                    </div>
                                </div>
                                <div className="text-sm font-semibold text-red-400 bg-red-500/10 px-3 py-1 rounded-full">
                                    {a.high_risk_components} High Risk
                                </div>
                            </div>
                        ))}
                        {fleet.filter(a => a.high_risk_components > 0).length === 0 && (
                            <div className="text-center text-slate-500 mt-8">No high-risk aircraft detected.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
