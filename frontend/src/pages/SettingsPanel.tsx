import React, { useState } from 'react';
import { adminApi } from '../api';
import { 
  Database, RefreshCw, AlertCircle, 
  Settings, Save, Search, 
  Trash2, FileText, Activity 
} from 'lucide-react';

export default function SettingsPanel() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [impactWeights, setImpactWeights] = useState({
    safety: 0.5,
    operational: 0.3,
    cost: 0.2
  });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await adminApi.regenerateData();
      alert('Risk database synchronized with latest operational data.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleWeightChange = (field: keyof typeof impactWeights, val: string) => {
    setImpactWeights(prev => ({ ...prev, [field]: parseFloat(val) }));
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <header className="mb-10 text-center">
        <p className="text-blue-500 font-bold tracking-widest uppercase text-xs mb-4">RBAMPS Core</p>
        <h1 className="text-5xl font-black text-white p-0 m-0">System Settings</h1>
        <p className="text-slate-500 font-medium mt-4">Manage risk engine parameters, data pipelines, and security protocols.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Risk Engine Weights */}
        <div className="glass-card">
          <div className="flex items-center gap-3 mb-8">
            <Activity className="text-blue-500" size={24} />
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Risk Impact Weights</h3>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black uppercase text-slate-500">Safety Criticality</label>
                <span className="text-sm font-black text-white">{(impactWeights.safety * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.05"
                value={impactWeights.safety}
                onChange={(e) => handleWeightChange('safety', e.target.value)}
                className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black uppercase text-slate-500">Operational Continuity</label>
                <span className="text-sm font-black text-white">{(impactWeights.operational * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.05"
                value={impactWeights.operational}
                onChange={(e) => handleWeightChange('operational', e.target.value)}
                className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black uppercase text-slate-500">Economic Impact</label>
                <span className="text-sm font-black text-white">{(impactWeights.cost * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.05"
                value={impactWeights.cost}
                onChange={(e) => handleWeightChange('cost', e.target.value)}
                className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
            <div className="pt-4">
               <button className="btn-primary w-full flex items-center justify-center gap-2">
                 <Save size={16} /> Update Weights
               </button>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="glass-card">
          <div className="flex items-center gap-3 mb-8">
            <Database className="text-amber-500" size={24} />
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Data Pipeline</h3>
          </div>
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Operation</p>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
              <p className="text-sm font-black text-white uppercase mb-2">Full Telemetry Refresh</p>
              <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">
                Recomputes failure probabilities across 12,000+ data points using the latest trained weights.
              </p>
              <button 
                onClick={handleSync}
                disabled={isSyncing}
                className="glass w-full py-2.5 rounded-xl text-xs font-black uppercase text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Syncing...' : 'Run Deep Sync'}
              </button>
            </div>
            
            <div className="flex gap-4">
              <button className="glass flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:text-red-500 transition-all">
                <Trash2 size={14} /> Wipe Cache
              </button>
              <button className="glass flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all">
                <FileText size={14} /> Audit Log
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security Check */}
      <div className="rounded-2xl bg-red-600/5 border border-red-600/20 p-8 flex items-start gap-6">
         <div className="p-4 rounded-2xl bg-red-600/10 text-red-500 shadow-[0_0_20px_rgba(220,38,38,0.1)]">
            <AlertCircle size={32} />
         </div>
         <div>
            <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-2">System Guardrails</h4>
            <p className="text-sm text-slate-400 font-medium leading-relaxed mb-6">
              Administrative actions in this panel directly affect fleet availability. Ensure all impact weight 
              changes are validated by the maintenance engineering board before being pushed to production models.
            </p>
            <div className="flex gap-4">
               <div className="bg-white/5 px-4 py-2 rounded-lg flex items-center gap-2 border border-white/5">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#10b981]"></div>
                  <span className="text-[10px] font-black text-slate-200 uppercase">ML Model Verified</span>
               </div>
               <div className="bg-white/5 px-4 py-2 rounded-lg flex items-center gap-2 border border-white/5">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
                  <span className="text-[10px] font-black text-slate-200 uppercase">Risk Engine v2.4</span>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
