import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

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
