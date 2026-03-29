import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Timer,
  RefreshCw,
  Database,
  Plane,
  ShieldAlert,
  Calendar,
  Bot,
  ChevronRight,
  Radar,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { Link } from 'react-router-dom';
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
        fleetApi.getBreakdown(),
      ]);
      setData(overview);
      setBreakdown(bd);
      setCountdown(60);
    } catch (err) {
      console.error('Failed to fetch overview', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      setCountdown((prev) => {
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
    if (confirm('Regenerate synthetic dataset and retrain models? This may take a few minutes.')) {
      await settingsApi.regenerateData();
      alert('Regeneration triggered in background. Dashboard will refresh automatically upon completion.');
    }
  };

  if (!data) return <div className="h-96 flex items-center justify-center animate-pulse">Loading Fleet Intelligence...</div>;

  const colors = ['#f43f5e', '#fbbf24', '#10b981'];
  const pieData = [
    { name: 'High', value: data.high_risk_components },
    { name: 'Medium', value: data.medium_risk_components },
    { name: 'Low', value: data.low_risk_components },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.92))] p-8 md:p-10 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1 text-[11px] font-black uppercase tracking-[0.32em] text-cyan-300">
              <Radar className="h-3.5 w-3.5" />
              Fleet intelligence
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">
              Risk-based maintenance command for an academic flagship demo.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              RBAMPS blends predictive failure probability with weighted operational impact to rank maintenance actions across the fleet in real time.
            </p>
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-400">
              <Timer className="w-4 h-4" />
              Live data sync in {countdown}s
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[26rem]">
            <button
              onClick={fetchData}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh now
            </button>
            <button
              onClick={handleRegenerate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-cyan-300"
            >
              <Database className="w-4 h-4" />
              Regenerate data
            </button>
            <Link
              to="/copilot"
              className="sm:col-span-2 inline-flex items-center justify-between rounded-[1.5rem] border border-cyan-400/20 bg-cyan-400/10 px-5 py-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
            >
              <span className="inline-flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Ask Fleet Copilot about your live data
              </span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

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
          <Link to="/priorities" className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold transition-colors">
            Review priorities
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Fleet Health" value={data.fleet_health_score} suffix="%" sub="Risk-adjusted readiness" color="blue" isGauge />
        <StatCard title="Active Aircraft" value={data.total_aircraft} icon={Plane} sub="Fleet assets in scope" color="slate" />
        <StatCard title="High Priority" value={data.high_risk_components} icon={AlertCircle} sub="Immediate response band" color="rose" />
        <StatCard title="Scheduled" value={data.medium_risk_components} icon={Calendar} sub="Next 7 day response band" color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
          <h3 className="text-lg font-bold text-white mb-6">Priority Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" startAngle={90} endAngle={450}>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} itemStyle={{ color: '#fff' }} />
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
                <Tooltip cursor={{ fill: '#33415550' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                <Bar dataKey="avg_risk" fill="#22d3ee" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

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
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    slate: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
  };

  return (
    <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl group hover:border-white/20 transition-all">
      <div className="flex justify-between items-start mb-4">
        <span className="text-slate-400 font-medium text-sm">{title}</span>
        {Icon && <Icon className={`w-5 h-5 ${colorMap[color].split(' ')[0]}`} />}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight text-white">
          {value}{suffix}
        </span>
      </div>
      <p className="text-slate-500 text-xs mt-2 uppercase font-semibold tracking-wider">{sub}</p>

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
