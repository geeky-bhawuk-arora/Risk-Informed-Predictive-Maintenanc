import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plane, 
  MapPin, 
  Calendar, 
  ChevronRight, 
  Activity, 
  ChevronLeft,
  Filter
} from 'lucide-react';
import { aircraftApi } from '../api';

const AircraftView = () => {
    const [fleet, setFleet] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        aircraftApi.getAll(page, 20).then(res => {
            setFleet(res.aircraft || []);
            setTotal(res.total || 0);
            setIsLoading(false);
        }).catch(() => setIsLoading(false));
    }, [page]);

    // Simple search filter
    const filteredFleet = fleet.filter(a => 
        a.registration.toLowerCase().includes(search.toLowerCase()) ||
        a.type.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Fleet Inventory</h1>
                    <p className="text-slate-400 mt-1">Real-time status of {total} aircraft in service.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                            type="text" 
                            placeholder="Filter by tail #..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-slate-900 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:border-blue-500/50 outline-none w-64 transition-all"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full h-64 flex items-center justify-center text-slate-500 animate-pulse">Scanning Fleet Registry...</div>
                ) : filteredFleet.length === 0 ? (
                    <div className="col-span-full h-64 flex items-center justify-center text-slate-500">No aircraft found matching filter.</div>
                ) : filteredFleet.map((ac: any) => (
                    <AircraftCard key={ac.aircraft_id} ac={ac} />
                ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-slate-500 text-sm px-4 pt-8">
                <p>Tail Numbers { (page-1)*20 + 1 } to { Math.min(page*20, total) } of {total}</p>
                <div className="flex items-center gap-2">
                    <button 
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="p-2 border border-white/10 rounded-xl hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 font-bold text-white uppercase tracking-tighter">PAGE {page}</span>
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

const AircraftCard = ({ ac }: any) => {
    const age = new Date().getFullYear() - new Date(ac.manufacture_date).getFullYear();
    const [health, setHealth] = useState<any>(null);

    useEffect(() => {
        aircraftApi.getDetail(ac.aircraft_id).then(setHealth);
    }, [ac.aircraft_id]);

    return (
        <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl group hover:border-white/20 hover:bg-slate-900/80 transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/10 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Plane className="w-6 h-6 text-blue-400 group-hover:text-white transition-all" />
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{ac.registration}</h4>
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{ac.type}</span>
                    </div>
                </div>
                {health && (
                    <div className={`px-2 py-1 rounded-lg text-xs font-black tracking-widest ${
                        health.health_score > 70 ? 'text-emerald-500 bg-emerald-500/10' : 
                        health.health_score > 40 ? 'text-amber-500 bg-amber-500/10' : 'text-rose-500 bg-rose-500/10'
                    }`}>
                        {health.health_score}%
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Base
                    </div>
                    <div className="text-xs text-white font-bold">{ac.base_airport} ({ac.climate_zone})</div>
                </div>
                <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Age
                    </div>
                    <div className="text-xs text-white font-bold">{age} Years Old</div>
                </div>
            </div>

            <div className="pt-6 border-t border-white/5 flex items-center justify-between text-slate-500 group-hover:text-slate-200 transition-colors">
                 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <Activity className="w-4 h-4 text-blue-500" />
                    {health?.tier_counts?.HIGH || 0} HIGH RISK
                 </div>
                 <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
        </div>
    )
};

export default AircraftView;
