import React, { useEffect, useState } from 'react';
import { ArrowRight, Search, Download, ChevronLeft, ChevronRight, AlertCircle, Clock, CheckCircle, Filter, RotateCcw, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { componentApi } from '../api';

const categories = ['Propulsion', 'Flight Controls', 'Landing Gear', 'Hydraulics', 'Avionics', 'Electrical', 'Pneumatics', 'Fuel', 'Structural', 'Cabin'];

const PriorityBoard = () => {
  const [components, setComponents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await componentApi.getRiskRankings(page, 20, level || undefined, category || undefined, search || undefined);
      setComponents(res.components || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to fetch rankings', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, level, category]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Priority Board</h1>
          <p className="mt-2 text-slate-500 max-w-2xl font-medium">Global risk rankings across all components. Prioritize maintenance based on AI-driven risk scores and operational impact.</p>
        </div>
        <button 
          onClick={() => window.open(componentApi.exportRankings(), '_blank')} 
          className="flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800 self-start md:self-auto"
        >
          <Download className="h-4 w-4" />
          Export Dataset
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              placeholder="Search by component ID, system, or airframe..."
              className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-3.5 pl-12 pr-4 text-sm font-medium outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-1.5 ring-1 ring-slate-100">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select 
                value={level} 
                onChange={(e) => { setLevel(e.target.value); setPage(1); }} 
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="">All Tiers</option>
                <option value="HIGH">Critical Only</option>
                <option value="MEDIUM">Planned Only</option>
                <option value="LOW">Routine Only</option>
              </select>
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-1.5 ring-1 ring-slate-100">
              <Activity className="h-3.5 w-3.5 text-slate-400" />
              <select 
                value={category} 
                onChange={(e) => { setCategory(e.target.value); setPage(1); }} 
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="">All Systems</option>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>

            <button
              onClick={() => {
                setSearch('');
                setLevel('');
                setCategory('');
                setPage(1);
                fetchData();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-400 border border-slate-200 hover:text-rose-600 hover:border-rose-100 transition shadow-sm"
              title="Reset Filters"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <th className="px-8 py-5">Component & Airframe</th>
                <th className="px-8 py-5">System Category</th>
                <th className="px-8 py-5">Risk Score</th>
                <th className="px-8 py-5">Priority Status</th>
                <th className="px-8 py-5">Prescriptive Action</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-8 py-6"><div className="h-8 bg-slate-100 rounded-xl w-full"></div></td>
                  </tr>
                ))
              ) : components.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-4">
                      <Search className="h-8 w-8" />
                    </div>
                    <p className="text-lg font-bold text-slate-900">No components found</p>
                    <p className="text-sm text-slate-500 mt-1">Try relaxing your search or filter criteria.</p>
                  </td>
                </tr>
              ) : components.map((component) => (
                <tr key={component.id} className="group hover:bg-slate-50/80 transition-colors">
                  <td className="px-8 py-5">
                    <div className="font-extrabold text-slate-900 group-hover:text-sky-600 transition-colors">{component.name}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">Asset ID {component.aircraft_id}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm font-bold text-slate-700">{component.system}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="font-mono text-sm font-black text-slate-900">{(component.risk_score * 100).toFixed(2)}%</div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ring-1 ${getBadgeStyles(component.level)}`}>
                      {component.level === 'HIGH' && <AlertCircle className="h-3 w-3" />}
                      {component.level === 'MEDIUM' && <Clock className="h-3 w-3" />}
                      {component.level === 'LOW' && <CheckCircle className="h-3 w-3" />}
                      {component.level}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-xs font-bold text-slate-500 max-w-[200px]">{component.recommended_action}</div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <Link to={`/component/${component.id}`} className="group/btn inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-sky-600 shadow-lg shadow-slate-200 hover:shadow-sky-100">
                      View
                      <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
        <p className="text-sm font-bold text-slate-400">
          Page <span className="text-slate-900">{page}</span> of <span className="text-slate-900">{Math.ceil(total / 20)}</span> • {total} components monitored
        </p>
        <div className="flex items-center gap-3">
          <button 
            disabled={page === 1} 
            onClick={() => { setPage((p) => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <button 
            disabled={page * 20 >= total} 
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

const getBadgeStyles = (level: string) => {
  switch (level) {
    case 'HIGH':
      return 'bg-rose-50 text-rose-700 ring-rose-100';
    case 'MEDIUM':
      return 'bg-amber-50 text-amber-700 ring-amber-100';
    default:
      return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  }
};

export default PriorityBoard;
