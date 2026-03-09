export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  module_used?: string;
  tokens_used?: number;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  context?: Record<string, unknown>;
}

export interface ChatResponse {
  reply: string;
  conversation_id: string;
  module_used?: string;
  tokens_used?: number;
}

export interface User {
  id: string;
  email: string;
  role: string;
  created_at?: string;
  full_name?: string | null;
  company?: string | null;
  timezone?: string | null;
  is_email_verified?: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}
