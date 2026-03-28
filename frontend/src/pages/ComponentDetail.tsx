import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { componentsApi } from '../api';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  ArrowLeft, AlertTriangle, Activity, Settings, 
  History, Shield, Zap, TrendingDown 
} from 'lucide-react';

export default function ComponentDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      componentsApi.getDetail(parseInt(id)).then(res => {
        setData(res.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div className="animate-pulse pt-20"><div className="h-96 glass-card"></div></div>;
  if (!data) return <div className="text-white pt-20">Component not found</div>;

  const getRiskColor = (score: number) => {
    if (score >= 0.6) return 'text-red-500';
    if (score >= 0.3) return 'text-amber-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex items-center gap-6">
        <Link to="/priority" className="glass p-3 rounded-xl text-slate-400 hover:text-white transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black text-white uppercase">{data.name}</h1>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 ${getRiskColor(data.risk_score)}`}>
              {data.risk_score >= 0.6 ? 'Critical' : data.risk_score >= 0.3 ? 'Warning' : 'Healthy'}
            </div>
          </div>
          <p className="text-slate-500 font-bold">Serial: {data.serial_number} • Aircraft: {data.aircraft_registration}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Risk Summary Card */}
        <div className="glass-card flex flex-col justify-between border-t-4 border-t-blue-500">
          <div>
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Risk Analysis</h3>
              <Shield className="text-blue-500" size={24} />
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                  <span>Failure Probability</span>
                  <span className="text-white">{(data.failure_probability * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" style={{ width: `${data.failure_probability * 100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                  <span>Impact Score</span>
                  <span className="text-white">{data.impact_score.toFixed(2)}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full shadow-[0_0_10px_#a855f7]" style={{ width: `${(data.impact_score / 10) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/5">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-300">
              <TrendingDown size={16} className="text-amber-500" />
              <span>Degradation detected in last 48h</span>
            </div>
          </div>
        </div>

        {/* Sensor Telemetry Chart */}
        <div className="lg:col-span-2 glass-card h-[350px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Sensor Telemetry</h3>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 text-[10px] font-black text-slate-400 uppercase">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div> Temp
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 text-[10px] font-black text-slate-400 uppercase">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div> Vibration
              </div>
            </div>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.telemetry || []}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="timestamp" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111116', border: '1px solid #ffffff10', borderRadius: '12px' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Maintenance History */}
        <div className="glass-card">
          <div className="flex items-center gap-3 mb-6">
            <History size={20} className="text-blue-500" />
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Service History</h3>
          </div>
          <div className="space-y-4">
            {data.maintenance_logs?.map((log: any, i: number) => (
              <div key={i} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                  <div className="w-[1px] flex-1 bg-white/10 my-2"></div>
                </div>
                <div>
                  <p className="text-sm font-black text-white uppercase">{log.action_taken}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">{log.timestamp}</p>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">{log.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Impact Sub-scores */}
        <div className="glass-card">
          <div className="flex items-center gap-3 mb-6">
            <Activity size={20} className="text-purple-500" />
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Impact Factors</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white/5 text-center">
              <Zap size={24} className="mx-auto mb-3 text-amber-500" />
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Safety</p>
              <p className="text-2xl font-black text-white">{(data.safety_impact * 10).toFixed(1)}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 text-center">
              <Settings size={24} className="mx-auto mb-3 text-blue-500" />
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Operational</p>
              <p className="text-2xl font-black text-white">{(data.operational_impact * 10).toFixed(1)}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 text-center">
              <AlertTriangle size={24} className="mx-auto mb-3 text-red-500" />
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Cost</p>
              <p className="text-2xl font-black text-white">{(data.cost_impact * 10).toFixed(1)}</p>
            </div>
          </div>
          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10">
            <p className="text-xs font-bold text-slate-300 italic">
              "Risk Score Calculation: (Fail P x Impact) where Impact = (0.5 x Safety) + (0.3 x Ops) + (0.2 x Cost)"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
