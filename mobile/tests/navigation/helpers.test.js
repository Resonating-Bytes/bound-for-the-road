import { canShowBackButton, getHomeRoute, getInitialMainRoute, getMainNavigatorKey, navigateBackOrHome } from '../../src/navigation/helpers';

describe('navigation helpers', () => {
  test('getHomeRoute returns role home screens', () => {
    expect(getHomeRoute('teen')).toBe('Dashboard');
    expect(getHomeRoute('adult')).toBe('AdultHome');
  });

  test('getInitialMainRoute gates on link requirement', () => {
    expect(getInitialMainRoute({ role: 'teen', requiresLink: true, linked: false })).toBe('LinkTeen');
    expect(
      getInitialMainRoute({ role: 'teen', requiresLink: true, linked: false, linkInviteDeferred: true }),
    ).toBe('Dashboard');
    expect(getInitialMainRoute({ role: 'teen', requiresLink: true, linked: true })).toBe('Dashboard');
    expect(getInitialMainRoute({ role: 'adult', requiresLink: true, linked: false })).toBe('LinkAdult');
    expect(getInitialMainRoute({ role: 'adult', requiresLink: true, linked: true })).toBe('AdultHome');
  });

  test('getMainNavigatorKey resets stack when link state changes', () => {
    expect(
      getMainNavigatorKey({ role: 'teen', requiresLink: true, linked: false, linkInviteDeferred: true }),
    ).toBe('deferred');
    expect(
      getMainNavigatorKey({ role: 'teen', requiresLink: true, linked: true, linkInviteDeferred: false }),
    ).toBe('linked');
    expect(getMainNavigatorKey({ role: 'teen', requiresLink: true, linked: false })).toBe('linking');
  });

  test('navigateBackOrHome resets to home when linked', () => {
    const navigation = { reset: jest.fn(), canGoBack: jest.fn(), goBack: jest.fn() };
    navigateBackOrHome(navigation, { linked: true, role: 'teen' });
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Dashboard' }],
    });
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test('canShowBackButton is true when linked even without stack history', () => {
    const navigation = { canGoBack: () => false };
    expect(canShowBackButton(navigation, true)).toBe(true);
    expect(canShowBackButton(navigation, false)).toBe(false);
  });
});
