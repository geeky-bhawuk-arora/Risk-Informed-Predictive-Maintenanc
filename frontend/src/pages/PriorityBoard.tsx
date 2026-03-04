import { useEffect, useState } from 'react';
import { getPriorities } from '../api';
import { AlertTriangle, Wrench, ShieldCheck, ChevronRight } from 'lucide-react';

interface PriorityItem {
    rank: number;
    aircraft_tail: string;
    component_type: string;
    component_id: number;
    risk_score: number;
    action: string;
    reasoning: string;
}

export default function PriorityBoard({ onSelectComponent }: { onSelectComponent: (id: number) => void }) {
    const [items, setItems] = useState<PriorityItem[]>([]);
    const [filter, setFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');

    useEffect(() => {
        getPriorities().then(res => setItems(res.data));
    }, []);

    const getRiskLevel = (score: number) => {
        if (score > 0.6) return 'High';
        if (score > 0.3) return 'Medium';
        return 'Low';
    };

    const filteredItems = items.filter(item => {
        if (filter === 'All') return true;
        return getRiskLevel(item.risk_score) === filter;
    });

    const getRiskIcon = (level: string) => {
        switch (level) {
            case 'High': return <AlertTriangle className="text-red-500" size={20} />;
            case 'Medium': return <Wrench className="text-amber-500" size={20} />;
            default: return <ShieldCheck className="text-emerald-500" size={20} />;
        }
    };

    return (
        <div className="space-y-6">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Maintenance Priority Board</h2>
                    <p className="text-slate-400 mt-2">Ranked list of components requiring attention based on computed risk scores.</p>
                </div>

                <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700/50">
                    {(['All', 'High', 'Medium', 'Low'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === f
                                    ? 'bg-slate-700 text-white shadow'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </header>

            <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/80 text-slate-400 border-b border-slate-700/50 text-sm">
                                <th className="p-4 font-semibold w-16 text-center">Rank</th>
                                <th className="p-4 font-semibold">Aircraft</th>
                                <th className="p-4 font-semibold">Component</th>
                                <th className="p-4 font-semibold">Risk Level</th>
                                <th className="p-4 font-semibold">Action Required</th>
                                <th className="p-4 font-semibold w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/30">
                            {filteredItems.map(item => {
                                const level = getRiskLevel(item.risk_score);
                                const scorePercent = (item.risk_score * 100).toFixed(1);

                                return (
                                    <tr
                                        key={`${item.aircraft_tail}-${item.component_id}`}
                                        onClick={() => onSelectComponent(item.component_id)}
                                        className="hover:bg-slate-700/30 transition-colors cursor-pointer group"
                                    >
                                        <td className="p-4 text-center font-bold text-slate-500">#{item.rank}</td>
                                        <td className="p-4 font-medium text-slate-200">{item.aircraft_tail}</td>
                                        <td className="p-4">{item.component_type}</td>
                                        <td className="p-4">
                                            <div className="flex items-center space-x-2">
                                                {getRiskIcon(level)}
                                                <span className={`font-semibold ${level === 'High' ? 'text-red-400' :
                                                        level === 'Medium' ? 'text-amber-400' : 'text-emerald-400'
                                                    }`}>
                                                    {level} ({scorePercent}%)
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm text-slate-200 font-medium">{item.action}</div>
                                            <div className="text-xs text-slate-400 mt-1 truncate max-w-xs">{item.reasoning}</div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button className="p-2 bg-slate-700/50 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:text-white">
                                                <ChevronRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredItems.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        No components found matching the selected filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
