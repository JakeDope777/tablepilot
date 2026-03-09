import { ChangeEvent, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, UploadCloud } from 'lucide-react';
import { restaurantService } from '../services/api';
import {
  EmptyPanelMessage,
  OpsKpiCard,
  OpsPageHeader,
  OpsPanel,
  RecommendationCard,
} from '../components/ui/OpsPrimitives';

type CsvRoute =
  | '/restaurant/ingest/pos-csv'
  | '/restaurant/ingest/purchases-csv'
  | '/restaurant/ingest/labor-csv'
  | '/restaurant/ingest/reviews-csv';

interface InventoryAlert {
  category: string;
  severity: string;
  title: string;
  why: string;
  next_action: string;
}

interface InventoryResponse {
  alerts: InventoryAlert[];
  summary: {
    alert_count: number;
    estimated_waste_qty: number;
    estimated_waste_cost: number;
  };
}

interface AutoOrderLine {
  item_name: string;
  supplier: string;
  order_qty: number;
  unit_cost: number;
  line_total: number;
  why: string;
}

interface AutoOrderResponse {
  purchase_order_draft: {
    line_count: number;
    total_estimated_cost: number;
    lines: AutoOrderLine[];
  };
}

interface SupplierRiskRow {
  supplier: string;
  risk_band: string;
  risk_score: number;
  spend: number;
  next_action: string;
}

interface SupplierRiskResponse {
  suppliers: SupplierRiskRow[];
}

interface PurchaseOrderResponse {
  purchase_order: {
    id: string;
    status: string;
    total_estimated_cost: number;
    line_count: number;
    lines: AutoOrderLine[];
  };
}

const uploads = [
  { key: 'pos', label: 'POS Sales', route: '/restaurant/ingest/pos-csv' as CsvRoute },
  { key: 'purchases', label: 'Purchases', route: '/restaurant/ingest/purchases-csv' as CsvRoute },
  { key: 'labor', label: 'Labor Shifts', route: '/restaurant/ingest/labor-csv' as CsvRoute },
  { key: 'reviews', label: 'Reviews', route: '/restaurant/ingest/reviews-csv' as CsvRoute },
] as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function InventoryWastePage() {
  const [date, setDate] = useState<string>(todayIso());
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const [inventory, setInventory] = useState<InventoryResponse | null>(null);
  const [autoOrder, setAutoOrder] = useState<AutoOrderResponse | null>(null);
  const [supplierRisk, setSupplierRisk] = useState<SupplierRiskRow[]>([]);
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderResponse['purchase_order'] | null>(null);
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});

  const [files, setFiles] = useState<{
    pos?: File;
    purchases?: File;
    labor?: File;
    reviews?: File;
  }>({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [inventoryRaw, autoOrderRaw, supplierRaw] = await Promise.all([
        restaurantService.getInventoryAlerts(date),
        restaurantService.getInventoryAutoOrder(date),
        restaurantService.getSupplierRisk(daysAgoIso(14), date),
      ]);
      setInventory(inventoryRaw as unknown as InventoryResponse);
      setAutoOrder(autoOrderRaw as unknown as AutoOrderResponse);
      setSupplierRisk((supplierRaw as unknown as SupplierRiskResponse).suppliers ?? []);
    } catch {
      setError('Inventory intelligence unavailable. Upload purchases/stock data and reload.');
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = (key: 'pos' | 'purchases' | 'labor' | 'reviews') => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFiles((prev) => ({ ...prev, [key]: file }));
  };

  const uploadDataset = async (label: string, route: CsvRoute, file?: File) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const response = await restaurantService.ingestCsv(route, file, undefined, `${label}-${Date.now()}`);
      const rows = Number(response.rows_ingested ?? 0);
      const skipped = Number(response.rows_skipped ?? 0);
      setUploadStatus((prev) => ({ ...prev, [label]: `Ingested ${rows} rows (skipped ${skipped})` }));
    } catch {
      setError(`Upload failed for ${label}. Validate headers and retry.`);
    } finally {
      setUploading(false);
    }
  };

  const createPoDraft = async () => {
    setError('');
    try {
      const payload = await restaurantService.createPurchaseOrderDraft(date);
      setPurchaseOrder((payload as unknown as PurchaseOrderResponse).purchase_order);
    } catch {
      setError('Unable to create purchase order draft. Verify auto-order lines exist.');
    }
  };

  const approvePo = async () => {
    if (!purchaseOrder) return;
    setError('');
    try {
      const payload = await restaurantService.updatePurchaseOrderApproval(purchaseOrder.id, {
        action: 'approve',
        approver: 'manager@tablepilot.local',
        comment: 'Approved from TablePilot pilot workflow.',
      });
      const status = String((payload.purchase_order as { status?: string })?.status ?? purchaseOrder.status);
      setPurchaseOrder((prev) => (prev ? { ...prev, status } : prev));
    } catch {
      setError('PO approval update failed.');
    }
  };

  const groupedAlerts = useMemo(() => {
    const groups = {
      low_stock: [] as InventoryAlert[],
      usage_variance: [] as InventoryAlert[],
      supplier_price: [] as InventoryAlert[],
      other: [] as InventoryAlert[],
    };

    for (const alert of inventory?.alerts ?? []) {
      if (alert.category === 'low_stock') groups.low_stock.push(alert);
      else if (alert.category === 'usage_variance') groups.usage_variance.push(alert);
      else if (alert.category === 'supplier_price') groups.supplier_price.push(alert);
      else groups.other.push(alert);
    }

    return groups;
  }, [inventory]);

  const uploadedCount = useMemo(
    () => Object.keys(uploadStatus).filter((label) => uploadStatus[label]).length,
    [uploadStatus],
  );

  const canDraftPo = Boolean(autoOrder?.purchase_order_draft?.line_count && autoOrder.purchase_order_draft.line_count > 0);

  return (
    <div className="space-y-6">
      <OpsPageHeader
        eyebrow="Inventory & Waste"
        title="Steward Console"
        subtitle="Ingest operational files, monitor stock risk, and push procurement actions before margin leakage compounds."
      >
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Refresh Intelligence
        </button>
      </OpsPageHeader>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="grid gap-3 lg:grid-cols-3">
        <OpsPanel title="Step 1" subtitle="Upload pilot datasets">
          <p className="text-sm text-slate-700">{uploadedCount}/4 datasets uploaded this session.</p>
        </OpsPanel>
        <OpsPanel title="Step 2" subtitle="Refresh inventory intelligence">
          <p className="text-sm text-slate-700">Pull alerts, auto-order guidance, and supplier risk for the selected date.</p>
        </OpsPanel>
        <OpsPanel title="Step 3" subtitle="Execute procurement action">
          <p className="text-sm text-slate-700">Create and approve PO draft when low-stock risk is confirmed.</p>
        </OpsPanel>
      </section>

      <OpsPanel title="CSV Ingestion Workflow" subtitle="Use standardized templates for reliable ingestion and anomaly detection.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {uploads.map((item) => (
            <article key={item.key} className="tp-panel-muted">
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={onFileChange(item.key as 'pos' | 'purchases' | 'labor' | 'reviews')}
                className="mt-2 block w-full text-xs text-slate-600"
              />
              <button
                onClick={() => void uploadDataset(item.label, item.route, files[item.key as keyof typeof files])}
                disabled={uploading || !files[item.key as keyof typeof files]}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <UploadCloud className="h-3.5 w-3.5" /> Upload
              </button>
              {uploadStatus[item.label] ? (
                <p className="mt-2 text-xs text-emerald-700">{uploadStatus[item.label]}</p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">Awaiting upload</p>
              )}
            </article>
          ))}
        </div>
      </OpsPanel>

      {loading ? (
        <div className="flex min-h-[25vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          {inventory && (
            <section className="grid gap-3 sm:grid-cols-3">
              <OpsKpiCard label="Active Alerts" value={`${inventory.summary.alert_count}`} helper="Open inventory anomalies" tone={inventory.summary.alert_count > 4 ? 'critical' : 'warning'} />
              <OpsKpiCard label="Estimated Waste Qty" value={`${inventory.summary.estimated_waste_qty.toFixed(2)}`} helper="Units at risk" tone={inventory.summary.estimated_waste_qty > 15 ? 'warning' : 'healthy'} />
              <OpsKpiCard label="Estimated Waste Cost" value={`€${inventory.summary.estimated_waste_cost.toFixed(2)}`} helper="Projected leakage" tone={inventory.summary.estimated_waste_cost > 300 ? 'critical' : 'warning'} />
            </section>
          )}

          <section className="grid gap-4 xl:grid-cols-2">
            <OpsPanel title="Low-Stock Alerts" subtitle="Items likely to stock out before next replenishment.">
              {groupedAlerts.low_stock.length === 0 ? (
                <EmptyPanelMessage message="No low-stock alerts detected." />
              ) : (
                <div className="space-y-2">
                  {groupedAlerts.low_stock.map((alert, idx) => (
                    <RecommendationCard
                      key={`${alert.title}-stock-${idx}`}
                      title={alert.title}
                      warning={alert.why}
                      why="Current on-hand inventory is below forecasted usage for the service window."
                      nextAction={alert.next_action}
                      automatable={true}
                      severity={alert.severity}
                    />
                  ))}
                </div>
              )}
            </OpsPanel>

            <OpsPanel title="Usage & Waste Variance" subtitle="Theoretical vs actual consumption mismatches.">
              {groupedAlerts.usage_variance.length === 0 ? (
                <EmptyPanelMessage message="No usage variance alerts detected." />
              ) : (
                <div className="space-y-2">
                  {groupedAlerts.usage_variance.map((alert, idx) => (
                    <RecommendationCard
                      key={`${alert.title}-variance-${idx}`}
                      title={alert.title}
                      warning={alert.why}
                      why="Actual prep/portion behavior is diverging from recipe expectations."
                      nextAction={alert.next_action}
                      automatable={false}
                      severity={alert.severity}
                    />
                  ))}
                </div>
              )}
            </OpsPanel>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <OpsPanel title="Procurement Actions" subtitle="Auto-order draft and approval workflow.">
              {autoOrder ? (
                <div className="space-y-3">
                  <article className="tp-panel-muted">
                    <p className="tp-kpi-label">Draft Summary</p>
                    <p className="tp-kpi-value text-slate-900">
                      {autoOrder.purchase_order_draft.line_count} lines · €{autoOrder.purchase_order_draft.total_estimated_cost.toFixed(2)}
                    </p>
                  </article>
                  <div className="space-y-2">
                    {autoOrder.purchase_order_draft.lines.slice(0, 6).map((line) => (
                      <article key={`${line.item_name}-${line.supplier}`} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                        <p className="font-semibold text-slate-900">{line.item_name}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {line.supplier} · Qty {line.order_qty.toFixed(2)} · €{line.line_total.toFixed(2)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{line.why}</p>
                      </article>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void createPoDraft()}
                      disabled={!canDraftPo}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      Create PO Draft
                    </button>
                    {purchaseOrder && purchaseOrder.status !== 'approved' && purchaseOrder.status !== 'ordered' && (
                      <button
                        onClick={() => void approvePo()}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-100"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve PO
                      </button>
                    )}
                  </div>

                  {purchaseOrder && (
                    <p className="text-xs text-slate-600">
                      Purchase Order {purchaseOrder.id.slice(0, 8)} · status <span className="font-semibold">{purchaseOrder.status}</span>
                    </p>
                  )}
                </div>
              ) : (
                <EmptyPanelMessage message="Refresh intelligence to generate auto-order draft suggestions." />
              )}
            </OpsPanel>

            <OpsPanel title="Supplier Price Risk" subtitle="Suppliers ranked by risk score and spend exposure.">
              {supplierRisk.length === 0 ? (
                <EmptyPanelMessage message="No supplier risk records in selected range." />
              ) : (
                <div className="space-y-2">
                  {supplierRisk.slice(0, 8).map((row) => (
                    <article key={row.supplier} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">{row.supplier}</p>
                        <span className={row.risk_score >= 70 ? 'tp-badge tp-badge-critical' : row.risk_score >= 45 ? 'tp-badge tp-badge-warning' : 'tp-badge tp-badge-healthy'}>
                          {row.risk_band} ({row.risk_score.toFixed(0)})
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">Spend €{row.spend.toFixed(2)}</p>
                      <p className="mt-1 text-xs text-slate-700">Next Action: {row.next_action}</p>
                    </article>
                  ))}
                </div>
              )}
            </OpsPanel>
          </section>
        </>
      )}
    </div>
  );
}
