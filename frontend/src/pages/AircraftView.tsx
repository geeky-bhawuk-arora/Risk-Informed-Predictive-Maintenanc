import React, { useEffect, useState } from 'react';
import { Search, Plane, MapPin, Calendar, ChevronRight, Activity, ChevronLeft } from 'lucide-react';
import { aircraftApi } from '../api';

const AircraftView = () => {
  const [fleet, setFleet] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    aircraftApi.getAll(page, 20).then((res) => {
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
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">Fleet Inventory</h1>
          <p className="page-subtitle mt-2">Browse aircraft, compare health, and identify which assets are carrying the most risk.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search registration or type"
            className="input-clean pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <div className="surface-card col-span-full h-48 flex items-center justify-center text-slate-500">Loading aircraft inventory...</div>
        ) : filteredFleet.length === 0 ? (
          <div className="surface-card col-span-full h-48 flex items-center justify-center text-slate-500">No aircraft match the current search.</div>
        ) : filteredFleet.map((aircraft) => (
          <AircraftCard key={aircraft.aircraft_id} aircraft={aircraft} />
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <p>Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} aircraft</p>
        <div className="flex items-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="button-secondary px-3 disabled:opacity-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="rounded-xl bg-white px-3 py-2 font-medium text-slate-700">Page {page}</span>
          <button disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)} className="button-secondary px-3 disabled:opacity-50">
            <ChevronRight className="h-4 w-4" />
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
    aircraftApi.getDetail(aircraft.aircraft_id).then(setHealth);
  }, [aircraft.aircraft_id]);

  return (
    <div className="surface-card p-5 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <Plane className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold text-slate-900">{aircraft.registration}</div>
            <div className="text-sm text-slate-500">{aircraft.type}</div>
          </div>
        </div>
        {health && (
          <div className={`rounded-xl px-3 py-2 text-sm font-semibold ${getHealthStyles(health.health_score)}`}>
            {health.health_score}%
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div className="surface-muted px-3 py-3">
          <div className="flex items-center gap-2 text-slate-500">
            <MapPin className="h-4 w-4" />
            Base
          </div>
          <div className="mt-2 font-medium text-slate-900">{aircraft.base_airport}</div>
          <div className="text-slate-500">{aircraft.climate_zone}</div>
        </div>
        <div className="surface-muted px-3 py-3">
          <div className="flex items-center gap-2 text-slate-500">
            <Calendar className="h-4 w-4" />
            Age
          </div>
          <div className="mt-2 font-medium text-slate-900">{age} years</div>
          <div className="text-slate-500">Since manufacture</div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
        <div className="inline-flex items-center gap-2 text-sm text-slate-600">
          <Activity className="h-4 w-4 text-sky-600" />
          {health?.tier_counts?.HIGH || 0} high-risk components
        </div>
        <button className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700">
          View details
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const getHealthStyles = (score: number) => {
  if (score > 70) return 'bg-emerald-50 text-emerald-700';
  if (score > 40) return 'bg-amber-50 text-amber-700';
  return 'bg-rose-50 text-rose-700';
};

export default AircraftView;
