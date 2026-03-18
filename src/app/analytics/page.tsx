'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useApi } from '@/hooks/useApi';
import { AppShell } from '@/components/ui/AppShell';
import { Card, StatCard, Skeleton, EmptyState } from '@/components/ui/index';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts';
import { formatDuration } from '@/lib/utils/exercises';
import { Share2 } from 'lucide-react';

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#c2410c'];

export default function AnalyticsPage() {
  const { request, loading } = useApi();
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState(7);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => { loadAnalytics(); }, [period]);

  const loadAnalytics = async () => {
    const res = await request<any>(`/api/exercises/analytics?period=${period}`);
    if (res?.success) setData(res.data);
  };

  const shareReport = async () => {
    const res = await request<any>('/api/exercises/report');
    if (res?.success) {
      setReportData(res.data);
      window.open(res.data.whatsappUrl, '_blank');
    }
  };

  const customTooltipStyle = {
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    color: '#f8f8f8',
    fontSize: '12px',
  };

  return (
    <AppShell
      title="Analytics"
      rightAction={
        <button onClick={shareReport} className="p-2 text-dark-400 hover:text-brand-400">
          <Share2 size={20} />
        </button>
      }
    >
      <div className="px-4 pt-4 space-y-5 pb-4">
        {/* Period selector */}
        <div className="flex gap-2">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`px-4 py-2 rounded-xl text-sm font-display font-semibold transition-all ${period === d ? 'bg-brand-500 text-white' : 'bg-dark-800 text-dark-400'}`}
            >
              {d}d
            </button>
          ))}
        </div>

        {loading && !data ? (
          <div className="space-y-3">
            {[0,1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        ) : !data ? (
          <EmptyState icon="📊" title="No data yet" description="Complete some workouts to see your analytics" />
        ) : (
          <>
            {/* Summary stats */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3">
              <StatCard label="Workouts" value={data.totals.workouts} icon="🏋️" />
              <StatCard label="Calories" value={`${data.totals.calories}`} icon="🔥" sub="kcal" />
              <StatCard label="Total Reps" value={data.totals.reps} icon="💪" />
              <StatCard label="Avg Score" value={`${data.totals.avgVerification}%`} icon="✅" />
            </motion.div>

            {/* Streak info */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🔥</span>
                  <div>
                    <p className="font-display text-3xl font-bold text-brand-400">{data.user.streak}</p>
                    <p className="text-xs text-dark-400">Current Streak</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-bold text-dark-200">{data.user.longestStreak}</p>
                  <p className="text-xs text-dark-500">Best Ever</p>
                </div>
              </Card>
            </motion.div>

            {/* Daily activity bar chart */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h3 className="font-display font-semibold text-dark-200 mb-3">Daily Workouts</h3>
              <Card className="p-3">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={data.dailyActivity} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fill: '#737373', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#737373', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: 'rgba(249,115,22,0.1)' }} />
                    <Bar dataKey="workouts" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>

            {/* Calories line chart */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <h3 className="font-display font-semibold text-dark-200 mb-3">Calories Burned</h3>
              <Card className="p-3">
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={data.dailyActivity} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="label" tick={{ fill: '#737373', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#737373', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={customTooltipStyle} />
                    <Line type="monotone" dataKey="calories" stroke="#f97316" strokeWidth={2.5} dot={{ fill: '#f97316', r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>

            {/* Exercise distribution pie */}
            {data.exerciseDistribution.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <h3 className="font-display font-semibold text-dark-200 mb-3">Exercise Mix</h3>
                <Card>
                  <div className="flex items-center gap-4">
                    <PieChart width={120} height={120}>
                      <Pie data={data.exerciseDistribution} cx={55} cy={55} innerRadius={35} outerRadius={55} dataKey="count" paddingAngle={3}>
                        {data.exerciseDistribution.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                    <div className="flex-1 space-y-1.5">
                      {data.exerciseDistribution.slice(0, 5).map((ex: any, i: number) => (
                        <div key={ex.name} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-xs text-dark-300 capitalize flex-1 truncate">{ex.name}</span>
                          <span className="text-xs text-dark-500 font-semibold">{ex.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Duration breakdown */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <h3 className="font-display font-semibold text-dark-200 mb-3">Time Spent</h3>
              <Card className="p-3">
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={data.dailyActivity} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fill: '#737373', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#737373', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={customTooltipStyle}
                      formatter={(val: number) => [formatDuration(val), 'Duration']}
                      cursor={{ fill: 'rgba(249,115,22,0.1)' }}
                    />
                    <Bar dataKey="duration" fill="#c2410c" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>

            {/* Total time stat */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⏱</span>
                  <div>
                    <p className="font-display text-xl font-bold text-dark-50">{formatDuration(data.dailyActivity.reduce((s: number, d: any) => s + d.duration, 0))}</p>
                    <p className="text-xs text-dark-400">Total time this period</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-dark-200">{data.totals.verified}/{data.totals.workouts}</p>
                  <p className="text-xs text-dark-500">verified</p>
                </div>
              </Card>
            </motion.div>

            {/* WhatsApp share */}
            <button
              onClick={shareReport}
              className="w-full py-3.5 bg-green-600/20 border border-green-500/30 rounded-xl font-semibold text-green-400 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              📲 Share Daily Report to WhatsApp
            </button>
          </>
        )}
      </div>
    </AppShell>
  );
}
