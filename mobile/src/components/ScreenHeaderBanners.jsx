import { Platform, Linking, Alert } from 'react-native';
import { HeaderBannerStack } from './HeaderBanner';
import { getHeaderBanners } from '../lib/compatibility';
import { useCompatibility } from '../context/CompatibilityContext';
import { getAppUpdateUrl } from '../config/compatibility';

export function ScreenHeaderBanners() {
  const { compatibility, loading, refresh, canRemoteWrite } = useCompatibility();
  const banners = getHeaderBanners(compatibility, {
    loading,
    canRemoteWrite,
    onRetry: refresh,
  });

  return <HeaderBannerStack banners={banners} />;
}

export function openAppUpdateUrl() {
  const url = getAppUpdateUrl(Platform.OS);
  if (!url) {
    Alert.alert(
      'Update link not configured',
      'Set EXPO_PUBLIC_APP_UPDATE_URL_IOS / EXPO_PUBLIC_APP_UPDATE_URL_ANDROID (or EXPO_PUBLIC_APP_UPDATE_URL) in mobile/.env.',
    );
    return;
  }
  Linking.openURL(url).catch(() => {
    Alert.alert('Could not open update link', url);
  });
}
