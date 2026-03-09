import { useMemo, useState } from 'react';
import { Loader2, Play, RefreshCw } from 'lucide-react';
import { restaurantService } from '../services/api';
import {
  EmptyPanelMessage,
  OpsKpiCard,
  OpsPageHeader,
  OpsPanel,
  RecommendationCard,
} from '../components/ui/OpsPrimitives';

interface MarginItem {
  menu_item: string;
  quantity: number;
  revenue: number;
  estimated_cogs: number;
  gross_margin: number;
  margin_pct: number;
}

interface MarginResponse {
  summary: {
    revenue: number;
    estimated_cogs: number;
    gross_margin: number;
    gross_margin_pct: number;
    break_even_revenue: number;
    break_even_progress_pct: number;
  };
  items: MarginItem[];
}

interface RepricingSuggestion {
  menu_item: string;
  recommended_change_pct: number;
  expected_margin_pct: number;
  reason: string;
}

interface RepricingResponse {
  repricing_suggestions: RepricingSuggestion[];
}

interface PriceSimulationResponse {
  summary: {
    items_simulated: number;
    current_revenue: number;
    projected_revenue: number;
    current_gross_margin: number;
    projected_gross_margin: number;
    revenue_delta: number;
    gross_margin_delta: number;
  };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function toneByMargin(marginPct: number): 'healthy' | 'warning' | 'critical' {
  if (marginPct >= 62) return 'healthy';
  if (marginPct >= 50) return 'warning';
  return 'critical';
}

export default function MarginBrainPage() {
  const [fromDate, setFromDate] = useState<string>(daysAgoIso(6));
  const [toDate, setToDate] = useState<string>(todayIso());
  const [loading, setLoading] = useState<boolean>(false);
  const [runningScenario, setRunningScenario] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [margin, setMargin] = useState<MarginResponse | null>(null);
  const [repricing, setRepricing] = useState<RepricingSuggestion[]>([]);
  const [simulation, setSimulation] = useState<PriceSimulationResponse['summary'] | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [marginRaw, repricingRaw] = await Promise.all([
        restaurantService.getFinanceMargin(fromDate, toDate),
        restaurantService.getMenuRepricing(fromDate, toDate),
      ]);
      setMargin(marginRaw as unknown as MarginResponse);
      setRepricing((repricingRaw as unknown as RepricingResponse).repricing_suggestions ?? []);
    } catch {
      setError('Margin intelligence is unavailable. Ingest POS and recipe inputs, then retry.');
    } finally {
      setLoading(false);
    }
  };

  const runScenario = async () => {
    setRunningScenario(true);
    setError('');
    try {
      const payload = await restaurantService.runMenuPriceSimulator({
        from_date: fromDate,
        to_date: toDate,
        elasticity: -1.1,
      });
      setSimulation((payload as unknown as PriceSimulationResponse).summary);
    } catch {
      setError('Price simulation failed for this date range.');
    } finally {
      setRunningScenario(false);
    }
  };

  const lowMarginItems = useMemo(() => {
    if (!margin) return [];
    return [...margin.items].filter((item) => item.revenue > 0).sort((a, b) => a.margin_pct - b.margin_pct).slice(0, 8);
  }, [margin]);

  const topRevenueItems = useMemo(() => {
    if (!margin) return [];
    return [...margin.items].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [margin]);

  return (
    <div className="space-y-6">
      <OpsPageHeader
        eyebrow="Finance & Margin"
        title="Margin Brain"
        subtitle="Turn sales and cost data into pricing decisions, margin protection signals, and break-even visibility."
      >
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Load
        </button>
        <button
          onClick={() => void runScenario()}
          disabled={runningScenario}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {runningScenario ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Simulate
        </button>
      </OpsPageHeader>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="flex min-h-[35vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          {margin ? (
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <OpsKpiCard label="Revenue" value={`€${margin.summary.revenue.toFixed(2)}`} helper="Net sales for selected period" />
              <OpsKpiCard label="Estimated COGS" value={`€${margin.summary.estimated_cogs.toFixed(2)}`} helper="Recipe and purchase cost baseline" />
              <OpsKpiCard
                label="Gross Margin"
                value={`€${margin.summary.gross_margin.toFixed(2)}`}
                helper={`${margin.summary.gross_margin_pct.toFixed(1)}%`}
                tone={toneByMargin(margin.summary.gross_margin_pct)}
              />
              <OpsKpiCard
                label="Break-even Progress"
                value={`${margin.summary.break_even_progress_pct.toFixed(1)}%`}
                helper={`Target €${margin.summary.break_even_revenue.toFixed(0)}`}
                tone={margin.summary.break_even_progress_pct >= 100 ? 'healthy' : 'warning'}
              />
              <OpsKpiCard
                label="Margin Protection Gap"
                value={`${Math.max(0, 65 - margin.summary.gross_margin_pct).toFixed(1)} pts`}
                helper="Gap to 65% reference guardrail"
                tone={margin.summary.gross_margin_pct >= 65 ? 'healthy' : 'critical'}
              />
            </section>
          ) : (
            <OpsPanel title="No Margin Snapshot Loaded">
              <EmptyPanelMessage message="Load a date range after CSV ingestion to activate margin intelligence." />
            </OpsPanel>
          )}

          <section className="grid gap-4 xl:grid-cols-2">
            <OpsPanel title="Top Revenue Items" subtitle="High-volume dishes ranked by contribution and margin quality.">
              {topRevenueItems.length === 0 ? (
                <EmptyPanelMessage message="No item-level sales found for this range." />
              ) : (
                <div className="space-y-2">
                  {topRevenueItems.map((item) => (
                    <article key={`${item.menu_item}-top`} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">{item.menu_item}</p>
                        <span className={item.margin_pct >= 55 ? 'tp-badge tp-badge-healthy' : item.margin_pct >= 45 ? 'tp-badge tp-badge-warning' : 'tp-badge tp-badge-critical'}>
                          {item.margin_pct.toFixed(1)}% margin
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        Qty {item.quantity} · Revenue €{item.revenue.toFixed(2)} · COGS €{item.estimated_cogs.toFixed(2)}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </OpsPanel>

            <OpsPanel title="Margin Leakage Watchlist" subtitle="Low-margin dishes that should be repriced, bundled, or operationally corrected.">
              {lowMarginItems.length === 0 ? (
                <EmptyPanelMessage message="No low-margin outliers detected." />
              ) : (
                <div className="space-y-2">
                  {lowMarginItems.map((item) => (
                    <RecommendationCard
                      key={`${item.menu_item}-low`}
                      title={item.menu_item}
                      warning={`Current margin is ${item.margin_pct.toFixed(1)}% on €${item.revenue.toFixed(2)} revenue.`}
                      why="Cost-to-price ratio is below healthy contribution target."
                      nextAction="Test repricing and enforce recipe/portion standards for this item."
                      automatable={false}
                      severity={item.margin_pct < 40 ? 'critical' : 'warning'}
                    />
                  ))}
                </div>
              )}
            </OpsPanel>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <OpsPanel title="Repricing Suggestions" subtitle="AI-generated price actions to protect gross margin.">
              {repricing.length === 0 ? (
                <EmptyPanelMessage message="No repricing suggestions generated for this range." />
              ) : (
                <div className="space-y-2">
                  {repricing.slice(0, 10).map((row) => (
                    <RecommendationCard
                      key={`${row.menu_item}-${row.recommended_change_pct}`}
                      title={`${row.menu_item} · ${row.recommended_change_pct.toFixed(1)}% price change`}
                      warning={`Expected margin ${row.expected_margin_pct.toFixed(1)}% after adjustment.`}
                      why={row.reason}
                      nextAction="Run a 7-day A/B menu pricing test, then lock successful changes."
                      automatable={false}
                      severity={row.recommended_change_pct > 0 ? 'warning' : 'notice'}
                    />
                  ))}
                </div>
              )}
            </OpsPanel>

            <OpsPanel title="Scenario Simulator" subtitle="Projected effect of pricing changes on revenue and gross margin.">
              {simulation ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <article className="tp-panel-muted">
                    <p className="tp-kpi-label">Items Simulated</p>
                    <p className="tp-kpi-value">{simulation.items_simulated}</p>
                  </article>
                  <article className="tp-panel-muted">
                    <p className="tp-kpi-label">Revenue Delta</p>
                    <p className={`tp-kpi-value ${simulation.revenue_delta >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      €{simulation.revenue_delta.toFixed(2)}
                    </p>
                  </article>
                  <article className="tp-panel-muted">
                    <p className="tp-kpi-label">Gross Margin Delta</p>
                    <p className={`tp-kpi-value ${simulation.gross_margin_delta >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      €{simulation.gross_margin_delta.toFixed(2)}
                    </p>
                  </article>
                  <article className="tp-panel-muted">
                    <p className="tp-kpi-label">Projected Margin</p>
                    <p className="tp-kpi-value text-slate-900">€{simulation.projected_gross_margin.toFixed(2)}</p>
                  </article>
                </div>
              ) : (
                <EmptyPanelMessage message="Run simulation to preview price impact before committing menu changes." />
              )}
            </OpsPanel>
          </section>
        </>
      )}
    </div>
  );
}
