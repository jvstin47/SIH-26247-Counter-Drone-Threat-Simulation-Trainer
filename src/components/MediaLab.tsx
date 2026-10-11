import { useRef, useState } from 'react';
import { Check, FileText, Play, Video } from 'lucide-react';
import { useSimStore } from '../store/simStore';
import { generateScenario } from '../simulation/scenarios';
import type { ScenarioDNA } from '../types';

const assets = [
  { id: 'sensor-grid', profile: 'SENSOR_GRID' as const, file: '/media/sensor-grid.mp4', title: 'Synthetic Sensor Grid', desc: 'Procedural monochrome observation feed with scan lines, moving tracks and timestamp overlays.', license: 'Generated for AID-C2S / local demo asset' },
  { id: 'aerial-day', profile: 'AERIAL_DAY' as const, file: '/media/aerial-day.mp4', title: 'Aerial Evidence / Day', desc: 'Synthetic daylight evidence loop for evidence-inspection practice.', license: 'Generated for AID-C2S / local demo asset' },
  { id: 'aerial-night', profile: 'AERIAL_NIGHT' as const, file: '/media/aerial-night.mp4', title: 'Aerial Evidence / Night', desc: 'Synthetic low-light evidence loop with visual noise and reduced visibility.', license: 'Generated for AID-C2S / local demo asset' },
];

export function MediaLab() {
  const [selected, setSelected] = useState(assets[0]);
  const [status, setStatus] = useState('Select an asset to inspect it or use it in a new scenario.');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { setScenario, setView } = useSimStore();
  const useInScenario = () => {
    const scenario = generateScenario(Date.now() % 2147483647, {
      id: `media-${selected.id}-${Date.now().toString(36)}`,
      title: `Evidence review / ${selected.title}`,
      mediaProfile: selected.profile,
      timeOfDay: selected.profile === 'AERIAL_NIGHT' ? 'NIGHT' : 'DAY',
      objective: `Review ${selected.title.toLowerCase()} and classify synthetic tracks using uncertain evidence.`,
    });
    setScenario(scenario);
    setStatus(`Created ${scenario.id} using ${selected.title}.`);
    setView('training');
  };
  const downloadAsset = () => {
    const anchor = document.createElement('a'); anchor.href = selected.file; anchor.download = `${selected.id}.mp4`; anchor.click();
    setStatus(`Requested download for ${selected.file}.`);
  };
  return <div className="page media-page">
    <div className="page-head"><div><span className="eyebrow">MEDIA EVIDENCE / LOCAL ASSET WORKSPACE</span><h1>Evidence, not decoration.</h1><p>Bundled synthetic video assets work offline. Media can be previewed and attached to a new scenario profile.</p></div><div className="tag">{assets.length.toString().padStart(2,'0')} LOCAL ASSETS</div></div>
    <div className="media-workspace">
      <section className="media-feature card"><div className="panel-title"><span><Video size={13}/> ACTIVE EVIDENCE FEED</span><b>LOCAL / MP4</b></div><div className="video-wrap v5-feature-video"><video ref={videoRef} key={selected.file} controls muted loop playsInline preload="metadata" onPlay={() => setStatus(`Playing ${selected.title}`)} onPause={() => setStatus(`Paused ${selected.title}`)}><source src={selected.file} type="video/mp4"/></video><div className="video-overlay"><span>AID-C2S // SYNTHETIC EVIDENCE</span><span>CHANNEL {selected.id.toUpperCase()}</span></div></div><div className="media-feature-meta"><div><span className="panel-label">SELECTED ASSET</span><h2>{selected.title}</h2><p>{selected.desc}</p></div><span className="tag">{selected.profile}</span></div><div className="btn-row"><button className="btn primary" onClick={useInScenario}><Play size={14}/> USE IN NEW TRAINING SCENARIO</button><button className="btn" onClick={downloadAsset}>DOWNLOAD LOCAL CLIP</button></div><div className="media-status" role="status">{status}</div></section>
      <aside className="media-library"><div className="section-head"><div><span className="panel-label">ASSET LIBRARY</span><h2>Evidence catalogue</h2><p>Choose a feed to preview its metadata.</p></div></div>{assets.map(asset => <button key={asset.id} className={selected.id === asset.id ? 'media-asset active' : 'media-asset'} onClick={() => { setSelected(asset); setStatus(`Selected ${asset.title}.`); }}><span className="media-asset-icon"><Video size={17}/></span><span className="media-asset-copy"><b>{asset.title}</b><small>{asset.desc}</small><code>{asset.file}</code></span><span className="media-asset-check">{selected.id === asset.id ? <Check size={14}/> : 'VIEW'}</span></button>)}<section className="media-license card"><FileText size={16}/><div><b>Source and attribution</b><p>All clips in this build are local synthetic assets generated for demonstration. No external stream or third-party video account is required.</p><code>{selected.license}</code></div></section></aside>
    </div>
  </div>;
}
