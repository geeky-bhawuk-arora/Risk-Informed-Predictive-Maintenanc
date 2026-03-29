import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Settings, 
  RotateCcw, 
  Save, 
  AlertCircle,
  Truck,
  DollarSign,
  TrendingUp,
  LayoutGrid
} from 'lucide-react';
import { settingsApi, fleetApi } from '../api';

const SettingsPanel = () => {
    const [weights, setWeights] = useState({ safety: 0.5, operational: 0.3, cost: 0.2 });
    const [previewChanges, setPreviewChanges] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [overview, setOverview] = useState<any>(null);

    useEffect(() => {
        Promise.all([fleetApi.getOverview(), settingsApi.getWeights()]).then(([overviewResponse, weightResponse]) => {
            setOverview(overviewResponse);
            setWeights({
                safety: weightResponse.safety,
                operational: weightResponse.operational,
                cost: weightResponse.cost,
            });
        });
    }, []);

    const handleWeightChange = (key: 'safety' | 'operational' | 'cost', value: number) => {
        const otherKeys = (['safety', 'operational', 'cost'] as const).filter(k => k !== key);
        const diff = value - weights[key];
        
        // Redistribute diff proportionally across other two
        const otherSum = weights[otherKeys[0]] + weights[otherKeys[1]];
        if (otherSum === 0) {
            // Equal redistribution if others are 0
            const newVal = Math.max(0, (1 - value) / 2);
            setWeights({ ...weights, [key]: value, [otherKeys[0]]: newVal, [otherKeys[1]]: newVal });
        } else {
            const ratio0 = weights[otherKeys[0]] / otherSum;
            const ratio1 = weights[otherKeys[1]] / otherSum;
            
            const newWeights = {
                ...weights,
                [key]: value,
                [otherKeys[0]]: Math.max(0, weights[otherKeys[0]] - (diff * ratio0)),
                [otherKeys[1]]: Math.max(0, weights[otherKeys[1]] - (diff * ratio1))
            };
            
            // Normalize to ensure sum = 1.0 due to float precision
            const sum = newWeights.safety + newWeights.operational + newWeights.cost;
            newWeights.safety /= sum;
            newWeights.operational /= sum;
            newWeights.cost /= sum;
            
            setWeights(newWeights);
        }
        
        // Simple preview logic: simulated change count for demo
        setPreviewChanges(Math.floor(Math.random() * 25) + 5); 
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await settingsApi.updateWeights(weights);
            setOverview(response.overview);
            setPreviewChanges(null);
            alert("Risk engine recalibrated with new impact weights.");
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setWeights({ safety: 0.5, operational: 0.3, cost: 0.2 });
        setPreviewChanges(null);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Settings className="w-8 h-8 text-blue-500" />
                        Risk Parameters
                    </h1>
                    <p className="text-slate-400 mt-1">Configure the relative weights of the maintenance impact engine.</p>
                </div>
            </div>

            <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-sm font-bold text-slate-500 uppercase tracking-widest">
                    <div className="space-y-4">
                        <div className="bg-rose-500/10 p-4 rounded-2xl border border-rose-500/10">
                            <Shield className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                            <span className="text-rose-500">Flight Safety</span>
                            <div className="text-2xl text-white mt-2">{(weights.safety * 100).toFixed(0)}%</div>
                        </div>
                        <input 
                            type="range" min="0" max="1" step="0.01" 
                            value={weights.safety} 
                            onChange={(e) => handleWeightChange('safety', parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-rose-500" 
                        />
                    </div>
                    
                    <div className="space-y-4">
                        <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/10">
                            <Truck className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                            <span className="text-amber-500">Operational</span>
                            <div className="text-2xl text-white mt-2">{(weights.operational * 100).toFixed(0)}%</div>
                        </div>
                        <input 
                            type="range" min="0" max="1" step="0.01" 
                            value={weights.operational} 
                            onChange={(e) => handleWeightChange('operational', parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500" 
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/10">
                            <DollarSign className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                            <span className="text-blue-500">Repair Cost</span>
                            <div className="text-2xl text-white mt-2">{(weights.cost * 100).toFixed(0)}%</div>
                        </div>
                        <input 
                            type="range" min="0" max="1" step="0.01" 
                            value={weights.cost} 
                            onChange={(e) => handleWeightChange('cost', parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                        />
                    </div>
                </div>

                {previewChanges !== null && (
                    <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-6 flex items-center justify-between text-blue-400">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-600/20 p-2 rounded-xl">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold">Recalculation Preview</h3>
                                <p className="text-sm opacity-80">This change will shift {previewChanges} components across priority tiers.</p>
                            </div>
                        </div>
                        <div className="text-xs font-black uppercase tracking-tighter bg-blue-500/20 px-3 py-1 rounded">SIMULATED</div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4">
                    <button 
                        onClick={handleReset}
                        className="flex items-center gap-2 px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold transition-all hover:scale-105"
                    >
                        <RotateCcw className="w-5 h-5" />
                        Reset to Defaults
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-12 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                    >
                        <Save className="w-5 h-5" />
                        {isSaving ? "RECALCULATING..." : "COMMIT CHANGES"}
                    </button>
                </div>
            </div>

            {/* Help Detail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-emerald-500" />
                        Impact Sensitivity
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Increasing the <strong>Safety Weight</strong> prioritizes components critical for flightworthiness, regardless of cost.
                        Reducing <strong>Operational Weight</strong> will de-prioritize non-safety related interior defects or cabin entertainment.
                    </p>
                </div>
                <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-emerald-500" />
                        Normalization
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        The system automatically normalizes weights to sum to 100%. Moving one slider will redistribute the remaining mass proportionally across the other two parameters.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
