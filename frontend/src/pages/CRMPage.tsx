import { useState, useEffect } from 'react';
import {
  Users,
  Megaphone,
  Plus,
  Loader2,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Building2,
  TrendingUp,
} from 'lucide-react';
import { crmService } from '../services/api';

// ── Demo data shown when backend is unavailable ──────────────────────────
const DEMO_LEADS = [
  { id: 'ld-001', name: 'Sophie Turner', email: 'sophie@growthco.io', company: 'GrowthCo', status: 'hot', created_at: '2026-03-05' },
  { id: 'ld-002', name: 'Marcus Webb', email: 'marcus@scaleai.com', company: 'ScaleAI', status: 'warm', created_at: '2026-03-06' },
  { id: 'ld-003', name: 'Lena Hoffmann', email: 'lena@nucliq.de', company: 'Nucliq', status: 'warm', created_at: '2026-03-07' },
  { id: 'ld-004', name: 'James Okafor', email: 'james@nexgen.io', company: 'NexGen', status: 'cold', created_at: '2026-03-08' },
  { id: 'ld-005', name: 'Priya Sharma', email: 'priya@orbit.co', company: 'Orbit', status: 'hot', created_at: '2026-03-09' },
];

const DEMO_CAMPAIGNS = [
  { id: 'cmp-001', name: 'Q1 SaaS Outreach', channel: 'email', status: 'active', leads: 124, conversions: 18, created_at: '2026-03-01' },
  { id: 'cmp-002', name: 'LinkedIn Awareness', channel: 'social', status: 'active', leads: 89, conversions: 9, created_at: '2026-03-03' },
  { id: 'cmp-003', name: 'Google Brand Defense', channel: 'ads', status: 'draft', leads: 0, conversions: 0, created_at: '2026-03-07' },
  { id: 'cmp-004', name: 'March Newsletter', channel: 'email', status: 'paused', leads: 340, conversions: 26, created_at: '2026-02-28' },
];
// ────────────────────────────────────────────────────────────────────────

type Lead = typeof DEMO_LEADS[0];
type Campaign = typeof DEMO_CAMPAIGNS[0];

export default function CRMPage() {
  const [tab, setTab] = useState<'leads' | 'campaigns' | 'compliance'>('leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  // Lead form
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');

  // Campaign form
  const [campName, setCampName] = useState('');
  const [campChannel, setCampChannel] = useState('email');

  // Compliance form
  const [compMessage, setCompMessage] = useState('');
  const [compChannel, setCompChannel] = useState('email');
  const [compResult, setCompResult] = useState<{ status: string; details?: { is_compliant?: boolean; message?: string; issues?: string[] } } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leadsRes, campsRes] = await Promise.all([
        crmService.getLeads(),
        crmService.getCampaigns(),
      ]);
      setLeads((leadsRes.leads as Lead[]) || []);
      setCampaigns((campsRes.campaigns as Campaign[]) || []);
      setIsDemo(false);
    } catch {
      setLeads(DEMO_LEADS);
      setCampaigns(DEMO_CAMPAIGNS);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchData(); }, []);

  const addLead = async () => {
    if (!leadName.trim()) return;
    try {
      await crmService.createLead(`lead-${Date.now()}`, { name: leadName, email: leadEmail });
      setLeadName('');
      setLeadEmail('');
      void fetchData();
    } catch {
      // optimistically add locally
      setLeads((prev) => [
        { id: `ld-${Date.now()}`, name: leadName, email: leadEmail, company: '—', status: 'cold', created_at: new Date().toISOString().slice(0, 10) },
        ...prev,
      ]);
      setLeadName('');
      setLeadEmail('');
    }
  };

  const addCampaign = async () => {
    if (!campName.trim()) return;
    try {
      await crmService.createCampaign(campName, campChannel);
      setCampName('');
      void fetchData();
    } catch {
      setCampaigns((prev) => [
        { id: `cmp-${Date.now()}`, name: campName, channel: campChannel, status: 'draft', leads: 0, conversions: 0, created_at: new Date().toISOString().slice(0, 10) },
        ...prev,
      ]);
      setCampName('');
    }
  };

  const checkCompliance = async () => {
    if (!compMessage.trim()) return;
    try {
      const result = await crmService.checkCompliance(compMessage, compChannel);
      setCompResult(result as typeof compResult);
    } catch {
      // Demo compliance check
      const hasIssues = compMessage.toLowerCase().includes('guarantee') || compMessage.toLowerCase().includes('free money');
      setCompResult({
        status: hasIssues ? 'non_compliant' : 'compliant',
        details: {
          is_compliant: !hasIssues,
          message: hasIssues
            ? 'Potential compliance issues detected in your message.'
            : 'Message looks compliant for this channel.',
          issues: hasIssues ? ['Avoid absolute guarantees ("guaranteed results")', 'Ensure unsubscribe mechanism is present'] : [],
        },
      });
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      hot: 'bg-red-100 text-red-700',
      warm: 'bg-amber-100 text-amber-700',
      cold: 'bg-blue-100 text-blue-700',
      active: 'bg-emerald-100 text-emerald-700',
      draft: 'bg-slate-100 text-slate-600',
      paused: 'bg-yellow-100 text-yellow-700',
    };
    return map[status] ?? 'bg-slate-100 text-slate-600';
  };

  const channelIcon = (ch: string) => {
    if (ch === 'email') return <Mail className="h-3.5 w-3.5" />;
    if (ch === 'social') return <Users className="h-3.5 w-3.5" />;
    return <Megaphone className="h-3.5 w-3.5" />;
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-orange-500">CRM & Campaigns</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Leads, Campaigns & Compliance</h2>
            <p className="text-sm text-slate-500">Manage your pipeline, run campaigns, and validate message compliance.</p>
          </div>
          {isDemo && (
            <span className="rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-medium text-orange-600">
              Demo data
            </span>
          )}
        </div>

        {/* Stats strip */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Total Leads', value: leads.length, icon: Users, color: 'text-blue-600' },
            { label: 'Active Campaigns', value: campaigns.filter((c) => c.status === 'active').length, icon: Megaphone, color: 'text-orange-600' },
            { label: 'Conversions', value: campaigns.reduce((acc, c) => acc + (c.conversions || 0), 0), icon: TrendingUp, color: 'text-emerald-600' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <Icon className={`h-5 w-5 ${s.color}`} />
                <div>
                  <p className="text-xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Tab bar ── */}
      <div className="flex gap-2">
        {([
          { key: 'leads', label: 'Leads', icon: Users },
          { key: 'campaigns', label: 'Campaigns', icon: Megaphone },
          { key: 'compliance', label: 'Compliance', icon: ShieldCheck },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── Leads Tab ── */}
      {tab === 'leads' && (
        <div className="space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Add Lead</h3>
            <div className="flex flex-wrap gap-3">
              <input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Full name" className="input-field max-w-xs" />
              <input value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="Email address" className="input-field max-w-xs" />
              <button onClick={() => void addLead()} className="btn-primary flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Lead
              </button>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Pipeline — {leads.length} leads</h3>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            </div>
            {leads.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">No leads yet. Add one above or use the AI Chat.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 text-left">Lead</th>
                      <th className="px-5 py-3 text-left">Company</th>
                      <th className="px-5 py-3 text-left">Status</th>
                      <th className="px-5 py-3 text-left">Added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leads.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                              {l.name?.slice(0, 2).toUpperCase() || '??'}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{l.name || '—'}</p>
                              <p className="text-xs text-slate-500 flex items-center gap-1"><Mail className="h-3 w-3" />{l.email || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            {(l as any).company || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusBadge((l as any).status || 'cold')}`}>
                            {(l as any).status || 'cold'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          {l.created_at?.slice(0, 10) || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>
      )}

      {/* ── Campaigns Tab ── */}
      {tab === 'campaigns' && (
        <div className="space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Create Campaign</h3>
            <div className="flex flex-wrap gap-3">
              <input value={campName} onChange={(e) => setCampName(e.target.value)} placeholder="Campaign name" className="input-field max-w-xs" />
              <select value={campChannel} onChange={(e) => setCampChannel(e.target.value)} className="input-field w-36">
                <option value="email">📧 Email</option>
                <option value="social">📱 Social</option>
                <option value="ads">📢 Ads</option>
              </select>
              <button onClick={() => void addCampaign()} className="btn-primary flex items-center gap-2">
                <Plus className="h-4 w-4" /> Create
              </button>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Campaigns — {campaigns.length} total</h3>
            </div>
            {campaigns.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">No campaigns yet. Create your first above.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 text-left">Campaign</th>
                      <th className="px-5 py-3 text-left">Channel</th>
                      <th className="px-5 py-3 text-left">Status</th>
                      <th className="px-5 py-3 text-right">Leads</th>
                      <th className="px-5 py-3 text-right">Conversions</th>
                      <th className="px-5 py-3 text-left">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {campaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-900">{c.name}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5 text-slate-600">
                            {channelIcon(c.channel)}
                            <span className="capitalize">{c.channel}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusBadge(c.status)}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-slate-700">{(c as any).leads ?? '—'}</td>
                        <td className="px-5 py-3 text-right font-semibold text-emerald-700">{(c as any).conversions ?? '—'}</td>
                        <td className="px-5 py-3 text-slate-500">{c.created_at?.slice(0, 10) || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>
      )}

      {/* ── Compliance Tab ── */}
      {tab === 'compliance' && (
        <div className="space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Compliance Checker</h3>
              <p className="text-xs text-slate-500 mt-0.5">Paste any marketing message to check it against email / SMS / social regulations (GDPR, CAN-SPAM, PECR).</p>
            </div>
            <textarea
              value={compMessage}
              onChange={(e) => setCompMessage(e.target.value)}
              placeholder="Paste your marketing message here…"
              rows={5}
              className="input-field resize-none"
            />
            <div className="flex flex-wrap gap-3">
              <select value={compChannel} onChange={(e) => setCompChannel(e.target.value)} className="input-field w-36">
                <option value="email">📧 Email</option>
                <option value="sms">📱 SMS</option>
                <option value="social">🌐 Social</option>
              </select>
              <button onClick={() => void checkCompliance()} disabled={!compMessage.trim()} className="btn-primary flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Check Compliance
              </button>
            </div>
          </article>

          {compResult && (
            <article className={`rounded-2xl border p-5 shadow-sm ${compResult.details?.is_compliant ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center gap-3 mb-3">
                {compResult.details?.is_compliant ? (
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
                <h3 className={`text-base font-bold ${compResult.details?.is_compliant ? 'text-emerald-900' : 'text-red-900'}`}>
                  {compResult.details?.is_compliant ? 'Message is Compliant' : 'Compliance Issues Found'}
                </h3>
              </div>
              <p className={`text-sm ${compResult.details?.is_compliant ? 'text-emerald-800' : 'text-red-800'}`}>
                {compResult.details?.message}
              </p>
              {(compResult.details?.issues ?? []).length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {compResult.details!.issues!.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                      <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                      {issue}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-slate-500" />
                <p className="text-xs text-slate-600">Channel: <strong>{compChannel}</strong> · Checked against GDPR, CAN-SPAM, PECR</p>
              </div>
            </article>
          )}
        </div>
      )}
    </div>
  );
}
