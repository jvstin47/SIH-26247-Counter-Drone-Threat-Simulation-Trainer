import {
  Activity, BarChart3, Boxes, CircleHelp, Crosshair, FileClock, FileText, Gauge,
  Layers3, LayoutDashboard, ScanLine, Settings2, Users, Video, ChevronDown, type LucideIcon,
} from 'lucide-react';
import { useSimStore } from '../store/simStore';
import type { ViewId } from '../types';

type NavItem = { key: ViewId; label: string; icon: LucideIcon };
const groups: { label: string; items: NavItem[] }[] = [
  { label: 'OPERATE', items: [
    { key: 'command', label: 'Command', icon: LayoutDashboard },
    { key: 'training', label: 'Live Training', icon: Crosshair },
    { key: 'tracking', label: 'Track Manager', icon: ScanLine },
    { key: 'fusion', label: 'Sensor Fusion', icon: Layers3 },
  ] },
  { label: 'AUTHOR', items: [
    { key: 'scenario', label: 'Scenario Lab', icon: Boxes },
    { key: 'media', label: 'Media Evidence', icon: Video },
  ] },
  { label: 'REVIEW', items: [
    { key: 'aar', label: 'AAR / Replay', icon: FileText },
    { key: 'history', label: 'Session History', icon: FileClock },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'unit', label: 'Unit Analytics', icon: Users },
  ] },
  { label: 'SYSTEM', items: [
    { key: 'system', label: 'System Settings', icon: Settings2 },
    { key: 'help', label: 'Technical Guide', icon: CircleHelp },
  ] },
];

export function TopNav() {
  const { activeView, setView, capabilities, activeProfile, profiles, setActiveProfile } = useSimStore();
  return <aside className="sidebar">
    <div className="brand"><div className="brand-square"><Activity size={19}/></div><div><strong>AID-C2S</strong><small>SIMULATION TRAINER / V5.0</small></div></div>
    <div className="live-strip"><span className="pulse"/> LOCAL TRAINING FABRIC <b>ACTIVE</b></div>
    <nav aria-label="Main navigation">{groups.map(group => <div key={group.label} className="nav-group"><span className="nav-group-label">{group.label}</span>{group.items.map(({ key, label, icon: Icon }) => <button aria-current={activeView === key ? 'page' : undefined} title={label} key={key} className={activeView === key ? 'nav-item active' : 'nav-item'} onClick={() => setView(key)}><Icon size={16}/><span>{label}</span></button>)}</div>)}</nav>
    <div className="sidebar-spacer"/>
    <div className="profile-selector"><div className="profile-mini"><div className="avatar">{(activeProfile?.name ?? 'O').slice(0, 1).toUpperCase()}</div><div className="profile-copy"><b>{activeProfile?.name ?? 'No active profile'}</b><small>{activeProfile?.role ?? 'Create a local profile'}</small></div></div><label className="profile-select-wrap"><span>ACTIVE PROFILE</span><div><select aria-label="Active operator profile" value={activeProfile?.id ?? ''} onChange={event => { const profile = profiles.find(item => item.id === event.target.value); if (profile) setActiveProfile(profile); }}><option value="" disabled>Select profile</option>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select><ChevronDown size={12}/></div></label></div>
    <div className="side-status"><Gauge size={13}/><span>WEBGPU</span><b>{capabilities.webgpu ? 'AVAILABLE' : 'WEBGL FALLBACK'}</b></div>
    <div className="side-status"><span>LOCAL STORAGE</span><b>{capabilities.storage ? 'READY' : 'LIMITED'}</b></div>
  </aside>;
}
