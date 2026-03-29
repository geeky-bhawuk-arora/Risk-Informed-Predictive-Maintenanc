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
  ChevronRight,
  LogOut,
  Bell,
  Search
} from 'lucide-react';
import { fleetApi } from './api';

import FleetOverview from './pages/FleetOverview';
import PriorityBoard from './pages/PriorityBoard';
import ComponentDetail from './pages/ComponentDetail';
import AircraftView from './pages/AircraftView';
import AircraftDetail from './pages/AircraftDetail';
import FleetBreakdown from './pages/FleetBreakdown';
import SettingsPanel from './pages/SettingsPanel';
import ModelPerformance from './pages/ModelPerformance';
import FleetCopilot from './pages/FleetCopilot';

const navItems = [
  { group: 'Operational', items: [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Risk Priorities', path: '/priorities', icon: ListChecks },
    { name: 'Fleet Inventory', path: '/fleet', icon: Plane },
  ]},
  { group: 'Analytics', items: [
    { name: 'Health Breakdown', path: '/breakdown', icon: PieChart },
    { name: 'Model Health', path: '/model', icon: Activity },
  ]},
  { group: 'Intelligence', items: [
    { name: 'Fleet Copilot', path: '/copilot', icon: Bot },
  ]},
  { group: 'System', items: [
    { name: 'Settings', path: '/settings', icon: Settings },
  ]}
];

const Sidebar = ({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (o: boolean) => void }) => {
  const location = useLocation();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 lg:static lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col">
          {/* Logo Section */}
          <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-lg shadow-sky-200">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-slate-900">RBAMPS</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-sky-600">Risk Engine v2.4</div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-8 mt-4">
            {navItems.map((group) => (
              <div key={group.group}>
                <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {group.group}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => setIsOpen(false)}
                        className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                          isActive 
                            ? 'bg-sky-50 text-sky-700' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className={`h-5 w-5 transition-colors ${isActive ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                          {item.name}
                        </div>
                        {isActive && <div className="h-1.5 w-1.5 rounded-full bg-sky-600 shadow-sm shadow-sky-400"></div>}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="mt-auto border-t border-slate-100 p-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold">
                  BA
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate text-slate-900">Bhawuk Arora</div>
                  <div className="text-xs text-slate-500 truncate">System Admin</div>
                </div>
                <button className="text-slate-400 hover:text-rose-600 transition">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

const Topbar = ({ setIsOpen, fleetStats }: { setIsOpen: (o: boolean) => void, fleetStats: any }) => {
  return (
    <header className="sticky top-0 z-30 h-20 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Quick actions (⌘K)" 
              className="w-80 rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          {fleetStats && (
            <div className="hidden items-center gap-3 xl:flex">
              <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Fleet Health: {fleetStats.fleet_health_score}%
              </div>
              <div className="flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                {fleetStats.high_risk_components} High Risk
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <button className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 transition">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2.5 top-2.5 flex h-2 w-2 rounded-full bg-rose-500"></span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

const App = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [fleetStats, setFleetStats] = useState<any>(null);

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
    <Router>
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        
        <div className="flex flex-1 flex-col min-w-0">
          <Topbar setIsOpen={setIsSidebarOpen} fleetStats={fleetStats} />
          
          <main className="flex-1 overflow-y-auto p-6 lg:p-10 max-w-[1600px] animate-fade-in">
            <Routes>
              <Route path="/" element={<FleetOverview />} />
              <Route path="/priorities" element={<PriorityBoard />} />
              <Route path="/component/:id" element={<ComponentDetail />} />
              <Route path="/fleet" element={<AircraftView />} />
              <Route path="/aircraft/:id" element={<AircraftDetail />} />
              <Route path="/breakdown" element={<FleetBreakdown />} />
              <Route path="/copilot" element={<FleetCopilot />} />
              <Route path="/model" element={<ModelPerformance />} />
              <Route path="/settings" element={<SettingsPanel />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;

