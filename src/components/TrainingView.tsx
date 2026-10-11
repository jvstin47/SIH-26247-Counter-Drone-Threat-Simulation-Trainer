import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, Camera, CirclePause, CirclePlay, Focus, Gauge, Radio,
  RotateCcw, ScanLine, ShieldCheck, Target, Video,
} from 'lucide-react';
import { WorldCanvas } from './WorldCanvas';
import { useSimStore } from '../store/simStore';
import type { DecisionAction, EngineSnapshot, EntityClass, TrainingEvent, Track } from '../types';
import { predictSyntheticTrack } from '../simulation/localMl';
import { scoreSession, summarizeSession } from '../simulation/scoring';
import { Radar } from './Radar';
import { showcaseScenarios } from '../simulation/scenarios';
import type { SimulationEngine } from '../simulation/Engine';

const classes: EntityClass[] = ['BENIGN', 'UNKNOWN', 'TRAINING_A', 'TRAINING_B', 'TRAINING_C'];
const decisions: DecisionAction[] = ['MONITOR', 'TRACK', 'ESCALATE', 'MITIGATE', 'RESOLVE'];
const mediaByProfile: Record<string, string> = {
  SENSOR_GRID: '/media/sensor-grid.mp4',
  AERIAL_DAY: '/media/aerial-day.mp4',
  AERIAL_NIGHT: '/media/aerial-night.mp4',
  NONE: '/media/sensor-grid.mp4',
};

function makeId() { return `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }

export function TrainingView() {
  const {
    scenario, setView, setScenario, appendEvent, finalizeSession, activeProfile,
    selectedTrackId, setSelectedTrack, settings,
  } = useSimStore();
  const [engine, setEngine] = useState<SimulationEngine | null>(null);
  const [snap, setSnap] = useState<EngineSnapshot | null>(null);
  const [classification, setClassification] = useState<EntityClass>('UNKNOWN');
  const [confidence, setConfidence] = useState(0.65);
  const [decision, setDecision] = useState<DecisionAction>('TRACK');
  const [prediction, setPrediction] = useState<ReturnType<typeof predictSyntheticTrack> | null>(null);
  const [engineError, setEngineError] = useState('');
  const [started, setStarted] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const eventsRef = useRef<TrainingEvent[]>([]);
  const sessionIdRef = useRef(makeId());
  const startAtRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const finalizingRef = useRef(false);

  useEffect(() => {
    eventsRef.current = [];
    sessionIdRef.current = makeId();
    startAtRef.current = Date.now();
    finishedRef.current = false;
    finalizingRef.current = false;
    setSnap(null); setEngine(null); setPrediction(null); setStarted(false); setEngineError(''); setMediaError(false);
    setClassification('UNKNOWN'); setConfidence(0.65); setDecision('TRACK');
  }, [scenario]);

  const onSnapshot = useCallback((snapshot: EngineSnapshot) => setSnap(snapshot), []);
  const onEvent = useCallback((event: TrainingEvent) => {
    eventsRef.current.push(event);
    appendEvent(event);
  }, [appendEvent]);
  const onEngine = useCallback((created: SimulationEngine) => {
    try { window.localStorage.setItem('aid-c2s-last-renderer', created.getRendererBackend()); } catch { /* storage can be blocked */ }
    setEngine(created);
    setSnap({ elapsedMs: 0, entities: [], tracks: [], observations: [], fps: 0, phase: 'IDLE', sensorHealth: 1, rendererBackend: created.getRendererBackend() });
  }, []);
  const onEngineError = useCallback((message: string) => setEngineError(message), []);

  useEffect(() => {
    engine?.setSimulationSpeed(settings.simulationSpeed);
    engine?.setQuality(settings.quality);
  }, [engine, settings.simulationSpeed, settings.quality]);

  const selected = useMemo(() => snap?.tracks.find(track => track.id === selectedTrackId) ?? null, [snap?.tracks, selectedTrackId]);
  const sensorSummary = useMemo(() => {
    const channels = ['VISUAL', 'RADAR_SYNTH', 'RF_LIKE', 'THERMAL_LIKE'] as const;
    return channels.map(source => {
      const observations = (snap?.observations ?? []).filter(observation => observation.source === source);
      return { source, count: observations.length, confidence: observations.length ? observations.reduce((sum, item) => sum + item.confidence, 0) / observations.length : 0 };
    });
  }, [snap?.observations]);

  if (!scenario) {
    return <div className="page empty"><div><Target size={28}/><h2>No scenario selected</h2><p>Choose a deterministic showcase scenario or author a new one.</p><button className="btn primary" onClick={() => { setScenario(showcaseScenarios[0]); setView('training'); }}>LOAD SHOWCASE</button><button className="btn" onClick={() => setView('scenario')}>OPEN SCENARIO LAB</button></div></div>;
  }

  const start = () => {
    if (!engine || snap?.phase === 'COMPLETE') return;
    if (snap?.phase === 'PAUSED') engine.resume();
    else if (!started) { startAtRef.current = Date.now(); engine.start(); setStarted(true); }
  };
  const togglePause = () => {
    if (!engine || !started) return;
    if (snap?.phase === 'RUNNING') engine.pause();
    else if (snap?.phase === 'PAUSED') engine.resume();
  };
  const acquire = (trackId: string) => {
    setSelectedTrack(trackId);
    engine?.selectTrack(trackId);
    setPrediction(null);
  };
  const submitClass = () => {
    if (!selected || !engine) return;
    engine.classifyTrack(selected.id, classification, confidence);
    setPrediction(predictSyntheticTrack(selected));
  };
  const submitDecision = () => { if (selected && engine) engine.decideTrack(selected.id, decision); };

  const finish = async () => {
    if (!engine || !activeProfile || !started || finalizingRef.current || finishedRef.current) return;
    finalizingRef.current = true;
    try {
      if (engine.getPhase() !== 'COMPLETE') engine.stop();
      const entities = engine.getEntities();
      const tracks = engine.getTracks();
      const durationMs = engine.getElapsedMs();
      const score = scoreSession(entities, tracks, durationMs);
      const eventLog = eventsRef.current.slice();
      if (!eventLog.some(event => event.type === 'SCENARIO_COMPLETED')) {
        eventLog.push({ id: `evt-final-${Date.now()}`, type: 'SCENARIO_COMPLETED', t: durationMs, payload: { durationMs } });
      }
      const draft = {
        id: sessionIdRef.current,
        profileId: activeProfile.id,
        startedAt: startAtRef.current,
        endedAt: Date.now(),
        scenario,
        events: eventLog,
        score,
        mistakes: [] as string[],
        strengths: [] as string[],
        trackCount: tracks.length,
        mediaProfile: scenario.mediaProfile,
        durationMs,
      };
      const finalRecord = { ...draft, ...summarizeSession(draft) };
      await finalizeSession(finalRecord);
      finishedRef.current = true;
      setView('aar');
    } catch (error) {
      finalizingRef.current = false;
      setEngineError(error instanceof Error ? error.message : String(error));
    }
  };

  const resetScenario = () => {
    if (started && !finishedRef.current && !window.confirm('Reset this active session? Unsaved training events will be discarded.')) return;
    setScenario({ ...scenario, id: scenario.id, seed: scenario.seed });
    setSelectedTrack(null);
  };
  const mediaSrc = mediaByProfile[scenario.mediaProfile] ?? mediaByProfile.SENSOR_GRID;
  const activeTracks = snap?.tracks.filter(track => track.state !== 'LOST' && track.state !== 'RESOLVED') ?? [];
  const totalTracks = snap?.tracks.length ?? 0;

  return <div className="training-shell training-v5">
    <div className="training-head">
      <div><span className="eyebrow">LIVE TRAINING / {scenario.id}</span><h1>{scenario.title}</h1><p>{scenario.objective}</p></div>
      <div className="session-meta"><div><small>SCENARIO SEED</small><b>{scenario.seed}</b></div><div><small>DIFFICULTY</small><b>{Math.round(scenario.difficulty * 100)}%</b></div><div><small>ELAPSED</small><b>{((snap?.elapsedMs ?? 0) / 1000).toFixed(1)}s</b></div><div><small>PHASE</small><b className="phase-value">{snap?.phase ?? 'INITIALIZING'}</b></div></div>
    </div>

    {engineError && <div className="runtime-banner" role="alert"><strong>ENGINE / RECOVERY</strong><span>{engineError}</span><button className="btn" onClick={() => { setEngineError(''); window.location.reload(); }}>RELOAD</button></div>}

    <div className="training-grid">
      <section className="world-panel card">
        <div className="panel-top"><div><span className="panel-label">SYNTHETIC WORLD / GROUND TRUTH HIDDEN</span><strong>{scenario.environment} / {scenario.timeOfDay} / {scenario.visibility}</strong></div><div className="world-stats"><span><Gauge size={12}/>{snap?.fps ?? 0} FPS</span><span><Radio size={12}/>{totalTracks} TRACKS</span><span><Activity size={12}/>{snap?.rendererBackend ?? 'RENDERER…'}</span></div></div>
        <WorldCanvas scenario={scenario} onSnapshot={onSnapshot} onEvent={onEvent} onEngine={onEngine} onError={onEngineError}/>
        <div className="world-overlay"><span>SIM {((snap?.elapsedMs ?? 0) / 1000).toFixed(1)}S</span><span>SENSOR {scenario.sensorHealth}</span><span>MEDIA {scenario.mediaProfile}</span><span>{snap?.phase ?? 'IDLE'}</span></div>
        <div className="world-actions"><button className="btn" onClick={() => engine?.resetCamera()}><Camera size={13}/> RESET CAMERA</button><button className="btn" onClick={() => selected && engine?.focusTrack(selected.id)} disabled={!selected}><Focus size={13}/> FOCUS SELECTED</button><button className="btn" onClick={resetScenario}><RotateCcw size={13}/> RESET SCENARIO</button></div>
      </section>

      <aside className="right-stack training-right">
        <div className="panel card"><div className="panel-title"><span>RELATIVE TRACK RADAR</span><b>{totalTracks.toString().padStart(2, '0')}</b></div><Radar tracks={snap?.tracks ?? []} selectedId={selectedTrackId} onSelect={acquire}/><div className="radar-legend"><span><i className="legend-dot active-dot"/> ACTIVE</span><span><i className="legend-dot"/> UNCERTAIN</span><span><i className="legend-dot lost-dot"/> LOST</span></div></div>
        <div className="panel card"><div className="panel-title"><span>TRACK MANAGER</span><b>{activeTracks.length} ACTIVE</b></div><div className="track-list">{(snap?.tracks ?? []).slice().sort((a, b) => b.lastSeen - a.lastSeen).map((track: Track) => <button key={track.id} className={selectedTrackId === track.id ? 'track-row active' : 'track-row'} onClick={() => acquire(track.id)}><span><b>{track.id}</b><span>{track.state} / {Math.round(track.confidence * 100)}% / {track.sources.length} CH</span></span><span className="status">{track.ageMs < 500 ? 'LIVE' : track.state === 'LOST' ? 'STALE' : 'FUSED'}</span></button>)}{!totalTracks && <div className="empty-track">Start the session to generate sensor observations.</div>}</div></div>
        <div className="panel card evidence-panel"><div className="panel-title"><span><Video size={12}/> LOCAL SENSOR EVIDENCE</span><b>OFFLINE</b></div><div className="evidence-video"><video key={mediaSrc} src={mediaSrc} autoPlay muted loop playsInline controls preload="metadata" onError={() => setMediaError(true)} onLoadedData={() => setMediaError(false)} /><div className="evidence-video-overlay"><span>AID-C2S / SYNTHETIC FEED</span><span>{scenario.mediaProfile}</span></div>{mediaError && <div className="evidence-fallback">Local clip unavailable. Synthetic track observations remain active.</div>}</div></div>
      </aside>

      <section className="decision card">
        <div className="section-head"><div><span className="panel-label">TRAINEE WORKFLOW</span><h2>{selected ? selected.id : 'SELECT A TRACK'}</h2><p>{selected ? 'Inspect synthetic evidence, then submit your classification and training decision.' : 'Ground truth remains hidden. Select a contact from the radar or track manager.'}</p></div><div className="track-tags">{selected && <><span className="tag">{selected.state}</span><span className="tag">CONF {Math.round(selected.confidence * 100)}%</span><span className="tag">{selected.sources.join(' / ')}</span></>}</div></div>
        {!selected ? <div className="contact-empty"><div><Focus size={22}/><b>Acquire a contact</b><p>Select a track to open its evidence and assessment workflow.</p></div></div> : <div className="workflow workflow-v5">
          <div className="workflow-step"><small>01 / CONTACT STATE</small><h3>{selected.state} · {Math.round(selected.confidence * 100)}% confidence</h3><p className="small muted">Observed {((snap?.elapsedMs ?? 0) - selected.lastSeen > 0 ? ((snap?.elapsedMs ?? 0) - selected.lastSeen) / 1000 : 0).toFixed(1)}s ago · {selected.history.length} history samples</p><div className="btn-row"><button className="btn" onClick={() => engine?.focusTrack(selected.id)}><Focus size={13}/> FOCUS TRACK</button></div></div>
          <div className="workflow-step"><small>02 / CLASSIFICATION</small><div className="chips">{classes.map(value => <button key={value} className={classification === value ? 'chip active' : 'chip'} onClick={() => setClassification(value)}>{value}</button>)}</div><div className="btn-row" style={{ marginTop: 8 }}><button className="btn primary" onClick={submitClass} disabled={snap?.phase !== 'RUNNING' && snap?.phase !== 'PAUSED'}>LOG CLASSIFICATION</button><button className="btn" onClick={() => setPrediction(predictSyntheticTrack(selected))}>LOCAL EVIDENCE ASSIST</button></div></div>
          <div className="workflow-step"><small>03 / CONFIDENCE CALIBRATION</small><div className="range"><input aria-label="Classification confidence" type="range" min=".1" max="1" step=".05" value={confidence} onChange={e => setConfidence(Number(e.target.value))} /><b>{Math.round(confidence * 100)}%</b></div></div>
          {prediction && <div className="ai-box"><div className="panel-label">LOCAL SYNTHETIC CLASSIFIER / NON-AUTHORITATIVE</div><div className="ai-box-grid"><div><small>PROVIDER</small><strong>{prediction.provider}</strong></div><div><small>SUGGESTION</small><strong>{prediction.label}</strong></div><div><small>CONFIDENCE</small><strong>{Math.round(prediction.confidence * 100)}%</strong></div></div><p className="small muted">Suggestion uses synthetic motion/signature features only. The trainee remains responsible for the final answer.</p></div>}
          <div className="workflow-step"><small>04 / ABSTRACT TRAINING DECISION</small><div className="chips">{decisions.map(value => <button key={value} className={decision === value ? 'chip active' : 'chip'} onClick={() => setDecision(value)}>{value}</button>)}</div><div className="btn-row" style={{ marginTop: 8 }}><button className="btn primary" onClick={submitDecision} disabled={!selected.traineeClassification || !started || snap?.phase === 'COMPLETE'}>SUBMIT DECISION</button></div></div>
        </div>}
      </section>

      <section className="fusion-strip card"><div className="section-head"><div><span className="panel-label">SYNTHETIC SENSOR FUSION</span><h2>Current evidence quality</h2></div><span className="tag">HEALTH {Math.round((snap?.sensorHealth ?? 1) * 100)}%</span></div><div className="sensor-channels">{sensorSummary.map(item => <div className="sensor-channel" key={item.source}><div><span>{item.source.replace('_', ' ')}</span><b>{Math.round(item.confidence * 100)}%</b></div><div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(1, item.confidence * 100)}%` }}/></div><small>{item.count} observations / frame</small></div>)}</div></section>

      <div className="bottom-bar"><span>SESSION {sessionIdRef.current.slice(-8).toUpperCase()} · {activeProfile?.name ?? 'LOCAL OPERATOR'}</span><div className="btn-row"><button className="btn" onClick={start} disabled={!engine || started || snap?.phase === 'COMPLETE'}><CirclePlay size={13}/> {snap?.phase === 'PAUSED' ? 'RESUME' : 'START'}</button><button className="btn" onClick={togglePause} disabled={!started || snap?.phase === 'COMPLETE'}><CirclePause size={13}/> {snap?.phase === 'PAUSED' ? 'RESUME' : 'PAUSE'}</button><button className="btn primary" onClick={() => void finish()} disabled={!started || finishedRef.current}><ShieldCheck size={13}/> FINISH + AAR</button></div></div>
    </div>
  </div>;
}
