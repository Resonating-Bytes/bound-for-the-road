import { getHeaderContrast, relativeLuminance } from '../../src/theme/contrast';

describe('header contrast', () => {
  test('relativeLuminance ranks light colors above dark', () => {
    expect(relativeLuminance('#ffffff')).toBeGreaterThan(relativeLuminance('#a0a0a0'));
    expect(relativeLuminance('#a0a0a0')).toBeGreaterThan(relativeLuminance('#1e293b'));
  });

  test('uses light text on mid and dark backgrounds', () => {
    expect(getHeaderContrast('#a0a0a0')).toEqual({
      headerText: '#f8fafc',
      statusBarStyle: 'light',
    });
    expect(getHeaderContrast('#b91c1c')).toEqual({
      headerText: '#f8fafc',
      statusBarStyle: 'light',
    });
    expect(getHeaderContrast('#1e293b')).toEqual({
      headerText: '#f8fafc',
      statusBarStyle: 'light',
    });
  });

  test('uses dark text on light backgrounds', () => {
    expect(getHeaderContrast('#dbeafe')).toEqual({
      headerText: '#1a2b3c',
      statusBarStyle: 'dark',
    });
    expect(getHeaderContrast('#c4b5a5')).toEqual({
      headerText: '#1a2b3c',
      statusBarStyle: 'dark',
    });
  });
});
