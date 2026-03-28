import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ListChecks, 
  Settings, 
  BarChart3, 
  Plane, 
  AlertTriangle, 
  RefreshCw, 
  Database
} from 'lucide-react';
import FleetOverview from './pages/FleetOverview';
import PriorityBoard from './pages/PriorityBoard';
import ComponentDetail from './pages/ComponentDetail';
import AircraftView from './pages/AircraftView';
import SettingsPanel from './pages/SettingsPanel';
import ModelPerformance from './pages/ModelPerformance';
import { adminApi } from './api';

const Sidebar = () => {
  const location = useLocation();
  const menuItems = [
    { icon: LayoutDashboard, label: 'Fleet Overview', path: '/' },
    { icon: ListChecks, label: 'Priority List', path: '/priority' },
    { icon: Plane, label: 'Aircraft View', path: '/aircraft' },
    { icon: BarChart3, label: 'Model Performance', path: '/model' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="w-64 h-screen glass border-r border-white/10 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-8 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)]">
          <Database size={18} className="text-white" />
        </div>
        <h1 className="text-xl font-black tracking-tighter text-white">RBAMPS</h1>
      </div>
      
      <nav className="flex-1 px-4 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mb-2 ${
                isActive 
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-white/5">
        <div className="p-4 glass rounded-xl text-center">
          <p className="text-xs text-slate-500 mb-2">System Status</p>
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></span>
            <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const AlertBanner = () => {
  const [visible, setVisible] = useState(true);
  
  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 left-68 z-[60] px-6 py-4 bg-red-600 text-white rounded-2xl shadow-2xl flex items-center justify-between animate-slide-up border border-red-500/50 ml-64">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
          <AlertTriangle className="text-white" />
        </div>
        <div>
          <p className="font-bold text-lg">Critical Risk Alert</p>
          <p className="text-sm opacity-90">Multiple components have escalated to HIGH priority since the last sync.</p>
        </div>
      </div>
      <button 
        onClick={() => setVisible(false)}
        className="px-4 py-2 bg-black/20 hover:bg-black/30 rounded-xl text-xs font-bold transition-all"
      >
        ACKNOWLEDGE
      </button>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#060608] flex">
        <Sidebar />
        <main className="flex-1 ml-64 p-8 relative">
          <AlertBanner />
          <div className="max-w-7xl mx-auto pt-4">
            <Routes>
              <Route path="/" element={<FleetOverview />} />
              <Route path="/priority" element={<PriorityBoard />} />
              <Route path="/component/:id" element={<ComponentDetail />} />
              <Route path="/aircraft" element={<AircraftView />} />
              <Route path="/aircraft/:id" element={<AircraftView />} />
              <Route path="/model" element={<ModelPerformance />} />
              <Route path="/settings" element={<SettingsPanel />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}
