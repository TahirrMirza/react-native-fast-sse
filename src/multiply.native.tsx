import { NitroModules } from 'react-native-nitro-modules';
import type { TurboSse } from './TurboSse.nitro';

const TurboSseHybridObject =
  NitroModules.createHybridObject<TurboSse>('TurboSse');

export function multiply(a: number, b: number): number {
  return TurboSseHybridObject.multiply(a, b);
}
