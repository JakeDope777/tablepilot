import { growthService } from './api';

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
    __utmCaptured?: boolean;
  }
}

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://app.posthog.com';

export function initAnalytics() {
  captureUtmParams();
  if (GA_ID) {
    loadGa(GA_ID);
  }
  if (POSTHOG_KEY) {
    loadPosthog(POSTHOG_KEY, POSTHOG_HOST);
  }
}

export async function trackEvent(eventName: string, properties: Record<string, unknown> = {}) {
  const merged = { ...getStoredUtm(), ...properties };
  if (window.gtag && GA_ID) {
    window.gtag('event', eventName, merged);
  }
  try {
    await growthService.trackEvent(eventName, merged, 'web');
  } catch {
    // best-effort analytics should not break UX
  }
}

function captureUtmParams() {
  if (window.__utmCaptured) return;
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get('utm_source');
  const utmMedium = params.get('utm_medium');
  const utmCampaign = params.get('utm_campaign');
  if (utmSource) localStorage.setItem('utm_source', utmSource);
  if (utmMedium) localStorage.setItem('utm_medium', utmMedium);
  if (utmCampaign) localStorage.setItem('utm_campaign', utmCampaign);
  window.__utmCaptured = true;
}

export function getStoredUtm() {
  return {
    utm_source: localStorage.getItem('utm_source') || undefined,
    utm_medium: localStorage.getItem('utm_medium') || undefined,
    utm_campaign: localStorage.getItem('utm_campaign') || undefined,
  };
}

function loadGa(measurementId: string) {
  if (document.getElementById('ga-script')) return;
  const script = document.createElement('script');
  script.async = true;
  script.id = 'ga-script';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args as unknown as Record<string, unknown>);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId);
}

function loadPosthog(apiKey: string, host: string) {
  if (document.getElementById('posthog-script')) return;
  const script = document.createElement('script');
  script.id = 'posthog-script';
  script.async = true;
  script.src = `${host.replace(/\/+$/, '')}/static/array.js`;
  document.head.appendChild(script);
  // Primary capture still routes via backend /growth/track for consistency.
  void apiKey;
}
