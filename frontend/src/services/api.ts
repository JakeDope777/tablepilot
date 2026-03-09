import axios from 'axios';
import type { AuthTokens, ChatRequest, ChatResponse, User } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

export const restaurantService = {
  async ingestCsv(
    route:
      | '/restaurant/ingest/pos-csv'
      | '/restaurant/ingest/purchases-csv'
      | '/restaurant/ingest/labor-csv'
      | '/restaurant/ingest/reviews-csv',
    file: File,
    venueId?: string,
    idempotencyKey?: string,
  ) {
    const params = venueId ? { venue_id: venueId } : undefined;
    const formData = new FormData();
    formData.append('file', file);
    const headers: Record<string, string> = {};
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    const { data } = await api.post(route, formData, { params, headers });
    return data as Record<string, unknown>;
  },

  async getControlTowerDaily(date: string, venueId?: string) {
    const { data } = await api.get('/restaurant/control-tower/daily', { params: { date, venue_id: venueId } });
    return data as Record<string, unknown>;
  },

  async getFinanceMargin(fromDate: string, toDate: string, venueId?: string, fixedCostPerDay?: number) {
    const { data } = await api.get('/restaurant/finance/margin', {
      params: { from: fromDate, to: toDate, venue_id: venueId, fixed_cost_per_day: fixedCostPerDay },
    });
    return data as Record<string, unknown>;
  },

  async getInventoryAlerts(date: string, venueId?: string) {
    const { data } = await api.get('/restaurant/inventory/alerts', { params: { date, venue_id: venueId } });
    return data as Record<string, unknown>;
  },

  async getDailyRecommendations(date: string, venueId?: string) {
    const { data } = await api.get('/restaurant/recommendations/daily', { params: { date, venue_id: venueId } });
    return data as Record<string, unknown>;
  },

  async getObservabilitySummary(date: string, venueId?: string) {
    const { data } = await api.get('/restaurant/observability/summary', { params: { date, venue_id: venueId } });
    return data as Record<string, unknown>;
  },

  async getMenuRepricing(fromDate: string, toDate: string, venueId?: string) {
    const { data } = await api.get('/restaurant/menu/repricing', { params: { from: fromDate, to: toDate, venue_id: venueId } });
    return data as Record<string, unknown>;
  },

  async runMenuPriceSimulator(payload: {
    from_date: string;
    to_date: string;
    elasticity?: number;
    venue_id?: string;
    fixed_cost_per_day?: number;
    adjustments?: Array<{ menu_item: string; price_change_pct: number }>;
  }) {
    const { data } = await api.post('/restaurant/menu/price-simulator', payload);
    return data as Record<string, unknown>;
  },

  async getSupplierRisk(fromDate: string, toDate: string, venueId?: string) {
    const { data } = await api.get('/restaurant/procurement/supplier-risk', { params: { from: fromDate, to: toDate, venue_id: venueId } });
    return data as Record<string, unknown>;
  },

  async getInventoryAutoOrder(date: string, venueId?: string) {
    const { data } = await api.get('/restaurant/inventory/auto-order', { params: { date, venue_id: venueId } });
    return data as Record<string, unknown>;
  },

  async createPurchaseOrderDraft(date: string, venueId?: string) {
    const { data } = await api.post('/restaurant/procurement/po-draft/from-auto-order', null, { params: { date, venue_id: venueId } });
    return data as Record<string, unknown>;
  },

  async updatePurchaseOrderApproval(
    purchaseOrderId: string,
    payload: { action: 'submit' | 'approve' | 'reject' | 'order' | 'reset'; approver?: string; comment?: string },
  ) {
    const { data } = await api.post(`/restaurant/procurement/po/${purchaseOrderId}/approval`, payload);
    return data as Record<string, unknown>;
  },
};

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
    return data;
  },
};
