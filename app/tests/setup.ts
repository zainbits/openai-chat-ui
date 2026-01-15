import { webcrypto } from "node:crypto";

const cryptoImpl = globalThis.crypto ?? webcrypto;

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: cryptoImpl,
  });
}

if (!globalThis.crypto.randomUUID) {
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    value: () =>
      `test-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`,
  });
}
