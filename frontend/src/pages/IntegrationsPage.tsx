import { useEffect, useState, useRef } from 'react';
import { Globe, Loader2, RefreshCw, Search, X, Zap } from 'lucide-react';
import { integrationsService } from '../services/api';

interface Connector {
  key: string;
  name: string;
  provider: string;
  category: string;
  auth_type?: string;
  status?: string;
}

interface CatalogItem {
  name: string;
  status: string;
  demo_mode: boolean;
  authenticated: boolean;
}

interface ConnectorDetail {
  key: string;
  display_name: string;
  category?: string;
  providers_available: string[];
  suggested_actions: string[];
  variants: unknown[];
}

const PROVIDERS = ['all', 'native', 'n8n'];
const CATEGORIES = ['', 'pos', 'accounting', 'inventory', 'labor', 'reviews', 'analytics', 'automation'];

const statusColor: Record<string, string> = {
  live: 'text-emerald-700 bg-emerald-50 ring-emerald-200',
  demo: 'text-orange-700 bg-orange-50 ring-orange-200',
  ready: 'text-blue-700 bg-blue-50 ring-blue-200',
};

export default function IntegrationsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [catalog, setCatalog] = useState<Record<string, CatalogItem>>({});
  const [stats, setStats] = useState<{ total_connectors: number; snapshot_connectors: number; source_total_connectors: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [provider, setProvider] = useState('all');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [detail, setDetail] = useState<ConnectorDetail | null>(null);
  const [detailKey, setDetailKey] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const PAGE_SIZE = 60;

  const fetchConnectors = async (reset = true) => {
    if (reset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }
    try {
      const currentOffset = reset ? 0 : offset;
      const [marketData, statsData, catalogData] = await Promise.all([
        integrationsService.getMarketplace({
          provider: provider === 'all' ? undefined : provider,
          category: category || undefined,
          search: search || undefined,
          limit: PAGE_SIZE,
          offset: currentOffset,
        }),
        stats === null ? integrationsService.getMarketplaceStats() : Promise.resolve(stats),
        Object.keys(catalog).length === 0 ? integrationsService.getCatalog() : Promise.resolve({ integrations: [] }),
      ]);

      if (reset) {
        setConnectors(marketData.connectors);
      } else {
        setConnectors((prev) => [...prev, ...marketData.connectors]);
      }
      setTotal(marketData.total);
      setHasMore(marketData.has_more);
      setOffset(currentOffset + PAGE_SIZE);

      if (statsData) setStats(statsData as typeof stats);

      if (catalogData.integrations.length > 0) {
        const map: Record<string, CatalogItem> = {};
        catalogData.integrations.forEach((item) => {
          map[item.name] = item;
        });
        setCatalog(map);
      }
    } catch {
      // backend may be offline; keep existing data
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void fetchConnectors(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, category]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      void fetchConnectors(true);
    }, 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openDetail = async (key: string, prov: string) => {
    if (detailKey === key) {
      setDetail(null);
      setDetailKey('');
      setActionResult(null);
      return;
    }
    setDetailKey(key);
    setDetail(null);
    setActionResult(null);
    setDetailLoading(true);
    try {
      const d = await integrationsService.getConnectorDetail(key, prov);
      setDetail(d);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const runDemoAction = async (key: string, action: string) => {
    setActionLoading(true);
    setActionResult(null);
    try {
      const result = await integrationsService.triggerAction(key, action, { demo: true });
      setActionResult(JSON.stringify(result, null, 2));
    } catch (e) {
      setActionResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const connectorStatus = (key: string): string => {
    const item = catalog[key];
    if (!item) return '';
    if (item.authenticated && !item.demo_mode) return 'live';
    if (item.demo_mode) return 'demo';
    return 'ready';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white shadow-xl shadow-slate-300/40">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-orange-300">Connector Marketplace</p>
            <h2 className="mt-2 text-2xl font-bold">Integrations</h2>
            <p className="mt-1 text-sm text-slate-300">
              {stats
                ? `${stats.total_connectors} native connectors · ${stats.snapshot_connectors}+ marketplace templates · ${stats.source_total_connectors} source integrations`
                : 'Connect your restaurant data stack'}
            </p>
          </div>
          <button
            onClick={() => void fetchConnectors(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Status badges for core connectors */}
        {Object.keys(catalog).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.values(catalog).slice(0, 8).map((item) => (
              <span
                key={item.name}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${item.authenticated && !item.demo_mode ? statusColor.live : item.demo_mode ? statusColor.demo : statusColor.ready}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${item.authenticated && !item.demo_mode ? 'bg-emerald-500' : item.demo_mode ? 'bg-orange-400' : 'bg-blue-400'}`} />
                {item.name}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search connectors..."
            className="h-9 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-300 w-56"
          />
        </div>

        <div className="flex gap-1">
          {PROVIDERS.map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${provider === p ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {p === 'all' ? 'All providers' : p}
            </button>
          ))}
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-orange-400 focus:outline-none"
        >
          <option value="">All categories</option>
          {CATEGORIES.filter(Boolean).map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>

        {(search || provider !== 'all' || category) && (
          <button
            onClick={() => { setSearch(''); setProvider('all'); setCategory(''); }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}

        <span className="ml-auto text-xs text-slate-500">
          {loading ? 'Loading…' : `${connectors.length} of ${total} connectors`}
        </span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {connectors.map((c) => {
              const st = connectorStatus(c.key);
              const isActive = detailKey === c.key;
              return (
                <button
                  key={`${c.key}-${c.provider}`}
                  onClick={() => void openDetail(c.key, c.provider)}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                    isActive
                      ? 'border-orange-300 bg-orange-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <Globe className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-orange-500' : 'text-slate-400'}`} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{c.name}</p>
                    <p className="truncate text-xs text-slate-500">{c.category || c.provider}</p>
                  </div>
                  {st && (
                    <span className={`ml-auto flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${statusColor[st]}`}>
                      {st}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {connectors.length === 0 && (
            <p className="py-12 text-center text-sm text-slate-500">No connectors found. Try a different search or filter.</p>
          )}

          {hasMore && (
            <div className="flex justify-center">
              <button
                onClick={() => void fetchConnectors(false)}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
              >
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Load more
              </button>
            </div>
          )}
        </>
      )}

      {/* Connector detail drawer */}
      {(detailLoading || detail) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {detailLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading connector details…
            </div>
          ) : detail ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{detail.display_name || detail.key}</h3>
                  <p className="text-xs text-slate-500">Key: {detail.key}{detail.category ? ` · ${detail.category}` : ''}</p>
                </div>
                <button onClick={() => { setDetail(null); setDetailKey(''); setActionResult(null); }} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {detail.providers_available.map((p) => (
                  <span key={p} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{p}</span>
                ))}
                {detail.category && (
                  <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">{detail.category}</span>
                )}
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">{Array.isArray(detail.variants) ? detail.variants.length : 0} variant(s)</span>
              </div>

              {detail.suggested_actions.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</p>
                  <div className="flex flex-wrap gap-2">
                    {detail.suggested_actions.map((action) => (
                      <button
                        key={action}
                        onClick={() => void runDemoAction(detail.key, action)}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        <Zap className="h-3 w-3" />
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {actionLoading && (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3 w-3 animate-spin" /> Running action…
                </div>
              )}

              {actionResult && (
                <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700 ring-1 ring-slate-200">
                  {actionResult}
                </pre>
              )}
            </>
          ) : null}
        </section>
      )}
    </div>
  );
}
