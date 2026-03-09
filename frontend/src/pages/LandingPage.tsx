import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Boxes,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';

const modules = [
  {
    title: 'Daily Control Tower',
    description: 'Revenue vs forecast, labor %, food %, anomalies, and operator priorities in one daily briefing.',
    icon: BarChart3,
  },
  {
    title: 'Margin Brain',
    description: 'Dish-level profitability, break-even tracking, repricing suggestions, and scenario simulation.',
    icon: TrendingUp,
  },
  {
    title: 'Inventory & Waste',
    description: 'CSV ingest, stock risk detection, usage variance alerts, and procurement workflow guidance.',
    icon: Boxes,
  },
  {
    title: 'Manager Chat',
    description: 'Ask why results changed and get specific operational actions linked to your restaurant data.',
    icon: MessageSquareText,
  },
];

const problems = [
  'Disconnected POS, spreadsheets, supplier files, and review tools',
  'Weak visibility on true margin by shift, dish, and service period',
  'Slow reaction to sales drops, labor pressure, and waste drift',
  'Owners and managers overloaded by manual reporting and firefighting',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#f8e5ca,_transparent_36%),linear-gradient(180deg,_#f9f7f2,_#f3f4f6)] px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-3xl border border-[#e6dfd2] bg-white/95 p-8 shadow-xl shadow-amber-100/40">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <p className="tp-eyebrow">AI Operating Partner for Restaurants</p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">TablePilot</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                The AI-native operating system for modern hospitality. TablePilot connects sales, labor, inventory,
                suppliers, and guest sentiment into one calm command center that helps operators decide faster and
                protect margin daily.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <article className="tp-panel-muted">
                  <p className="tp-kpi-label">Core Promise</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">What is wrong, why, and what to do next</p>
                </article>
                <article className="tp-panel-muted">
                  <p className="tp-kpi-label">Pilot Model</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Single venue first, action-oriented</p>
                </article>
                <article className="tp-panel-muted">
                  <p className="tp-kpi-label">Delivery</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Dashboard + AI Manager Chat</p>
                </article>
              </div>
            </div>

            <div className="flex min-w-[220px] flex-col gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Start Pilot <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Sign In
              </Link>
              <Link
                to="/app/control-tower?demo=1"
                className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100"
              >
                Open App Demo
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="tp-panel">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Why Restaurant Teams Need This</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {problems.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="tp-panel">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">What Makes TablePilot Different</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="tp-panel-muted">
                <p className="tp-kpi-label">Typical Tools</p>
                <p className="mt-1 text-sm text-slate-700">Show dashboards, require manual interpretation, and stop at reporting.</p>
              </div>
              <div className="tp-panel-muted">
                <p className="tp-kpi-label">TablePilot</p>
                <p className="mt-1 text-sm font-medium text-slate-800">Generates recommendations, warnings, forecasts, and next actions.</p>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {modules.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="tp-panel">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </article>
            );
          })}
        </section>

        <section className="tp-panel flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="tp-eyebrow">Pilot Alpha</p>
            <h2 className="text-xl font-bold text-slate-900">Less chaos. Better margins. Faster decisions.</h2>
            <p className="mt-1 text-sm text-slate-600">
              Built for owner-operators, general managers, and small multi-location groups.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Users className="h-4 w-4" />
            Single-venue pilot first
          </div>
        </section>

        <footer className="pb-2 text-center text-xs text-slate-500">
          TablePilot Pilot Alpha · Legacy marketing APIs retained as backend compatibility-only
        </footer>
      </div>
    </div>
  );
}
