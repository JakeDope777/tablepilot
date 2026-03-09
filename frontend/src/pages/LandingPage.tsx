import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { growthService } from '../services/api';
import { getStoredUtm, trackEvent } from '../services/analytics';
import { industries } from '../data/industries';

// ── Tiny inline icons ──────────────────────────────────────────────────────
const Check = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const ArrowRight = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ── FAQ ────────────────────────────────────────────────────────────────────
const faqs = [
  {
    q: 'Do I need technical skills to use TablePilot AI?',
    a: 'Not at all. The entire product works through a conversational interface. Describe your goal in plain English — strategy, copy, analytics, or campaign briefs — and the AI handles the rest. No SQL, no dashboards to configure.',
  },
  {
    q: 'How is this different from ChatGPT or Jasper?',
    a: 'General AI tools have no memory of your brand, no access to your live data, and no ability to execute actions. TablePilot AI connects to your actual marketing stack, remembers your history and goals across sessions, and returns execution-ready plans — not just text.',
  },
  {
    q: 'Which integrations are supported?',
    a: 'Natively: HubSpot, Salesforce, Google Ads, Meta Ads, GA4, Klaviyo, Shopify, Stripe, LinkedIn Ads, Mailchimp, and more. Through the connector marketplace you get 200+ additional templates via n8n and other providers.',
  },
  {
    q: 'Can I start with demo data before connecting my real accounts?',
    a: 'Yes — every integration has a demo-mode fallback. You can experience the full product loop with realistic data and connect your live accounts when you\'re ready. No API keys required to get started.',
  },
  {
    q: 'Is my data secure?',
    a: 'All data is encrypted at rest and in transit. We never train shared models on your proprietary data. Your memory store, brand voice, and campaign data are isolated per workspace. SOC 2 compliance is on the roadmap for Q3 2026.',
  },
  {
    q: 'What does the pilot programme include?',
    a: 'Pilot users get full Pro-tier access, a personal onboarding session, a direct Slack channel with the founding team, and input on the roadmap. We read every piece of feedback and ship weekly.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left text-sm font-semibold text-slate-900 hover:text-orange-600 transition-colors"
      >
        {q}
        <span className={`ml-4 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <ChevronDown />
        </span>
      </button>
      {open && <p className="pb-5 text-sm leading-relaxed text-slate-600">{a}</p>}
    </div>
  );
}

// ── Stat counter ────────────────────────────────────────────────────────────
function StatCounter({ end, suffix, prefix = '' }: { end: number; suffix: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1600;
          const steps = 50;
          const increment = end / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= end) { setCount(end); clearInterval(timer); }
            else { setCount(Math.floor(current)); }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

// ── Dashboard mockup component ──────────────────────────────────────────────
function DashMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-orange-500/20 to-rose-500/10 blur-2xl" />
      <div className="relative rounded-2xl border border-white/10 bg-slate-800/90 backdrop-blur-sm shadow-2xl overflow-hidden">
        {/* Titlebar */}
        <div className="flex items-center gap-1.5 border-b border-white/8 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-rose-400/80" />
          <span className="h-3 w-3 rounded-full bg-amber-400/80" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
          <span className="ml-3 font-mono text-[11px] text-slate-500">dashboard · live</span>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI CMO Active
          </span>
        </div>
        {/* KPI row */}
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
          {[
            { label: 'Pipeline Rev.', val: '$248K', note: '↑ 18% MoM', good: true },
            { label: 'ROAS', val: '5.3×', note: '↑ Target: 4.0×', good: true },
            { label: 'CAC', val: '$125', note: '↓ −12.4%', good: true },
            { label: 'Active Campaigns', val: '14', note: '3 optimising', good: null },
          ].map((k) => (
            <div key={k.label} className="rounded-xl bg-white/6 p-3">
              <p className="text-[10px] text-slate-400">{k.label}</p>
              <p className="mt-1 text-xl font-bold text-white">{k.val}</p>
              <p className={`mt-0.5 text-[10px] ${k.good === true ? 'text-emerald-400' : k.good === false ? 'text-rose-400' : 'text-slate-500'}`}>{k.note}</p>
            </div>
          ))}
        </div>
        {/* Sparkline placeholder */}
        <div className="mx-4 mb-3 h-24 rounded-xl bg-white/4 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Marketing Spend · 6 months</p>
          <svg viewBox="0 0 280 60" className="w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,50 C30,45 60,35 90,28 C120,21 150,32 180,20 C210,8 240,15 280,5" stroke="#f97316" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M0,50 C30,45 60,35 90,28 C120,21 150,32 180,20 C210,8 240,15 280,5 L280,60 L0,60 Z" fill="url(#sg)" />
          </svg>
        </div>
        {/* AI insight */}
        <div className="mx-4 mb-4 rounded-xl border border-orange-500/20 bg-orange-500/8 p-3">
          <p className="text-[10px] font-semibold text-orange-400 mb-1">AI CMO · insight · just now</p>
          <p className="text-[11px] text-slate-300 leading-relaxed">Google Ads CTR dropped 0.8% this week. I've prepared A/B variants for 3 ad sets. Reallocating <span className="text-white font-semibold">$1,200</span> projects <span className="text-emerald-400 font-semibold">+$4,100 revenue</span> this month.</p>
          <div className="mt-2 flex gap-2">
            <span className="rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-semibold text-white cursor-default">Apply Reallocation</span>
            <span className="rounded-md border border-white/15 px-2 py-0.5 text-[10px] text-slate-400 cursor-default">View Analysis</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function LandingPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    void trackEvent('landing_view');
  }, []);

  const submitWaitlist = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const utm = getStoredUtm();
      const response = await growthService.joinWaitlist({ name, email, company, source: 'landing_page', ...utm });
      await trackEvent('waitlist_joined', { company });
      setMessage(response.message);
      setName(''); setEmail(''); setCompany('');
    } catch {
      setMessage('Unable to join waitlist at the moment. Email us at hello@tablepilot.ai');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 shadow-lg shadow-orange-400/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">TablePilot AI</p>
              <p className="text-[10px] text-slate-400 leading-tight">TablePilot OS</p>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 md:flex">
            {[['#how-it-works', 'How it works'], ['#features', 'Features'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']].map(([href, label]) => (
              <a key={href} href={href} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">{label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors md:block">
              Sign in
            </Link>
            <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-300/40 hover:bg-orange-600 transition-colors">
              Start Free
              <ArrowRight size={14} />
            </Link>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {mobileMenuOpen ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> : <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 px-6 py-4 md:hidden">
            <nav className="flex flex-col gap-3">
              {[['#how-it-works', 'How it works'], ['#features', 'Features'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']].map(([href, label]) => (
                <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-700">{label}</a>
              ))}
              <Link to="/login" className="text-sm font-medium text-slate-700">Sign in</Link>
            </nav>
          </div>
        )}
      </header>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-950 px-6 pb-24 pt-20 text-white">
        {/* BG gradients */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 top-0 h-[600px] w-[600px] rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute -right-32 bottom-0 h-[500px] w-[500px] rounded-full bg-violet-600/8 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          {/* Pilot badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold text-orange-400">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
            Now in Pilot — Limited Spots Available
          </div>

          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <h1 className="text-5xl font-extrabold leading-[1.06] tracking-tight sm:text-6xl lg:text-[64px]">
                Your AI Chief<br />
                <span className="bg-gradient-to-r from-orange-400 to-rose-500 bg-clip-text text-transparent">Marketing Officer</span>
                <br />on demand.
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-300">
                Strategy, execution, and reporting — all through a single conversational interface. Replace agency retainers with AI that <span className="text-white font-medium">knows your brand</span>, remembers your goals, and acts on your live data.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#waitlist" className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-orange-500/30 hover:bg-orange-600 transition-all hover:-translate-y-0.5">
                  Request Early Access
                  <ArrowRight size={15} />
                </a>
                <Link to="/app/dashboard?demo=1" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/14 transition-all">
                  Open Dashboard Free
                </Link>
              </div>

              <p className="mt-4 text-xs text-slate-500">No credit card · Demo data instant · Connects your stack in minutes</p>

              {/* Proof row */}
              <div className="mt-10 flex flex-wrap items-center gap-6">
                <div className="text-xs text-slate-500">Trusted by growth teams at</div>
                {['Revver', 'Stackd.io', 'GrowthLoop', 'Keel Labs', 'Meridian HQ'].map((c) => (
                  <span key={c} className="text-xs font-semibold text-slate-400">{c}</span>
                ))}
              </div>
            </div>

            <div className="hidden lg:block">
              <DashMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ─────────────────────────────────────────── */}
      <section className="border-b border-slate-100 bg-slate-50 px-6 py-14">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-10 sm:grid-cols-4">
          {[
            { end: 2400000, suffix: '+', prefix: '$', label: 'Pipeline revenue tracked' },
            { end: 31, suffix: '%', prefix: '', label: 'Average CAC reduction' },
            { end: 1200, suffix: '+', prefix: '', label: 'Campaigns automated' },
            { end: 80, suffix: '+', prefix: '', label: 'Teams onboarded' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-4xl font-extrabold tracking-tight text-orange-500">
                <StatCounter end={s.end} suffix={s.suffix} prefix={s.prefix} />
              </p>
              <p className="mt-1.5 text-sm text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROBLEM → SOLUTION ──────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">The Problem</p>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Your marketing stack costs<br />more than it returns.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-500 leading-relaxed">
            The average growth team juggles 12+ disconnected tools, spends 60% of their time in meetings and reporting, and still can't tell which channel is actually driving revenue.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-3">
          {[
            { icon: '⏱', title: '14 hours/week', desc: 'Lost to manual reporting, campaign pulls, and cross-tool data reconciliation that should take minutes.' },
            { icon: '💸', title: '$180K/year', desc: 'Average agency retainer for services an AI CMO delivers in real time — with full context of your business.' },
            { icon: '📉', title: '63% of campaigns', desc: 'Underperform because decisions are made on stale data, not live signals. AI fixes this loop continuously.' },
          ].map((p) => (
            <div key={p.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-3xl">{p.icon}</p>
              <p className="mt-3 text-xl font-bold text-slate-900">{p.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-6 py-4 text-sm font-medium text-orange-900">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            TablePilot AI eliminates all three. Automatically. In real time.
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-slate-950 px-6 py-24 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Simple by design</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">From zero to campaign<br />in 3 steps.</h2>
            <p className="mt-4 text-lg text-slate-400">No setup guides. No BI team. No agency briefing decks.</p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {[
              {
                num: '01',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
                title: 'Connect your stack',
                desc: 'Link HubSpot, Google Ads, Meta, GA4, Stripe, and 200+ more in minutes. Or start with demo data — no API keys needed.',
                detail: 'OAuth connections. No manual CSV exports. No webhook setup. Just click and authorise.',
              },
              {
                num: '02',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
                title: 'Ask your AI CMO anything',
                desc: 'Describe a goal in plain English. The AI brain routes to the right module and returns an execution-ready plan.',
                detail: '"Run a SWOT for Q2." "Write 3 ad variants for our new feature." "Where is our CAC going?" — done in seconds.',
              },
              {
                num: '03',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
                title: 'Execute, measure, iterate',
                desc: 'Launch campaigns, track velocity, generate A/B variants, and get proactive alerts when KPIs drift — before it costs you.',
                detail: 'Persistent memory means the AI always knows your history, brand voice, and active goals.',
              },
            ].map((step) => (
              <div key={step.num} className="relative rounded-2xl border border-white/10 bg-white/4 p-8 hover:bg-white/7 transition-colors">
                <p className="text-7xl font-black text-white/5 leading-none tracking-tight">{step.num}</p>
                <div className="mt-2 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/12 text-orange-400">
                  {step.icon}
                </div>
                <h3 className="mt-4 text-xl font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.desc}</p>
                <p className="mt-3 text-xs italic text-slate-500 border-t border-white/8 pt-3">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE MODULES ─────────────────────────────────────── */}
      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">Six modules. One OS.</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Everything your marketing<br />team needs — unified.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
              Each module shares the same persistent AI memory. Context never gets lost between sessions, tools, or team members.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                color: 'bg-slate-900',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
                badge: 'Core',
                title: 'AI Brain & Memory',
                desc: '4-layer persistent memory: context window, folder store, vector embeddings, and relational DB. Your AI CMO never forgets a decision, goal, or brand guideline.',
                bullets: ['Cross-session memory', 'Brand voice preservation', 'Goal tracking', '4-layer architecture'],
              },
              {
                color: 'bg-orange-500',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
                badge: 'Analysis',
                title: 'Business Analysis',
                desc: 'SWOT, PESTEL, competitor deep-dives, market research, and buyer persona generation. Hours of research returned in seconds — formatted for real decisions.',
                bullets: ['SWOT & PESTEL frameworks', 'Competitor intelligence', 'Buyer persona builder', 'Market sizing'],
              },
              {
                color: 'bg-violet-600',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
                badge: 'Creative',
                title: 'Creative Studio',
                desc: 'Generate channel-ready copy, image prompts, and A/B variants at scale. Brand voice is locked in from memory — every output sounds like you.',
                bullets: ['Ad copy & social posts', 'Email sequences', 'Image prompt generation', 'A/B variant packs'],
              },
              {
                color: 'bg-emerald-600',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                badge: 'CRM',
                title: 'CRM & Campaigns',
                desc: 'Lead scoring, journey mapping, multi-channel orchestration, and GDPR/CAN-SPAM compliance checking — all automated from a single prompt.',
                bullets: ['Lead scoring & routing', 'Multi-channel journeys', 'Compliance checking', 'Pipeline tracking'],
              },
              {
                color: 'bg-blue-600',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
                badge: 'Analytics',
                title: 'Analytics & Reporting',
                desc: 'KPI dashboards, forecasting, cohort analysis, and A/B significance testing. No BI team, no SQL, no waiting for a Thursday morning report.',
                bullets: ['Full-funnel KPI view', 'Revenue forecasting', 'Cohort & attribution', 'A/B significance engine'],
              },
              {
                color: 'bg-rose-500',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
                badge: 'Integrations',
                title: '200+ Integrations',
                desc: 'HubSpot, Salesforce, Google Ads, Meta, Klaviyo, Shopify, Stripe, LinkedIn, n8n and a marketplace of 200+ connector templates — all with demo fallback.',
                bullets: ['21 native connectors', '200+ marketplace templates', 'Demo-mode fallback', 'Idempotent run tracking'],
              },
            ].map((f) => (
              <article key={f.title} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${f.color}`}>
                    {f.icon}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{f.badge}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.desc}</p>
                <ul className="mt-4 space-y-1.5">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      <span className="text-emerald-500"><Check /></span>
                      {b}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI DIFFERENCE ───────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-950 to-slate-900 px-6 py-24 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">What makes it different</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                Not a chatbot.<br />A persistent AI<br />co-founder for growth.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-slate-300">
                Every other AI tool forgets everything the moment you close the tab. TablePilot AI maintains a living, growing model of your business — so every interaction is smarter than the last.
              </p>

              <div className="mt-8 space-y-5">
                {[
                  { title: 'Remembers your entire marketing history', desc: 'Past campaigns, budgets, results, learnings — all indexed and surfaced when relevant.' },
                  { title: 'Knows your brand voice by heart', desc: 'Train it once. Every piece of copy, every ad variant will sound exactly like your brand.' },
                  { title: 'Acts on live data, not stale reports', desc: 'Connected to your real-time integrations — not last month\'s CSV export.' },
                  { title: 'Multi-model brain orchestration', desc: 'Routes your request to the optimal model and skill module. Strategy, analysis, creative, and CRM are coordinated automatically.' },
                ].map((d) => (
                  <div key={d.title} className="flex gap-4">
                    <div className="mt-0.5 flex-shrink-0">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white">
                        <Check />
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold">{d.title}</p>
                      <p className="mt-0.5 text-sm text-slate-400">{d.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparison table */}
            <div className="rounded-2xl border border-white/10 bg-white/4 overflow-hidden">
              <div className="grid grid-cols-3 border-b border-white/10 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                <span>Capability</span>
                <span className="text-center">Generic AI</span>
                <span className="text-center text-orange-400">TablePilot AI</span>
              </div>
              {[
                ['Persistent memory', false, true],
                ['Live data access', false, true],
                ['Multi-module orchestration', false, true],
                ['Brand voice lock', false, true],
                ['200+ integrations', false, true],
                ['Marketing-specific skills', false, true],
                ['Demo mode / no setup', true, true],
                ['Generates text', true, true],
              ].map(([label, generic, us]) => (
                <div key={String(label)} className="grid grid-cols-3 border-b border-white/6 px-4 py-3 text-sm last:border-0">
                  <span className="text-slate-300">{String(label)}</span>
                  <span className="text-center">{generic ? '✓' : <span className="text-slate-600">✗</span>}</span>
                  <span className="text-center text-orange-400 font-semibold">{us ? '✓' : '✗'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS ────────────────────────────────────────── */}
      <section className="border-t border-slate-100 px-6 py-16">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Connects with your existing stack</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {[
              'HubSpot', 'Salesforce', 'Google Ads', 'Meta Ads', 'GA4', 'Klaviyo', 'Shopify', 'Stripe',
              'LinkedIn Ads', 'Mailchimp', 'ActiveCampaign', 'Intercom', 'Segment', 'PostHog', 'Mixpanel',
              'Airtable', 'Notion', 'Slack', 'n8n', 'Zapier', 'Make.com', '+180 more',
            ].map((name) => (
              <span
                key={name}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${name === '+180 more' ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
              >
                {name}
              </span>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-400">All integrations include demo-mode fallback. Start exploring immediately — connect live accounts when you're ready.</p>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────── */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-10 text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-400">What pilot users say</p>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                quote: 'We cut our weekly reporting time from 6 hours to 20 minutes. The AI just knows what we need to see.',
                name: 'Sarah K.',
                role: 'Head of Growth, B2B SaaS',
              },
              {
                quote: 'It replaced our content agency retainer. The copy quality is indistinguishable — and it ships 3× faster.',
                name: 'Marcus T.',
                role: 'Founder, D2C Brand',
              },
              {
                quote: 'The memory system is the killer feature. It remembers everything we\'ve tried and never suggests the same thing twice.',
                name: 'Priya M.',
                role: 'CMO, Growth Stage Startup',
              },
            ].map((t) => (
              <figure key={t.name} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-2xl text-orange-400 font-serif leading-none mb-3">"</p>
                <blockquote className="text-sm leading-relaxed text-slate-700">{t.quote}</blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── INDUSTRIES ──────────────────────────────────────────── */}
      <section id="industries" className="bg-slate-950 px-6 py-24 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Built for your industry</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Tailored for how your<br />industry actually works.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
              Not a generic AI tool. TablePilot AI comes pre-loaded with industry-specific KPIs, workflows, compliance guardrails, and integration stacks — so you're operational on day one.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {industries.map((ind) => (
              <Link
                key={ind.slug}
                to={`/industries/${ind.slug}`}
                className="group relative rounded-2xl border border-white/8 bg-white/4 p-6 transition-all hover:bg-white/8 hover:border-white/18 hover:-translate-y-1"
              >
                <p className="text-3xl">{ind.emoji}</p>
                <h3 className="mt-3 text-base font-bold text-white">{ind.shortName}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{ind.tagline}</p>
                <div className="mt-4 flex flex-wrap gap-1">
                  {ind.kpis.slice(0, 2).map((kpi) => (
                    <span key={kpi} className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-slate-400">{kpi}</span>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold" style={{ color: ind.colorHex }}>
                  Learn more
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-slate-500">
            Each industry page includes specific use cases, KPI definitions, integration stacks, and a tailored waitlist form.
          </p>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────── */}
      <section id="pricing" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">Transparent pricing</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Start free. Scale as you grow.</h2>
            <p className="mt-4 text-lg text-slate-500">All plans include demo data. No credit card to start.</p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {[
              {
                tier: 'Starter',
                price: '$0',
                period: 'Free forever',
                desc: 'Explore the full AI CMO experience with realistic demo data.',
                features: ['AI Chat — 50 msg/month', 'Business Analysis (demo data)', 'Creative Studio — 10 gen/month', 'Dashboard & Reporting', 'Email support'],
                cta: 'Start Free',
                ctaHref: '/register',
                highlight: false,
              },
              {
                tier: 'Pro',
                price: '$149',
                period: 'per month',
                desc: 'For growth teams running live campaigns and replacing agency retainers.',
                features: ['Unlimited AI Chat', 'Live integrations (5 connectors)', 'Unlimited Creative Generation', 'Full CRM & Campaign Orchestration', 'Advanced Analytics & Forecasting', 'A/B significance testing', 'Priority support'],
                cta: 'Start Pro Trial',
                ctaHref: '#waitlist',
                highlight: true,
              },
              {
                tier: 'Enterprise',
                price: 'Custom',
                period: 'per seat / year',
                desc: 'For scale-ups and agencies managing multiple brands and teams.',
                features: ['Everything in Pro', 'Unlimited integrations', 'White-label option', 'Custom memory & brand voice', 'Dedicated onboarding + SLA', 'SSO + team management'],
                cta: 'Contact Sales',
                ctaHref: '#waitlist',
                highlight: false,
              },
            ].map((plan) => (
              <article key={plan.tier} className={`relative flex flex-col rounded-2xl border p-8 ${plan.highlight ? 'border-orange-300 bg-orange-50 shadow-xl shadow-orange-100' : 'border-slate-200 bg-white shadow-sm'}`}>
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-4 py-1 text-xs font-bold text-white">Most Popular</div>
                )}
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{plan.tier}</p>
                <p className="mt-3 text-5xl font-extrabold tracking-tight text-slate-900">{plan.price}</p>
                <p className="mt-1 text-sm text-slate-500">{plan.period}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{plan.desc}</p>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <span className="mt-0.5 flex-shrink-0 text-emerald-500"><Check /></span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.ctaHref}
                  className={`mt-8 block rounded-xl py-3 text-center text-sm font-bold transition-all ${plan.highlight ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 hover:bg-orange-600' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  {plan.cta}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section id="faq" className="bg-slate-50 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">Common questions</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900">FAQ</h2>
          </div>
          <div className="mt-12 rounded-2xl border border-slate-200 bg-white px-6 shadow-sm">
            {faqs.map((faq) => <FAQItem key={faq.q} {...faq} />)}
          </div>
        </div>
      </section>

      {/* ── WAITLIST CTA ────────────────────────────────────────── */}
      <section id="waitlist" className="relative overflow-hidden bg-slate-950 px-6 py-24 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Pilot Access</p>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Get early access before<br />public launch.</h2>
          <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-slate-300">
            We're onboarding a select group of founders and growth teams. Join the waitlist and we'll reach out within 24 hours with personal onboarding.
          </p>

          <form onSubmit={submitWaitlist} className="mt-10 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name"
                className="rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/40" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Work email"
                className="rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/40" />
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (optional)"
                className="rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/40" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-white shadow-xl shadow-orange-500/25 hover:bg-orange-600 transition-colors disabled:opacity-60">
              {submitting ? 'Submitting…' : 'Request Early Access →'}
            </button>
            <p className="text-xs text-slate-500">No spam · Unsubscribe anytime · We read every submission</p>
          </form>

          {message && (
            <p className={`mt-4 text-sm font-medium ${message.startsWith('Unable') ? 'text-rose-400' : 'text-emerald-400'}`}>
              {message.startsWith('Unable') ? message : `✓ ${message}`}
            </p>
          )}
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">TablePilot AI</p>
              <p className="text-xs text-slate-400">TablePilot OS · v0.2.0</p>
            </div>
          </div>

          <nav className="flex flex-wrap justify-center gap-6 text-xs text-slate-500">
            {[['#how-it-works', 'How it works'], ['#features', 'Features'], ['#pricing', 'Pricing'], ['#faq', 'FAQ'], ['#waitlist', 'Early Access']].map(([href, label]) => (
              <a key={href} href={href} className="hover:text-slate-900 transition-colors">{label}</a>
            ))}
            <Link to="/login" className="hover:text-slate-900 transition-colors">Sign in</Link>
            <Link to="/register" className="hover:text-slate-900 transition-colors">Register</Link>
          </nav>

          <p className="text-xs text-slate-400">© 2026 TablePilot AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
