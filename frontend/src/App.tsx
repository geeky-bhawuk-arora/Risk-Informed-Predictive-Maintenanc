import React, { useState, useEffect } from 'react';
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
  Orbit,
  Radar,
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

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [fleetStats, setFleetStats] = useState<any>(null);
  const location = useLocation();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await fleetApi.getOverview();
        setFleetStats(stats);
      } catch (err) {
        console.error('Failed to fetch global stats', err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Priorities', path: '/priorities', icon: ListChecks },
    { name: 'Fleet', path: '/fleet', icon: Plane },
    { name: 'Breakdown', path: '/breakdown', icon: PieChart },
    { name: 'Copilot', path: '/copilot', icon: Bot },
    { name: 'Diagnostics', path: '/model', icon: Activity },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#22d3ee,#0f172a)] shadow-[0_12px_30px_rgba(34,211,238,0.32)]">
                <Orbit className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-xl font-black bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
                  RBAMPS
                </div>
                <div className="text-[10px] uppercase tracking-[0.32em] text-slate-500">Risk Command Center</div>
              </div>
            </div>

            <div className="hidden xl:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <Radar className="h-3.5 w-3.5 text-cyan-300" />
              <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-300">Academic demo build</span>
            </div>

            <div className="hidden md:flex items-baseline space-x-3">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    location.pathname === item.path
                      ? 'bg-cyan-400 text-slate-950'
                      : 'text-slate-300 hover:bg-slate-800/90 hover:text-white'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {fleetStats && (
              <div className="hidden lg:flex items-center gap-3 border-l border-white/10 pl-6 h-10">
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                  Health {fleetStats.fleet_health_score}%
                </div>
                <div className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-xs font-bold text-rose-300">
                  {fleetStats.high_risk_components} High Risk
                </div>
              </div>
            )}

            <div className="md:hidden">
              <button onClick={() => setIsOpen(!isOpen)} className="text-slate-300 hover:text-white p-2">
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-slate-950 border-b border-white/10 px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-2xl text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <item.icon className="w-5 h-5 text-cyan-300" />
              {item.name}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_22%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_18%),linear-gradient(180deg,#020617,#0f172a_42%,#020617)] text-slate-100 font-sans selection:bg-cyan-400/30 selection:text-cyan-100">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
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
