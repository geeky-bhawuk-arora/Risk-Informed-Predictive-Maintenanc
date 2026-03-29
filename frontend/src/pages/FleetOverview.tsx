import React, { useEffect, useState } from 'react';
import { AlertCircle, Timer, RefreshCw, Database, Plane, ShieldAlert, Calendar, Bot } from 'lucide-react';
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

  if (!data) return <div className="h-96 flex items-center justify-center text-slate-500">Loading fleet overview...</div>;

  const pieData = [
    { name: 'High', value: data.high_risk_components },
    { name: 'Medium', value: data.medium_risk_components },
    { name: 'Low', value: data.low_risk_components },
  ];
  const colors = ['#ef4444', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-6">
      <section className="surface-card p-6 md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold text-sky-700">Maintenance operations overview</div>
            <h1 className="mt-2 page-title">Prioritize fleet risk with clear operational decisions.</h1>
            <p className="mt-3 max-w-2xl page-subtitle">
              Review current fleet health, high-priority maintenance items, exposure by aircraft type, and system-wide trends from one place.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
              <Timer className="h-4 w-4" />
              Live refresh in {countdown}s
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={fetchData} disabled={isRefreshing} className="button-secondary">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button onClick={handleRegenerate} className="button-primary">
              <Database className="h-4 w-4" />
              Regenerate
            </button>
            <Link to="/copilot" className="surface-muted sm:col-span-2 flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100">
              <span className="inline-flex items-center gap-2">
                <Bot className="h-4 w-4 text-sky-600" />
                Ask Fleet Copilot
              </span>
              <span className="text-sky-700">Open</span>
            </Link>
          </div>
        </div>
      </section>

      {data.tier_changes > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <div>
              <div className="font-semibold">New high-priority escalations detected</div>
              <div className="text-sm text-amber-800">{data.tier_changes} components moved into HIGH priority since the last snapshot.</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Fleet Health" value={`${data.fleet_health_score}%`} sub="Overall readiness" icon={Plane} />
        <StatCard title="Aircraft" value={`${data.total_aircraft}`} sub="In monitored fleet" icon={Plane} />
        <StatCard title="High Priority" value={`${data.high_risk_components}`} sub="Immediate attention" icon={AlertCircle} accent="rose" />
        <StatCard title="Scheduled" value={`${data.medium_risk_components}`} sub="Plan within 7 days" icon={Calendar} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="surface-card p-6">
          <h2 className="text-lg font-semibold text-slate-900">Priority Distribution</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={55} outerRadius={82} paddingAngle={4}>
                  {pieData.map((entry, index) => <Cell key={entry.name} fill={colors[index]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-6 xl:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Average Risk by Aircraft Type</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdown?.by_type}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={12} stroke="#64748b" axisLine={false} tickLine={false} />
                <YAxis fontSize={12} stroke="#64748b" axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="avg_risk" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="surface-card p-6">
        <h2 className="text-lg font-semibold text-slate-900">Risk Exposure by Climate Zone</h2>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdown?.by_zone} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" fontSize={12} stroke="#64748b" axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={110} fontSize={12} stroke="#64748b" axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="avg_risk" fill="#0f766e" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, sub, icon: Icon, accent = 'sky' }: any) => {
  const accentMap: any = {
    sky: 'bg-sky-50 text-sky-700',
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-slate-500">{title}</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
          <div className="mt-1 text-sm text-slate-600">{sub}</div>
        </div>
        <div className={`rounded-xl p-2 ${accentMap[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

export default FleetOverview;
