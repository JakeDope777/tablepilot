import { useState } from 'react';
import {
  Search,
  Loader2,
  BarChart2,
  Swords,
  Globe,
  Users,
  Layers,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { analysisService } from '../services/api';
import ReactMarkdown from 'react-markdown';
import { trackEvent } from '../services/analytics';

type AnalysisType = 'market' | 'swot' | 'pestel' | 'competitor' | 'persona';

const ANALYSIS_TYPES: {
  key: AnalysisType;
  label: string;
  icon: React.ElementType;
  placeholder: string;
  color: string;
  description: string;
}[] = [
  {
    key: 'market',
    label: 'Market Research',
    icon: BarChart2,
    placeholder: 'e.g. SaaS market in Europe 2026',
    color: 'orange',
    description: 'Market size, trends, and growth opportunities',
  },
  {
    key: 'swot',
    label: 'SWOT Analysis',
    icon: Layers,
    placeholder: 'e.g. Our new product launch',
    color: 'blue',
    description: 'Strengths, Weaknesses, Opportunities, Threats',
  },
  {
    key: 'pestel',
    label: 'PESTEL Analysis',
    icon: Globe,
    placeholder: 'e.g. European tech market',
    color: 'emerald',
    description: 'Political, Economic, Social, Technical factors',
  },
  {
    key: 'competitor',
    label: 'Competitor Intel',
    icon: Swords,
    placeholder: 'e.g. Salesforce, HubSpot, Pipedrive',
    color: 'rose',
    description: 'Positioning, pricing, and differentiation gaps',
  },
  {
    key: 'persona',
    label: 'Buyer Personas',
    icon: Users,
    placeholder: 'e.g. B2B SaaS decision makers',
    color: 'violet',
    description: 'ICP deep-dives with pain points & motivations',
  },
];

// Demo result shown until the backend responds
const DEMO_RESULTS: Record<AnalysisType, string> = {
  market: `## SaaS Market — Europe 2026

**Market Size:** €48.2B total addressable market, growing at 19.4% CAGR.

### Key Trends
- AI-native products claiming 31% of new deal flow in enterprise segment
- Usage-based pricing adoption up 2.4× since 2023 — flat seat fees declining
- Compliance (GDPR, AI Act) driving demand for audit-ready SaaS platforms

### Top Opportunity Segments
| Segment | Size | Growth |
|---------|------|--------|
| Revenue Intelligence | €3.1B | +28% |
| Customer Data Platforms | €2.7B | +24% |
| Marketing Automation | €4.4B | +18% |

### Strategic Recommendation
Enter mid-market (50–500 seats) with a vertical-specific AI product. GTM motion: product-led trials with sales-assist at $10k+ ACV threshold.`,

  swot: `## SWOT Analysis

### ✅ Strengths
- AI-first architecture — zero legacy technical debt
- Proprietary training data from pilot customers showing 23% engagement lift
- Founding team with prior exits in marketing tech

### ⚠️ Weaknesses
- Brand recognition near zero vs. incumbents
- Single-tenant infrastructure creates scaling cost pressure
- Churn risk during onboarding if time-to-value > 14 days

### 🚀 Opportunities
- CMOs under pressure to justify spend — ROI proof tools in high demand
- Open-source LLMs reducing inference cost 60% YoY
- Post-cookie world creating measurement gap competitors haven't solved

### 🔴 Threats
- HubSpot, Salesforce shipping AI features inside existing workflows
- Talent market for ML engineers extremely competitive
- Macro environment slowing discretionary SaaS spend`,

  pestel: `## PESTEL Analysis — European Tech Market

**Political:** AI Act enforcement beginning 2026 — high-risk AI classification creates compliance overhead for generative tools. GDPR enforcement intensifying (avg fine €4.2M in 2025).

**Economic:** ECB rate stabilisation improving SaaS deal cycles. €2.1B in EU digital transformation grants targeting SMEs through 2027.

**Social:** Remote-first work normalised — platform spend shifting from travel/facilities to productivity SaaS. Decision-makers younger (avg CMO age dropped from 48 → 43).

**Technology:** Multimodal models commoditised by Q3 2025. Edge inference viable for real-time marketing signals. Browser-based auth (passkeys) eliminating password friction.

**Environmental:** Scope 3 SaaS emissions reporting mandated for EU companies >250 employees from 2027 — creates green-stack differentiation angle.

**Legal:** DSA platform obligations affecting paid social distribution. ePrivacy Regulation still pending — creates uncertainty in cookie-less tracking strategies.`,

  competitor: `## Competitor Intelligence Report

### HubSpot
- **Positioning:** All-in-one platform, SMB-first, freemium GTM
- **Weakness:** AI features bolted on, not native — users report "feels like an add-on"
- **Pricing:** $800–$3,200/mo for Marketing Hub Pro
- **Gap to exploit:** No real-time campaign intelligence or autonomous execution

### Salesforce Marketing Cloud
- **Positioning:** Enterprise, data cloud integration, high configurability
- **Weakness:** 6–18 month implementation cycles, high TCO
- **Pricing:** $1,250–$15,000/mo, plus consulting fees
- **Gap to exploit:** SMB and mid-market completely underserved

### Klaviyo (E-commerce focus)
- **Positioning:** Email + SMS for DTC brands
- **Weakness:** Limited to e-commerce, no B2B use case
- **Gap to exploit:** B2B buyers growing rapidly, no Klaviyo equivalent

### Your Differentiation
Autonomous AI that **plans, executes and analyses** — not just reports. Faster time-to-insight, no integration tax, vertical-specific models.`,

  persona: `## Buyer Persona Report

---

### Persona 1 — "The Stretched CMO"
**Name:** Sarah, VP Marketing, Series B SaaS
**Age:** 38 · **Company:** 80–300 employees · **Budget:** $150k–$500k/yr

**Core Pain:** Expected to 3× pipeline with the same team size after last round of layoffs. Drowning in dashboards, starved for decisions.

**What they want:** One place that tells them what to do next, not just what happened.
**Buying trigger:** Board meeting where they couldn't explain why paid CAC jumped 40%.
**Key objection:** "We already have too many tools."
**Message that wins:** *"Replace 4 reporting tools with one that acts."*

---

### Persona 2 — "The Performance Lead"
**Name:** Marcos, Head of Growth, PLG startup
**Age:** 31 · **Company:** 20–80 employees · **Budget:** $30k–$80k/yr

**Core Pain:** Manually pulling channel data every Monday morning. Experiments running with no statistical significance framework.

**What they want:** Auto-detected experiment winners with confidence intervals, pushed to Slack.
**Buying trigger:** Lost a key hire to a competitor with better tooling.
**Key objection:** "Can it integrate with our data warehouse?"
**Message that wins:** *"From raw events to recommended budget shift in under 60 seconds."*`,
};

export default function AnalysisPage() {
  const [selectedType, setSelectedType] = useState<AnalysisType>('market');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const runAnalysis = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setIsDemo(false);
    try {
      await trackEvent('analysis_run', { analysis_type: selectedType });
      let response;
      switch (selectedType) {
        case 'market':
          response = await analysisService.marketResearch(query);
          break;
        case 'swot':
          response = await analysisService.swotAnalysis(query);
          break;
        case 'pestel':
          response = await analysisService.pestelAnalysis(query);
          break;
        case 'competitor':
          response = await analysisService.competitorAnalysis(query.split(',').map((s) => s.trim()));
          break;
        case 'persona':
          response = await analysisService.createPersonas(query);
          break;
      }
      const text = typeof response === 'string'
        ? response
        : response?.analysis
          ? JSON.stringify(response.analysis, null, 2)
          : response?.insights
            ? JSON.stringify(response.insights, null, 2)
            : JSON.stringify(response, null, 2);
      setResult(text);
    } catch {
      // Show demo result so the page is useful without backend
      setResult(DEMO_RESULTS[selectedType]);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  };

  const current = ANALYSIS_TYPES.find((t) => t.key === selectedType)!;
  const colorMap: Record<string, string> = {
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
  };
  const activeMap: Record<string, string> = {
    orange: 'bg-orange-500 text-white border-orange-500',
    blue: 'bg-blue-600 text-white border-blue-600',
    emerald: 'bg-emerald-600 text-white border-emerald-600',
    rose: 'bg-rose-600 text-white border-rose-600',
    violet: 'bg-violet-600 text-white border-violet-600',
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-orange-500">Intelligence Engine</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Business Analysis</h2>
        <p className="text-sm text-slate-500">AI-powered strategic analyses — market research, competitive intel, buyer personas and more.</p>
      </section>

      {/* ── Type selector ── */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {ANALYSIS_TYPES.map((type) => {
          const Icon = type.icon;
          const isActive = selectedType === type.key;
          return (
            <button
              key={type.key}
              onClick={() => setSelectedType(type.key)}
              className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
                isActive
                  ? activeMap[type.color]
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">{type.label}</p>
                <p className={`mt-0.5 text-xs leading-relaxed ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                  {type.description}
                </p>
              </div>
            </button>
          );
        })}
      </section>

      {/* ── Input ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block text-sm font-semibold text-slate-800 mb-2">{current.label}</label>
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void runAnalysis()}
            placeholder={current.placeholder}
            className="input-field"
          />
          <button
            onClick={() => void runAnalysis()}
            disabled={loading || !query.trim()}
            className="btn-primary inline-flex items-center gap-2 px-5 whitespace-nowrap"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? 'Analysing…' : 'Analyse'}
          </button>
        </div>

        {/* Quick suggestions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {[current.placeholder, 'AI startups in DACH region', 'SaaS pricing strategy 2026'].map((s, i) => (
            <button
              key={i}
              onClick={() => setQuery(s)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="h-3 w-3 text-slate-400" />
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* ── Results ── */}
      {loading && (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
            <p className="mt-3 text-sm text-slate-500">Running {current.label}…</p>
          </div>
        </div>
      )}

      {result && !loading && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-slate-800">{current.label} Results</h3>
            {isDemo && (
              <span className={`ml-auto rounded-full border px-2 py-0.5 text-xs font-medium ${colorMap[current.color]}`}>
                Demo output
              </span>
            )}
          </div>
          <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-headings:font-semibold prose-p:text-slate-700 prose-li:text-slate-700 prose-strong:text-slate-900 prose-table:text-sm">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </section>
      )}
    </div>
  );
}
