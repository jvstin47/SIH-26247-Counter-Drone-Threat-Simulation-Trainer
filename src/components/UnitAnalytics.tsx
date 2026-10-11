import { useMemo, useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { useSimStore } from '../store/simStore';

export function UnitAnalytics() {
  const { sessions, profiles, activeProfile, createProfile, setActiveProfile, renameProfile, archiveProfile } = useSimStore();
  const [notice, setNotice] = useState('');
  const stats = useMemo(() => {
    const map = new Map<string, { count: number; sum: number; latest: number }>();
    sessions.forEach(session => {
      const item = map.get(session.profileId) ?? { count: 0, sum: 0, latest: 0 };
      item.count += 1; item.sum += session.score.total; item.latest = Math.max(item.latest, session.endedAt);
      map.set(session.profileId, item);
    });
    return map;
  }, [sessions]);
  const average = sessions.length ? sessions.reduce((sum, session) => sum + session.score.total, 0) / sessions.length : 0;
  const covered = profiles.filter(profile => (stats.get(profile.id)?.count ?? 0) > 0).length;
  const add = async () => {
    const name = window.prompt('Name for the new local training profile', `Operator ${profiles.length + 1}`);
    if (!name?.trim()) return;
    try { await createProfile(name, 'Trainee'); setNotice(`Created and selected ${name.trim()}.`); }
    catch (error) { setNotice(error instanceof Error ? error.message : String(error)); }
  };
  const rename = async (id: string, currentName: string) => {
    const name = window.prompt('Rename local profile', currentName);
    if (!name?.trim()) return;
    try { await renameProfile(id, name); setNotice(`Profile renamed to ${name.trim()}.`); }
    catch (error) { setNotice(error instanceof Error ? error.message : String(error)); }
  };
  const archive = async (id: string, name: string) => {
    if (profiles.length <= 1) { setNotice('At least one profile must remain.'); return; }
    if (!window.confirm(`Archive profile “${name}”? Its historical sessions remain available.`)) return;
    try { await archiveProfile(id); setNotice(`Archived ${name}.`); }
    catch (error) { setNotice(error instanceof Error ? error.message : String(error)); }
  };
  return <div className="page"><div className="page-head"><div><span className="eyebrow">UNIT / TEAM ANALYTICS</span><h1>Cohort readiness</h1><p>Aggregate data from local profiles. Every displayed metric is derived from saved session records.</p></div><button className="btn" onClick={() => void add()}><UserPlus size={13}/> ADD LOCAL PROFILE</button></div>
    {notice && <div className="scenario-notice" role="status"><span>{notice}</span><button className="icon-btn" aria-label="Dismiss notice" onClick={() => setNotice('')}>×</button></div>}
    <div className="kpi-grid"><div className="metric card"><small>ACTIVE PROFILES</small><strong>{profiles.length}</strong><span>local operator profiles</span></div><div className="metric card"><small>COMPLETED SESSIONS</small><strong>{sessions.length}</strong><span>stored training runs</span></div><div className="metric card"><small>UNIT AVERAGE</small><strong>{sessions.length ? Math.round(average) : '—'}</strong><span>score / 100</span></div><div className="metric card"><small>PROFILE COVERAGE</small><strong>{profiles.length ? Math.round(covered / profiles.length * 100) : '—'}%</strong><span>profiles with at least one saved session</span></div></div>
    <section className="section card"><div className="section-head"><div><span className="panel-label">PROFILE TABLE</span><h2>Performance by local profile</h2></div><Users size={16}/></div><div className="history-table-scroll"><table className="table"><thead><tr><th>PROFILE</th><th>ROLE</th><th>SESSIONS</th><th>AVERAGE</th><th>LAST SESSION</th><th>ACTIONS</th></tr></thead><tbody>{profiles.map(profile => { const item = stats.get(profile.id); return <tr key={profile.id}><td><b>{profile.name}</b>{activeProfile?.id === profile.id && <small className="active-profile-label">ACTIVE</small>}</td><td>{profile.role}</td><td>{item?.count ?? 0}</td><td>{item ? Math.round(item.sum / item.count) : '—'}</td><td>{item?.latest ? new Date(item.latest).toLocaleDateString() : '—'}</td><td><div className="btn-row"><button className="btn" disabled={activeProfile?.id === profile.id} onClick={() => { setActiveProfile(profile); setNotice(`Switched to ${profile.name}.`); }}>USE</button><button className="btn" onClick={() => void rename(profile.id, profile.name)}>RENAME</button><button className="btn" disabled={profiles.length <= 1} onClick={() => void archive(profile.id, profile.name)}>ARCHIVE</button></div></td></tr>; })}{!profiles.length && <tr><td colSpan={6}>No local profiles yet. Create one to begin session attribution.</td></tr>}</tbody></table></div></section>
  </div>;
}
