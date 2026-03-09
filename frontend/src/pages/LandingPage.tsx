import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Boxes, MessageSquareText, Shield } from 'lucide-react';

const capabilities = [
  {
    title: 'Daily Control Tower',
    description: 'Track revenue vs forecast, covers, labor %, food %, anomalies, and operator tasks in one place.',
    icon: BarChart3,
  },
  {
    title: 'Margin Brain',
    description: 'View dish-level margin, menu engineering signals, and price scenario impact before changes go live.',
    icon: Shield,
  },
  {
    title: 'Inventory & Waste',
    description: 'Ingest CSVs from POS/purchases/labor, detect low stock and usage variance, and draft purchase orders.',
    icon: Boxes,
  },
  {
    title: 'Manager Chat',
    description: 'Ask what happened, why, and what to do next. Get operational recommendations tied to real data.',
    icon: MessageSquareText,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#fed7aa,_transparent_35%),linear-gradient(180deg,_#ffffff,_#f8fafc)] px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-xl shadow-slate-300/30">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.2em] text-orange-600">AI Restaurant Operating System</p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">TablePilot</h1>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Run your restaurant with fewer blind spots, better margins, and faster decisions.
                TablePilot connects sales, labor, inventory, suppliers, and guest signals into one operational command center.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Start Pilot <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Sign In
              </Link>
              <Link
                to="/app/control-tower"
                className="inline-flex items-center justify-center rounded-lg border border-orange-300 bg-orange-50 px-5 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-100"
              >
                Open App Demo
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {capabilities.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </article>
            );
          })}
        </section>

        <footer className="pb-2 text-center text-xs text-slate-500">
          TablePilot Pilot Alpha · Single venue first · Legacy marketing APIs retained as compatibility-only
        </footer>
      </div>
    </div>
  );
}
