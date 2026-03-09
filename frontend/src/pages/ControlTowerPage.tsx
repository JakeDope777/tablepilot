import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { restaurantService } from '../services/api';
import {
  EmptyPanelMessage,
  OpsKpiCard,
  OpsPageHeader,
  OpsPanel,
  RecommendationCard,
  severityClass,
  severityLabel,
} from '../components/ui/OpsPrimitives';

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

interface StockAlert {
  category: string;
  severity: string;
  title: string;
  why: string;
  next_action: string;
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
  stock_alerts: StockAlert[];
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

function percentTone(value: number, target: number, invert = false): 'healthy' | 'warning' | 'critical' {
  const bad = invert ? value < target : value > target;
  if (!bad) return 'healthy';
  const distance = Math.abs(value - target);
  return distance > 6 ? 'critical' : 'warning';
}

function recommendationSeverity(rec: Recommendation): string {
  if (rec.category === 'steady_state') return 'healthy';
  if (['labor_optimization', 'sales_recovery', 'inventory_risk'].includes(rec.category)) return 'critical';
  return 'warning';
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
      setControl(controlRaw as unknown as ControlResponse);
      setRecommendations(((recRaw as unknown as RecommendationsResponse).recommendations ?? []).slice(0, 8));
      setObservability(obsRaw as unknown as ObservabilityResponse);
    } catch {
      setError('Control Tower data is unavailable. Upload pilot CSV datasets and refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revenueGap = useMemo(() => {
    if (!control) return 0;
    return control.kpis.revenue - control.kpis.forecast_revenue;
  }, [control]);

  if (loading && !control) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-slate-300 border-t-slate-700 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OpsPageHeader
        eyebrow="Daily Control Tower"
        title="Operator Briefing"
        subtitle="Monitor service performance, margin pressure, and AI-prioritized next actions from one command view."
      >
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </OpsPageHeader>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {control && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <OpsKpiCard label="Revenue Today" value={`€${control.kpis.revenue.toFixed(2)}`} helper={`Forecast €${control.kpis.forecast_revenue.toFixed(2)}`} tone="neutral" />
            <OpsKpiCard
              label="Revenue vs Forecast"
              value={`${control.kpis.revenue_vs_forecast_pct.toFixed(1)}%`}
              helper={`Gap €${revenueGap.toFixed(2)}`}
              tone={percentTone(control.kpis.revenue_vs_forecast_pct, -control.targets.sales_drop_alert_pct, true)}
            />
            <OpsKpiCard label="Covers" value={`${control.kpis.covers}`} helper={`Avg check €${control.kpis.avg_check.toFixed(2)}`} />
            <OpsKpiCard
              label="Labor Cost %"
              value={`${control.kpis.labor_cost_pct.toFixed(1)}%`}
              helper={`Target ${control.targets.labor_target_pct.toFixed(1)}%`}
              tone={percentTone(control.kpis.labor_cost_pct, control.targets.labor_target_pct)}
            />
            <OpsKpiCard
              label="Food Cost %"
              value={`${control.kpis.food_cost_pct.toFixed(1)}%`}
              helper={`Target ${control.targets.food_target_pct.toFixed(1)}%`}
              tone={percentTone(control.kpis.food_cost_pct, control.targets.food_target_pct)}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
            <OpsPanel title="Anomaly Stream" subtitle="Priority issues detected for this service date.">
              {control.anomalies.length === 0 ? (
                <EmptyPanelMessage message="No anomalies detected for this date." />
              ) : (
                <div className="space-y-2">
                  {control.anomalies.slice(0, 8).map((item, idx) => (
                    <article key={`${item.title}-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <span className={severityClass(item.severity)}>{severityLabel(item.severity)}</span>
                      </div>
                      <p className="text-xs text-slate-700">{item.why}</p>
                      <p className="mt-1 text-xs text-slate-500">Metric: {item.metric.toFixed(2)}</p>
                    </article>
                  ))}
                </div>
              )}
            </OpsPanel>

            <OpsPanel title="Recommendation Queue" subtitle="Prescriptive actions generated for the owner and manager.">
              {recommendations.length === 0 ? (
                <EmptyPanelMessage message="No recommendation cards generated yet." />
              ) : (
                <div className="space-y-2">
                  {recommendations.map((rec, idx) => (
                    <RecommendationCard
                      key={`${rec.title}-${idx}`}
                      title={rec.title}
                      warning={rec.warning}
                      why={rec.why}
                      nextAction={rec.next_action}
                      automatable={rec.automatable}
                      severity={recommendationSeverity(rec)}
                    />
                  ))}
                </div>
              )}
            </OpsPanel>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <OpsPanel title="Inventory Signal Highlights" subtitle="Stock and usage anomalies impacting daily execution.">
              {!control.stock_alerts?.length ? (
                <EmptyPanelMessage message="No stock or usage alerts for this date." />
              ) : (
                <div className="space-y-2">
                  {control.stock_alerts.slice(0, 6).map((alert, idx) => (
                    <article key={`${alert.title}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                        <span className={severityClass(alert.severity)}>{severityLabel(alert.severity)}</span>
                      </div>
                      <p className="text-xs text-slate-700">{alert.why}</p>
                      <p className="mt-1 text-xs font-medium text-slate-800">Next Action: {alert.next_action}</p>
                    </article>
                  ))}
                </div>
              )}
            </OpsPanel>

            <OpsPanel title="Operational Health" subtitle="Pilot observability and recommendation backlog.">
              {observability ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <article className="tp-panel-muted">
                    <p className="tp-kpi-label">Platform Status</p>
                    <p className="tp-kpi-value text-slate-900">{observability.status}</p>
                  </article>
                  <article className="tp-panel-muted">
                    <p className="tp-kpi-label">Ingestion Runs (7d)</p>
                    <p className="tp-kpi-value text-slate-900">{observability.ingestion_health.total_runs_7d}</p>
                  </article>
                  <article className="tp-panel-muted">
                    <p className="tp-kpi-label">Open Recs / High Anomalies</p>
                    <p className="tp-kpi-value text-slate-900">
                      {observability.operations_health.open_recommendations_today}/{observability.operations_health.high_anomalies_today}
                    </p>
                  </article>
                </div>
              ) : (
                <EmptyPanelMessage message="Observability summary not available." />
              )}
            </OpsPanel>
          </section>
        </>
      )}

      {!control && !error && (
        <div className="tp-panel flex items-center gap-3 text-slate-600">
          <AlertTriangle className="h-4 w-4" />
          Upload POS, purchases, labor, and reviews CSV files to activate this view.
        </div>
      )}
    </div>
  );
}
