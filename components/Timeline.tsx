import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SvgObject, TimelineState, TimelineTrack, TimelineProperty, SvgOverrides } from '../types';
import { ARTICULABLE_PARTS } from '../types';
import { clampFrame, computeOverrides } from './timelineUtils';

type TimelineProps = {
  svgObjects: SvgObject[];
  selectedObject: SvgObject | null;
  value: TimelineState;
  onChange: (next: TimelineState) => void;
  onComputedOverrides: (overrides: SvgOverrides) => void;
};

const DEFAULT_FPS = 24;
const DEFAULT_DURATION = 240; // 10s by default

export function makeEmptyTimeline(): TimelineState {
  return {
    fps: DEFAULT_FPS,
    duration: DEFAULT_DURATION,
    currentFrame: 0,
    isPlaying: false,
    loop: true,
    tracks: [],
    autoKeyframe: true,
  };
}

function uid(prefix = 'trk'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export const Timeline: React.FC<TimelineProps> = ({ svgObjects, selectedObject, value, onChange, onComputedOverrides }) => {
  const { fps, duration, currentFrame, isPlaying, loop, tracks } = value;
  const [zoom, setZoom] = useState<number>(1); // horizontal zoom factor
  const pxPerFrame = 6 * zoom; // base scale
  const contentWidth = Math.max(600, Math.ceil((duration + 1) * pxPerFrame));
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const effectiveOverrides = useMemo(() => computeOverrides({ currentFrame, tracks }), [currentFrame, tracks]);
  useEffect(() => { onComputedOverrides(effectiveOverrides); }, [effectiveOverrides, onComputedOverrides]);

  const setPartial = (patch: Partial<TimelineState>) => onChange({ ...value, ...patch });

  const play = () => {
    if (isPlaying) return;
    setPartial({ isPlaying: true });
  };
  const pause = () => setPartial({ isPlaying: false });
  const stop = () => setPartial({ isPlaying: false, currentFrame: 0 });

  const clearTimeline = () => {
    const yes = window.confirm('Purger la timeline ?\nToutes les pistes et keyframes seront supprimées.');
    if (!yes) return;
    onChange({
      ...value,
      isPlaying: false,
      currentFrame: 0,
      tracks: [],
    });
  };

  const tick = useCallback((now: number) => {
    if (!value.isPlaying) return;
    if (!lastTickRef.current) lastTickRef.current = now;
    const deltaMs = now - lastTickRef.current;
    const framesToAdvance = Math.floor(deltaMs / (1000 / fps));
    if (framesToAdvance > 0) {
      lastTickRef.current = now;
      const next = currentFrame + framesToAdvance;
      if (next >= duration) {
        if (loop) {
          onChange({ ...value, currentFrame: next % duration, isPlaying: true });
        } else {
          onChange({ ...value, currentFrame: duration, isPlaying: false });
        }
      } else {
        onChange({ ...value, currentFrame: next });
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [value, onChange, fps, currentFrame, duration, loop]);

  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tick);
      return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTickRef.current = 0;
    }
  }, [isPlaying, tick]);

  const addKeyframe = (property: TimelineProperty, part?: string) => {
    if (!selectedObject) return;
    const objectId = selectedObject.id;
    const at = currentFrame;

    const ensureTrack = (): TimelineTrack => {
      const existing = tracks.find(t => t.objectId === objectId && t.property === property && (property !== 'articulation' || (t as any).part === part));
      if (existing) return existing;
      if (property === 'position') return { id: uid(), objectId, property: 'position', keyframes: [] } as TimelineTrack;
      if (property === 'rotation') return { id: uid(), objectId, property: 'rotation', keyframes: [] } as TimelineTrack;
      if (property === 'visibility') return { id: uid(), objectId, property: 'visibility', keyframes: [] } as TimelineTrack;
      return { id: uid(), objectId, property: 'articulation', part: part || ARTICULABLE_PARTS[0], keyframes: [] } as TimelineTrack;
    };

    const nextTracks = [...tracks];
    let track = ensureTrack();
    if (!tracks.includes(track)) {
      nextTracks.push(track);
    }

    // Remove any existing keyframe at the same frame for this track
    const removeAtSame = (arr: any[]) => arr.filter(k => k.frame !== at);

    if (property === 'position') {
      const pos = { x: selectedObject.x, y: selectedObject.y };
      const t = nextTracks.find(t => t === track) as any;
      t.keyframes = removeAtSame(t.keyframes);
      t.keyframes.push({ frame: at, value: pos, interpolation: 'linear' });
      t.keyframes.sort((a: any, b: any) => a.frame - b.frame);
    } else if (property === 'rotation') {
      const rot = selectedObject.rotation ?? 0;
      const t = nextTracks.find(t => t === track) as any;
      t.keyframes = removeAtSame(t.keyframes);
      t.keyframes.push({ frame: at, value: rot, interpolation: 'linear' });
      t.keyframes.sort((a: any, b: any) => a.frame - b.frame);
    } else if (property === 'visibility') {
      const vis = !(selectedObject.hidden ?? false);
      const t = nextTracks.find(t => t === track) as any;
      t.keyframes = removeAtSame(t.keyframes);
      t.keyframes.push({ frame: at, value: vis, interpolation: 'step' });
      t.keyframes.sort((a: any, b: any) => a.frame - b.frame);
    } else if (property === 'articulation') {
      const angle = selectedObject.articulation?.[part || ARTICULABLE_PARTS[0]] ?? 0;
      const t = nextTracks.find(t => t === track) as any;
      t.keyframes = removeAtSame(t.keyframes);
      t.keyframes.push({ frame: at, value: angle, interpolation: 'linear' });
      t.keyframes.sort((a: any, b: any) => a.frame - b.frame);
    }

    onChange({ ...value, tracks: nextTracks });
  };

  const deleteKeyframe = (trackId: string, frame: number) => {
    const nextTracks = value.tracks.map(t => (t.id === trackId ? { ...t, keyframes: (t as any).keyframes.filter((k: any) => k.frame !== frame) } : t));
    onChange({ ...value, tracks: nextTracks });
  };

  const scrubTo = (f: number) => setPartial({ currentFrame: clampFrame(Math.round(f), 0, duration) });

  const [kfProp, setKfProp] = useState<TimelineProperty>('position');
  const [kfPart, setKfPart] = useState<string>(ARTICULABLE_PARTS[0]);

  const laneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const f = Math.round(x / pxPerFrame);
    scrubTo(f);
  };

  return (
    <div className="timeline-shell">
      <div className="timeline-toolbar">
        <button onClick={isPlaying ? pause : play}>{isPlaying ? 'Pause' : 'Play'}</button>
        <button onClick={stop}>Stop</button>
        <button onClick={clearTimeline} title="Supprimer toutes les pistes et keyframes">Purger</button>
        <div className="spacer" />
        <div className="timeline-toolbar-field">
          <span>Frame</span>
          <input type="number" value={currentFrame} min={0} max={duration} onChange={e => scrubTo(Number(e.target.value))} />
        </div>
        <div className="timeline-toolbar-field">
          <span>FPS</span>
          <input type="number" value={fps} min={1} max={120} onChange={e => setPartial({ fps: Math.max(1, Math.min(120, Number(e.target.value))) })} />
        </div>
        <div className="timeline-toolbar-field">
          <span>Durée</span>
          <input type="number" value={duration} min={1} max={3600} onChange={e => setPartial({ duration: Math.max(1, Math.min(3600, Number(e.target.value))) })} />
        </div>
        <div className="timeline-toolbar-check">
          <label><input type="checkbox" checked={loop} onChange={e => setPartial({ loop: e.target.checked })} /> Loop</label>
        </div>
        <div className="timeline-toolbar-check">
          <label><input type="checkbox" checked={!!value.autoKeyframe} onChange={e => setPartial({ autoKeyframe: e.target.checked })} /> Auto‑KF</label>
        </div>
        <div className="timeline-toolbar-field">
          <span>Zoom</span>
          <input type="range" min={0.5} max={4} step={0.25} value={zoom} onChange={e => setZoom(Number(e.target.value))} />
        </div>
      </div>

      <div className="timeline-keyframe-adder">
        <span>Keyframe for:</span>
        <select value={kfProp} onChange={e => setKfProp(e.target.value as TimelineProperty)}>
          <option value="position">Position</option>
          <option value="rotation">Rotation</option>
          <option value="visibility">Visibilité</option>
          <option value="articulation">Articulation</option>
        </select>
        {kfProp === 'articulation' && (
          <select value={kfPart} onChange={e => setKfPart(e.target.value)}>
            {ARTICULABLE_PARTS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}
        <button disabled={!selectedObject} onClick={() => addKeyframe(kfProp, kfPart)}>Add keyframe (obj sélectionné)</button>
      </div>
      <div className="timeline-body">
        <div className="timeline-header-row">
          <div className="timeline-col-label">Piste</div>
          <div className="timeline-col-lanes">
            <div className="timeline-ruler" style={{ width: contentWidth }} onClick={laneClick}>
              {Array.from({ length: Math.ceil((duration + 1) / (fps)) + 1 }).map((_, i) => {
                const frame = i * fps;
                const left = frame * pxPerFrame;
                const sec = i;
                return (
                  <div key={i} className="tick" style={{ left }} title={`t=${sec}s (f=${frame})`}>
                    <span>{sec}s</span>
                  </div>
                );
              })}
              <div className="playhead" style={{ left: currentFrame * pxPerFrame }} />
            </div>
          </div>
        </div>
        <div className="timeline-rows">
          {tracks.length === 0 && (
            <div className="timeline-empty">Aucune piste. Sélectionnez un objet et ajoutez un keyframe.</div>
          )}
          {tracks.map(track => {
            const object = svgObjects.find(o => o.id === track.objectId);
            const label = `${object?.name || object?.id || 'Objet'} • ${track.property}${(track as any).part ? `:${(track as any).part}` : ''}`;
            const keyframes = (track as any).keyframes as { frame: number }[];
            return (
              <div key={track.id} className="timeline-track-row">
                <div className="timeline-col-label" title={label}>{label}</div>
                <div className="timeline-col-lanes">
                  <div className="lane" style={{ width: contentWidth }} onClick={laneClick}>
                    {keyframes.map(kf => (
                      <div key={kf.frame} className="kf" style={{ left: kf.frame * pxPerFrame }} title={`f=${kf.frame}`} onClick={(e) => { e.stopPropagation(); scrubTo(kf.frame); }} onDoubleClick={(e) => { e.stopPropagation(); deleteKeyframe(track.id, kf.frame); }} />
                    ))}
                    <div className="playhead" style={{ left: currentFrame * pxPerFrame }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
