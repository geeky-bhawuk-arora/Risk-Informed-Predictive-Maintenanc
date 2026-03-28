import React, { useState, useEffect } from 'react';
import { fleetApi } from '../api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { Plane, Activity, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FleetOverview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fleetApi.getOverview().then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse flex space-y-4 flex-col pt-20"><div className="h-40 glass-card"></div><div className="h-80 glass-card"></div></div>;

  const stats = [
    { label: 'Total Aircraft', value: data?.total_aircraft || 0, icon: Plane, color: 'text-blue-500' },
    { label: 'Avg Fleet Health', value: `${((data?.avg_health || 0) * 100).toFixed(1)}%`, icon: Activity, color: 'text-green-500' },
    { label: 'Pending Critical', value: data?.critical_count || 0, icon: AlertCircle, color: 'text-red-500' },
    { label: 'Maintenance Due', value: data?.maintenance_due || 0, icon: Clock, color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex justify-between items-end">
        <div>
          <p className="text-blue-500 font-bold tracking-widest uppercase text-xs mb-2">Dashboard</p>
          <h1 className="text-4xl font-black text-white">Fleet Overview</h1>
        </div>
        <div className="flex gap-4">
          <button className="glass px-6 py-2 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-all">
            Export Report
          </button>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass-card hover:translate-y-[-4px]">
            <div className={`w-10 h-10 rounded-xl mb-4 flex items-center justify-center bg-white/5 ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <p className="text-slate-500 text-sm font-semibold">{stat.label}</p>
            <p className="text-3xl font-black text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Risk Trend Chart */}
        <div className="lg:col-span-2 glass-card h-[400px] flex flex-col">
          <h3 className="text-xl font-bold mb-6 text-white">7-Day Risk Projection</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.risk_trend || []}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111116', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="risk" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRisk)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Aircraft Status List */}
        <div className="glass-card flex flex-col h-[400px]">
          <h3 className="text-xl font-bold mb-6 text-white">Fleet Distribution</h3>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {data?.aircraft_status?.map((ac: any) => (
              <Link 
                key={ac.id} 
                to={`/aircraft/${ac.id}`}
                className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-400 font-bold group-hover:scale-110 transition-transform">
                    {ac.registration.slice(-2)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-100">{ac.registration}</p>
                    <p className="text-xs text-slate-500 uppercase font-black">{ac.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`status-badge ${ac.health > 0.8 ? 'status-low' : ac.health > 0.5 ? 'status-med' : 'status-high'}`}>
                    {Math.round(ac.health * 100)}%
                  </div>
                  <ChevronRight size={16} className="text-slate-600 group-hover:text-white transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
