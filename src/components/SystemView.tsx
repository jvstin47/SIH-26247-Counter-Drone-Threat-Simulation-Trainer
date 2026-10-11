import { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, Download, Gauge, HardDrive, Monitor, RotateCcw, Save, Upload, Wifi, Zap, Server, RefreshCw } from 'lucide-react';
import { useSimStore } from '../store/simStore';
import { repository } from '../services/repository';
import { defaultSettings } from '../db/db';
import { localModelStatus } from '../simulation/localMl';

function downloadJson(filename: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const LOCAL_API = 'http://127.0.0.1:4177/api';
type LocalApiStatus = 'CHECKING' | 'CONNECTED' | 'OFFLINE';

export function SystemView() {
  const { capabilities, settings, saveSettings, loadAll, profiles, scenarios, sessions } = useSimStore();
  const [message, setMessage] = useState('');
  const [renderer, setRenderer] = useState('NOT STARTED');
  const [memory, setMemory] = useState('NOT EXPOSED');
  const [apiStatus, setApiStatus] = useState<LocalApiStatus>('CHECKING');
  const [apiBusy, setApiBusy] = useState(false);
  const [apiMessage, setApiMessage] = useState('');
  const modelStatus = localModelStatus();
  const checkLocalApi = useCallback(async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 1800);
    try {
      const response = await fetch(`${LOCAL_API}/health`, { signal: controller.signal, cache: 'no-store' });
      const body = await response.json() as { ok?: boolean; version?: number; service?: string };
      if (!response.ok || !body.ok || body.service !== 'aid-c2s-local-api') throw new Error('Health check failed or the expected API service was not found.');
      setApiStatus('CONNECTED');
      setApiMessage(`Local API V${body.version ?? '?'} is reachable on loopback.`);
    } catch {
      setApiStatus('OFFLINE');
      setApiMessage('Optional local API is unavailable. Core training and IndexedDB remain fully usable.');
    } finally { window.clearTimeout(timeout); }
  }, []);

  useEffect(() => {
    try { setRenderer(window.localStorage.getItem('aid-c2s-last-renderer') ?? 'NOT STARTED'); } catch { setRenderer('LOCAL STORAGE BLOCKED'); }
    const nav = navigator as Navigator & { deviceMemory?: number; userAgentData?: { brands?: Array<{ brand: string; version: string }> } };
    setMemory(nav.deviceMemory ? `${nav.deviceMemory} GB (browser estimate)` : 'NOT EXPOSED BY BROWSER');
    void checkLocalApi();
  }, [checkLocalApi]);

  const rows = useMemo(() => [
    { label: 'WebGPU adapter', value: capabilities.webgpu ? 'AVAILABLE' : 'NOT AVAILABLE', icon: Zap },
    { label: 'Renderer used', value: renderer, icon: Monitor },
    { label: 'WebGL canvas fallback', value: 'AVAILABLE WHEN WEBGPU INIT FAILS', icon: Monitor },
    { label: 'Immersive WebXR', value: capabilities.webxr ? 'VR SESSION SUPPORTED' : 'NOT DETECTED', icon: Gauge },
    { label: 'Local synthetic classifier', value: modelStatus.trained ? 'TRAINED / READY' : 'LAZY-LOAD / NOT YET USED', icon: Zap },
    { label: 'IndexedDB', value: capabilities.storage ? 'AVAILABLE' : 'NOT AVAILABLE', icon: Database },
    { label: 'Service worker API', value: capabilities.serviceWorker ? 'SUPPORTED' : 'UNSUPPORTED', icon: HardDrive },
    { label: 'Network', value: capabilities.online ? 'ONLINE' : 'OFFLINE', icon: Wifi },
    { label: 'Optional local API', value: apiStatus, icon: Server },
  ], [capabilities, renderer, modelStatus.trained, apiStatus]);

  const updateSettings = async (patch: Partial<typeof settings>) => {
    try { await saveSettings({ ...settings, ...patch }); setMessage('Setting saved and applied.'); }
    catch (error) { setMessage(`Setting was not saved: ${error instanceof Error ? error.message : String(error)}`); }
  };
  const exportData = async () => {
    try { const payload = await repository.exportAll(); downloadJson(`aid-c2s-v5-backup-${Date.now()}.json`, payload); setMessage('Full local backup exported.'); }
    catch (error) { setMessage(`Export failed: ${error instanceof Error ? error.message : String(error)}`); }
  };
  const importData = async (file: File) => {
    try { await useSimStore.getState().importAll(JSON.parse(await file.text())); setMessage('Backup merged into local IndexedDB.'); }
    catch (error) { setMessage(`Import rejected: ${error instanceof Error ? error.message : String(error)}`); }
  };
  const syncToLocalApi = async () => {
    setApiBusy(true);
    try {
      const payload = await repository.exportAll();
      const response = await fetch(`${LOCAL_API}/import`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, format: 'AID-C2S-BACKUP-V5', merge: true }),
      });
      const result = await response.json() as { ok?: boolean; error?: string; counts?: Record<string, number> };
      if (!response.ok || !result.ok) throw new Error(result.error ?? `API returned HTTP ${response.status}.`);
      setApiMessage(`Local records synchronized. API now holds ${result.counts?.sessions ?? 0} sessions and ${result.counts?.scenarios ?? 0} scenarios.`);
      setApiStatus('CONNECTED');
    } catch (error) {
      setApiStatus('OFFLINE');
      setApiMessage(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally { setApiBusy(false); }
  };
  const restoreFromLocalApi = async () => {
    setApiBusy(true);
    try {
      const response = await fetch(`${LOCAL_API}/state`, { cache: 'no-store' });
      const payload = await response.json() as { sessions?: unknown[]; scenarios?: unknown[]; profiles?: unknown[]; settings?: unknown[] };
      if (!response.ok || !Array.isArray(payload.sessions) || !Array.isArray(payload.scenarios) || !Array.isArray(payload.profiles) || !Array.isArray(payload.settings)) {
        throw new Error('The API returned an invalid backup document.');
      }
      await useSimStore.getState().importAll({ sessions: payload.sessions, scenarios: payload.scenarios, profiles: payload.profiles, settings: payload.settings });
      await loadAll();
      setApiStatus('CONNECTED');
      setApiMessage(`Merged ${payload.sessions.length} sessions, ${payload.scenarios.length} scenarios and ${payload.profiles.length} profiles into this browser. Existing records with the same IDs were updated.`);
    } catch (error) {
      setApiStatus('OFFLINE');
      setApiMessage(`Restore failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally { setApiBusy(false); }
  };

  const resetSessions = async () => {
    if (!window.confirm('Delete all completed training sessions? Saved scenarios and profiles will remain.')) return;
    try { await repository.clearTrainingData(); await loadAll(); setMessage('Completed session history cleared.'); }
    catch (error) { setMessage(`Reset failed: ${error instanceof Error ? error.message : String(error)}`); }
  };
  const resetSettings = () => {
    if (window.confirm('Reset graphics quality, simulation speed, and motion preferences?')) void updateSettings(defaultSettings);
  };
  const requestPersistence = async () => {
    try { const accepted = await navigator.storage?.persist?.(); setMessage(accepted ? 'Browser granted persistent storage.' : 'Browser did not grant persistent storage; IndexedDB remains available but may be evicted under storage pressure.'); }
    catch { setMessage('Persistent storage request is not supported by this browser.'); }
  };

  return <div className="page system-page">
    <div className="page-head"><div><span className="eyebrow">SYSTEM / LOCAL RUNTIME</span><h1>Control the environment.</h1><p>Capability reporting, user preferences, and portable data management. Optional API and XR integrations never block core training.</p></div><span className="tag">V5.0 / LOCAL-FIRST</span></div>
    <div className="system-grid">
      <section className="section card"><div className="section-head"><div><span className="panel-label">RUNTIME DIAGNOSTICS</span><h2>Detected capabilities</h2></div></div><div className="sys-list">{rows.map(({ label, value, icon: Icon }) => <div className="sys-row" key={label}><span className="sys-label"><Icon size={13}/>{label}</span><b>{value}</b></div>)}</div><div className="sys-device-info"><div><small>BROWSER</small><b>{(navigator as Navigator & { userAgentData?: { brands?: Array<{ brand: string; version: string }> } }).userAgentData?.brands?.map(brand => `${brand.brand} ${brand.version}`).join(', ') ?? navigator.userAgent.split(' ').slice(-2).join(' ')}</b></div><div><small>VIEWPORT</small><b>{window.innerWidth} × {window.innerHeight}</b></div><div><small>DEVICE PIXEL RATIO</small><b>{window.devicePixelRatio.toFixed(2)}×</b></div><div><small>APPROX MEMORY</small><b>{memory}</b></div></div><button className="btn" onClick={() => void requestPersistence()} style={{marginTop:12}}>REQUEST PERSISTENT LOCAL STORAGE</button></section>

      <section className="section card"><div className="section-head"><div><span className="panel-label">USER EXPERIENCE</span><h2>Preferences</h2></div><Save size={15}/></div><div className="field" style={{marginTop:10}}><label>GRAPHICS QUALITY</label><select value={settings.quality} onChange={event => void updateSettings({ quality: event.target.value as typeof settings.quality })}><option value="HIGH">HIGH / DETAIL</option><option value="BALANCED">BALANCED</option><option value="LOW">LOW / PERFORMANCE</option></select></div><div className="field" style={{marginTop:12}}><label>SIMULATION SPEED</label><select value={settings.simulationSpeed} onChange={event => void updateSettings({ simulationSpeed: Number(event.target.value) })}><option value={0.5}>0.5× / SLOW</option><option value={1}>1× / REAL TIME</option><option value={2}>2×</option><option value={4}>4× / FAST REVIEW</option></select></div><label className="setting-toggle"><input type="checkbox" checked={settings.reducedMotion} onChange={event => void updateSettings({ reducedMotion: event.target.checked })}/> <span>Reduce non-essential motion</span></label><p className="muted small">Graphics quality affects Babylon hardware scaling. Simulation speed affects the deterministic simulation clock, not the scoring formula.</p><button className="btn" onClick={resetSettings}><RotateCcw size={13}/> RESET PREFERENCES</button></section>

      <section className="section card system-data-card"><div className="section-head"><div><span className="panel-label">DATA MANAGEMENT</span><h2>Local records</h2><p>All records are stored on this device unless exported.</p></div><Database size={16}/></div><div className="local-counts"><div><small>SCENARIOS</small><strong>{scenarios.length}</strong></div><div><small>SESSIONS</small><strong>{sessions.length}</strong></div><div><small>PROFILES</small><strong>{profiles.length}</strong></div></div><div className="btn-row data-actions"><button className="btn primary" onClick={() => void exportData()}><Download size={13}/> EXPORT FULL BACKUP</button><label className="btn"><Upload size={13}/> IMPORT BACKUP<input hidden type="file" accept="application/json,.json" onChange={event => { const file = event.target.files?.[0]; if (file) void importData(file); event.currentTarget.value = ''; }}/></label><button className="btn" onClick={() => void resetSessions()}><RotateCcw size={13}/> RESET SESSIONS</button></div><div className="system-banner"><Save size={14}/><div><b>Portable local-first records</b><p>The backup includes scenarios, sessions, local profiles, settings, scores and event logs. Imports are schema-checked before merging.</p></div></div></section>
      <section className="section card system-api-card"><div className="section-head"><div><span className="panel-label">OPTIONAL BACKEND / LOOPBACK ONLY</span><h2>Local API archive</h2><p>Validated local HTTP API for backup and profile/session transfer. It is not needed to run offline training.</p></div><Server size={16}/></div><div className="sys-list"><div className="sys-row"><span className="sys-label"><Server size={13}/> API endpoint</span><b>127.0.0.1:4177</b></div><div className="sys-row"><span className="sys-label"><Wifi size={13}/> API state</span><b>{apiStatus}</b></div><div className="sys-row"><span className="sys-label"><Database size={13}/> Storage</span><b>LOCAL JSON / ATOMIC WRITE</b></div></div><div className="btn-row data-actions" style={{marginTop:12}}><button className="btn" disabled={apiBusy} onClick={() => void checkLocalApi()}><RefreshCw size={13}/> TEST CONNECTION</button><button className="btn primary" disabled={apiBusy || apiStatus !== 'CONNECTED'} onClick={() => void syncToLocalApi()}><Upload size={13}/> SYNC BROWSER → API</button><button className="btn" disabled={apiBusy || apiStatus !== 'CONNECTED'} onClick={() => { if (window.confirm('Merge the API archive into this browser? Existing records with matching IDs will be updated.')) void restoreFromLocalApi(); }}><Download size={13}/> MERGE API → BROWSER</button></div><div className="system-banner"><Save size={14}/><div><b>Offline stays primary</b><p>{apiMessage || 'Checking optional local API…'} The API listens on loopback only; no remote service is contacted.</p></div></div></section>
    </div>
    {message && <div className="scenario-notice" role="status"><span>{message}</span><button className="icon-btn" onClick={() => setMessage('')} aria-label="Dismiss notice">×</button></div>}
  </div>;
}
