import type { ScoreBreakdown, SessionRecord } from '../types';
import { generateScenario } from './scenarios';
export function nextDifficulty(history: SessionRecord[], current: number) {
  if(!history.length) return Math.max(.2,Math.min(.95,current));
  const recent=history.slice(0,5); const avg=recent.reduce((a,s)=>a+s.score.total,0)/recent.length;
  let next=current; if(avg>=89) next+=.06; else if(avg<=58) next-=.08; else if(avg<=70) next-=.03; return Math.max(.2,Math.min(.95,Number(next.toFixed(2))));
}
export function recommendScenario(history: SessionRecord[], current: ScoreBreakdown, seed: number) {
  const weak=Math.min(current.detection,current.classification,current.decision,current.trackContinuity,current.confidenceCalibration);
  const d=nextDifficulty(history,current.total/100);
  return generateScenario(seed,{difficulty:d,visibility:weak<70?'LOW':undefined,sensorHealth:weak<66?'SEVERE':undefined,trackingDifficulty:weak<72?Math.min(.92,d+.08):undefined,title:weak<70?'Adaptive Reinforcement':'Adaptive Continuation'});
}
