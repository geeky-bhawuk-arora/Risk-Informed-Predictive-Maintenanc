import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, Search, Download, Filter, 
  ChevronLeft, ChevronRight, AlertCircle, 
  Clock, CheckCircle, Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { componentApi } from '../api';

const PriorityBoard = () => {
    const [components, setComponents] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [level, setLevel] = useState<string>("");
    const [category, setCategory] = useState<string>("");
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await componentApi.getRiskRankings(page, 20, level, category, search || undefined);
            setComponents(res.components || []);
            setTotal(res.total || 0);
        } catch (err) {
            console.error("Failed to fetch rankings", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, level, category]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchData(); // Simplification: search on enter
    };

    const handleExport = () => {
        window.open(componentApi.exportRankings(), '_blank');
    };

    const categories = ["Propulsion", "Flight Controls", "Landing Gear", "Hydraulics", "Avionics", "Electrical", "Pneumatics", "Fuel", "Structural", "Cabin"];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Priority Board</h1>
                <div className="flex gap-2">
                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-all"
                    >
                        <Download className="w-4 h-4" />
                        Export (.csv)
                    </button>
                    {/* Add CSV export download via hidden link or simple fetch */}
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center gap-4 backdrop-blur-md">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="Search aircraft or component..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-950 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none"
                    />
                </div>
                
                <select 
                    value={level} 
                    onChange={(e) => setLevel(e.target.value)}
                    className="bg-slate-950 border border-white/5 rounded-xl py-2 px-4 text-sm outline-none focus:border-blue-500/50"
                >
                    <option value="">All Tiers</option>
                    <option value="HIGH">High Severity</option>
                    <option value="MEDIUM">Medium Severity</option>
                    <option value="LOW">Monitor Only</option>
                </select>

                <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-slate-950 border border-white/5 rounded-xl py-2 px-4 text-sm outline-none focus:border-blue-500/50"
                >
                    <option value="">All Systems</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                
                <button 
                    onClick={() => { setLevel(""); setCategory(""); setPage(1); }}
                    className="text-slate-400 hover:text-white flex items-center gap-1 text-sm underline underline-offset-4"
                >
                    Clear Filters
                </button>
            </div>

            {/* Table */}
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                <th className="px-6 py-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">Component</th>
                                <th className="px-6 py-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">System</th>
                                <th className="px-6 py-4 text-slate-400 font-semibold text-xs uppercase tracking-wider text-center">Risk Score</th>
                                <th className="px-6 py-4 text-slate-400 font-semibold text-xs uppercase tracking-wider text-center">Tier</th>
                                <th className="px-6 py-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">Recommended Action</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Querying Fleet Intelligence...</td></tr>
                            ) : components.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No components matching your filters.</td></tr>
                            ) : components.map((c: any) => (
                                <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-white group-hover:text-blue-400 transition-colors">{c.name}</div>
                                        <div className="text-xs text-slate-500">Aircraft ID: {c.aircraft_id}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-slate-300">{c.system}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center font-mono text-white">
                                        {(c.risk_score * 100).toFixed(1)}%
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getBadgeStyles(c.level)}`}>
                                            {c.level === 'HIGH' && <AlertCircle className="w-3 h-3" />}
                                            {c.level === 'MEDIUM' && <Clock className="w-3 h-3" />}
                                            {c.level === 'LOW' && <CheckCircle className="w-3 h-3" />}
                                            {c.level}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${c.level === 'HIGH' ? 'bg-rose-500' : 'bg-slate-600'}`}></div>
                                            <span className="text-sm text-slate-400">
                                                {c.recommended_action}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link 
                                            to={`/component/${c.id}`}
                                            className="p-2 bg-slate-800 hover:bg-blue-600 rounded-lg inline-flex text-white transition-all hover:scale-110 active:scale-90"
                                        >
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-slate-400 text-sm px-4">
                <p>Showing 1-20 of {total} components</p>
                <div className="flex items-center gap-2">
                    <button 
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="p-2 border border-white/10 rounded-xl hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 font-bold text-white">Page {page}</span>
                    <button 
                        disabled={page * 20 >= total}
                        onClick={() => setPage(p => p + 1)}
                        className="p-2 border border-white/10 rounded-xl hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const getBadgeStyles = (level: string) => {
    switch (level) {
        case 'HIGH': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
        case 'MEDIUM': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        case 'LOW': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
}

export default PriorityBoard;
