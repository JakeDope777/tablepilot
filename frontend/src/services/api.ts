import axios from 'axios';
import type {
  ChatRequest,
  ChatResponse,
  AuthTokens,
  User,
  DashboardData,
  AnalysisResponse,
  CreativeResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auth ────────────────────────────────────────────────────

export const authService = {
  async signup(email: string, password: string): Promise<AuthTokens> {
    const { data } = await api.post<AuthTokens>('/auth/signup', { email, password });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return data;
  },

  async login(email: string, password: string): Promise<AuthTokens> {
    const { data } = await api.post<AuthTokens>('/auth/login', { email, password });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return data;
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email });
    return data;
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/reset-password', {
      token,
      new_password: newPassword,
    });
    return data;
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/verify-email', { token });
    return data;
  },

  async sendVerification(email?: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/send-verification', email ? { email } : {});
    return data;
  },

  async updateProfile(payload: {
    full_name?: string;
    company?: string;
    timezone?: string;
  }): Promise<User> {
    const { data } = await api.patch<User>('/auth/profile', payload);
    return data;
  },

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  },
};

// ── Chat ────────────────────────────────────────────────────

export const chatService = {
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const { data } = await api.post<ChatResponse>('/chat', request);
    return data;
  },

  async getConversation(conversationId: string) {
    const { data } = await api.get(`/chat/${conversationId}`);
    return data;
  },

  async clearConversation(conversationId: string) {
    const { data } = await api.delete(`/chat/${conversationId}`);
    return data;
  },
};

// ── Dashboard / Analytics ───────────────────────────────────

export const analyticsService = {
  async getDashboard(): Promise<DashboardData> {
    const { data } = await api.get<DashboardData>('/analytics/dashboard');
    return data;
  },

  async getForecast(metric: string, horizon: number = 30) {
    const { data } = await api.post('/analytics/forecast', { metric, horizon });
    return data;
  },

  async recordExperiment(experimentId: string, variants: Array<Record<string, unknown>>) {
    const { data } = await api.post('/analytics/experiment', {
      experiment_id: experimentId,
      variants,
    });
    return data;
  },
};

// ── Business Analysis ───────────────────────────────────────

export const analysisService = {
  async marketResearch(query: string): Promise<AnalysisResponse> {
    const { data } = await api.post<AnalysisResponse>('/analysis/market', { query });
    return data;
  },

  async swotAnalysis(subject: string): Promise<AnalysisResponse> {
    const { data } = await api.post<AnalysisResponse>('/analysis/swot', { subject });
    return data;
  },

  async pestelAnalysis(subject: string): Promise<AnalysisResponse> {
    const { data } = await api.post<AnalysisResponse>('/analysis/pestel', { subject });
    return data;
  },

  async competitorAnalysis(companyNames: string[]): Promise<AnalysisResponse> {
    const { data } = await api.post<AnalysisResponse>('/analysis/competitors', {
      company_names: companyNames,
    });
    return data;
  },

  async createPersonas(dataSource: string = 'general', numPersonas: number = 3): Promise<AnalysisResponse> {
    const { data } = await api.post<AnalysisResponse>('/analysis/personas', {
      data_source: dataSource,
      num_personas: numPersonas,
    });
    return data;
  },
};

// ── Creative ────────────────────────────────────────────────

export const creativeService = {
  async generateCopy(brief: string, tone?: string, length?: number): Promise<CreativeResponse> {
    const { data } = await api.post<CreativeResponse>('/creative/generate', { brief, tone, length });
    return data;
  },

  async generateImage(description: string, style?: string): Promise<CreativeResponse> {
    const { data } = await api.post<CreativeResponse>('/creative/image', { description, style });
    return data;
  },

  async suggestABTests(baseCopy: string): Promise<CreativeResponse> {
    const { data } = await api.post<CreativeResponse>('/creative/ab-test', { base_copy: baseCopy });
    return data;
  },
};

// ── CRM ─────────────────────────────────────────────────────

export const crmService = {
  async getLeads() {
    const { data } = await api.get('/crm/leads');
    return data;
  },

  async getCampaigns() {
    const { data } = await api.get('/crm/campaigns');
    return data;
  },

  async createLead(leadId: string, attributes: Record<string, unknown>) {
    const { data } = await api.post('/crm/lead', { lead_id: leadId, attributes });
    return data;
  },

  async createCampaign(name: string, channel: string = 'email') {
    const { data } = await api.post('/crm/campaign', { name, channel });
    return data;
  },

  async checkCompliance(message: string, channel: string = 'email') {
    const { data } = await api.post('/crm/compliance', { message, channel });
    return data;
  },
};

// ── Billing ─────────────────────────────────────────────────

export const billingService = {
  async createCheckoutSession(plan: string = 'pro') {
    const { data } = await api.post('/billing/create-checkout-session', { plan });
    return data as {
      checkout_url?: string;
      portal_url?: string;
      session_id?: string;
      status: string;
      demo?: boolean;
    };
  },

  async createPortalSession() {
    const { data } = await api.post('/billing/portal-session');
    return data as {
      checkout_url?: string;
      portal_url?: string;
      session_id?: string;
      status: string;
      demo?: boolean;
    };
  },

  async getSubscription() {
    const { data } = await api.get('/billing/subscription');
    return data as {
      tier: string;
      status: string;
      stripe_subscription_id?: string;
      stripe_customer_id?: string;
      current_period_start?: string;
      current_period_end?: string;
      cancel_at_period_end: boolean;
      demo?: boolean;
    };
  },

  async getInvoices() {
    const { data } = await api.get('/billing/invoices');
    return data as {
      invoices: Array<{
        id: string;
        amount_due: number;
        amount_paid: number;
        currency: string;
        status: string;
        hosted_invoice_url?: string;
        invoice_pdf?: string;
        period_start?: string;
        period_end?: string;
        created_at?: string;
      }>;
      demo?: boolean;
    };
  },
};

// ── Integrations ────────────────────────────────────────────

export const integrationsService = {
  async getCatalog() {
    const { data } = await api.get<{ integrations: Array<{ name: string; status: string; demo_mode: boolean; authenticated: boolean }> }>('/integrations/catalog');
    return data;
  },

  async getMarketplace(params?: { provider?: string; category?: string; search?: string; limit?: number; offset?: number }) {
    const { data } = await api.get<{
      connectors: Array<{ key: string; name: string; provider: string; category: string; auth_type?: string; status?: string }>;
      total: number;
      has_more: boolean;
    }>('/integrations/marketplace/connectors', { params });
    return data;
  },

  async getMarketplaceStats() {
    const { data } = await api.get<{ total_connectors: number; snapshot_connectors: number; source_total_connectors: number; providers: string[] }>('/integrations/marketplace/stats');
    return data;
  },

  async getConnectorDetail(key: string, provider?: string) {
    const { data } = await api.get(`/integrations/marketplace/connectors/${encodeURIComponent(key)}`, { params: provider ? { provider } : undefined });
    return data as { key: string; display_name: string; category?: string; providers_available: string[]; suggested_actions: string[]; variants: unknown[] };
  },

  async getConnectorStatus(name: string) {
    const { data } = await api.get(`/integrations/${name}/status`);
    return data as { name: string; status: string; demo_mode: boolean; authenticated: boolean };
  },

  async triggerAction(name: string, action: string, payload?: Record<string, unknown>) {
    const { data } = await api.post(`/integrations/${name}/action`, { action, payload: payload ?? {} });
    return data;
  },
};

// ── Growth / Tracking ──────────────────────────────────────

export const growthService = {
  async trackEvent(eventName: string, properties?: Record<string, unknown>, source: string = 'web') {
    const { data } = await api.post('/growth/track', {
      event_name: eventName,
      source,
      properties: properties ?? {},
    });
    return data;
  },

  async joinWaitlist(payload: {
    name: string;
    email: string;
    company?: string;
    note?: string;
    source?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  }) {
    const { data } = await api.post('/growth/waitlist', payload);
    return data as { message: string };
  },

  async getFunnelSummary(days: number = 14) {
    const { data } = await api.get('/growth/funnel-summary', { params: { days } });
    return data as {
      date_from: string;
      date_to: string;
      steps: Array<{ name: string; count: number }>;
      conversion_signup_from_visitor: number;
      conversion_verified_from_signup: number;
      conversion_first_value_from_verified: number;
      conversion_return_from_first_value: number;
    };
  },
};

export default api;
