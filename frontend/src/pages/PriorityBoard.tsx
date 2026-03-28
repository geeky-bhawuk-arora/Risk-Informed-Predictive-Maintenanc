import React, { useState, useEffect } from 'react';
import { componentsApi, adminApi } from '../api';
import { AlertCircle, Clock, CheckCircle, Download, RefreshCw, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PriorityBoard() {
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchRankings = () => {
    setLoading(true);
    componentsApi.getRankings().then(res => {
      setRankings(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchRankings();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    await adminApi.regenerateData();
    fetchRankings();
    setIsSyncing(false);
  };

  const getTier = (score: number) => {
    if (score >= 0.6) return 'HIGH';
    if (score >= 0.3) return 'MEDIUM';
    return 'LOW';
  };

  const tiers = [
    { id: 'HIGH', label: 'Critical Action', color: 'bg-red-500', icon: AlertCircle, desc: 'Inspection within 24h' },
    { id: 'MEDIUM', label: 'Scheduled', color: 'bg-amber-500', icon: Clock, desc: 'Service within 7d' },
    { id: 'LOW', label: 'Monitoring', color: 'bg-green-500', icon: CheckCircle, desc: 'Normal Operation' },
  ];

  if (loading) return <div className="grid grid-cols-3 gap-6 pt-20 animate-pulse"><div className="h-96 glass-card"></div><div className="h-96 glass-card"></div><div className="h-96 glass-card"></div></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex justify-between items-end">
        <div>
          <p className="text-blue-500 font-bold tracking-widest uppercase text-xs mb-2">Maintenance Ops</p>
          <h1 className="text-4xl font-black text-white">Priority Board</h1>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="glass px-6 py-2 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-all flex items-center gap-2 outline-none border-none cursor-pointer"
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Recomputing...' : 'Recompute Risk'}
          </button>
          <a 
            href={componentsApi.exportCSV()} 
            className="btn-primary flex items-center gap-2 no-underline text-sm font-bold"
          >
            <Download size={16} />
            Export CSV
          </a>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {tiers.map(tier => (
          <div key={tier.id} className="flex flex-col gap-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${tier.color} shadow-[0_0_10px_currentColor]`}></div>
                <h3 className="text-xl font-bold text-white uppercase tracking-tighter">{tier.label}</h3>
              </div>
              <span className="text-slate-500 font-black text-sm">
                {rankings.filter(r => getTier(r.risk_score) === tier.id).length}
              </span>
            </div>
            
            <div className="flex flex-col gap-4">
              {rankings
                .filter(r => getTier(r.risk_score) === tier.id)
                .map(item => (
                  <Link 
                    key={item.component_id}
                    to={`/component/${item.component_id}`}
                    className="glass-card !p-5 group hover:border-white/20 hover:bg-white/5 no-underline block"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="max-w-[180px]">
                        <p className="font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight text-sm truncate">
                          {item.component_name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-black">{item.aircraft_registration}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-white tracking-tighter">{(item.risk_score * 100).toFixed(0)}</p>
                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest -mt-1">RiskIdx</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-white/5 rounded-lg p-2 text-center">
                        <p className="text-[8px] text-slate-500 font-bold uppercase truncate">Fail P</p>
                        <p className="text-xs font-black text-slate-200">{(item.failure_probability * 100).toFixed(0)}%</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2 text-center col-span-2">
                        <p className="text-[8px] text-slate-500 font-bold uppercase truncate">Primary Impact</p>
                        <p className="text-xs font-black text-slate-200 truncate">{item.component_type}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 border-t border-white/5 pt-3">
                      <div className="flex items-center gap-2">
                        <tier.icon size={12} className={tier.color.replace('bg-', 'text-')} />
                        <span className="uppercase tracking-widest">{tier.desc}</span>
                      </div>
                      <ChevronRight size={12} />
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
