import type { ReactNode } from 'react';
import clsx from 'clsx';

export type OpsSeverity = 'critical' | 'warning' | 'notice' | 'healthy' | string;

function normalizeSeverity(raw?: string): 'critical' | 'warning' | 'notice' | 'healthy' {
  const value = (raw || '').toLowerCase();
  if (['critical', 'high', 'severe'].includes(value)) return 'critical';
  if (['warning', 'warn', 'medium'].includes(value)) return 'warning';
  if (['notice', 'info', 'low'].includes(value)) return 'notice';
  return 'healthy';
}

export function severityLabel(raw?: string): string {
  const tone = normalizeSeverity(raw);
  return tone.charAt(0).toUpperCase() + tone.slice(1);
}

export function severityClass(raw?: string): string {
  const tone = normalizeSeverity(raw);
  return {
    critical: 'tp-badge tp-badge-critical',
    warning: 'tp-badge tp-badge-warning',
    notice: 'tp-badge tp-badge-notice',
    healthy: 'tp-badge tp-badge-healthy',
  }[tone];
}

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function OpsPageHeader({ eyebrow, title, subtitle, children }: PageHeaderProps) {
  return (
    <section className="tp-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="tp-eyebrow">{eyebrow}</p>
          <h1 className="tp-title">{title}</h1>
          {subtitle && <p className="tp-subtitle">{subtitle}</p>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </section>
  );
}

interface PanelProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function OpsPanel({ title, subtitle, actions, children, className }: PanelProps) {
  return (
    <section className={clsx('tp-panel', className)}>
      {(title || subtitle || actions) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  helper?: string;
  tone?: 'neutral' | 'healthy' | 'warning' | 'critical';
}

export function OpsKpiCard({ label, value, helper, tone = 'neutral' }: KpiCardProps) {
  const toneClass = {
    neutral: 'text-slate-900',
    healthy: 'text-emerald-700',
    warning: 'text-amber-700',
    critical: 'text-red-700',
  }[tone];

  return (
    <article className="tp-panel-muted">
      <p className="tp-kpi-label">{label}</p>
      <p className={clsx('tp-kpi-value', toneClass)}>{value}</p>
      {helper && <p className="tp-kpi-helper">{helper}</p>}
    </article>
  );
}

interface RecommendationCardProps {
  title: string;
  warning: string;
  why: string;
  nextAction: string;
  automatable: boolean;
  severity?: string;
}

export function RecommendationCard({
  title,
  warning,
  why,
  nextAction,
  automatable,
  severity,
}: RecommendationCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={severityClass(severity)}>{severityLabel(severity)}</span>
        <span className="tp-badge tp-badge-notice">{automatable ? 'Automatable' : 'Manual'}</span>
      </div>
      <p className="text-sm font-semibold text-slate-900">What: {title}</p>
      <p className="mt-1 text-xs text-slate-700">Warning: {warning}</p>
      <p className="mt-1 text-xs text-slate-600">Why: {why}</p>
      <p className="mt-1 text-xs font-medium text-slate-800">Next Action: {nextAction}</p>
    </article>
  );
}

export function EmptyPanelMessage({ message }: { message: string }) {
  return <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">{message}</p>;
}
