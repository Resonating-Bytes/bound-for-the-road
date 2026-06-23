import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigateWhenReady(routeName, params, attempt = 0) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(routeName, params);
    return;
  }
  if (attempt >= 20) return;
  setTimeout(() => navigateWhenReady(routeName, params, attempt + 1), 100);
}

export function navigateToSignInNotice(notice) {
  navigateWhenReady('SignIn', { notice });
}

export function navigateFromPushPayload(data, role) {
  if (!navigationRef.isReady() || !data?.type) return false;

  if (data.type === 'pending_approval' && data.requestHash && role === 'adult') {
    navigationRef.navigate('ApproveSession', { requestHash: data.requestHash });
    return true;
  }

  if (data.type === 'session_approved' && role === 'teen') {
    navigationRef.navigate('Dashboard');
    return true;
  }

  if (data.type === 'session_declined' && role === 'teen') {
    navigationRef.navigate('Dashboard');
    return true;
  }

  return false;
}
