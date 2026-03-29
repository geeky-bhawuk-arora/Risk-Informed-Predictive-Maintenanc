import React, { useEffect, useState } from 'react';
import { ArrowRight, Search, Download, ChevronLeft, ChevronRight, AlertCircle, Clock, CheckCircle } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">Priority Board</h1>
          <p className="page-subtitle mt-2">Review ranked components, filter by severity or system, and drill into the items that need action first.</p>
        </div>
        <button onClick={() => window.open(componentApi.exportRankings(), '_blank')} className="button-secondary">
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="surface-card p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr),180px,180px,auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              placeholder="Search component, system, or type"
              className="input-clean pl-10"
            />
          </div>

          <select value={level} onChange={(e) => setLevel(e.target.value)} className="input-clean">
            <option value="">All priority levels</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-clean">
            <option value="">All systems</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>

          <button
            onClick={() => {
              setSearch('');
              setLevel('');
              setCategory('');
              setPage(1);
            }}
            className="button-secondary"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-6 py-4 font-semibold">Component</th>
                <th className="px-6 py-4 font-semibold">System</th>
                <th className="px-6 py-4 font-semibold">Risk score</th>
                <th className="px-6 py-4 font-semibold">Priority</th>
                <th className="px-6 py-4 font-semibold">Action</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading ranked components...</td></tr>
              ) : components.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No components match the current filters.</td></tr>
              ) : components.map((component) => (
                <tr key={component.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{component.name}</div>
                    <div className="text-xs text-slate-500">Aircraft ID {component.aircraft_id}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{component.system}</td>
                  <td className="px-6 py-4 font-mono text-slate-900">{(component.risk_score * 100).toFixed(1)}%</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${getBadgeStyles(component.level)}`}>
                      {component.level === 'HIGH' && <AlertCircle className="h-3.5 w-3.5" />}
                      {component.level === 'MEDIUM' && <Clock className="h-3.5 w-3.5" />}
                      {component.level === 'LOW' && <CheckCircle className="h-3.5 w-3.5" />}
                      {component.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{component.recommended_action}</td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/component/${component.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-800">
                      View
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <p>
          Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} components
        </p>
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

const getBadgeStyles = (level: string) => {
  switch (level) {
    case 'HIGH':
      return 'bg-rose-50 text-rose-700';
    case 'MEDIUM':
      return 'bg-amber-50 text-amber-700';
    default:
      return 'bg-emerald-50 text-emerald-700';
  }
};

export default PriorityBoard;
