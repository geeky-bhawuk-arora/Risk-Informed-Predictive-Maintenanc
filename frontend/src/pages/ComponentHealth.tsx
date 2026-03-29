import { useEffect, useState } from 'react';
import { componentApi } from '../api';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function ComponentHealth({ componentId, onBack }: { componentId: number | null; onBack: () => void }) {
  const [risk, setRisk] = useState<any>(null);
  const [sensors, setSensors] = useState<any[]>([]);

  useEffect(() => {
    if (!componentId) return;

    Promise.all([
      componentApi.getRiskDetail(componentId),
      componentApi.getSensorHistory(componentId),
    ]).then(([riskResponse, sensorResponse]) => {
      setRisk(riskResponse);
      setSensors(sensorResponse);
    });
  }, [componentId]);

  if (!componentId) return <div className="text-slate-400">No component selected.</div>;
  if (!risk) return <div className="text-slate-400 animate-pulse">Loading component telemetry...</div>;

  const vibData = sensors.filter((sensor) => sensor.type === 'Vib').map((sensor) => ({
    time: new Date(sensor.timestamp).toLocaleDateString(),
    vibration: sensor.value,
  }));

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-slate-400 hover:text-white">Back</button>
      <div className="text-white text-2xl font-bold">{risk.component_name}</div>
      <div className="text-slate-400">Risk score: {risk.risk_score.toFixed(3)}</div>
      <div className="h-64 glass-panel p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={vibData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
            <Line type="monotone" dataKey="vibration" stroke="#3b82f6" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
