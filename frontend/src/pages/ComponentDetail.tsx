import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  Gauge,
  History,
  Wrench,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { componentApi } from '../api';

const ComponentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [risk, setRisk] = useState<any>(null);
  const [sensors, setSensors] = useState<any[]>([]);
  const [riskTrend, setRiskTrend] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        const [riskResponse, sensorResponse, trendResponse, logResponse] = await Promise.all([
          componentApi.getRiskDetail(id),
          componentApi.getSensorHistory(id),
          componentApi.getRiskTrend(id),
          componentApi.getMaintenanceHistory(id),
        ]);

        setRisk(riskResponse);
        setSensors(sensorResponse);
        setRiskTrend(trendResponse);
        setLogs(logResponse);
      } catch (err) {
        console.error('Failed to load component details', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  if (isLoading || !risk) {
    return <div className="h-96 flex items-center justify-center animate-pulse">Analyzing Component Health...</div>;
  }

  const sensorTypes = Array.from(new Set(sensors.map((sensor) => sensor.type)));
  const groupedSensors = sensors.reduce((acc: Record<string, any>, sensor) => {
    const key = new Date(sensor.timestamp).toLocaleDateString();
    if (!acc[key]) acc[key] = { timestamp: key };
    acc[key][sensor.type] = sensor.value;
    return acc;
  }, {});
  const chartData = Object.values(groupedSensors);
  const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

  return (
    <div className="space-y-8 pb-12">
      <Link to="/priorities" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Fleet Prioritization
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight leading-none mb-2">
              {risk.component_name}
            </h1>
            <div className="flex items-center gap-4 text-slate-400 text-sm mb-2">
              <span className="flex items-center gap-1.5 border border-white/5 bg-white/5 px-2 py-0.5 rounded uppercase font-bold text-[10px] tracking-widest text-blue-400">
                {risk.system_category}
              </span>
              <span>Aircraft ID: {risk.aircraft_id}</span>
              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
              <span>Snapshot: {new Date(risk.snapshot_date).toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Risk Equation
            </h3>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-slate-950/50 rounded-2xl border border-white/5">
              <MetricBlock label="P(Failure)" value={risk.failure_prob.toFixed(3)} />
              <div className="text-2xl text-slate-700">x</div>
              <MetricBlock label="Impact Score" value={risk.impact.weighted_impact.toFixed(2)} />
              <div className="text-2xl text-slate-700">=</div>
              <div className="text-center">
                <div className="bg-blue-600/20 px-6 py-3 rounded-2xl border border-blue-500/30">
                  <div className="text-[10px] text-blue-400 uppercase font-black tracking-widest mb-1">Risk Score</div>
                  <div className="text-4xl font-mono font-black text-blue-400">{risk.risk_score.toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <div className="text-sm text-slate-400">Recommended action: {risk.recommended_action}</div>
              <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest border ${getBadgeStyles(risk.risk_level)}`}>
                {risk.risk_level}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-amber-400" />
              Impact Composition
            </h3>
            <div className="space-y-4">
              <ImpactRow label="Flight Safety" value={risk.impact.safety} color="rose" />
              <ImpactRow label="Operational" value={risk.impact.ops} color="amber" />
              <ImpactRow label="Repair Cost" value={risk.impact.cost} color="blue" />
            </div>
          </div>

          <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              Risk Trend
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={riskTrend}>
                  <defs>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis dataKey="snapshot_date" tickFormatter={(value) => new Date(value).toLocaleDateString()} fontSize={10} stroke="#64748b" />
                  <YAxis domain={[0, 1]} fontSize={10} stroke="#64748b" />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                  />
                  <Area type="monotone" dataKey="risk_score" stroke="#3b82f6" fill="url(#riskGrad)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
          <h3 className="text-white font-bold mb-6 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-blue-400" />
            Sensor Analytics (30d)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="timestamp" fontSize={10} stroke="#64748b" axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis fontSize={10} stroke="#64748b" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} />
                <Legend verticalAlign="top" height={36} />
                {sensorTypes.map((type, idx) => (
                  <Line
                    key={type}
                    type="monotone"
                    dataKey={type}
                    stroke={chartColors[idx % chartColors.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
          <h3 className="text-white font-bold mb-6 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-slate-400" />
            Maintenance History
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {logs.length === 0 ? (
              <div className="text-sm text-slate-500">No recent maintenance history found.</div>
            ) : (
              logs.map((log, index) => (
                <div key={`${log.maintenance_date}-${index}`} className="p-4 rounded-2xl border bg-slate-950/30 border-white/5">
                  <div className="text-white font-bold text-sm tracking-tight">{log.subtype || log.maintenance_type}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                    {log.maintenance_type} · {new Date(log.maintenance_date).toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-400 mt-2">{log.description || log.outcome}</div>
                  <div className="text-xs text-slate-500 mt-2">Outcome: {log.outcome}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="text-center">
    <div className="text-xs text-slate-500 uppercase font-bold mb-1">{label}</div>
    <div className="text-2xl font-mono font-bold text-white">{value}</div>
  </div>
);

const ImpactRow = ({ label, value, color }: { label: string; value: number; color: 'rose' | 'amber' | 'blue' }) => {
  const colorMap = { rose: 'bg-rose-500', amber: 'bg-amber-500', blue: 'bg-blue-600' };
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400 font-bold">{label}</span>
        <span className="text-white font-mono">{value.toFixed(2)}</span>
      </div>
      <div className="h-2 bg-slate-950 rounded-full border border-white/5 overflow-hidden">
        <div className={`h-full ${colorMap[color]}`} style={{ width: `${value * 100}%` }}></div>
      </div>
    </div>
  );
};

const getBadgeStyles = (level: string) => {
  switch (level) {
    case 'HIGH':
      return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    case 'MEDIUM':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    default:
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  }
};

export default ComponentDetail;
