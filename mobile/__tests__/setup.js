jest.mock('expo-crypto', () => {
  const nodeCrypto = require('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA256' },
    digestStringAsync: (_algo, input) =>
      Promise.resolve(nodeCrypto.createHash('sha256').update(input).digest('hex')),
  };
});
