import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ListChecks, 
  Plane, 
  PieChart, 
  Settings, 
  Activity, 
  AlertTriangle,
  Menu,
  X,
  RefreshCw
} from 'lucide-react';
import { fleetApi } from './api';

// Page Imports
import FleetOverview from './pages/FleetOverview';
import PriorityBoard from './pages/PriorityBoard';
import ComponentDetail from './pages/ComponentDetail';
import AircraftView from './pages/AircraftView';
import FleetBreakdown from './pages/FleetBreakdown';
import SettingsPanel from './pages/SettingsPanel';
import ModelPerformance from './pages/ModelPerformance';

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
        console.error("Failed to fetch global stats", err);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Priorities', path: '/priorities', icon: ListChecks },
    { name: 'Fleet Inventory', path: '/fleet', icon: Plane },
    { name: 'Breakdown', path: '/breakdown', icon: PieChart },
    { name: 'Diagnostics', path: '/model', icon: Activity },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <nav className="bg-slate-900/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-white animate-spin-slow" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent">
                RBAMPS
              </span>
            </div>
            
            <div className="hidden md:flex items-baseline space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
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
              <div className="hidden lg:flex items-center gap-4 border-l border-white/10 pl-6 h-10">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Health Score</span>
                  <div className={`text-sm font-bold ${
                    fleetStats.fleet_health_score > 70 ? 'text-emerald-400' : 
                    fleetStats.fleet_health_score > 40 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {fleetStats.fleet_health_score}%
                  </div>
                </div>
                <div className="bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full flex items-center gap-2 text-xs font-bold border border-rose-500/20 animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  {fleetStats.high_risk_components} High Risk
                </div>
              </div>
            )}
            
            <div className="md:hidden">
              <button 
                onClick={() => setIsOpen(!isOpen)}
                className="text-slate-300 hover:text-white p-2"
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-slate-900 border-b border-white/10 px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <item.icon className="w-5 h-5 text-blue-400" />
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
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30 selection:text-blue-200">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
          <Routes>
            <Route path="/" element={<FleetOverview />} />
            <Route path="/priorities" element={<PriorityBoard />} />
            <Route path="/component/:id" element={<ComponentDetail />} />
            <Route path="/fleet" element={<AircraftView />} />
            <Route path="/breakdown" element={<FleetBreakdown />} />
            <Route path="/model" element={<ModelPerformance />} />
            <Route path="/settings" element={<SettingsPanel />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
