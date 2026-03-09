import { useMemo, useState } from 'react';
import { Loader2, Play, RefreshCw } from 'lucide-react';
import { restaurantService } from '../services/api';

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
      const marginData = marginRaw as unknown as MarginResponse;
      const repricingData = repricingRaw as unknown as RepricingResponse;
      setMargin(marginData);
      setRepricing(repricingData.repricing_suggestions ?? []);
    } catch {
      setError('Failed to load margin data. Make sure POS and recipe data are ingested.');
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
      const simulationData = payload as unknown as PriceSimulationResponse;
      setSimulation(simulationData.summary);
    } catch {
      setError('Failed to run price simulation.');
    } finally {
      setRunningScenario(false);
    }
  };

  const topItems = useMemo(() => (margin?.items ?? []).slice(0, 8), [margin]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Finance & Margin</p>
            <h2 className="text-xl font-bold text-slate-900">Margin Brain</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          {margin && (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Revenue</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">€{margin.summary.revenue.toFixed(2)}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Estimated COGS</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">€{margin.summary.estimated_cogs.toFixed(2)}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Gross Margin</p>
                <p className="mt-2 text-2xl font-bold text-emerald-700">€{margin.summary.gross_margin.toFixed(2)}</p>
                <p className="mt-1 text-xs text-slate-500">{margin.summary.gross_margin_pct.toFixed(1)}%</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Break-even Progress</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{margin.summary.break_even_progress_pct.toFixed(1)}%</p>
                <p className="mt-1 text-xs text-slate-500">Target €{margin.summary.break_even_revenue.toFixed(0)}</p>
              </article>
            </section>
          )}

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-900">Top Items by Revenue</h3>
              <div className="mt-3 space-y-2">
                {topItems.length === 0 ? (
                  <p className="text-sm text-slate-500">No item sales data in selected period.</p>
                ) : (
                  topItems.map((item) => (
                    <div key={item.menu_item} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <p className="font-semibold text-slate-900">{item.menu_item}</p>
                      <p className="text-xs text-slate-600">
                        Qty {item.quantity} · Revenue €{item.revenue.toFixed(2)} · Margin {item.margin_pct.toFixed(1)}%
                      </p>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-900">Repricing Suggestions</h3>
              <div className="mt-3 space-y-2">
                {repricing.length === 0 ? (
                  <p className="text-sm text-slate-500">No repricing suggestions for this period.</p>
                ) : (
                  repricing.slice(0, 8).map((row) => (
                    <div key={`${row.menu_item}-${row.recommended_change_pct}`} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <p className="font-semibold text-slate-900">{row.menu_item}</p>
                      <p className="text-xs text-slate-600">Change {row.recommended_change_pct.toFixed(1)}% · Expected margin {row.expected_margin_pct.toFixed(1)}%</p>
                      <p className="mt-1 text-xs text-slate-500">{row.reason}</p>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>

          {simulation && (
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-900">Price Scenario Result</h3>
              <div className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                <p>Items simulated: <span className="font-semibold">{simulation.items_simulated}</span></p>
                <p>Revenue delta: <span className={`font-semibold ${simulation.revenue_delta >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>€{simulation.revenue_delta.toFixed(2)}</span></p>
                <p>Margin delta: <span className={`font-semibold ${simulation.gross_margin_delta >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>€{simulation.gross_margin_delta.toFixed(2)}</span></p>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
