export interface SSEEvent {
  id?: string;
  event?: string;
  data: string;
}

export interface TurboSSEOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
}
