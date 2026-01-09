
import React from 'react';
import { GameStats } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  stats: GameStats;
}

const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
  // Datos para el gráfico: mostramos el progreso desde 0 hasta el Elo actual
  const chartData = stats.wins + stats.losses > 0 
    ? [
        { name: 'Inicio', elo: 0 }, 
        { name: 'Actual', elo: stats.elo }
      ]
    : [];

  return (
    <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
      <h2 className="text-2xl font-orbitron mb-6 flex items-center gap-3">
        <i className="fas fa-trophy text-yellow-500"></i>
        Arena Competitive
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 p-4 rounded-lg text-center border border-slate-800">
          <p className="text-slate-400 text-xs uppercase font-bold tracking-tighter">Rango Elo</p>
          <p className="text-3xl font-bold text-cyan-400">{stats.elo}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-lg text-center border border-slate-800">
          <p className="text-slate-400 text-xs uppercase font-bold tracking-tighter">Victorias</p>
          <p className="text-3xl font-bold text-emerald-400">{stats.wins}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-lg text-center border border-slate-800">
          <p className="text-slate-400 text-xs uppercase font-bold tracking-tighter">Derrotas</p>
          <p className="text-3xl font-bold text-rose-400">{stats.losses}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-lg text-center border border-slate-800">
          <p className="text-slate-400 text-xs uppercase font-bold tracking-tighter">Win Rate</p>
          <p className="text-3xl font-bold text-white">
            {stats.wins + stats.losses > 0 ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="h-80 w-full bg-slate-900 p-6 rounded-lg border border-slate-800 flex flex-col">
        <p className="text-sm mb-6 text-slate-400 font-bold uppercase tracking-widest text-xs flex-shrink-0">Progreso Elo Reciente</p>
        
        {/* Contenedor del gráfico con min-h-0 y flex-1 para estabilizar ResponsiveContainer */}
        <div className="flex-1 min-h-0 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    border: '1px solid #334155', 
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontFamily: 'Orbitron, sans-serif'
                  }}
                  itemStyle={{ color: '#22d3ee' }}
                  cursor={{ stroke: '#334155', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="elo" 
                  stroke="#22d3ee" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#22d3ee', strokeWidth: 2, stroke: '#0f172a' }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-sm gap-3">
              <i className="fas fa-chess-board text-3xl opacity-20"></i>
              <span>Juega algunas partidas para ver tu progreso...</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Mejor Victoria</p>
          <p className="text-lg font-orbitron text-slate-300">N/A</p>
        </div>
        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Racha Actual</p>
          <p className="text-lg font-orbitron text-emerald-500">0 Partidas</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
