import { useEffect, useMemo, useState } from 'react';
import { Download, Lightbulb, Pause, Play, RotateCcw, SkipBack, SkipForward, Sparkles } from 'lucide-react';
import { useSimStore } from '../store/simStore';
import { recommendScenario } from '../simulation/adaptive';
import { ReplayMap } from './ReplayMap';

export function AARView() {
  const { lastSession, sessions, setScenario, setView } = useSimStore();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const session = lastSession;
  const events = session?.events ?? [];
  useEffect(() => { setIndex(0); setPlaying(false); }, [session?.id]);
  useEffect(() => {
    if (!playing || !events.length) return;
    const timer = window.setInterval(() => setIndex(current => {
      if (current >= events.length - 1) { setPlaying(false); return current; }
      return current + 1;
    }), 650 / speed);
    return () => window.clearInterval(timer);
  }, [playing, events.length, speed]);

  const currentEvent = events[index];
  const eventTime = currentEvent?.t ?? 0;
  const eventCounts = useMemo(() => events.reduce<Record<string, number>>((counts, event) => {
    counts[event.type] = (counts[event.type] ?? 0) + 1; return counts;
  }, {}), [events]);
  if (!session) return <div className="page empty"><div><Lightbulb size={28}/><h2>No completed AAR</h2><p>Finish a training session first. Your AAR will include actual persisted scores, events and replay keyframes.</p><button className="btn primary" onClick={() => setView('scenario')}>OPEN SCENARIO LAB</button><button className="btn" onClick={() => setView('training')}>OPEN TRAINING</button></div></div>;

  const exportAar = () => {
    const blobUrl = URL.createObjectURL(new Blob([JSON.stringify({ version: 5, exportedAt: new Date().toISOString(), session }, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = blobUrl; anchor.download = `AID-C2S-AAR-${session.id}.json`; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };
  const adaptive = () => { setScenario(recommendScenario(sessions, session.score, (session.scenario.seed + 731) % 2147483647)); setView('training'); };
  const tip = session.mistakes?.[0] ?? session.strengths?.[0] ?? 'Repeat the scenario to establish a longer performance trend.';
  const step = (amount: number) => setIndex(current => Math.max(0, Math.min(events.length - 1, current + amount)));

  return <div className="page aar-page">
    <div className="page-head"><div><span className="eyebrow">AFTER-ACTION REVIEW / {session.id.slice(-8).toUpperCase()}</span><h1>{session.scenario.title}</h1><p>{new Date(session.endedAt).toLocaleString()} · {Math.round(session.durationMs / 1000)} seconds · {session.trackCount} tracks · seed {session.scenario.seed}</p></div><div className="btn-row"><button className="btn" onClick={exportAar}><Download size={14}/> EXPORT AAR JSON</button><button className="btn" onClick={() => { setScenario(session.scenario); setView('training'); }}><RotateCcw size={14}/> RE-RUN</button><button className="btn primary" onClick={adaptive}><Sparkles size={14}/> ADAPTIVE NEXT</button></div></div>
    <div className="aar-top"><div className="score-ring card"><span>OVERALL SCORE</span><strong>{session.score.total}</strong><small>/ 100</small></div><div className="card bars">{[['Detection', session.score.detection], ['Classification', session.score.classification], ['Decision', session.score.decision], ['Confidence calibration', session.score.confidenceCalibration], ['Track continuity', session.score.trackContinuity], ['Completion', session.score.completion]].map(([label, value]) => <Bar key={String(label)} label={String(label)} value={Number(value)}/>)}</div><div className="section card aar-coaching"><span className="panel-label">COACHING / RULES-BASED</span><h2>Next focus</h2><p>{tip}</p><div className="cap-list"><div className="cap-row"><span>False-positive penalty</span><b>{session.score.falsePositivePenalty}</b></div><div className="cap-row"><span>Events recorded</span><b>{events.length}</b></div><div className="cap-row"><span>Unique event types</span><b>{Object.keys(eventCounts).length}</b></div></div></div></div>
    <section className="section card replay-console"><div className="section-head"><div><span className="panel-label">EVENT-SOURCED REPLAY</span><h2>Session reconstruction</h2><p>Choose an event or seek by index. The map renders the latest stored simulation keyframe at or before the selected event time.</p></div><span className="tag">{events.length ? `${index + 1} / ${events.length}` : 'NO EVENTS'}</span></div>
      <ReplayMap scenario={session.scenario} events={events} timeMs={eventTime}/>
      <div className="replay-controls"><div className="btn-row"><button className="icon-btn" aria-label="Jump to first event" onClick={() => { setIndex(0); setPlaying(false); }} disabled={!events.length}><SkipBack size={14}/></button><button className="btn" onClick={() => setPlaying(value => !value)} disabled={events.length < 2}>{playing ? <Pause size={13}/> : <Play size={13}/>} {playing ? 'PAUSE' : 'PLAY'}</button><button className="icon-btn" aria-label="Step backward" onClick={() => step(-1)} disabled={!events.length}><SkipBack size={14}/></button><button className="icon-btn" aria-label="Step forward" onClick={() => step(1)} disabled={!events.length}><SkipForward size={14}/></button><button className="icon-btn" aria-label="Jump to last event" onClick={() => { setIndex(Math.max(0, events.length - 1)); setPlaying(false); }} disabled={!events.length}><SkipForward size={14}/></button></div><label className="replay-speed">PLAYBACK<select value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select></label><label className="replay-seek"><span>EVENT SEEK</span><input aria-label="Replay event seek" type="range" min={0} max={Math.max(0, events.length - 1)} step={1} value={index} onChange={event => { setIndex(Number(event.target.value)); setPlaying(false); }}/></label><div className="replay-timestamp">T+ {(eventTime / 1000).toFixed(2)}s</div></div>
    </section>
    <div className="subgrid aar-lower"><section className="section card"><div className="section-head"><div><span className="panel-label">EVENT TIMELINE</span><h2>Recorded events</h2></div></div><div className="timeline aar-event-list">{events.map((event, eventIndex) => <button className={eventIndex === index ? 'timeline-row active' : 'timeline-row'} key={event.id} onClick={() => { setIndex(eventIndex); setPlaying(false); }}><span className="time">{(event.t / 1000).toFixed(1)}s</span><span className="dot"/><div><b>{event.type.replaceAll('_', ' ')}</b><p>{Object.entries(event.payload).map(([key, value]) => `${key}: ${String(value)}`).join(' · ')}</p></div></button>)}{!events.length && <p>No event log stored.</p>}</div></section><section className="section card"><span className="panel-label">SESSION NOTES</span><h2>Strengths</h2>{(session.strengths ?? []).map(note => <p key={note} className="aar-note">+ {note}</p>)}<h2 className="aar-subtitle">Improvement areas</h2>{(session.mistakes ?? []).map(note => <p key={note} className="aar-note">• {note}</p>)}<div className="system-banner"><Lightbulb size={14}/><div><b>Scoring boundary</b><p>Scores are computed by deterministic code from the immutable synthetic ground truth and trainee answers. Coaching is rules-based and does not modify the score.</p></div></div></section></div>
  </div>;
}

function Bar({ label, value }: { label: string; value: number }) { return <div className="bar-row"><span>{label}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }}/></div><b>{value}</b></div>; }
