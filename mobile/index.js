import 'react-native-url-polyfill/auto';
import { registerRootComponent } from 'expo';
import { enableScreens } from 'react-native-screens';
import { installCryptoPolyfill } from './src/lib/cryptoPolyfill';

import App from './App';

installCryptoPolyfill();
enableScreens(true);

registerRootComponent(App);
