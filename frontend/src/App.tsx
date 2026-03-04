import { useState } from 'react';
import { Activity, LayoutDashboard, List, RefreshCw } from 'lucide-react';
import FleetOverview from './pages/FleetOverview';
import PriorityBoard from './pages/PriorityBoard';
import ComponentHealth from './pages/ComponentHealth';
import { recomputeRisk } from './api';

function App() {
    const [activeTab, setActiveTab] = useState<'fleet' | 'board' | 'health'>('fleet');
    const [selectedCompId, setSelectedCompId] = useState<number | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleUpdate = async () => {
        setIsUpdating(true);
        try {
            await recomputeRisk();
            alert('Pipeline triggered. Data will update shortly. Please refresh the dashboard in a few seconds.');
        } catch (e) {
            alert('Failed to trigger update');
        }
        setIsUpdating(false);
    };

    const navigateToHealth = (compId: number) => {
        setSelectedCompId(compId);
        setActiveTab('health');
    };

    return (
        <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-slate-800/80 border-r border-slate-700/50 flex flex-col">
                <div className="p-6 flex items-center space-x-3 text-primary">
                    <Activity size={28} />
                    <h1 className="text-xl font-bold text-white tracking-wide">Risk<span className="text-primary">Ops</span></h1>
                </div>
                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <button
                        onClick={() => setActiveTab('fleet')}
                        className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all ${activeTab === 'fleet' ? 'bg-primary/20 text-primary' : 'hover:bg-slate-700/50 text-slate-400 hover:text-slate-200'}`}
                    >
                        <LayoutDashboard size={20} />
                        <span className="font-medium">Fleet Overview</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('board')}
                        className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all ${activeTab === 'board' ? 'bg-primary/20 text-primary' : 'hover:bg-slate-700/50 text-slate-400 hover:text-slate-200'}`}
                    >
                        <List size={20} />
                        <span className="font-medium">Priority Board</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-700/50">
                    <button
                        onClick={handleUpdate}
                        disabled={isUpdating}
                        className="flex items-center justify-center space-x-2 w-full p-3 bg-slate-700 hover:bg-slate-600 outline-none rounded-lg text-sm font-medium transition-colors"
                    >
                        <RefreshCw size={16} className={isUpdating ? 'animate-spin' : ''} />
                        <span>Recompute Risk</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto relative">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 pointer-events-none -z-10" />
                <main className="p-8">
                    {activeTab === 'fleet' && <FleetOverview />}
                    {activeTab === 'board' && <PriorityBoard onSelectComponent={navigateToHealth} />}
                    {activeTab === 'health' && <ComponentHealth componentId={selectedCompId} onBack={() => setActiveTab('board')} />}
                </main>
            </div>
        </div>
    );
}

export default App;
