import { Component, useEffect, useState, type ComponentType, type ErrorInfo, type ReactNode } from 'react';
import { TopNav } from './components/TopNav';
import { Dashboard } from './components/Dashboard';
import { TrainingView } from './components/TrainingView';
import { TrackingView } from './components/TrackingView';
import { FusionView } from './components/FusionView';
import { ScenarioLab } from './components/ScenarioLab';
import { MediaLab } from './components/MediaLab';
import { AARView } from './components/AARView';
import { HistoryView } from './components/HistoryView';
import { Analytics } from './components/Analytics';
import { UnitAnalytics } from './components/UnitAnalytics';
import { SystemView } from './components/SystemView';
import { HelpView } from './components/HelpView';
import { useSimStore } from './store/simStore';
import { detectCapabilities } from './utils/capabilities';
import { ensureSeeded } from './db/db';
import { showcaseScenarios } from './simulation/scenarios';
import type { ViewId } from './types';
import './styles/app.css';
import './styles/v5.css';

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  state = { hasError: false, message: '' };
  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }
  componentDidCatch(error: unknown, info: ErrorInfo) { console.error('AID-C2S V5 runtime error', error, info); }
  render() {
    if (this.state.hasError) {
      return <div className="runtime-error"><div className="runtime-card"><div className="eyebrow">AID-C2S / RUNTIME RECOVERY</div><h1>Workspace interrupted</h1><p>The application caught a runtime error rather than leaving a silent blank screen. Return to Command or reload after the underlying issue has been resolved.</p><pre>{this.state.message}</pre><div className="btn-row"><button className="btn primary" onClick={() => { window.location.hash = '#/command'; window.location.reload(); }}>RETURN TO COMMAND</button><button className="btn" onClick={() => window.location.reload()}>RELOAD</button></div></div></div>;
    }
    return this.props.children;
  }
}

const viewMap: Record<ViewId, ComponentType> = {
  command: Dashboard, training: TrainingView, tracking: TrackingView, fusion: FusionView,
  scenario: ScenarioLab, media: MediaLab, aar: AARView, history: HistoryView,
  analytics: Analytics, unit: UnitAnalytics, system: SystemView, help: HelpView,
};
const validViews = new Set<string>(Object.keys(viewMap));
function viewFromHash(): ViewId | null {
  const value = window.location.hash.replace(/^#\/?/, '').split(/[?&]/)[0];
  return validViews.has(value) ? value as ViewId : null;
}

export default function App() {
  const { activeView, setCapabilities, loadAll, setView, settings, capabilities } = useSimStore();
  const [clock, setClock] = useState(() => new Date());
  const [initError, setInitError] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initialView = viewFromHash();
    if (initialView) setView(initialView);
    let cancelled = false;
    void ensureSeeded(showcaseScenarios)
      .then(() => loadAll())
      .then(() => { if (!cancelled) setInitialized(true); })
      .catch(error => { if (!cancelled) { setInitError(error instanceof Error ? error.message : String(error)); setInitialized(true); } });
    void detectCapabilities().then(setCapabilities).catch(error => console.warn('Capability detection failed', error));
    // Register only in production. A dev service worker can cache stale Vite modules
    // and make a newly extracted build look unchanged after a refresh.
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(() => {
        void detectCapabilities().then(setCapabilities);
      }).catch(error => console.warn('Service worker registration failed', error));
    }
    const onOnline = () => void detectCapabilities().then(setCapabilities);
    const onOffline = () => void detectCapabilities().then(setCapabilities);
    const onHash = () => { const next = viewFromHash(); if (next) useSimStore.getState().setView(next); };
    const key = (event: KeyboardEvent) => {
      if (event.altKey && event.key >= '1' && event.key <= '9') {
        const nav: ViewId[] = ['command', 'training', 'tracking', 'fusion', 'scenario', 'media', 'aar', 'history', 'analytics'];
        const next = nav[Number(event.key) - 1]; if (next) setView(next);
      }
    };
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('hashchange', onHash);
    window.addEventListener('keydown', key);
    return () => {
      cancelled = true; window.clearInterval(timer);
      window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline);
      window.removeEventListener('hashchange', onHash); window.removeEventListener('keydown', key);
    };
  }, [loadAll, setCapabilities, setView]);

  useEffect(() => { document.documentElement.dataset.reducedMotion = settings.reducedMotion ? '1' : '0'; }, [settings.reducedMotion]);
  const View = viewMap[activeView] ?? Dashboard;

  return <AppErrorBoundary><div className="app-shell">
    <TopNav/>
    <main className="main-content">
      <header className="topbar"><div className="crumb"><span>AID-C2S</span><b>//</b><span>{activeView.toUpperCase()}</span><span className="crumb-version">V5.0</span></div><div className="telemetry"><span>{clock.toLocaleTimeString()}</span><span>ALT+1…9 NAV</span><span>{capabilities.online ? 'NETWORK ONLINE' : 'OFFLINE CORE'}</span><span className="telemetry-dot"/></div></header>
      {initError && <div className="init-warning" role="alert"><b>LOCAL DATABASE NOTICE</b><span>{initError}</span><button className="btn" onClick={() => { setInitError(''); void loadAll().catch(error => setInitError(String(error))); }}>RETRY STORAGE</button></div>}
      {!initialized ? <div className="boot-screen"><div className="boot-mark">AID</div><div className="boot-line"/><span>INITIALIZING LOCAL TRAINING FABRIC…</span></div> : <View/>}
    </main>
  </div></AppErrorBoundary>;
}
