describe('supabase', () => {
  const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  afterEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    jest.resetModules();
  });

  test('isSupabaseConfigured is false without env', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const { isSupabaseConfigured } = require('../../src/lib/supabase');
    expect(isSupabaseConfigured()).toBe(false);
  });

  test('isSupabaseConfigured is true when env is set', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    const { isSupabaseConfigured, getSupabaseConfig } = require('../../src/lib/supabase');
    expect(isSupabaseConfigured()).toBe(true);
    expect(getSupabaseConfig().url).toBe('https://example.supabase.co');
  });

  test('getSupabase throws when not configured', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const { getSupabase } = require('../../src/lib/supabase');
    expect(() => getSupabase()).toThrow(/not configured/i);
  });

  test('checkSupabaseConnection returns not_configured without env', async () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const { checkSupabaseConnection } = require('../../src/lib/supabase');
    await expect(checkSupabaseConnection()).resolves.toEqual({
      ok: false,
      reason: 'not_configured',
    });
  });
});
