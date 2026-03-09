import { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { industryBySlug } from '../data/industries';
import { growthService } from '../services/api';
import { getStoredUtm, trackEvent } from '../services/analytics';

const Check = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);

const ArrowRight = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

export default function IndustryPage() {
  const { slug } = useParams<{ slug: string }>();
  const industry = slug ? industryBySlug[slug] : undefined;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (industry) {
      void trackEvent('industry_page_view', { industry: industry.slug });
      window.scrollTo(0, 0);
    }
  }, [industry]);

  if (!industry) return <Navigate to="/" replace />;

  const submitWaitlist = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const utm = getStoredUtm();
      const response = await growthService.joinWaitlist({
        name, email, company,
        source: `landing_industry_${industry.slug}`,
        ...utm,
      });
      await trackEvent('waitlist_joined', { company, industry: industry.slug });
      setMessage(response.message);
      setName(''); setEmail(''); setCompany('');
    } catch {
      setMessage('Unable to join waitlist. Email us at hello@tablepilot.ai');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">TablePilot AI</p>
              <p className="text-[10px] text-slate-400 leading-tight">TablePilot OS</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/#industries" className="hidden items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors md:flex">
              <ArrowLeft /> All Industries
            </Link>
            <Link to="/login" className="hidden rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 md:block">Sign in</Link>
            <Link to="/register" className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors">
              Start Free <ArrowRight />
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-slate-950 px-6 pb-20 pt-18 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-20 h-[500px] w-[500px] rounded-full blur-3xl" style={{ backgroundColor: `${industry.colorHex}15` }} />
          <div className="absolute -right-32 bottom-0 h-[400px] w-[400px] rounded-full bg-slate-800/60 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        </div>

        <div className="relative mx-auto max-w-5xl">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-xs text-slate-500">
            <Link to="/" className="hover:text-slate-300 transition-colors">Home</Link>
            <span>/</span>
            <Link to="/#industries" className="hover:text-slate-300 transition-colors">Industries</Link>
            <span>/</span>
            <span style={{ color: industry.colorHex }}>{industry.name}</span>
          </div>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold" style={{ borderColor: `${industry.colorHex}40`, backgroundColor: `${industry.colorHex}12`, color: industry.colorHex }}>
            <span className="text-base">{industry.emoji}</span>
            {industry.name}
          </div>

          <h1 className="text-5xl font-extrabold leading-[1.07] tracking-tight sm:text-6xl" style={{ whiteSpace: 'pre-line' }}>
            {industry.heroHeadline.split('\n').map((line, i) => (
              <span key={i}>
                {i === 1 ? <span style={{ backgroundImage: `linear-gradient(135deg, ${industry.colorHex}, #f43f5e)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{line}</span> : line}
                {i < industry.heroHeadline.split('\n').length - 1 && <br />}
              </span>
            ))}
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">{industry.heroSub}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#waitlist" className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-xl transition-all hover:-translate-y-0.5" style={{ backgroundColor: industry.colorHex, boxShadow: `0 12px 32px ${industry.colorHex}35` }}>
              Request Early Access <ArrowRight />
            </a>
            <Link to="/register" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/14 transition-all">
              Try Free with Demo Data
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {industry.stats.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-extrabold tracking-tight" style={{ color: industry.colorHex }}>{s.val}</p>
                <p className="mt-1 text-xs text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PAIN POINTS ── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">The challenge</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              What's slowing {industry.shortName} marketing teams down.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {industry.painPoints.map((p, i) => (
              <div key={p.title} className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-black text-white" style={{ backgroundColor: industry.colorHex }}>
                  {i + 1}
                </div>
                <h3 className="text-base font-bold text-slate-900">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: industry.colorHex }}>What you can do</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Real workflows. Instant results.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-500">These aren't hypothetical features — they're prompts you can run on day one.</p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {industry.useCases.map((uc) => (
              <article key={uc.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-3xl">{uc.icon}</p>
                <h3 className="mt-3 text-lg font-bold text-slate-900">{uc.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{uc.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── KPIs ── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="grid items-center gap-10 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">KPIs we track</p>
                <h3 className="mt-2 text-2xl font-extrabold text-slate-900">Every {industry.shortName} metric, unified.</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  TablePilot AI comes pre-loaded with {industry.shortName}-specific KPI definitions. No custom setup, no analyst needed.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {industry.kpis.map((kpi) => (
                  <span key={kpi} className="rounded-full px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: industry.colorHex }}>
                    {kpi}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS ── */}
      <section className="bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Pre-wired for {industry.shortName}</p>
          <h3 className="mt-2 text-2xl font-extrabold text-slate-900">Connects to your {industry.shortName} stack.</h3>
          <p className="mt-2 text-sm text-slate-500">Native integrations for the tools {industry.shortName} teams actually use — all with demo-mode fallback.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {industry.integrations.map((name) => (
              <span key={name} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                {name}
              </span>
            ))}
            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-400 shadow-sm">+ 200 more</span>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <figure className="rounded-2xl border-l-4 pl-8 py-4" style={{ borderColor: industry.colorHex }}>
            <p className="text-3xl font-serif leading-none mb-4" style={{ color: industry.colorHex }}>"</p>
            <blockquote className="text-lg leading-relaxed text-slate-700 font-medium">{industry.quote.text}</blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: industry.colorHex }}>
                {industry.quote.author[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{industry.quote.author}</p>
                <p className="text-xs text-slate-500">{industry.quote.role}</p>
              </div>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ── OTHER INDUSTRIES ── */}
      <section className="bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="mb-6 text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Also built for</p>
          <div className="flex flex-wrap justify-center gap-3">
            {Object.values(industryBySlug)
              .filter((ind) => ind.slug !== industry.slug)
              .map((ind) => (
                <Link
                  key={ind.slug}
                  to={`/industries/${ind.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <span>{ind.emoji}</span> {ind.shortName}
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* ── WAITLIST CTA ── */}
      <section id="waitlist" className="relative overflow-hidden bg-slate-950 px-6 py-24 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" style={{ backgroundColor: `${industry.colorHex}12` }} />
        </div>
        <div className="relative mx-auto max-w-2xl text-center">
          <span className="text-4xl">{industry.emoji}</span>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Start growing your<br />{industry.shortName} business with AI.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-slate-300">
            Join {industry.shortName} teams already using TablePilot AI to replace manual work with intelligent, data-driven marketing.
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
              className="w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-xl transition-colors disabled:opacity-60"
              style={{ backgroundColor: industry.colorHex }}>
              {submitting ? 'Submitting…' : `Get Early Access for ${industry.shortName} →`}
            </button>
            <p className="text-xs text-slate-500">No spam · Personal onboarding · We read every submission</p>
          </form>

          {message && (
            <p className={`mt-4 text-sm font-medium ${message.startsWith('Unable') ? 'text-rose-400' : 'text-emerald-400'}`}>
              {message.startsWith('Unable') ? message : `✓ ${message}`}
            </p>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-200 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-900">TablePilot AI</span>
          </Link>
          <p className="text-xs text-slate-400">© 2026 TablePilot AI. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-slate-400">
            <Link to="/" className="hover:text-slate-700">Home</Link>
            <Link to="/login" className="hover:text-slate-700">Sign in</Link>
            <Link to="/register" className="hover:text-slate-700">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
