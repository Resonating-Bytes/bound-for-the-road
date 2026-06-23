import 'react-native-url-polyfill/auto';
import { registerRootComponent } from 'expo';
import { enableScreens } from 'react-native-screens';
import * as Linking from 'expo-linking';
import { installCryptoPolyfill } from './src/lib/cryptoPolyfill';
import { isAuthCallbackUrl } from './src/lib/authCallback';
import { publishAuthLinkUrl } from './src/lib/authLinkBootstrap';

import App from './App';

installCryptoPolyfill();
enableScreens(true);

function captureAuthLink(url) {
  if (url && isAuthCallbackUrl(url)) {
    publishAuthLinkUrl(url);
  }
}

Linking.addEventListener('url', ({ url }) => captureAuthLink(url));
Linking.getInitialURL().then(captureAuthLink);

registerRootComponent(App);
