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
  private _userClosed = false;

  private _onOpenCallback?: () => void;
  private _onMessageCallback?: (event: SSEEvent) => void;
  private _onErrorCallback?: (err: Error) => void;

  constructor(url: string, options?: TurboSSEOptions) {
    this._url = url;
    this._options = options || {};
    this._native = TurboSseHybridObject;
  }

  get readyState(): 0 | 1 | 2 {
    return this._native.readyState as 0 | 1 | 2;
  }

  /**
   * Manually initiates the connection to the SSE endpoint.
   */
  public connect(): void {
    this._userClosed = false;
    this._connectInternal();
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

  public close(): void {
    console.log(`[TurboSSE] User closed connection to ${this._url}`);
    this._userClosed = true;
    this._native.disconnect();
  }

  /**
   * Disconnects the stream. Alias for close().
   */
  public disconnect(): void {
    this.close();
  }

  private _connectInternal(): void {
    const httpMethod = this._options.method || 'GET';
    const headers = { ...this._options.headers };

    if (this._lastEventId) {
      headers['Last-Event-ID'] = this._lastEventId;
    }

    console.log(
      `[TurboSSE] Connecting to ${this._url} with method ${httpMethod}`
    );

    this._native.connect(
      this._url,
      httpMethod,
      headers,
      this._options.body || '',
      () => {
        console.log(`[TurboSSE] Connected successfully to ${this._url}`);
        this._onOpenCallback?.();
      },
      (event: string, id: string, data: string) => {
        console.log(
          `[TurboSSE] Received message - Event: ${event}, ID: ${id}, Data length: ${data.length}`
        );
        if (id) {
          this._lastEventId = id;
        }
        this._onMessageCallback?.({ event, id, data });
      },
      (message: string) => {
        console.error(`[TurboSSE] Native error: ${message}`);
        this._onErrorCallback?.(new Error(message));
        this._handleDisconnect(message);
      },
      () => {
        console.log(`[TurboSSE] Native connection closed.`);
        this._handleDisconnect();
      }
    );
  }

  private _handleDisconnect(errorMsg?: string): void {
    if (this._userClosed) return;
    console.log(`[TurboSSE] Disconnected. Error: ${errorMsg || 'None'}`);
  }
}
