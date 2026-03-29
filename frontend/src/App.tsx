import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ListChecks,
  Plane,
  PieChart,
  Settings,
  Activity,
  Menu,
  X,
  Bot,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { fleetApi } from './api';

import FleetOverview from './pages/FleetOverview';
import PriorityBoard from './pages/PriorityBoard';
import ComponentDetail from './pages/ComponentDetail';
import AircraftView from './pages/AircraftView';
import FleetBreakdown from './pages/FleetBreakdown';
import SettingsPanel from './pages/SettingsPanel';
import ModelPerformance from './pages/ModelPerformance';
import FleetCopilot from './pages/FleetCopilot';

const navItems = [
  { name: 'Overview', path: '/', icon: LayoutDashboard },
  { name: 'Priorities', path: '/priorities', icon: ListChecks },
  { name: 'Fleet', path: '/fleet', icon: Plane },
  { name: 'Breakdown', path: '/breakdown', icon: PieChart },
  { name: 'Copilot', path: '/copilot', icon: Bot },
  { name: 'Model', path: '/model', icon: Activity },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [fleetStats, setFleetStats] = useState<any>(null);
  const location = useLocation();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setFleetStats(await fleetApi.getOverview());
      } catch (err) {
        console.error('Failed to fetch global stats', err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[72px] items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900">RBAMPS</div>
                <div className="text-xs text-slate-500">Aircraft maintenance operations</div>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    location.pathname === item.path
                      ? 'bg-sky-50 text-sky-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {fleetStats && (
              <>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-500">Fleet health </span>
                  <span className="font-semibold text-slate-900">{fleetStats.fleet_health_score}%</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                  <AlertTriangle className="h-4 w-4" />
                  {fleetStats.high_risk_components} high risk
                </div>
              </>
            )}
            <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden button-secondary px-3">
              {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>

          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden button-secondary px-3">
            {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6 lg:px-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`inline-flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                  location.pathname === item.path ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
          <Routes>
            <Route path="/" element={<FleetOverview />} />
            <Route path="/priorities" element={<PriorityBoard />} />
            <Route path="/component/:id" element={<ComponentDetail />} />
            <Route path="/fleet" element={<AircraftView />} />
            <Route path="/breakdown" element={<FleetBreakdown />} />
            <Route path="/copilot" element={<FleetCopilot />} />
            <Route path="/model" element={<ModelPerformance />} />
            <Route path="/settings" element={<SettingsPanel />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
