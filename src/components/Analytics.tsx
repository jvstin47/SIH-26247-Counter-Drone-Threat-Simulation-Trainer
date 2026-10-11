import { useMemo, useState } from 'react';
import { ArrowRight, Download, TrendingUp } from 'lucide-react';
import { useSimStore } from '../store/simStore';
import type { SessionRecord } from '../types';

function downloadData(sessions: SessionRecord[]) {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 5, exportedAt: new Date().toISOString(), sessions }, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `AID-C2S-analytics-${Date.now()}.json`; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Analytics() {
  const { sessions, activeProfile, setView, setScenario } = useSimStore();
  const [environment, setEnvironment] = useState('ALL');
  const [period, setPeriod] = useState('ALL');
  const filtered = useMemo(() => {
    const cutoff = period === '7D' ? Date.now() - 7 * 86400000 : period === '30D' ? Date.now() - 30 * 86400000 : 0;
    return [...sessions].filter(session => activeProfile && session.profileId === activeProfile.id && (environment === 'ALL' || session.scenario.environment === environment) && session.endedAt >= cutoff).sort((a, b) => a.endedAt - b.endedAt);
  }, [sessions, activeProfile, environment, period]);
  const average = filtered.length ? filtered.reduce((sum, session) => sum + session.score.total, 0) / filtered.length : null;
  const best = filtered.length ? Math.max(...filtered.map(session => session.score.total)) : null;
  const first = filtered[0]?.score.total;
  const last = filtered.at(-1)?.score.total;
  const change = filtered.length > 1 && first !== undefined && last !== undefined ? last - first : null;
  const dimensions = [
    { label: 'Detection', value: averageFor(filtered, session => session.score.detection) },
    { label: 'Classification', value: averageFor(filtered, session => session.score.classification) },
    { label: 'Decision quality', value: averageFor(filtered, session => session.score.decision) },
    { label: 'Confidence calibration', value: averageFor(filtered, session => session.score.confidenceCalibration) },
    { label: 'Track continuity', value: averageFor(filtered, session => session.score.trackContinuity) },
    { label: 'Task completion', value: averageFor(filtered, session => session.score.completion) },
  ];
  const openAar = (session: SessionRecord) => { setScenario(session.scenario); useSimStore.setState({ lastSession: session }); setView('aar'); };

  return <div className="page analytics-page">
    <div className="page-head"><div><span className="eyebrow">PERFORMANCE / PERSONAL ANALYTICS</span><h1>Measure what improves.</h1><p>All charts and KPIs are derived from the sessions persisted on this device. No synthetic placeholder scores are added.</p></div><button className="btn" onClick={() => downloadData(filtered)} disabled={!filtered.length}><Download size={13}/> EXPORT FILTERED DATA</button></div>
    <div className="analytics-filters"><label>Environment<select value={environment} onChange={event => setEnvironment(event.target.value)}><option value="ALL">ALL ENVIRONMENTS</option><option value="URBAN">URBAN</option><option value="RURAL">RURAL</option><option value="OPEN">OPEN</option><option value="INFRASTRUCTURE">INFRASTRUCTURE</option></select></label><label>Period<select value={period} onChange={event => setPeriod(event.target.value)}><option value="ALL">ALL HISTORY</option><option value="30D">LAST 30 DAYS</option><option value="7D">LAST 7 DAYS</option></select></label><span className="tag">{filtered.length} FILTERED RUNS</span></div>
    <div className="kpi-grid"><div className="metric card"><small>MEAN SCORE</small><strong>{average === null ? '—' : Math.round(average)}</strong><span>{filtered.length ? 'score / 100' : 'No matching sessions'}</span></div><div className="metric card"><small>BEST SCORE</small><strong>{best === null ? '—' : best}</strong><span>highest in this filter</span></div><div className="metric card"><small>SCORE CHANGE</small><strong>{change === null ? '—' : `${change >= 0 ? '+' : ''}${change}`}</strong><span>{change === null ? 'Need two sessions' : 'last compared with first'}</span></div><div className="metric card"><small>EVENTS STORED</small><strong>{filtered.reduce((sum, session) => sum + session.events.length, 0)}</strong><span>persisted event records</span></div></div>
    <section className="section card analytics-chart"><div className="section-head"><div><span className="panel-label">PERFORMANCE TREND</span><h2>Session score over time</h2><p>Chronological sequence of the filtered saved sessions.</p></div><TrendingUp size={16}/></div>{filtered.length >= 2 ? <ScoreChart sessions={filtered}/> : <div className="chart-empty"><span>INSUFFICIENT DATA</span><p>{filtered.length ? 'Complete another session to create a score trend.' : 'Complete a training session to begin the trend line.'}</p><button className="btn primary" onClick={() => setView('scenario')}>OPEN SCENARIO LAB</button></div>}</section>
    <div className="subgrid analytics-lower"><section className="section card"><div className="section-head"><div><span className="panel-label">SKILL DIMENSIONS</span><h2>Average score composition</h2></div></div><div className="dimension-list">{dimensions.map(item => <div className="dimension-row" key={item.label}><div><span>{item.label}</span><b>{item.value === null ? '—' : Math.round(item.value)}</b></div><div className="bar-track"><div className="bar-fill" style={{ width: `${item.value ?? 0}%` }}/></div></div>)}</div></section><section className="section card"><div className="section-head"><div><span className="panel-label">ENVIRONMENT MIX</span><h2>Training coverage</h2></div></div><div className="environment-list">{(['URBAN','RURAL','OPEN','INFRASTRUCTURE'] as const).map(name => { const count = filtered.filter(session => session.scenario.environment === name).length; const pct = filtered.length ? count / filtered.length * 100 : 0; return <button className="environment-row" key={name} onClick={() => setEnvironment(environment === name ? 'ALL' : name)}><span>{name}</span><b>{count}</b><div className="bar-track"><div className="bar-fill" style={{width:`${pct}%`}}/></div></button>; })}</div><p className="small muted">Click an environment to filter the entire analytics page.</p></section></div>
    <section className="section card analytics-sessions"><div className="section-head"><div><span className="panel-label">SESSION DETAIL</span><h2>Recent filtered runs</h2></div><button className="btn" onClick={() => setView('history')}>OPEN FULL HISTORY <ArrowRight size={13}/></button></div><div className="history-table-scroll"><table className="table"><thead><tr><th>DATE</th><th>SCENARIO</th><th>DETECTION</th><th>CLASSIFICATION</th><th>DECISION</th><th>TOTAL</th><th>OPEN</th></tr></thead><tbody>{[...filtered].reverse().slice(0,8).map(session => <tr key={session.id}><td>{new Date(session.endedAt).toLocaleDateString()}</td><td><b>{session.scenario.title}</b><small>{session.scenario.environment} / SEED {session.scenario.seed}</small></td><td>{session.score.detection}</td><td>{session.score.classification}</td><td>{session.score.decision}</td><td><b>{session.score.total}</b></td><td><button className="btn" onClick={() => openAar(session)}>AAR</button></td></tr>)}{!filtered.length && <tr><td colSpan={7}>No saved sessions match these filters.</td></tr>}</tbody></table></div></section>
  </div>;
}

function averageFor(sessions: SessionRecord[], selector: (session: SessionRecord) => number) {
  return sessions.length ? sessions.reduce((sum, session) => sum + selector(session), 0) / sessions.length : null;
}
function ScoreChart({ sessions }: { sessions: SessionRecord[] }) {
  const width = 900, height = 230, left = 36, right = 24, top = 18, bottom = 28;
  const xAt = (index: number) => left + index / Math.max(1, sessions.length - 1) * (width - left - right);
  const yAt = (score: number) => top + (100 - Math.max(0, Math.min(100, score))) / 100 * (height - top - bottom);
  const points = sessions.map((session, index) => `${xAt(index)},${yAt(session.score.total)}`).join(' ');
  return <div className="score-chart-wrap"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Saved session score trend"><title>Saved session score trend</title>{[0,25,50,75,100].map(tick => <g key={tick}><line x1={left} y1={yAt(tick)} x2={width-right} y2={yAt(tick)} stroke="rgba(255,255,255,.10)" strokeWidth="1"/><text x={left-9} y={yAt(tick)+3} textAnchor="end" fill="#777b82" fontSize="9">{tick}</text></g>)}<polyline fill="none" stroke="#f1f2f4" strokeWidth="2" strokeLinejoin="round" points={points}/>{sessions.map((session, index) => <g key={session.id}><circle cx={xAt(index)} cy={yAt(session.score.total)} r="3.5" fill="#070809" stroke="#fff" strokeWidth="1.3"><title>{session.scenario.title}: {session.score.total}</title></circle></g>)}</svg><div className="chart-axis-labels"><span>{new Date(sessions[0].endedAt).toLocaleDateString()}</span><span>{sessions.length} runs plotted</span><span>{new Date(sessions.at(-1)!.endedAt).toLocaleDateString()}</span></div></div>;
}
