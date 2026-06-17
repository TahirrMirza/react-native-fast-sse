import type { HybridObject } from 'react-native-nitro-modules';

export interface TurboSse extends HybridObject<{
  ios: 'swift';
  android: 'kotlin';
}> {
  connect(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: string,
    onOpen: () => void,
    onMessage: (event: string, id: string, data: string) => void,
    onError: (message: string) => void,
    onClose: () => void
  ): void;

  disconnect(): void;

  readonly readyState: number; // 0=CONNECTING, 1=OPEN, 2=CLOSED
}
