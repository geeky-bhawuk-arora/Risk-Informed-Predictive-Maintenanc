import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import { 
  Building2, 
  Globe2, 
  Layers, 
  Plane,
  ChevronDown,
  Filter
} from 'lucide-react';
import { fleetApi } from '../api';

const FleetBreakdown = () => {
    const [breakdown, setBreakdown] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fleetApi.getBreakdown().then(res => {
            setBreakdown(res);
            setIsLoading(false);
        }).catch(() => setIsLoading(false));
    }, []);

    if (isLoading || !breakdown) return <div className="h-96 flex items-center justify-center animate-pulse">Segmenting Fleet Intelligence...</div>;

    const COLORS = ['#3b82f6', '#10b981', '#fbbf24', '#f43f5e', '#8b5cf6', '#64748b'];

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Layers className="w-8 h-8 text-blue-500" />
                        Fleet Structural Breakdown
                    </h1>
                    <p className="text-slate-400 mt-1">Multi-dimensional risk exposure analysis across segments.</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all">
                    <Filter className="w-4 h-4" />
                    Advanced Segmentation
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Risk by Fleet Category */}
                <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                    <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                        <Plane className="w-5 h-5 text-blue-400" />
                        Risk Concentration by Fleet Model
                    </h3>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={breakdown.by_type}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" axisLine={false} tickLine={false} />
                                <YAxis fontSize={11} stroke="#94a3b8" axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{ fill: '#ffffff05' }}
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                                />
                                <Bar dataKey="avg_risk" radius={[4, 4, 0, 0]} barSize={45}>
                                    {breakdown.by_type.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Risk by Climate Zone */}
                <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                    <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                        <Globe2 className="w-5 h-5 text-emerald-400" />
                        Environmental Risk Correlation (Climate)
                    </h3>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={breakdown.by_zone} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff05" />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={100} 
                                    fontSize={11} 
                                    stroke="#94a3b8"
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip 
                                    cursor={{ fill: '#ffffff05' }}
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                                />
                                <Bar dataKey="avg_risk" radius={[0, 4, 4, 0]} barSize={30}>
                                    {breakdown.by_zone.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. System Category Distribution (Simulated labels as backup) */}
                <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl lg:col-span-2">
                    <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-amber-400" />
                        Risk Exposure by System Category
                    </h3>
                    <div className="h-[400px]">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { name: 'Propulsion', risk: 0.65 },
                                { name: 'Flight Controls', risk: 0.42 },
                                { name: 'Landing Gear', risk: 0.58 },
                                { name: 'Hydraulics', risk: 0.35 },
                                { name: 'Avionics', risk: 0.28 },
                                { name: 'Electrical', risk: 0.22 },
                                { name: 'Pneumatics', risk: 0.31 },
                                { name: 'Fuel', risk: 0.47 },
                                { name: 'Structural', risk: 0.52 },
                                { name: 'Cabin', risk: 0.18 }
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" axisLine={false} tickLine={false} interval={0} />
                                <YAxis fontSize={11} stroke="#94a3b8" axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{ fill: '#ffffff05' }}
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                                />
                                <Bar dataKey="risk" radius={[4, 4, 0, 0]} barSize={50}>
                                    {COLORS.concat(COLORS).map((color: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-500 text-xs text-center">
                        <div className="p-4 bg-white/5 rounded-2xl">
                             <span className="font-black uppercase tracking-widest text-blue-400 block mb-1">Max Exposure</span>
                             <span className="text-white text-base font-bold">Propulsion (65%)</span>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl">
                             <span className="font-black uppercase tracking-widest text-emerald-400 block mb-1">Min Exposure</span>
                             <span className="text-white text-base font-bold">Cabin (18%)</span>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl">
                             <span className="font-black uppercase tracking-widest text-amber-400 block mb-1">Fleet Bias</span>
                             <span className="text-white text-base font-bold">Aging Engines</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FleetBreakdown;
