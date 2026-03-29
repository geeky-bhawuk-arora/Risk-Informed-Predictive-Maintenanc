import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Timer,
  RefreshCw,
  Database,
  Plane,
  ShieldAlert,
  Calendar
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { fleetApi, settingsApi } from '../api';

const FleetOverview = () => {
  const [data, setData] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [countdown, setCountdown] = useState(60);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const [overview, bd] = await Promise.all([
        fleetApi.getOverview(),
        fleetApi.getBreakdown()
      ]);
      setData(overview);
      setBreakdown(bd);
      setCountdown(60);
    } catch (err) {
      console.error("Failed to fetch overview", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchData();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRegenerate = async () => {
    if (confirm("Regenerate synthetic dataset and retrain models? This may take a few minutes.")) {
      await settingsApi.regenerateData();
      alert("Regeneration triggered in background. Dashboard will refresh automatically upon completion.");
    }
  };

  if (!data) return <div className="h-96 flex items-center justify-center animate-pulse">Loading Fleet Intelligence...</div>;

  const COLORS = ['#f43f5e', '#fbbf24', '#10b981'];
  const pieData = [
    { name: 'High', value: data.high_risk_components },
    { name: 'Medium', value: data.medium_risk_components },
    { name: 'Low', value: data.low_risk_components },
  ];

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Fleet Intelligence</h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            <Timer className="w-4 h-4" />
            Live data sync in {countdown}s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleRegenerate}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5"
          >
            <Database className="w-4 h-4" />
            Regenerate Dataset
          </button>
        </div>
      </div>

      {/* Tier Change Alert Banner */}
      {data.tier_changes > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 animate-bounce-subtle">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-500/20 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <h3 className="text-rose-400 font-bold">Critical Maintenance Escalation</h3>
              <p className="text-rose-400/70 text-sm">{data.tier_changes} components moved to HIGH priority since last snapshot.</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold transition-colors">
            Review Alerts
          </button>
        </div>
      )}

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Fleet Health" value={data.fleet_health_score} suffix="%" sub="Aggregated Index" color="blue" isGauge />
        <StatCard title="Active Aircraft" value={data.total_aircraft} icon={Plane} sub="100% Ops Ready" color="slate" />
        <StatCard title="High Priority" value={data.high_risk_components} icon={AlertCircle} sub="Action < 24h" color="rose" />
        <StatCard title="Scheduled" value={data.medium_risk_components} icon={Calendar} sub="Next 7 Days" color="amber" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
          <h3 className="text-lg font-bold text-white mb-6">Priority Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={pieData} 
                  innerRadius={60} outerRadius={80} paddingAngle={5} 
                  dataKey="value" startAngle={90} endAngle={450}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
          <h3 className="text-lg font-bold text-white mb-6">Risk by Aircraft Model</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdown?.by_type}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                <XAxis dataKey="name" fontSize={12} stroke="#64748b" axisLine={false} tickLine={false} />
                <YAxis fontSize={12} stroke="#64748b" axisLine={false} tickLine={false} />
                <Tooltip 
                    cursor={{ fill: '#33415550' }}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                />
                <Bar dataKey="avg_risk" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Climate Break-down */}
      <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
        <h3 className="text-lg font-bold text-white mb-6">Risk Exposure by Climate Zone</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdown?.by_zone} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff10" />
              <XAxis type="number" fontSize={12} stroke="#64748b" axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={100} fontSize={12} stroke="#64748b" axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#33415550' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
              <Bar dataKey="avg_risk" fill="#10b981" radius={[0, 4, 4, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, sub, icon: Icon, color, suffix, isGauge }: any) => {
  const colorMap: any = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    rose: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    slate: "text-slate-400 bg-slate-400/10 border-slate-400/20",
  };

  return (
    <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl group hover:border-white/20 transition-all">
      <div className="flex justify-between items-start mb-4">
        <span className="text-slate-400 font-medium text-sm">{title}</span>
        {Icon && <Icon className={`w-5 h-5 ${colorMap[color].split(' ')[0]}`} />}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-4xl font-bold tracking-tight text-white`}>
          {value}{suffix}
        </span>
      </div>
      <p className="text-slate-500 text-xs mt-2 uppercase font-semibold tracking-wider">
        {sub}
      </p>
      
      {isGauge && (
        <div className="mt-4 pt-4 border-t border-white/5 flex gap-1">
          <div className={`h-1 flex-1 rounded-full ${value > 70 ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
          <div className={`h-1 flex-1 rounded-full ${value > 40 ? 'bg-amber-500' : 'bg-slate-800'}`}></div>
          <div className={`h-1 flex-1 rounded-full ${value <= 40 ? 'bg-rose-500' : 'bg-slate-800'}`}></div>
        </div>
      )}
    </div>
  );
};

export default FleetOverview;
