import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  Gauge,
  History,
  Wrench,
  ChevronLeft,
  ShieldCheck,
  Zap,
  Clock,
  AlertTriangle,
  Settings,
  Database
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
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-600 border-t-transparent"></div>
          <p className="text-slate-500 animate-pulse font-bold tracking-widest uppercase text-xs">Deep Analysis in Progress...</p>
        </div>
      </div>
    );
  }

  const sensorTypes = Array.from(new Set(sensors.map((sensor) => sensor.type)));
  const groupedSensors = sensors.reduce((acc: Record<string, any>, sensor) => {
    const key = new Date(sensor.timestamp).toLocaleDateString();
    if (!acc[key]) acc[key] = { timestamp: key };
    acc[key][sensor.type] = sensor.value;
    return acc;
  }, {});
  const chartData = Object.values(groupedSensors);
  const chartColors = ['#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <Link to="/priorities" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-900 transition shadow-sm">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <Settings className="h-3 w-3" /> System Analysis / {risk.system_category}
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{risk.component_name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Risk Profile Card */}
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-sky-600" />
                Risk Equation Analysis
              </h3>
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border ring-1 ${getBadgeStyles(risk.risk_level)}`}>
                {risk.risk_level} Priority
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center p-8 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="text-center group">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-sky-600 transition-colors">P(Failure)</div>
                <div className="text-4xl font-black text-slate-900">{risk.failure_prob.toFixed(3)}</div>
              </div>
              <div className="flex justify-center">
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-white shadow-sm font-black text-slate-300">×</div>
              </div>
              <div className="text-center group">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-sky-600 transition-colors">Weighted Impact</div>
                <div className="text-4xl font-black text-slate-900">{risk.impact.weighted_impact.toFixed(2)}</div>
              </div>
            </div>

            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-4xl font-black text-sky-600">{risk.risk_score.toFixed(2)}</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Risk Score</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-tight mt-1">P/N: {risk.part_number || 'N/A'}</div>
                </div>
                <div className="h-12 w-px bg-slate-100 hidden md:block"></div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Recommended Intervention</div>
                  <div className="text-xs font-medium text-slate-500 mt-1">{risk.recommended_action}</div>
                </div>
              </div>
              <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-100">
                <Zap className="h-8 w-8" />
              </div>
            </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <Activity className="h-6 w-6 text-sky-600" />
              Risk Drivers & Explainability
            </h3>
            <div className="flex flex-wrap gap-3">
              {(risk.risk_drivers || 'Fleet Baseline').split(', ').map((driver: string) => (
                <div key={driver} className="flex items-center gap-2 rounded-2xl bg-sky-50 px-5 py-2.5 ring-1 ring-sky-100 border border-sky-100">
                  <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse"></span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-sky-800">{driver}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs font-medium text-slate-500 leading-relaxed border-l-4 border-slate-100 pl-4 italic">
              Deep analysis of telemetry signals and historical maintenance patterns has flagged these specific markers as primary drivers for the current risk tier.
            </p>
          </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
              <History className="h-6 w-6 text-sky-600" />
              Risk Propagation Trend
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={riskTrend}>
                  <defs>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="snapshot_date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()} 
                    fontSize={10} 
                    fontWeight={700}
                    stroke="#94a3b8" 
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis domain={[0, 1]} fontSize={10} fontWeight={700} stroke="#94a3b8" axisLine={false} tickLine={false} />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="risk_score" stroke="#0ea5e9" fill="url(#riskGrad)" strokeWidth={4} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-sky-600" />
              Maintenance Review
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-sm font-bold text-slate-700">Check Completed</span>
                <button 
                  onClick={() => {
                    const next = !risk.is_checked;
                    componentApi.updateRisk(id!, { is_checked: next }).then(res => setRisk(res));
                  }}
                  className={`h-10 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    risk.is_checked 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
                    : 'bg-white text-slate-400 border border-slate-200 hover:border-sky-300 hover:text-sky-600'
                  }`}
                >
                  {risk.is_checked ? 'Completed' : 'Mark Complete'}
                </button>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Team Comments</label>
                <textarea 
                  value={risk.comments || ''}
                  onChange={(e) => setRisk({ ...risk, comments: e.target.value })}
                  onBlur={() => componentApi.updateRisk(id!, { comments: risk.comments })}
                  placeholder="Annotate risk findings or inspection results..."
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-medium outline-none focus:border-sky-300 focus:bg-white transition-all h-24 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
              <Gauge className="h-5 w-5 text-amber-500" />
              Impact Vector
            </h3>
            <div className="space-y-6">
              <ImpactRow label="Safety Criticality" value={risk.impact.safety} color="rose" />
              <ImpactRow label="Operational Latency" value={risk.impact.ops} color="amber" />
              <ImpactRow label="Asset Valuation" value={risk.impact.cost} color="sky" />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
              <Database className="h-5 w-5 text-slate-900" />
              Maintenance Log
            </h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center text-slate-400">
                  <Clock className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No Log Data</p>
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={`${log.maintenance_date}-${index}`} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 transition hover:border-sky-200 hover:bg-white hover:shadow-md">
                    <div className="flex justify-between items-start gap-4">
                      <div className="font-extrabold text-slate-900 text-sm">{log.subtype || log.maintenance_type}</div>
                      <div className="rounded-lg bg-white px-2 py-1 text-[8px] font-black uppercase text-slate-400 border border-slate-100">{log.outcome}</div>
                    </div>
                    <div className="text-[9px] font-bold text-sky-600 uppercase tracking-widest mt-1">
                      {new Date(log.maintenance_date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-slate-500 mt-2 font-medium line-clamp-2 leading-relaxed">{log.description || log.outcome}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sensor Plots Footer */}
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
          <Activity className="h-6 w-6 text-sky-600" />
          Multi-Sensor Temporal Resolution
        </h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="timestamp" fontSize={10} fontWeight={700} stroke="#94a3b8" axisLine={false} tickLine={false} dy={10} />
              <YAxis fontSize={10} fontWeight={700} stroke="#94a3b8" axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="top" align="right" height={48} iconType="circle" />
              {sensorTypes.map((type, idx) => (
                <Line
                  key={type}
                  type="monotone"
                  dataKey={type}
                  stroke={chartColors[idx % chartColors.length]}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const ImpactRow = ({ label, value, color }: { label: string; value: number; color: 'rose' | 'amber' | 'sky' }) => {
  const colorMap = { rose: 'bg-rose-500 shadow-rose-200', amber: 'bg-amber-500 shadow-amber-200', sky: 'bg-sky-500 shadow-sky-200' };
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <span className="text-sm font-black text-slate-900">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
        <div className={`h-full rounded-full shadow-sm transition-all duration-1000 ${colorMap[color]}`} style={{ width: `${value * 100}%` }}></div>
      </div>
    </div>
  );
};

const getBadgeStyles = (level: string) => {
  switch (level) {
    case 'HIGH':
      return 'bg-rose-50 text-rose-700 ring-rose-100 border-rose-200';
    case 'MEDIUM':
      return 'bg-amber-50 text-amber-700 ring-amber-100 border-amber-200';
    default:
      return 'bg-emerald-50 text-emerald-700 ring-emerald-100 border-emerald-200';
  }
};

export default ComponentDetail;
