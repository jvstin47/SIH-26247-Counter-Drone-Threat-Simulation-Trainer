import { Layers3, Radio } from 'lucide-react';
import { useSimStore } from '../store/simStore';
import { showcaseScenarios } from '../simulation/scenarios';

export function FusionView() {
  const { lastSession, setScenario, setView } = useSimStore();
  if (!lastSession) return <div className="page empty"><div><Layers3 size={28}/><h2>Sensor fusion console</h2><p>Complete a training run to inspect actual multi-source observations from the stored event stream.</p><button className="btn primary" onClick={() => { setScenario(showcaseScenarios[0]); setView('training'); }}>START TRAINING</button></div></div>;
  const latest = [...lastSession.events].filter(event => event.type === 'SENSOR_KEYFRAME').at(-1);
  const sourceMap = (latest?.payload.sources ?? {}) as Record<string, { count: number; quality: number }>;
  const sources = ['VISUAL', 'RADAR_SYNTH', 'RF_LIKE', 'THERMAL_LIKE'];
  const scenario = lastSession.scenario;
  return <div className="page"><div className="page-head"><div><span className="eyebrow">SENSOR FUSION / PERSISTED EVIDENCE</span><h1>Evidence quality</h1><p>{scenario.sensorHealth} / {scenario.visibility} / {scenario.timeOfDay} · {scenario.title}</p></div><span className="tag">SEED {scenario.seed}</span></div>
    <div className="subgrid">{sources.map(source => { const item = sourceMap[source]; return <section className="section card" key={source}><div className="section-head"><div><span className="panel-label">OBSERVATION CHANNEL</span><h2>{source}</h2></div><Radio size={16}/></div><div className="cap-list"><div className="cap-row"><span>Observation samples / keyframe</span><b>{item?.count ?? '—'}</b></div><div className="cap-row"><span>Mean confidence</span><b>{item ? `${Math.round(item.quality * 100)}%` : '—'}</b></div><div className="cap-row"><span>Scenario health</span><b>{scenario.sensorHealth}</b></div></div><div className="bar-track" style={{marginTop:12}}><div className="bar-fill" style={{width:`${Math.max(0,Math.min(100,(item?.quality ?? 0)*100))}%`}}/></div></section>; })}</div>
    <section className="section card" style={{ marginTop: 10 }}><div className="section-head"><div><span className="panel-label">FUSION PIPELINE</span><h2>Observation → association → track</h2><p>These summaries are taken from the last stored sensor keyframe, not fabricated realtime measurements.</p></div></div><div className="dna"><div className="dna-item"><span>INPUT</span><b>Deterministic synthetic observations</b></div><div className="dna-item"><span>ASSOCIATION</span><b>Nearest-neighbour confidence gate</b></div><div className="dna-item"><span>ESTIMATOR</span><b>Alpha-beta style state update</b></div><div className="dna-item"><span>OUTPUT</span><b>Track state and bounded history</b></div></div><button className="btn" style={{marginTop:12}} onClick={() => setView('aar')}>INSPECT SOURCE SESSION AAR</button></section></div>;
}
