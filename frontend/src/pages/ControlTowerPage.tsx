import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { restaurantService } from '../services/api';

interface KPIBlock {
  revenue: number;
  forecast_revenue: number;
  revenue_vs_forecast_pct: number;
  covers: number;
  avg_check: number;
  labor_cost: number;
  labor_cost_pct: number;
  food_cost: number;
  food_cost_pct: number;
  review_sentiment: number;
}

interface ControlAnomaly {
  category: string;
  severity: string;
  title: string;
  why: string;
  metric: number;
}

interface ControlResponse {
  date: string;
  venue_id: string;
  kpis: KPIBlock;
  targets: {
    labor_target_pct: number;
    food_target_pct: number;
    sales_drop_alert_pct: number;
  };
  anomalies: ControlAnomaly[];
}

interface Recommendation {
  category: string;
  title: string;
  warning: string;
  why: string;
  next_action: string;
  automatable: boolean;
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
}

interface ObservabilityResponse {
  status: 'healthy' | 'warning' | 'degraded';
  ingestion_health: {
    total_runs_7d: number;
  };
  operations_health: {
    open_recommendations_today: number;
    high_anomalies_today: number;
  };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function metricColor(value: number, threshold: number, invert = false): string {
  const isBad = invert ? value < threshold : value > threshold;
  return isBad ? 'text-red-600' : 'text-emerald-700';
}

export default function ControlTowerPage() {
  const [date, setDate] = useState<string>(todayIso());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [control, setControl] = useState<ControlResponse | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [observability, setObservability] = useState<ObservabilityResponse | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [controlRaw, recRaw, obsRaw] = await Promise.all([
        restaurantService.getControlTowerDaily(date),
        restaurantService.getDailyRecommendations(date),
        restaurantService.getObservabilitySummary(date),
      ]);
      const controlData = controlRaw as unknown as ControlResponse;
      const recData = recRaw as unknown as RecommendationsResponse;
      const obsData = obsRaw as unknown as ObservabilityResponse;
      setControl(controlData);
      setRecommendations(recData.recommendations ?? []);
      setObservability(obsData);
    } catch {
      setError('Failed to load control tower data. Ingest sample CSVs first.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = useMemo(() => {
    if (!control) return [];
    const k = control.kpis;
    return [
      { label: 'Revenue', value: `€${k.revenue.toFixed(2)}` },
      { label: 'Forecast', value: `€${k.forecast_revenue.toFixed(2)}` },
      { label: 'Covers', value: `${k.covers}` },
      { label: 'Avg Check', value: `€${k.avg_check.toFixed(2)}` },
    ];
  }, [control]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Daily Control Tower</p>
            <h2 className="text-xl font-bold text-slate-900">Service Command Snapshot</h2>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      {control && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Labor Cost %</p>
              <p className={`mt-2 text-2xl font-bold ${metricColor(control.kpis.labor_cost_pct, control.targets.labor_target_pct)}`}>
                {control.kpis.labor_cost_pct.toFixed(1)}%
              </p>
              <p className="mt-1 text-xs text-slate-500">Target {control.targets.labor_target_pct.toFixed(1)}%</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Food Cost %</p>
              <p className={`mt-2 text-2xl font-bold ${metricColor(control.kpis.food_cost_pct, control.targets.food_target_pct)}`}>
                {control.kpis.food_cost_pct.toFixed(1)}%
              </p>
              <p className="mt-1 text-xs text-slate-500">Target {control.targets.food_target_pct.toFixed(1)}%</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Revenue vs Forecast</p>
              <p className={`mt-2 text-2xl font-bold ${metricColor(control.kpis.revenue_vs_forecast_pct, -control.targets.sales_drop_alert_pct, true)}`}>
                {control.kpis.revenue_vs_forecast_pct.toFixed(1)}%
              </p>
              <p className="mt-1 text-xs text-slate-500">Alert if below -{control.targets.sales_drop_alert_pct.toFixed(1)}%</p>
            </article>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <h3 className="font-semibold text-slate-900">Anomalies</h3>
              </div>
              {control.anomalies.length === 0 ? (
                <p className="text-sm text-slate-500">No anomalies detected.</p>
              ) : (
                <div className="space-y-2">
                  {control.anomalies.map((item, idx) => (
                    <div key={`${item.title}-${idx}`} className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-600">{item.why}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <h3 className="font-semibold text-slate-900">AI Recommendations</h3>
              </div>
              {recommendations.length === 0 ? (
                <p className="text-sm text-slate-500">No recommendations yet.</p>
              ) : (
                <div className="space-y-2">
                  {recommendations.map((item, idx) => (
                    <div key={`${item.title}-${idx}`} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-600">{item.warning}</p>
                      <p className="mt-1 text-xs text-slate-500">Why: {item.why}</p>
                      <p className="mt-1 text-xs font-medium text-slate-700">Next: {item.next_action}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          {observability && (
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Pilot Observability</p>
              <div className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                <p>Status: <span className="font-semibold">{observability.status}</span></p>
                <p>Ingestion runs (7d): <span className="font-semibold">{observability.ingestion_health.total_runs_7d}</span></p>
                <p>Open recs today: <span className="font-semibold">{observability.operations_health.open_recommendations_today}</span></p>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
