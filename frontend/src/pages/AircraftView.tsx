import React, { useEffect, useState } from 'react';
import { Search, Plane, MapPin, Calendar, ChevronRight, Activity, ChevronLeft, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { aircraftApi } from '../api';

const AircraftView = () => {
  const [fleet, setFleet] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    aircraftApi.getAll(page, 12).then((res) => {
      setFleet(res.aircraft || []);
      setTotal(res.total || 0);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [page]);

  const filteredFleet = fleet.filter((aircraft) =>
    aircraft.registration.toLowerCase().includes(search.toLowerCase()) ||
    aircraft.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Fleet Inventory</h1>
          <p className="mt-2 text-slate-500 max-w-2xl">Monitor real-time health across your entire fleet. Identify high-risk assets and optimize maintenance cycles based on predictive risk scores.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search registration or type..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm font-medium outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-3xl bg-slate-200/50 border border-slate-100"></div>
          ))
        ) : filteredFleet.length === 0 ? (
          <div className="col-span-full h-64 flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
            <Plane className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-lg font-semibold">No aircraft found</p>
            <p className="text-sm mt-1">Try adjusting your search criteria</p>
          </div>
        ) : filteredFleet.map((aircraft) => (
          <AircraftCard key={aircraft.aircraft_id} aircraft={aircraft} />
        ))}
      </div>

      <div className="flex flex-col gap-4 border-t border-slate-100 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-slate-500">
          Showing <span className="text-slate-900 font-bold">{(page - 1) * 12 + 1}</span> to <span className="text-slate-900 font-bold">{Math.min(page * 12, total)}</span> of <span className="text-slate-900 font-bold">{total}</span> assets
        </p>
        <div className="flex items-center gap-3">
          <button 
            disabled={page === 1} 
            onClick={() => { setPage((p) => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-sm font-bold text-white shadow-lg shadow-sky-100">
            {page}
          </div>
          <button 
            disabled={page * 12 >= total} 
            onClick={() => { setPage((p) => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const AircraftCard = ({ aircraft }: any) => {
  const age = new Date().getFullYear() - new Date(aircraft.manufacture_date).getFullYear();
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    aircraftApi.getDetail(aircraft.aircraft_id).then(setHealth).catch(() => {});
  }, [aircraft.aircraft_id]);

  return (
    <div className="group relative flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-500/5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 transition-colors group-hover:bg-sky-50 group-hover:text-sky-600">
            <Plane className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900">{aircraft.registration}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-sky-600">{aircraft.type}</div>
          </div>
        </div>
        {health && (
          <div className={`rounded-xl px-2.5 py-1.5 text-xs font-black ring-1 ${getHealthStyles(health.health_score)}`}>
            {health.health_score}%
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-50/50 p-3 ring-1 ring-slate-100/50">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <MapPin className="h-3 w-3" /> Base
          </div>
          <div className="mt-1 text-sm font-bold text-slate-800">{aircraft.base_airport}</div>
        </div>
        <div className="rounded-2xl bg-slate-50/50 p-3 ring-1 ring-slate-100/50">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <Calendar className="h-3 w-3" /> Age
          </div>
          <div className="mt-1 text-sm font-bold text-slate-800">{age} yrs</div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-slate-50 pt-4">
        <div className="flex flex-col">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Risk Profile</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-700">
            <Activity className="h-4 w-4 text-sky-500" />
            {health?.tier_counts?.HIGH || 0} Critical
          </div>
        </div>
        <Link 
          to={`/aircraft/${aircraft.aircraft_id}`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white transition-transform hover:scale-110 group-hover:bg-sky-600"
        >
          <ArrowUpRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
};

const getHealthStyles = (score: number) => {
  if (score > 70) return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  if (score > 40) return 'bg-amber-50 text-amber-700 ring-amber-100';
  return 'bg-rose-50 text-rose-700 ring-rose-100';
};

export default AircraftView;

