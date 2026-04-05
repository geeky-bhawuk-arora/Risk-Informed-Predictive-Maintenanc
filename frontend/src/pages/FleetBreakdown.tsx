import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  Building2, 
  Globe2, 
  Layers, 
  Plane,
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
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-xl">
                            <Layers className="w-8 h-8 text-blue-600" />
                        </div>
                        Fleet Structural Breakdown
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Multi-dimensional risk exposure analysis across segments.</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-600 rounded-2xl font-bold transition-all shadow-sm">
                    <Filter className="w-4 h-4" />
                    Advanced Segmentation
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Risk by Fleet Category */}
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                            <Plane className="w-6 h-6 text-blue-500" />
                            Risk Concentration by Fleet Model
                        </h3>
                        <div className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full">Live Stats</div>
                    </div>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={breakdown.by_type}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={10} fontWeight={700} stroke="#94a3b8" axisLine={false} tickLine={false} dy={10} />
                                <YAxis fontSize={10} fontWeight={700} stroke="#94a3b8" axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="avg_risk" radius={[6, 6, 0, 0]} barSize={40}>
                                    {breakdown.by_type.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Risk by Climate Zone */}
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                            <Globe2 className="w-6 h-6 text-emerald-500" />
                            Environmental Risk Correlation
                        </h3>
                        <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full">Climatic Drift</div>
                    </div>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={breakdown.by_zone} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={100} 
                                    fontSize={10} 
                                    fontWeight={700}
                                    stroke="#94a3b8"
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="avg_risk" radius={[0, 6, 6, 0]} barSize={24}>
                                    {breakdown.by_zone.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. System Category Distribution */}
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm hover:shadow-md transition-shadow lg:col-span-2">
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                            <Building2 className="w-6 h-6 text-amber-500" />
                            Risk Exposure by System Category
                        </h3>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div> Sensors
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Maintenance
                            </div>
                        </div>
                    </div>
                    <div className="h-[400px]">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={breakdown.by_system}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={9} fontWeight={700} stroke="#94a3b8" axisLine={false} tickLine={false} interval={0} dy={10} />
                                <YAxis fontSize={10} fontWeight={700} stroke="#94a3b8" axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="avg_risk" radius={[6, 6, 0, 0]} barSize={50}>
                                    {breakdown.by_system.map((_: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-12 pt-10 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                             <span className="font-black uppercase tracking-widest text-blue-600 block mb-2 text-[10px]">Max Exposure</span>
                             <span className="text-slate-900 text-lg font-black tracking-tight">{breakdown.by_system?.[0]?.name || 'N/A'}</span>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                             <span className="font-black uppercase tracking-widest text-emerald-600 block mb-2 text-[10px]">Min Exposure</span>
                             <span className="text-slate-900 text-lg font-black tracking-tight">{breakdown.by_system?.[breakdown.by_system.length - 1]?.name || 'N/A'}</span>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                             <span className="font-black uppercase tracking-widest text-amber-600 block mb-2 text-[10px]">Fleet Bias</span>
                             <span className="text-slate-900 text-lg font-black tracking-tight text-balance">Live Statistical Aggregator</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FleetBreakdown;
