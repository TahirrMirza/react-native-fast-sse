import { type ConfigPlugin, withPlugins } from '@expo/config-plugins';
import { withTurboSseIos } from './withIos';
import { withTurboSseAndroid } from './withAndroid';

const withTurboSse: ConfigPlugin = (config) => {
  return withPlugins(config, [withTurboSseIos, withTurboSseAndroid]);
};

export default withTurboSse;
