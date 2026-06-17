export interface SSEEvent {
  id?: string;
  event?: string;
  data: string;
}

export interface TurboSSEOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  connectTimeoutMs?: number;
  readTimeoutMs?: number;
}
