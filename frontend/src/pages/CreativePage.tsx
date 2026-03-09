import { useState } from 'react';
import { Wand2, Loader2, Copy, Check, Paintbrush, TestTubeDiagonal, Sparkles, ChevronRight } from 'lucide-react';
import { creativeService } from '../services/api';
import ReactMarkdown from 'react-markdown';

type CreativeMode = 'copy' | 'image' | 'ab-test';

// ── Demo output shown when backend unavailable ────────────────────────────
const DEMO_COPY = `**LinkedIn Post — AI in Marketing (Professional tone)**

The future of marketing isn't more dashboards. It's fewer decisions.

Every week, high-performing marketing teams waste 40–60% of their time on reporting, reconciliation, and gut-feel calls that should be data-driven.

AI-native CMO tools are changing that equation:
→ Auto-detecting which channel is underperforming before it affects pipeline
→ Recommending budget shifts with confidence intervals, not opinions
→ Writing first-draft briefs so creatives focus on creative, not briefs

The teams we work with have reduced their weekly marketing ops overhead by 8 hours — and improved ROAS by 23% in 90 days.

This isn't the future. It's already happening.

#AIMarketing #GrowthMarketing #MarTech`;

const DEMO_IMAGE = `**Image Prompt — Ready for Midjourney / DALL-E**

A sleek, futuristic marketing command center dashboard floating in a dark slate environment. Multiple holographic screens display real-time analytics charts in orange and white. The aesthetic is minimal and premium — similar to Apple's design language meets Bloomberg Terminal. Soft ambient glow from screen light. 8K render, ultra-detailed, professional product photography style. --ar 16:9 --v 6`;

const DEMO_AB = `## A/B Test Variant Set

### Variant A — Curiosity Hook
"What would your ROAS look like if your CMO never slept?"

Most marketing teams leave 30% of their budget's potential on the table. Our AI watches every channel, every minute — and tells you exactly where to shift spend before the week is over.

**CTA:** See My Revenue Gap

---

### Variant B — Social Proof
"$2.4M in recovered ad spend. 47 teams. 90 days."

We analysed what the top-performing marketing teams do differently. Spoiler: it's not creativity. It's speed of insight. Get your free audit.

**CTA:** Get Free Audit

---

### Variant C — Fear of Missing Out
"Your competitors already know which channel is underperforming this week. Do you?"

Real-time competitive signals meet AI-powered spend recommendations. The first team in your space to act always wins.

**CTA:** Start Free Trial — No Card Required`;
// ────────────────────────────────────────────────────────────────────────

const MODES: { key: CreativeMode; label: string; icon: React.ElementType; description: string }[] = [
  { key: 'copy', label: 'Marketing Copy', icon: Paintbrush, description: 'Emails, ads, social posts, landing pages' },
  { key: 'image', label: 'Image Prompt', icon: Sparkles, description: 'Midjourney / DALL-E ready prompts' },
  { key: 'ab-test', label: 'A/B Variants', icon: TestTubeDiagonal, description: 'Multiple test variants from one brief' },
];

const QUICK_BRIEFS: Record<CreativeMode, string[]> = {
  copy: [
    'LinkedIn post about AI in marketing for B2B audience',
    'Email subject lines for SaaS product launch',
    'Google Ads headline for CMO persona, competitive angle',
  ],
  image: [
    'Modern SaaS dashboard hero image, dark background, orange accents',
    'Professional team collaboration, clean minimal office, tech startup',
  ],
  'ab-test': [
    'Try our AI-powered marketing platform free for 14 days.',
    'Stop guessing. Start growing. Connect your data in 60 seconds.',
  ],
};

export default function CreativePage() {
  const [mode, setMode] = useState<CreativeMode>('copy');
  const [brief, setBrief] = useState('');
  const [tone, setTone] = useState('professional');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const generate = async () => {
    if (!brief.trim()) return;
    setLoading(true);
    setResult(null);
    setIsDemo(false);
    try {
      let response;
      switch (mode) {
        case 'copy':
          response = await creativeService.generateCopy(brief, tone);
          setResult(response.content || JSON.stringify(response, null, 2));
          break;
        case 'image':
          response = await creativeService.generateImage(brief);
          setResult(response.content || JSON.stringify(response, null, 2));
          break;
        case 'ab-test':
          response = await creativeService.suggestABTests(brief);
          setResult(
            response.alternatives
              ? response.alternatives.join('\n\n---\n\n')
              : JSON.stringify(response, null, 2),
          );
          break;
      }
    } catch {
      // Show demo output so page is always useful
      const demoMap: Record<CreativeMode, string> = {
        copy: DEMO_COPY,
        image: DEMO_IMAGE,
        'ab-test': DEMO_AB,
      };
      setResult(demoMap[mode]);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentMode = MODES.find((m) => m.key === mode)!;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-orange-500">Creative Studio</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">AI Content Generator</h2>
        <p className="text-sm text-slate-500">Generate marketing copy, image prompts, and A/B test variants — powered by your brand voice.</p>
      </section>

      {/* ── Mode selector ── */}
      <section className="grid gap-3 sm:grid-cols-3">
        {MODES.map(({ key, label, icon: Icon, description }) => (
          <button
            key={key}
            onClick={() => { setMode(key); setResult(null); }}
            className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
              mode === key
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Icon className="h-5 w-5" />
            <div>
              <p className="text-sm font-semibold">{label}</p>
              <p className={`mt-0.5 text-xs ${mode === key ? 'text-slate-300' : 'text-slate-500'}`}>{description}</p>
            </div>
          </button>
        ))}
      </section>

      {/* ── Input ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1">
            {mode === 'ab-test' ? 'Base copy to vary' : 'Creative brief'}
          </label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={
              mode === 'copy'
                ? 'Describe what you need — e.g. LinkedIn post about AI trends in marketing for B2B SaaS decision-makers'
                : mode === 'image'
                  ? 'Describe the visual — e.g. Modern tech hero image, dark background, orange accents, 16:9'
                  : 'Paste your existing copy to generate A/B variants'
            }
            rows={4}
            className="input-field resize-none"
          />
        </div>

        {mode === 'copy' && (
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Tone of voice</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)} className="input-field max-w-xs">
              <option value="professional">Professional</option>
              <option value="casual">Casual &amp; friendly</option>
              <option value="playful">Playful</option>
              <option value="urgent">Urgent</option>
              <option value="inspirational">Inspirational</option>
              <option value="provocative">Provocative / Bold</option>
            </select>
          </div>
        )}

        {/* Quick brief suggestions */}
        <div>
          <p className="text-xs text-slate-500 mb-2">Quick starts:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_BRIEFS[mode].map((s, i) => (
              <button
                key={i}
                onClick={() => setBrief(s)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <ChevronRight className="h-3 w-3 text-slate-400" /> {s.length > 55 ? s.slice(0, 52) + '…' : s}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => void generate()}
          disabled={loading || !brief.trim()}
          className="btn-primary inline-flex items-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {loading ? 'Generating…' : `Generate ${currentMode.label}`}
        </button>
      </section>

      {/* ── Result ── */}
      {loading && (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
            <p className="mt-3 text-sm text-slate-500">Crafting your {currentMode.label}…</p>
          </div>
        </div>
      )}

      {result && !loading && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-500" />
              <h3 className="text-sm font-semibold text-slate-800">Generated {currentMode.label}</h3>
              {isDemo && (
                <span className="rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-xs font-medium text-orange-600">
                  Demo output
                </span>
              )}
            </div>
            <button
              onClick={copyToClipboard}
              className="btn-secondary flex items-center gap-1.5 text-xs"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied!' : 'Copy all'}
            </button>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
            <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-headings:font-semibold prose-p:text-slate-700 prose-li:text-slate-700 prose-strong:text-slate-900 prose-hr:border-slate-200">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
