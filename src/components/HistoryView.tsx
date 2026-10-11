import { useMemo, useState } from 'react';
import { Download, Eye, FileText, Search, Trash2 } from 'lucide-react';
import { useSimStore } from '../store/simStore';
import type { SessionRecord } from '../types';

function exportJson(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function HistoryView() {
  const { sessions, setView, deleteSession } = useSimStore();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'latest' | 'score' | 'duration'>('latest');
  const [status, setStatus] = useState('');
  const list = useMemo(() => {
    const search = query.toLowerCase().trim();
    const filtered = sessions.filter(session => [session.scenario.title, session.id, session.profileId, session.scenario.environment].some(value => value.toLowerCase().includes(search)));
    if (sort === 'score') return [...filtered].sort((a, b) => b.score.total - a.score.total);
    if (sort === 'duration') return [...filtered].sort((a, b) => b.durationMs - a.durationMs);
    return [...filtered].sort((a, b) => b.endedAt - a.endedAt);
  }, [sessions, query, sort]);

  const openAar = (session: SessionRecord) => {
    useSimStore.getState().setScenario(session.scenario);
    useSimStore.setState({ lastSession: session });
    setView('aar');
  };
  const remove = async (session: SessionRecord) => {
    if (!window.confirm(`Delete session ${session.id}? This cannot be undone.`)) return;
    try { await deleteSession(session.id); setStatus(`Deleted ${session.id}`); }
    catch (error) { setStatus(`Delete failed: ${error instanceof Error ? error.message : String(error)}`); }
  };
  const exportAll = () => { exportJson(`AID-C2S-session-archive-${Date.now()}.json`, { version: 5, exportedAt: new Date().toISOString(), sessions }); setStatus(`Exported ${sessions.length} sessions`); };

  return <div className="page history-page">
    <div className="page-head"><div><span className="eyebrow">SESSION HISTORY / LOCAL ARCHIVE</span><h1>Every run, traceable.</h1><p>Each record links to its persisted event stream, score breakdown, scenario seed and after-action review.</p></div><button className="btn" onClick={exportAll} disabled={!sessions.length}><Download size={14}/> EXPORT ARCHIVE</button></div>
    {status && <div className="scenario-notice" role="status"><span>{status}</span><button className="icon-btn" onClick={() => setStatus('')} aria-label="Dismiss notification">×</button></div>}
    <div className="history-toolbar"><div className="history-search"><Search size={14}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search scenario, session, profile or environment" aria-label="Search sessions"/></div><label>Sort<select value={sort} onChange={event => setSort(event.target.value as typeof sort)}><option value="latest">Most recent</option><option value="score">Highest score</option><option value="duration">Longest session</option></select></label><span className="tag">{list.length} / {sessions.length} RECORDS</span></div>
    <section className="section card"><div className="history-table-scroll"><table className="table history-table"><thead><tr><th>COMPLETED</th><th>SCENARIO / SEED</th><th>PROFILE</th><th>SCORE</th><th>TIME</th><th>TRACKS</th><th>ACTIONS</th></tr></thead><tbody>{list.map(session => <tr key={session.id}><td>{new Date(session.endedAt).toLocaleString()}</td><td><b>{session.scenario.title}</b><small>{session.scenario.environment} / {session.scenario.timeOfDay} / SEED {session.scenario.seed}</small></td><td>{session.profileId}</td><td><span className="score-strong">{session.score.total}</span><small>/ 100</small></td><td>{Math.round(session.durationMs / 1000)}s</td><td>{session.trackCount}</td><td><div className="btn-row"><button className="btn" onClick={() => openAar(session)}><Eye size={12}/> AAR</button><button className="icon-btn" title="Export session JSON" aria-label={`Export session ${session.id}`} onClick={() => exportJson(`AID-C2S-${session.id}.json`, session)}><FileText size={12}/></button><button className="icon-btn" title="Delete session" aria-label={`Delete session ${session.id}`} onClick={() => void remove(session)}><Trash2 size={12}/></button></div></td></tr>)}{!list.length && <tr><td colSpan={7}>{sessions.length ? 'No sessions match those filters.' : 'No completed sessions have been saved yet. Run a training scenario to populate this archive.'}</td></tr>}</tbody></table></div></section>
  </div>;
}
