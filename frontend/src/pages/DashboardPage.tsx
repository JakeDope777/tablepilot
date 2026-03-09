import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  DollarSign,
  Eye,
  Filter,
  Loader2,
  MousePointer,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { analyticsService, growthService } from '../services/api';
import type { ChartData, DashboardMetrics } from '../types';
import { trackEvent } from '../services/analytics';

const defaults: DashboardMetrics = {
  total_leads: 342,
  new_leads_period: 47,
  total_spend: 12450.0,
  conversions: 28,
  conversion_rate: 4.2,
  cac: 125.5,
  ltv: 1250.0,
  roas: 5.3,
  ctr: 3.1,
  impressions: 125000,
  clicks: 3875,
  email_open_rate: 24.5,
  email_click_rate: 4.8,
};

// Demo chart data shown when backend is not reachable
const DEMO_SPEND: { date: string; spend: number }[] = [
  { date: '02-17', spend: 980 },
  { date: '02-18', spend: 1120 },
  { date: '02-19', spend: 870 },
  { date: '02-20', spend: 1340 },
  { date: '02-21', spend: 1650 },
  { date: '02-22', spend: 1290 },
  { date: '02-23', spend: 1480 },
  { date: '02-24', spend: 960 },
  { date: '02-25', spend: 1580 },
  { date: '02-26', spend: 1720 },
  { date: '02-27', spend: 1390 },
  { date: '02-28', spend: 1845 },
  { date: '03-01', spend: 1650 },
  { date: '03-02', spend: 1920 },
];

const DEMO_CHANNELS: { name: string; conversions: number }[] = [
  { name: 'Google Ads', conversions: 89 },
  { name: 'Meta', conversions: 62 },
  { name: 'Email', conversions: 48 },
  { name: 'LinkedIn', conversions: 31 },
  { name: 'Organic', conversions: 27 },
  { name: 'Referral', conversions: 19 },
];

const DEMO_FUNNEL_STEPS = [
  { name: 'visitors', count: 18420 },
  { name: 'signups', count: 1284 },
  { name: 'verified', count: 876 },
  { name: 'first_value', count: 312 },
  { name: 'returning', count: 198 },
];

const ACTIONS = [
  'Shift 10% budget from lowest-performing channel into high-conversion campaigns.',
  'Launch two creative variants for underperforming ad sets this week.',
  'Tighten onboarding email sequence to improve click-to-demo progression.',
  'A/B test subject lines on nurture sequence — current open rate lags 6% below target.',
];

const CHANNEL_COLORS = ['#f97316', '#0f172a', '#3b82f6', '#8b5cf6', '#10b981', '#64748b'];

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(defaults);
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [funnel, setFunnel] = useState<{
    steps: Array<{ name: string; count: number }>;
    conversion_signup_from_visitor: number;
    conversion_verified_from_signup: number;
    conversion_first_value_from_verified: number;
    conversion_return_from_first_value: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [isDemo, setIsDemo] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await analyticsService.getDashboard();
      setMetrics(data.metrics ?? defaults);
      setCharts(data.charts || []);
      const funnelData = await growthService.getFunnelSummary(14);
      setFunnel(funnelData);
      setIsDemo(false);
    } catch {
      setMetrics(defaults);
      setFunnel({
        steps: DEMO_FUNNEL_STEPS,
        conversion_signup_from_visitor: 6.97,
        conversion_verified_from_signup: 68.22,
        conversion_first_value_from_verified: 35.62,
        conversion_return_from_first_value: 63.46,
      });
      setIsDemo(true);
    } finally {
      setUpdatedAt(new Date().toLocaleString());
      setLoading(false);
    }
  };

  useEffect(() => {
    void trackEvent('dashboard_viewed');
    if (!localStorage.getItem('onboarding_completed')) {
      localStorage.setItem('onboarding_completed', '1');
      void trackEvent('onboarding_completed');
    }
    void fetchData();
  }, []);

  const spendSeries = useMemo(() => {
    const spendChart = charts.find((c) => c.id === 'spend_over_time');
    if (!spendChart?.data.x || !spendChart.data.y) return DEMO_SPEND;
    return spendChart.data.x.map((date, index) => ({
      date: date.slice(5),
      spend: spendChart.data.y?.[index] ?? 0,
    }));
  }, [charts]);

  const channelSeries = useMemo(() => {
    const channelChart = charts.find((c) => c.id === 'conversions_by_channel');
    if (!channelChart?.data.x || !channelChart.data.y) return DEMO_CHANNELS;
    return channelChart.data.x.map((name, index) => ({
      name,
      conversions: channelChart.data.y?.[index] ?? 0,
    }));
  }, [charts]);

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const cards = [
    {
      title: 'ROAS',
      value: `${metrics.roas.toFixed(2)}×`,
      icon: TrendingUp,
      note: 'Return on ad spend',
      accent: 'orange',
    },
    {
      title: 'Pipeline Leads',
      value: metrics.total_leads.toLocaleString(),
      icon: Users,
      note: `+${metrics.new_leads_period} this period`,
      accent: 'blue',
    },
    {
      title: 'Conversion Rate',
      value: `${metrics.conversion_rate.toFixed(1)}%`,
      icon: Target,
      note: `${metrics.conversions} conversions`,
      accent: 'green',
    },
    {
      title: 'Total Spend',
      value: `$${metrics.total_spend.toLocaleString()}`,
      icon: DollarSign,
      note: `CAC $${metrics.cac.toFixed(0)} · LTV $${metrics.ltv.toFixed(0)}`,
      accent: 'purple',
    },
  ] as const;

  const accentMap = {
    orange: 'bg-orange-500/20 text-orange-300',
    blue: 'bg-blue-500/20 text-blue-300',
    green: 'bg-emerald-500/20 text-emerald-300',
    purple: 'bg-violet-500/20 text-violet-300',
  };

  const maxFunnelCount = funnel ? Math.max(...funnel.steps.map((s) => s.count)) : 1;

  return (
    <div className="space-y-6">
      {/* ── Dark hero header ── */}
      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs uppercase tracking-[0.2em] text-orange-300">Executive View</p>
              {isDemo && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-300 border border-orange-500/30">
                  <Sparkles className="h-3 w-3" /> Demo data
                </span>
              )}
            </div>
            <h2 className="mt-2 text-2xl font-bold">Growth Command Dashboard</h2>
            <p className="mt-1 text-sm text-slate-400">Last sync: {updatedAt || 'just now'}</p>
          </div>
          <button
            onClick={() => void fetchData()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="rounded-xl bg-white/8 p-4 ring-1 ring-white/10 hover:bg-white/12 transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">{card.title}</p>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${accentMap[card.accent]}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold">{card.value}</p>
                <p className="mt-1 text-xs text-slate-400">{card.note}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Charts ── */}
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Marketing Spend Over Time</h3>
          <p className="text-xs text-slate-500">Detect efficiency drift before it hurts acquisition.</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendSeries}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, 'Spend']}
                />
                <Area type="monotone" dataKey="spend" stroke="#f97316" fill="url(#spendGradient)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Conversions by Channel</h3>
          <p className="text-xs text-slate-500">Focus spend where contribution margin is strongest.</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelSeries} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="conversions" radius={[6, 6, 0, 0]}>
                  {channelSeries.map((_, index) => (
                    <Cell key={index} fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      {/* ── Reach strip ── */}
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Audience Reach</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{metrics.impressions.toLocaleString()}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700">
            <Eye className="h-3 w-3" /> high visibility across channels
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Click-Through Rate</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{metrics.ctr.toFixed(2)}%</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-700">
            <MousePointer className="h-3 w-3" /> {metrics.clicks.toLocaleString()} clicks
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Email Funnel</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {metrics.email_open_rate.toFixed(1)}% <span className="text-lg text-slate-400">/</span> {metrics.email_click_rate.toFixed(1)}%
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-700">
            <Filter className="h-3 w-3" /> open → click rate
          </p>
        </article>
      </section>

      {/* ── Funnel ── */}
      {funnel && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Pilot Funnel — last 14 days</h3>
          <p className="text-xs text-slate-500">End-to-end conversion from first visit to returning user.</p>
          <div className="mt-5 space-y-3">
            {funnel.steps.map((step, i) => {
              const pct = Math.round((step.count / maxFunnelCount) * 100);
              const stepColors = ['bg-orange-500', 'bg-orange-400', 'bg-orange-300', 'bg-orange-200', 'bg-orange-100'];
              return (
                <div key={step.name}>
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span className="font-medium capitalize">{step.name.replace(/_/g, ' ')}</span>
                    <span className="font-bold text-slate-900">{step.count.toLocaleString()}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${stepColors[i] || 'bg-orange-100'} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 grid gap-x-6 gap-y-1 text-xs text-slate-600 md:grid-cols-2">
            <p>Visitor → Signup: <strong className="text-slate-900">{funnel.conversion_signup_from_visitor.toFixed(2)}%</strong></p>
            <p>Signup → Verified: <strong className="text-slate-900">{funnel.conversion_verified_from_signup.toFixed(2)}%</strong></p>
            <p>Verified → First Value: <strong className="text-slate-900">{funnel.conversion_first_value_from_verified.toFixed(2)}%</strong></p>
            <p>First Value → Return: <strong className="text-slate-900">{funnel.conversion_return_from_first_value.toFixed(2)}%</strong></p>
          </div>
        </section>
      )}

      {/* ── AI Actions ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-slate-800">AI-Recommended Next Actions</h3>
        </div>
        <ul className="space-y-2">
          {ACTIONS.map((action, i) => (
            <li key={i} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 hover:border-orange-200 transition-colors">
              <ArrowUpRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-500" />
              <span className="text-sm text-slate-700">{action}</span>
              <ChevronRight className="ml-auto mt-0.5 h-4 w-4 flex-shrink-0 text-slate-300" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
