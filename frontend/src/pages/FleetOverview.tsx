import React, { useEffect, useState } from 'react';
import { AlertCircle, Timer, RefreshCw, Database, Plane, ShieldAlert, Calendar, Bot, ArrowRight, TrendingUp, Compass, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
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
      const [overview, bd] = await Promise.all([fleetApi.getOverview(), fleetApi.getBreakdown()]);
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

  if (!data) return (
    <div className="flex h-96 items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-600 border-t-transparent"></div>
        <p className="text-slate-500 animate-pulse font-medium">Synchronizing fleet telemetry...</p>
      </div>
    </div>
  );

  const pieData = [
    { name: 'High Risk', value: data.high_risk_components },
    { name: 'Medium Risk', value: data.medium_risk_components },
    { name: 'Low Risk', value: data.low_risk_components },
  ];
  const colors = ['#f43f5e', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 lg:text-5xl">
            Fleet <span className="text-sky-600">Intelligence</span>
          </h1>
          <p className="mt-3 text-lg font-medium text-slate-500 max-w-2xl">
            Real-time risk assessment and predictive maintenance prioritization for mission-critical aircraft operations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200">
            <Timer className="h-4 w-4 text-sky-600" />
            Auto-sync: {countdown}s
          </div>
          <button onClick={fetchData} disabled={isRefreshing} className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 text-sky-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync Now
          </button>
          <button onClick={handleRegenerate} className="flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800">
            <Database className="h-4 w-4 text-sky-400" />
            Full Rebuild
          </button>
        </div>
      </div>

      {/* Alerts Section */}
      {data.tier_changes > 0 && (
        <div className="group relative overflow-hidden rounded-3xl border border-rose-100 bg-rose-50/50 p-6 transition-all hover:bg-rose-50">
          <div className="flex items-center gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-200">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <div className="text-xl font-bold text-rose-900">Immediate Risk Escalation</div>
              <div className="mt-1 font-medium text-rose-800">{data.tier_changes} components have moved into the HIGH critical tier in the last 24 hours.</div>
            </div>
            <Link to="/priorities" className="hidden items-center gap-2 font-black uppercase tracking-widest text-rose-600 sm:flex">
              Review Now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Health Score" value={`${data.fleet_health_score}%`} sub="+1.2% versus last week" icon={Activity} trend="up" color="sky" />
        <StatCard title="Active Fleet" value={`${data.total_aircraft}`} sub="Assets currently monitored" icon={Plane} color="slate" />
        <StatCard title="Critical Risks" value={`${data.high_risk_components}`} sub="Requires immediate review" icon={AlertCircle} color="rose" />
        <StatCard title="Total Inventory" value="2,481" sub="Individual component IDs" icon={Compass} color="amber" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Priority Pie */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-900">Priority Mix</h2>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={60} outerRadius={90} paddingAngle={8} cornerRadius={4}>
                  {pieData.map((entry, index) => <Cell key={entry.name} fill={colors[index]} />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Bar */}
        <div className="lg:col-span-2 overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-900">Risk Variance by Airframe</h2>
            <Link to="/fleet" className="text-sm font-bold text-sky-600 hover:underline">View All Types</Link>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdown?.by_type}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={12} fontWeight={700} stroke="#94a3b8" axisLine={false} tickLine={false} dy={10} />
                <YAxis fontSize={12} fontWeight={700} stroke="#94a3b8" axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="avg_risk" fill="#0284c7" radius={[8, 8, 8, 8]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Climate Zone Exposure */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md">
          <h2 className="text-xl font-extrabold text-slate-900 mb-6">Climate Exposure Profile</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdown?.by_zone} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" fontSize={12} fontWeight={700} stroke="#94a3b8" axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={110} fontSize={12} fontWeight={700} stroke="#94a3b8" axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="avg_risk" fill="#0f766e" radius={[8, 8, 8, 8]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom CTA / Link */}
        <div className="flex flex-col gap-6">
          <Link to="/copilot" className="group flex h-1/2 flex-col justify-between overflow-hidden rounded-3xl bg-sky-600 p-8 text-white shadow-lg shadow-sky-200 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-300">
            <Bot className="h-10 w-10 text-sky-200" />
            <div>
              <div className="text-2xl font-black">Fleet Copilot</div>
              <div className="mt-2 text-sky-100 font-medium opacity-90">Ask AI about maintenance schedules, spare parts lead times, or risk trends.</div>
              <div className="mt-6 flex items-center gap-2 font-black uppercase tracking-widest text-white transition-all group-hover:gap-4">
                Launch Assistant <ArrowRight className="h-5 w-5" />
              </div>
            </div>
          </Link>
          <div className="flex h-1/2 items-center gap-6 rounded-3xl border border-slate-200 bg-white p-8 group transition-all hover:border-sky-300">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-900 group-hover:bg-sky-50 group-hover:text-sky-600 transition-colors">
              <Calendar className="h-8 w-8" />
            </div>
            <div>
              <div className="text-xl font-bold">Planned Maintenance</div>
              <div className="mt-1 font-medium text-slate-500">Explore components scheduled for next 30 days.</div>
              <Link to="/priorities" className="mt-3 inline-flex items-center gap-2 font-black uppercase tracking-widest text-sky-600 hover:text-sky-700">
                Go to board <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, sub, icon: Icon, color = 'sky', trend }: any) => {
  const colorMap: any = {
    sky: 'bg-sky-50 text-sky-600 ring-sky-100',
    rose: 'bg-rose-50 text-rose-600 ring-rose-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    slate: 'bg-slate-50 text-slate-600 ring-slate-100',
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-slate-300">
      <div className="flex items-start justify-between">
        <div className={`rounded-2xl p-3 ring-1 ${colorMap[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        {trend && (
          <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-600 ring-1 ring-emerald-100">
            <TrendingUp className="h-3 w-3" /> Trending
          </div>
        )}
      </div>
      <div className="mt-6">
        <div className="text-3xl font-black text-slate-900">{value}</div>
        <div className="mt-1 text-sm font-bold text-slate-400 uppercase tracking-widest">{title}</div>
        <div className="mt-4 border-t border-slate-50 pt-4 text-xs font-semibold text-slate-500">
          {sub}
        </div>
      </div>
    </div>
  );
};

export default FleetOverview;
