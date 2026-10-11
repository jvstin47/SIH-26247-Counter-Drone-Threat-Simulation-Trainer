import { useEffect, useRef } from 'react';
import { SimulationEngine } from '../simulation/Engine';
import type { EngineSnapshot, ScenarioDNA, TrainingEvent } from '../types';

interface WorldCanvasProps {
  scenario: ScenarioDNA;
  onSnapshot: (snapshot: EngineSnapshot) => void;
  onEvent: (event: TrainingEvent) => void;
  onEngine: (engine: SimulationEngine) => void;
  onError?: (message: string) => void;
}

export function WorldCanvas({ scenario, onSnapshot, onEvent, onEngine, onError }: WorldCanvasProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelled = false;
    let engine: SimulationEngine | undefined;
    void SimulationEngine.create(canvas, scenario)
      .then(created => {
        if (cancelled) { created.dispose(); return; }
        engine = created;
        const unsubscribeSnapshot = created.onSnapshot(onSnapshot);
        const unsubscribeEvent = created.onEvent(onEvent);
        // Keep disposers attached to the created object without a React rerender.
        (created as SimulationEngine & { __disposeSubscriptions?: () => void }).__disposeSubscriptions = () => {
          unsubscribeSnapshot(); unsubscribeEvent();
        };
        onEngine(created);
      })
      .catch(error => onError?.(error instanceof Error ? error.message : String(error)));
    return () => {
      cancelled = true;
      if (engine) {
        (engine as SimulationEngine & { __disposeSubscriptions?: () => void }).__disposeSubscriptions?.();
        engine.dispose();
      }
    };
  }, [scenario, onSnapshot, onEvent, onEngine, onError]);
  return <canvas ref={ref} className="world-canvas" aria-label="Synthetic 3D training simulation world" />;
}
