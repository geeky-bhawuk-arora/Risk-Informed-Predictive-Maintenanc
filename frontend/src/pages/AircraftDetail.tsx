import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Plane, 
  ChevronLeft, 
  Activity, 
  AlertTriangle, 
  Search,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  MapPin,
  Calendar,
  Layers
} from 'lucide-react';
import { aircraftApi, componentApi } from '../api';

const AircraftDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [aircraft, setAircraft] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [components, setComponents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    
    // In a real app we'd have a getAircraftByRegistration/Id, 
    // but here we might need to find it from the list or assume aircraftApi.getDetail(id) returns it.
    // Looking at api.ts, getDetail returns health. 
    // We might need to fetch all aircraft and find this one if there's no single aircraft get.
    
    Promise.all([
      aircraftApi.getDetail(id),
      aircraftApi.getComponents(id),
      aircraftApi.getAll(1, 1000) // Hack to find aircraft metadata
    ]).then(([healthData, compData, allAircraft]) => {
      setHealth(healthData);
      setComponents(compData.components || []);
      const meta = allAircraft.aircraft.find((a: any) => a.aircraft_id === parseInt(id));
      setAircraft(meta);
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-600 border-t-transparent"></div>
          <p className="text-slate-500 animate-pulse">Loading aircraft details...</p>
        </div>
      </div>
    );
  }

  if (!aircraft) {
    return (
      <div className="surface-card p-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">Aircraft Not Found</h2>
        <p className="mt-2 text-slate-500">The aircraft you're looking for doesn't exist or has been retired.</p>
        <Link to="/fleet" className="button-primary mt-6">
          <ChevronLeft className="h-4 w-4" />
          Back to Fleet
        </Link>
      </div>
    );
  }

  const filteredComponents = components.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.part_number && c.part_number.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/fleet" className="button-secondary p-2 shadow-none border-none hover:bg-slate-200">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Plane className="h-6 w-6 text-sky-600" />
            {aircraft.registration}
          </h1>
          <p className="text-slate-500">{aircraft.type} • {aircraft.operator}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick Stats */}
        <div className="surface-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Health Score</span>
            <Activity className="h-5 w-5 text-sky-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{health?.health_score}%</span>
            <span className={`flex items-center text-xs font-semibold ${health?.health_score > 70 ? 'text-emerald-600' : 'text-rose-600'}`}>
              <TrendingDown className="h-3 w-3 mr-1" /> -2.4%
            </span>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${getHealthBg(health?.health_score)}`}
              style={{ width: `${health?.health_score}%` }}
            ></div>
          </div>
        </div>

        <div className="surface-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Risk Tier Distribution</span>
            <Layers className="h-5 w-5 text-sky-600" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 text-center">
              <div className="text-2xl font-bold text-rose-600">{health?.tier_counts?.HIGH || 0}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">High</div>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex-1 text-center">
              <div className="text-2xl font-bold text-amber-600">{health?.tier_counts?.MEDIUM || 0}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Medium</div>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex-1 text-center">
              <div className="text-2xl font-bold text-emerald-600">{health?.tier_counts?.LOW || 0}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Low</div>
            </div>
          </div>
          <div className="mt-4 flex h-2 w-full rounded-full overflow-hidden bg-slate-100">
            <div className="h-full bg-rose-500" style={{ width: `${((health?.tier_counts?.HIGH || 0) / components.length) * 100}%` }}></div>
            <div className="h-full bg-amber-500" style={{ width: `${((health?.tier_counts?.MEDIUM || 0) / components.length) * 100}%` }}></div>
            <div className="h-full bg-emerald-500" style={{ width: `${((health?.tier_counts?.LOW || 0) / components.length) * 100}%` }}></div>
          </div>
        </div>

        <div className="surface-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Operational Meta</span>
            <MapPin className="h-5 w-5 text-sky-600" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 flex items-center gap-2"><MapPin className="h-3 w-3" /> Home Base</span>
              <span className="font-semibold">{aircraft.base_airport}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 flex items-center gap-2"><Calendar className="h-3 w-3" /> Age</span>
              <span className="font-semibold">{new Date().getFullYear() - new Date(aircraft.manufacture_date).getFullYear()} years</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 flex items-center gap-2"><Activity className="h-3 w-3" /> Climate Zone</span>
              <span className="font-semibold">{aircraft.climate_zone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Components List */}
      <div className="surface-card overflow-hidden">
        <div className="border-b border-slate-100 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-bold">Installed Components</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search components..."
                className="input-clean pl-10 h-10 py-0"
              />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-4">Component</th>
                <th className="px-6 py-4">Part Number</th>
                <th className="px-6 py-4">Risk Level</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredComponents.map((comp) => (
                <tr key={comp.component_id} className="group hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{comp.name}</div>
                    <div className="text-xs text-slate-500 capitalize">{comp.system_category}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-slate-600">
                    {comp.part_number}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase ${getTierStyles(comp.risk_level)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${getTierDot(comp.risk_level)}`}></span>
                      {comp.risk_level}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      to={`/component/${comp.component_id}`}
                      className="inline-flex items-center gap-1 text-sm font-bold text-sky-600 opacity-0 group-hover:opacity-100 transition"
                    >
                      Analyze <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredComponents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No components found matching "{search}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const getHealthBg = (score: number) => {
  if (score > 70) return 'bg-emerald-500';
  if (score > 40) return 'bg-amber-500';
  return 'bg-rose-500';
};

const getTierStyles = (tier: string) => {
  switch (tier) {
    case 'HIGH': return 'bg-rose-50 text-rose-700 border border-rose-100';
    case 'MEDIUM': return 'bg-amber-50 text-amber-700 border border-amber-100';
    case 'LOW': return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
    default: return 'bg-slate-50 text-slate-700';
  }
};

const getTierDot = (tier: string) => {
  switch (tier) {
    case 'HIGH': return 'bg-rose-600';
    case 'MEDIUM': return 'bg-amber-600';
    case 'LOW': return 'bg-emerald-600';
    default: return 'bg-slate-600';
  }
};

export default AircraftDetail;
