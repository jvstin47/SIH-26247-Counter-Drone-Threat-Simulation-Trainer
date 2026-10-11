import type { SystemCapabilities } from '../types';

export async function detectCapabilities(): Promise<SystemCapabilities> {
  const nav = typeof navigator === 'undefined' ? null : navigator;
  if (!nav) return { webgpu: false, webxr: false, storage: false, online: false, serviceWorker: false };
  let webgpu = false;
  try {
    const gpu = (nav as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
    webgpu = Boolean(gpu && await gpu.requestAdapter());
  } catch { webgpu = false; }
  let webxr = false;
  try {
    const xr = (nav as Navigator & { xr?: { isSessionSupported?: (mode: string) => Promise<boolean> } }).xr;
    webxr = Boolean(xr?.isSessionSupported && await xr.isSessionSupported('immersive-vr'));
  } catch { webxr = false; }
  let storage = typeof indexedDB !== 'undefined';
  try { await nav.storage?.persist?.(); } catch { /* Persistence permission is optional. */ }
  if (!storage) storage = false;
  return {
    webgpu,
    webxr,
    storage,
    online: nav.onLine,
    serviceWorker: 'serviceWorker' in nav,
  };
}
