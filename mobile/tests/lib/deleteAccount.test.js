import { deleteRemoteAccount } from '../../src/lib/deleteAccount';

jest.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: jest.fn(() => true),
  getSupabase: jest.fn(),
}));

const { isSupabaseConfigured, getSupabase } = require('../../src/lib/supabase');

describe('deleteRemoteAccount', () => {
  test('calls delete_my_account RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({ error: null });
    getSupabase.mockReturnValue({ rpc });

    await deleteRemoteAccount();

    expect(rpc).toHaveBeenCalledWith('delete_my_account');
  });

  test('throws when RPC fails', async () => {
    getSupabase.mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ error: { message: 'nope' } }),
    });

    await expect(deleteRemoteAccount()).rejects.toEqual({ message: 'nope' });
  });

  test('no-op when Supabase is not configured', async () => {
    isSupabaseConfigured.mockReturnValueOnce(false);
    getSupabase.mockReturnValue({ rpc: jest.fn() });

    await deleteRemoteAccount();

    expect(getSupabase().rpc).not.toHaveBeenCalled();
  });
});
