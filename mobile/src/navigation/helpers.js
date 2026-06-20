export function getHomeRoute(role) {
  return role === 'adult' ? 'AdultHome' : 'Dashboard';
}

export function resetToHome(navigation, role) {
  const home = getHomeRoute(role);
  navigation.reset({
    index: 0,
    routes: [{ name: home }],
  });
}

export function canShowBackButton(navigation, linked) {
  return linked || navigation.canGoBack();
}

export function navigateBackOrHome(navigation, { linked, role }) {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  if (linked) {
    resetToHome(navigation, role);
  }
}

export function getInitialMainRoute({ role, requiresLink, linked, linkInviteDeferred = false }) {
  if (requiresLink && !linked) {
    if (role === 'teen' && linkInviteDeferred) {
      return 'Dashboard';
    }
    return role === 'adult' ? 'LinkAdult' : 'LinkTeen';
  }
  return getHomeRoute(role);
}

/** Forces stack reset when link state changes even if initial route name is unchanged. */
export function getMainNavigatorKey({ role, requiresLink, linked, linkInviteDeferred = false }) {
  if (!requiresLink) return 'main';
  if (linked) return 'linked';
  if (role === 'teen' && linkInviteDeferred) return 'deferred';
  return 'linking';
}
