import { useRef, useState, type ReactNode } from 'react';
import { Boxes, Copy, Download, FileCheck2, Play, Save, Trash2, Upload, WandSparkles } from 'lucide-react';
import { generateScenario } from '../simulation/scenarios';
import { validateScenario } from '../simulation/validation';
import { useSimStore } from '../store/simStore';
import type { Environment, ScenarioDNA, SensorHealth, TimeOfDay, Visibility } from '../types';

function newSeed() { return Math.floor(Math.random() * 0x7fffffff) || 1; }
function downloadJson(filename: string, value: unknown) {
  const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = blobUrl; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

export function ScenarioLab() {
  const { scenarios, saveScenario, deleteScenario, setScenario, setView } = useSimStore();
  const [draft, setDraft] = useState<ScenarioDNA>(() => generateScenario(482031));
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement | null>(null);
  const patch = (value: Partial<ScenarioDNA>) => setDraft(current => ({ ...current, ...value }));
  const randomize = () => { const seed = newSeed(); setDraft(generateScenario(seed)); setNotice(`Generated reproducible seed ${seed}`); setError(''); };
  const exportOne = () => { downloadJson(`${draft.id}.json`, draft); setNotice('Scenario exported as JSON'); };
  const save = async (scenario = draft) => {
    try { const valid = validateScenario(scenario); await saveScenario(valid); setDraft(valid); setNotice(`Saved ${valid.id} to local scenario library`); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
  };
  const run = async () => {
    try {
      const valid = validateScenario(draft);
      await saveScenario(valid);
      setScenario(valid); setView('training');
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
  };
  const importFile = async (file: File) => {
    try {
      const raw: unknown = JSON.parse(await file.text());
      const valid = validateScenario(raw);
      setDraft(valid); setNotice(`Loaded scenario ${valid.id}`); setError('');
    } catch (reason) { setError(`Import rejected: ${reason instanceof Error ? reason.message : String(reason)}`); }
    finally { if (fileInput.current) fileInput.current.value = ''; }
  };
  const duplicate = (scenario: ScenarioDNA) => {
    const seed = newSeed();
    setDraft({ ...scenario, id: `scn-${seed}`, seed, title: `${scenario.title} / COPY` });
    setNotice('Copy created as a separate scenario. Save it to retain it.'); setError('');
  };
  const remove = async (scenario: ScenarioDNA) => {
    if (!window.confirm(`Delete saved scenario “${scenario.title}”?`)) return;
    try { await deleteScenario(scenario.id); setNotice(`Deleted ${scenario.id}`); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
  };

  return <div className="page scenario-page">
    <div className="page-head"><div><span className="eyebrow">SCENARIO LAB / AUTHORING WORKSPACE</span><h1>Compose a training scenario.</h1><p>Each scenario has a reproducible seed, typed configuration and local persistence. Imported JSON is validated before it can run.</p></div><div className="btn-row"><button className="btn" onClick={randomize}><WandSparkles size={14}/> GENERATE NEW</button><button className="btn" onClick={exportOne}><Download size={14}/> EXPORT JSON</button><button className="btn" onClick={() => fileInput.current?.click()}><Upload size={14}/> IMPORT JSON</button><input ref={fileInput} hidden type="file" accept="application/json,.json" onChange={event => { const file = event.target.files?.[0]; if (file) void importFile(file); }}/></div></div>
    {(notice || error) && <div className={error ? 'scenario-notice error' : 'scenario-notice'} role={error ? 'alert' : 'status'}><span>{error || notice}</span><button className="icon-btn" aria-label="Dismiss message" onClick={() => { setNotice(''); setError(''); }}>×</button></div>}
    <div className="scenario-grid">
      <section className="section card scenario-editor"><div className="section-head"><div><span className="panel-label">CONFIGURATION</span><h2>Scenario parameters</h2><p>Changes apply to the next run, not to ground truth retroactively.</p></div><span className="tag">SCHEMA V2</span></div>
        <div className="controls">
          <Field label="Environment"><select value={draft.environment} onChange={event => patch({ environment: event.target.value as Environment })}>{(['URBAN','RURAL','OPEN','INFRASTRUCTURE'] as Environment[]).map(value => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Time of day"><select value={draft.timeOfDay} onChange={event => patch({ timeOfDay: event.target.value as TimeOfDay })}>{(['DAY','NIGHT'] as TimeOfDay[]).map(value => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Visibility"><select value={draft.visibility} onChange={event => patch({ visibility: event.target.value as Visibility })}>{(['CLEAR','HAZY','LOW'] as Visibility[]).map(value => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Sensor health"><select value={draft.sensorHealth} onChange={event => patch({ sensorHealth: event.target.value as SensorHealth })}>{(['NOMINAL','DEGRADED','SEVERE'] as SensorHealth[]).map(value => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Evidence feed"><select value={draft.mediaProfile} onChange={event => patch({ mediaProfile: event.target.value as ScenarioDNA['mediaProfile'] })}>{(['SENSOR_GRID','AERIAL_DAY','AERIAL_NIGHT','NONE'] as ScenarioDNA['mediaProfile'][]).map(value => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Entity count"><input type="number" min={1} max={40} value={draft.entityCount} onChange={event => patch({ entityCount: Math.max(1, Math.min(40, Number(event.target.value) || 1)) })}/></Field>
          <Field label="Duration (seconds)"><input type="number" min={10} max={300} value={draft.scenarioDuration} onChange={event => patch({ scenarioDuration: Math.max(10, Math.min(300, Number(event.target.value) || 10)) })}/></Field>
          <Field label="Scenario title"><input type="text" value={draft.title} maxLength={80} onChange={event => patch({ title: event.target.value })}/></Field>
        </div>
        <div className="controls scenario-sliders">
          <Slider label="Difficulty" value={draft.difficulty} onChange={value => patch({ difficulty: value })}/>
          <Slider label="Ambiguity" value={draft.ambiguity} onChange={value => patch({ ambiguity: value })}/>
          <Slider label="Background activity" value={draft.backgroundActivity} onChange={value => patch({ backgroundActivity: value })}/>
          <Slider label="Tracking difficulty" value={draft.trackingDifficulty} onChange={value => patch({ trackingDifficulty: value })}/>
          <Slider label="Event density" value={draft.eventDensity} onChange={value => patch({ eventDensity: value })}/>
        </div>
        <div className="btn-row scenario-primary-actions"><button className="btn primary" onClick={() => void run()}><Play size={14}/> SAVE & RUN</button><button className="btn" onClick={() => void save()}><Save size={14}/> SAVE SCENARIO</button><button className="btn" onClick={() => duplicate(draft)}><Copy size={14}/> DUPLICATE</button></div>
      </section>
      <section className="section card scenario-inspector"><div className="section-head"><div><span className="panel-label">SCENARIO DNA</span><h2>{draft.title || 'Untitled scenario'}</h2><p>{draft.objective}</p></div><span className="tag">SEED {draft.seed}</span></div>
        <div className="dna">{[['ID',draft.id],['Environment',draft.environment],['Time',draft.timeOfDay],['Visibility',draft.visibility],['Sensor health',draft.sensorHealth],['Entities',draft.entityCount],['Difficulty',`${Math.round(draft.difficulty*100)}%`],['Media',draft.mediaProfile],['Duration',`${draft.scenarioDuration}s`],['Track difficulty',`${Math.round(draft.trackingDifficulty*100)}%`],['Background',`${Math.round(draft.backgroundActivity*100)}%`],['Event density',`${Math.round(draft.eventDensity*100)}%`]].map(([label,value]) => <div className="dna-item" key={String(label)}><span>{label}</span><b>{String(value)}</b></div>)}</div>
        <div className="scenario-library-head"><div><span className="panel-label">LOCAL LIBRARY</span><h2>Saved scenarios <span className="library-count">{scenarios.length.toString().padStart(2,'0')}</span></h2></div></div>
        <div className="scenario-cards">{scenarios.map(scenario => <div className="scenario-card" key={scenario.id}><div className="scenario-card-copy"><b>{scenario.title}</b><p>{scenario.objective}</p><span className="mono">{scenario.environment} / {scenario.timeOfDay} / {Math.round(scenario.difficulty*100)}% · SEED {scenario.seed}</span></div><div className="btn-row scenario-card-actions"><button className="icon-btn" title="Run scenario" aria-label={`Run ${scenario.title}`} onClick={() => { setScenario(scenario); setView('training'); }}><Play size={13}/></button><button className="icon-btn" title="Edit scenario" aria-label={`Edit ${scenario.title}`} onClick={() => { setDraft(scenario); setNotice(`Editing ${scenario.id}`); }}><FileCheck2 size={13}/></button><button className="icon-btn" title="Duplicate scenario" aria-label={`Duplicate ${scenario.title}`} onClick={() => duplicate(scenario)}><Copy size={13}/></button><button className="icon-btn" title="Delete scenario" aria-label={`Delete ${scenario.title}`} onClick={() => void remove(scenario)}><Trash2 size={13}/></button></div></div>)}{!scenarios.length && <div className="empty-library">No saved scenarios yet. Configure the editor and choose SAVE SCENARIO.</div>}</div>
      </section>
    </div>
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <div className="field"><label>{label}</label>{children}</div>; }
function Slider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <div className="field slider-field"><label>{label}<b>{Math.round(value*100)}%</b></label><input type="range" min="0.05" max="0.95" step="0.01" value={value} onChange={event => onChange(Number(event.target.value))}/></div>; }
