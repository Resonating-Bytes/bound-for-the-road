import * as ExpoCrypto from 'expo-crypto';

const DIGEST_ALGORITHMS = {
  'SHA-1': ExpoCrypto.CryptoDigestAlgorithm.SHA1,
  'SHA-256': ExpoCrypto.CryptoDigestAlgorithm.SHA256,
  'SHA-384': ExpoCrypto.CryptoDigestAlgorithm.SHA384,
  'SHA-512': ExpoCrypto.CryptoDigestAlgorithm.SHA512,
};

function toUint8Array(data) {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  return new Uint8Array(data);
}

/**
 * Supabase PKCE needs crypto.subtle.digest (SHA-256). React Native does not provide it.
 */
export function installCryptoPolyfill() {
  if (globalThis.crypto?.subtle?.digest) return;

  if (!globalThis.crypto) {
    globalThis.crypto = {};
  }

  if (!globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues = ExpoCrypto.getRandomValues;
  }

  globalThis.crypto.subtle = {
    async digest(algorithm, data) {
      const name = typeof algorithm === 'string' ? algorithm : algorithm?.name ?? 'SHA-256';
      const expoAlgo = DIGEST_ALGORITHMS[name] ?? ExpoCrypto.CryptoDigestAlgorithm.SHA256;
      return ExpoCrypto.digest(expoAlgo, toUint8Array(data));
    },
  };
}
