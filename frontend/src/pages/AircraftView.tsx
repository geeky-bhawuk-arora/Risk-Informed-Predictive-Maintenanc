import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fleetApi } from '../api';
import { Plane, Activity, Clock, Shield, ChevronRight, AlertCircle, Info } from 'lucide-react';

export default function AircraftView() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fleetApi.getAircraft(parseInt(id)).then(res => {
        setData(res.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div className="animate-pulse pt-20 flex space-y-4 flex-col"><div className="h-40 glass-card"></div><div className="h-80 glass-card"></div></div>;
  if (!data) return <div className="text-white pt-20">Aircraft not found</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex justify-between items-end">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 font-black text-2xl border border-blue-500/30">
            {data.registration.slice(-2)}
          </div>
          <div>
            <h1 className="text-4xl font-black text-white p-0 m-0">{data.registration}</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2 mt-1">
              {data.type} • {data.status} • Total Hours: {data.total_hours}
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className={`status-badge ${data.health > 0.8 ? 'status-low' : data.health > 0.5 ? 'status-med' : 'status-high'} px-6 py-2 text-sm`}>
            Health: {Math.round(data.health * 100)}%
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card">
          <div className="flex items-center gap-3 mb-4 text-slate-500">
            <Activity size={18} />
            <span className="text-xs font-black uppercase tracking-widest">Efficiency</span>
          </div>
          <p className="text-3xl font-black text-white">94.2%</p>
          <div className="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: '94.2%' }}></div>
          </div>
        </div>
        <div className="glass-card">
          <div className="flex items-center gap-3 mb-4 text-slate-500">
            <Clock size={18} />
            <span className="text-xs font-black uppercase tracking-widest">Next Service</span>
          </div>
          <p className="text-3xl font-black text-white">12 Days</p>
          <div className="mt-4 flex items-center gap-2 text-amber-500">
            <Shield size={14} />
            <span className="text-[10px] font-bold uppercase">Scheduled Inspection</span>
          </div>
        </div>
        <div className="glass-card">
          <div className="flex items-center gap-3 mb-4 text-slate-500">
            <AlertCircle size={18} />
            <span className="text-xs font-black uppercase tracking-widest">Critical Risks</span>
          </div>
          <p className="text-3xl font-black text-white">{data.components?.filter((c: any) => c.risk_score >= 0.6).length || 0}</p>
          <div className="mt-4 flex items-center gap-2 text-red-500 font-bold uppercase text-[10px]">
            Requires Attention
          </div>
        </div>
      </div>

      <div className="glass-card !p-0 overflow-hidden">
        <div className="p-6 border-b border-white/5 bg-white/2 cursor-default flex justify-between items-center">
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">On-Board Components</h3>
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{data.components?.length || 0} Total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-6 py-4">Component Name</th>
                <th className="px-6 py-4">Serial</th>
                <th className="px-6 py-4 text-center">Fail Prob</th>
                <th className="px-6 py-4 text-center">Risk Score</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.components?.map((component: any) => (
                <tr key={component.id} className="hover:bg-white/2 group transition-colors">
                  <td className="px-6 py-5">
                    <p className="font-black text-slate-100 uppercase text-sm tracking-tight">{component.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{component.type}</p>
                  </td>
                  <td className="px-6 py-5 text-xs text-slate-400 font-mono">{component.serial_number}</td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-sm font-black text-slate-200">{(component.failure_probability * 100).toFixed(1)}%</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`text-lg font-black tracking-tighter ${component.risk_score >= 0.6 ? 'text-red-500' : component.risk_score >= 0.3 ? 'text-amber-500' : 'text-slate-400'}`}>
                      {(component.risk_score * 100).toFixed(0)}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`status-badge !p-0 flex items-center gap-2 ${component.risk_score >= 0.6 ? 'status-high' : component.risk_score >= 0.3 ? 'status-med' : 'status-low'} justify-center w-24 h-7 text-[10px]`}>
                      {component.risk_score >= 0.6 ? 'Critical' : component.risk_score >= 0.3 ? 'Warning' : 'OK'}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <Link to={`/component/${component.id}`} className="p-2 text-slate-600 hover:text-white transition-all block">
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex gap-4 items-start">
        <Info className="text-blue-500 shrink-0 mt-1" size={20} />
        <div>
          <h4 className="font-black text-white text-sm uppercase mb-1">Fleet Maintenance Advisory</h4>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            This aircraft is currently operating at high efficiency levels. However, based on predictive analytics, 
            3 components have shown minor deviations in sensor telemetry. No immediate grounding required, but 
            inspection during the next overnight stop is recommended.
          </p>
        </div>
      </div>
    </div>
  );
}
