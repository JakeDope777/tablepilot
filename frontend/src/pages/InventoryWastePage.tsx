import { ChangeEvent, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, UploadCloud } from 'lucide-react';
import { restaurantService } from '../services/api';

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
      const inventoryData = inventoryRaw as unknown as InventoryResponse;
      const autoOrderData = autoOrderRaw as unknown as AutoOrderResponse;
      const supplierData = supplierRaw as unknown as SupplierRiskResponse;
      setInventory(inventoryData);
      setAutoOrder(autoOrderData);
      setSupplierRisk(supplierData.suppliers ?? []);
    } catch {
      setError('Failed to load inventory data. Upload purchases/stock CSV first.');
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
      setError(`Upload failed for ${label} CSV.`);
    } finally {
      setUploading(false);
    }
  };

  const createPoDraft = async () => {
    setError('');
    try {
      const payload = await restaurantService.createPurchaseOrderDraft(date);
      const data = payload as unknown as PurchaseOrderResponse;
      setPurchaseOrder(data.purchase_order);
    } catch {
      setError('Could not create purchase order draft. Ensure low-stock lines exist.');
    }
  };

  const approvePo = async () => {
    if (!purchaseOrder) return;
    setError('');
    try {
      const payload = await restaurantService.updatePurchaseOrderApproval(purchaseOrder.id, {
        action: 'approve',
        approver: 'manager@tablepilot.local',
        comment: 'Approved in pilot workflow.',
      });
      const status = String((payload.purchase_order as { status?: string })?.status ?? purchaseOrder.status);
      setPurchaseOrder((prev) => (prev ? { ...prev, status } : prev));
    } catch {
      setError('Failed to approve purchase order.');
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Inventory & Waste</p>
            <h2 className="text-xl font-bold text-slate-900">Stock Risk and Procurement Console</h2>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              <RefreshCw className="h-4 w-4" /> Load
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-slate-900">CSV Uploads</h3>
        <p className="mt-1 text-xs text-slate-500">Upload pilot datasets and refresh the panel.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[
            { key: 'pos', label: 'POS Sales', route: '/restaurant/ingest/pos-csv' as CsvRoute },
            { key: 'purchases', label: 'Purchases', route: '/restaurant/ingest/purchases-csv' as CsvRoute },
            { key: 'labor', label: 'Labor Shifts', route: '/restaurant/ingest/labor-csv' as CsvRoute },
            { key: 'reviews', label: 'Reviews', route: '/restaurant/ingest/reviews-csv' as CsvRoute },
          ].map((item) => (
            <div key={item.key} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-900">{item.label}</p>
              <input type="file" accept=".csv,text/csv" onChange={onFileChange(item.key as 'pos' | 'purchases' | 'labor' | 'reviews')} className="mt-2 block w-full text-xs text-slate-600" />
              <button
                onClick={() => void uploadDataset(item.label, item.route, files[item.key as keyof typeof files])}
                disabled={uploading || !files[item.key as keyof typeof files]}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <UploadCloud className="h-3.5 w-3.5" /> Upload
              </button>
              {uploadStatus[item.label] && <p className="mt-2 text-xs text-emerald-700">{uploadStatus[item.label]}</p>}
            </div>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-[25vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          {inventory && (
            <section className="grid gap-4 lg:grid-cols-3">
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Alerts</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{inventory.summary.alert_count}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Estimated Waste Qty</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{inventory.summary.estimated_waste_qty.toFixed(2)}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Estimated Waste Cost</p>
                <p className="mt-2 text-2xl font-bold text-red-600">€{inventory.summary.estimated_waste_cost.toFixed(2)}</p>
              </article>
            </section>
          )}

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-900">Inventory Alerts</h3>
              <div className="mt-3 space-y-2">
                {inventory?.alerts.length ? (
                  inventory.alerts.slice(0, 8).map((alert, idx) => (
                    <div key={`${alert.title}-${idx}`} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <p className="font-semibold text-slate-900">{alert.title}</p>
                      <p className="text-xs text-slate-600">{alert.why}</p>
                      <p className="mt-1 text-xs font-medium text-slate-700">Next: {alert.next_action}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No active alerts loaded for this date.</p>
                )}
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-900">Auto-Order Draft</h3>
              {autoOrder ? (
                <>
                  <p className="mt-2 text-sm text-slate-700">
                    {autoOrder.purchase_order_draft.line_count} lines · €{autoOrder.purchase_order_draft.total_estimated_cost.toFixed(2)}
                  </p>
                  <div className="mt-2 space-y-2">
                    {autoOrder.purchase_order_draft.lines.slice(0, 6).map((line) => (
                      <div key={`${line.item_name}-${line.supplier}`} className="rounded-lg border border-slate-200 p-3 text-sm">
                        <p className="font-semibold text-slate-900">{line.item_name}</p>
                        <p className="text-xs text-slate-600">
                          {line.supplier} · Qty {line.order_qty.toFixed(2)} · €{line.line_total.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => void createPoDraft()} className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white hover:bg-slate-800">
                      Create PO Draft
                    </button>
                    {purchaseOrder && purchaseOrder.status !== 'approved' && purchaseOrder.status !== 'ordered' && (
                      <button onClick={() => void approvePo()} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-100">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                    )}
                  </div>
                  {purchaseOrder && (
                    <p className="mt-2 text-xs text-slate-600">
                      PO {purchaseOrder.id.slice(0, 8)} · Status <span className="font-semibold">{purchaseOrder.status}</span>
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Load data to generate auto-order suggestions.</p>
              )}
            </article>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-slate-900">Supplier Risk</h3>
            <div className="mt-3 space-y-2">
              {supplierRisk.length === 0 ? (
                <p className="text-sm text-slate-500">No supplier risk records in range.</p>
              ) : (
                supplierRisk.slice(0, 6).map((row) => (
                  <div key={row.supplier} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <p className="font-semibold text-slate-900">{row.supplier}</p>
                    <p className="text-xs text-slate-600">
                      Risk {row.risk_band} ({row.risk_score.toFixed(1)}) · Spend €{row.spend.toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{row.next_action}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
