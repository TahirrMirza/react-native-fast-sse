import { NitroModules } from 'react-native-nitro-modules';
import type { TurboSse } from './TurboSse.nitro';
import type { TurboSSEOptions, SSEEvent } from './types';

const TurboSseHybridObject =
  NitroModules.createHybridObject<TurboSse>('TurboSse');

export class TurboEventSource {
  private _native: TurboSse;
  private _url: string;
  private _options: TurboSSEOptions;

  private _lastEventId: string = '';
  private _retryDelay: number = 1000;
  private _retryTimer?: ReturnType<typeof setTimeout>;
  private _userClosed = false;

  private _onOpenCallback?: () => void;
  private _onMessageCallback?: (event: SSEEvent) => void;
  private _onErrorCallback?: (err: Error) => void;

  constructor(url: string, options?: TurboSSEOptions) {
    this._url = url;
    this._options = options || {};
    this._native = TurboSseHybridObject;
    // We initiate connection immediately to mimic browser EventSource
    this._connect();
  }

  get readyState(): 0 | 1 | 2 {
    return this._native.readyState as 0 | 1 | 2;
  }

  onOpen(cb: () => void): void {
    this._onOpenCallback = cb;
  }

  onMessage(cb: (event: SSEEvent) => void): void {
    this._onMessageCallback = cb;
  }

  onError(cb: (err: Error) => void): void {
    this._onErrorCallback = cb;
  }

  close(): void {
    this._userClosed = true;
    clearTimeout(this._retryTimer);
    this._native.disconnect();
  }

  private _connect(): void {
    const method = this._options.method || 'GET';
    const headers = { ...this._options.headers };

    if (this._lastEventId) {
      headers['Last-Event-ID'] = this._lastEventId;
    }

    this._native.connect(
      this._url,
      method,
      headers,
      this._options.body || '',
      () => {
        // Reset retry delay on successful connection
        this._retryDelay = 1000;
        this._onOpenCallback?.();
      },
      (event: string, id: string, data: string) => {
        if (id) {
          this._lastEventId = id;
        }
        this._onMessageCallback?.({ event, id, data });
      },
      (message: string) => {
        this._onErrorCallback?.(new Error(message));
        this._handleDisconnect(message);
      },
      () => {
        this._handleDisconnect();
      }
    );
  }

  private _handleDisconnect(errorMsg?: string): void {
    if (this._userClosed) return;

    // Based on WHATWG EventSource rules for reconnection
    let shouldReconnect = true;
    if (errorMsg) {
      // If we got a 204 No Content, server explicitly ended the stream
      if (errorMsg.includes('HTTP Error 204') || errorMsg.includes('204')) {
        shouldReconnect = false;
      }
      // If we got a 4xx client error, don't reconnect
      if (errorMsg.match(/HTTP Error 4\d\d/)) {
        shouldReconnect = false;
      }
    }

    if (shouldReconnect) {
      this._scheduleReconnect();
    }
  }

  private _scheduleReconnect(): void {
    if (this._userClosed) return;

    clearTimeout(this._retryTimer);

    // Add jitter to avoid thundering herd
    const delay = this._retryDelay + Math.random() * 500;
    this._retryTimer = setTimeout(() => {
      this._connect();
    }, delay);

    // Exponential backoff capped at 30 seconds
    this._retryDelay = Math.min(this._retryDelay * 2, 30_000);
  }
}
