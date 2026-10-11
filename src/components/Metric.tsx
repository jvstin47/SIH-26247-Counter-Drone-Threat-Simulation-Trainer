export function Metric({label,value,hint}:{label:string;value:string|number;hint:string}){return <div className="metric card"><small>{label}</small><strong>{value}</strong><span>{hint}</span></div>}
