import type { TimelineTrack, SvgOverrides, TimelineState, SvgObject, ArticulationTrack, PositionTrack, RotationTrack, VisibilityTrack } from '../types';

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function findSpan<T extends { frame: number }>(keyframes: T[], frame: number): { prev: T | null; next: T | null } {
  if (keyframes.length === 0) return { prev: null, next: null };
  // Assume keyframes are sorted by frame
  let prev: T | null = null;
  let next: T | null = null;
  for (let i = 0; i < keyframes.length; i++) {
    const k = keyframes[i];
    if (k.frame === frame) {
      return { prev: k, next: k };
    }
    if (k.frame < frame) prev = k;
    if (k.frame > frame) { next = k; break; }
  }
  return { prev, next };
}

function evaluatePosition(track: PositionTrack, frame: number) {
  const { prev, next } = findSpan(track.keyframes, frame);
  if (!prev && !next) return null;
  if (!next) return prev!.value;
  if (!prev) return next.value;
  if (prev === next) return prev.value;
  const interp = next.interpolation ?? 'linear';
  if (interp === 'step') return prev.value;
  const span = next.frame - prev.frame;
  const t = span === 0 ? 0 : (frame - prev.frame) / span;
  return { x: lerp(prev.value.x, next.value.x, t), y: lerp(prev.value.y, next.value.y, t) };
}

function evaluateNumber(track: RotationTrack | ArticulationTrack, frame: number) {
  const { prev, next } = findSpan(track.keyframes, frame);
  if (!prev && !next) return null;
  if (!next) return prev!.value;
  if (!prev) return next.value;
  if (prev === next) return prev.value;
  const interp = next.interpolation ?? 'linear';
  if (interp === 'step') return prev.value;
  const span = next.frame - prev.frame;
  const t = span === 0 ? 0 : (frame - prev.frame) / span;
  return lerp(prev.value, next.value, t);
}

function evaluateVisibility(track: VisibilityTrack, frame: number) {
  const { prev, next } = findSpan(track.keyframes, frame);
  if (!prev && !next) return null;
  if (!next) return prev!.value;
  return prev ? prev.value : next.value;
}

export function computeOverrides(state: Pick<TimelineState, 'currentFrame' | 'tracks'>): SvgOverrides {
  const { currentFrame, tracks } = state;
  const overrides: SvgOverrides = {};

  for (const track of tracks) {
    const targetId = track.objectId;
    if (!overrides[targetId]) overrides[targetId] = {};

    switch (track.property) {
      case 'position': {
        const value = evaluatePosition(track as PositionTrack, currentFrame);
        if (value) {
          overrides[targetId].x = Math.round(value.x);
          overrides[targetId].y = Math.round(value.y);
        }
        break;
      }
      case 'rotation': {
        const value = evaluateNumber(track as RotationTrack, currentFrame);
        if (typeof value === 'number') {
          overrides[targetId].rotation = Math.round(value);
        }
        break;
      }
      case 'visibility': {
        const value = evaluateVisibility(track as VisibilityTrack, currentFrame);
        if (typeof value === 'boolean') {
          overrides[targetId].hidden = !value;
        }
        break;
      }
      case 'articulation': {
        const aTrack = track as ArticulationTrack;
        const value = evaluateNumber(aTrack, currentFrame);
        if (typeof value === 'number') {
          const existing = (overrides[targetId].articulation ?? {}) as SvgObject['articulation'];
          overrides[targetId].articulation = { ...existing, [aTrack.part]: Math.round(value) };
        }
        break;
      }
    }
  }

  return overrides;
}

export function clampFrame(frame: number, min: number, max: number) {
  return Math.max(min, Math.min(max, frame));
}

// Add or update a keyframe for a given track definition
function upsertKeyframe<T extends { frame: number }>(arr: T[], kf: T): T[] {
  const filtered = arr.filter(k => k.frame !== kf.frame);
  filtered.push(kf);
  filtered.sort((a, b) => a.frame - b.frame);
  return filtered;
}

// Returns a new TimelineState with keyframes added for updated properties
export function addKeyframesFromUpdate(
  timeline: TimelineState,
  object: SvgObject,
  newProps: Partial<SvgObject>
): TimelineState {
  const frame = timeline.currentFrame;
  let tracks = [...timeline.tracks];

  const ensureTrack = (objectId: string, property: 'position' | 'rotation' | 'visibility' | 'articulation', part?: string): TimelineTrack => {
    const found = tracks.find(t => t.objectId === objectId && t.property === property && (property !== 'articulation' || (t as any).part === part));
    if (found) return found;
    if (property === 'position') {
      const t: PositionTrack = { id: `trk-${Math.random().toString(36).slice(2, 9)}`, objectId, property: 'position', keyframes: [] };
      tracks.push(t);
      return t;
    }
    if (property === 'rotation') {
      const t: RotationTrack = { id: `trk-${Math.random().toString(36).slice(2, 9)}`, objectId, property: 'rotation', keyframes: [] };
      tracks.push(t);
      return t;
    }
    if (property === 'visibility') {
      const t: VisibilityTrack = { id: `trk-${Math.random().toString(36).slice(2, 9)}`, objectId, property: 'visibility', keyframes: [] };
      tracks.push(t);
      return t;
    }
    const t: ArticulationTrack = { id: `trk-${Math.random().toString(36).slice(2, 9)}`, objectId, property: 'articulation', part: part || 'tete', keyframes: [] };
    tracks.push(t);
    return t;
  };

  // Position
  if (typeof newProps.x === 'number' || typeof newProps.y === 'number') {
    const t = ensureTrack(object.id, 'position') as PositionTrack;
    const x = typeof newProps.x === 'number' ? newProps.x : object.x;
    const y = typeof newProps.y === 'number' ? newProps.y : object.y;
    t.keyframes = upsertKeyframe(t.keyframes, { frame, value: { x, y }, interpolation: 'linear' });
  }

  // Rotation
  if (typeof newProps.rotation === 'number') {
    const t = ensureTrack(object.id, 'rotation') as RotationTrack;
    t.keyframes = upsertKeyframe(t.keyframes, { frame, value: newProps.rotation, interpolation: 'linear' });
  }

  // Visibility
  if (typeof newProps.hidden === 'boolean') {
    const t = ensureTrack(object.id, 'visibility') as VisibilityTrack;
    t.keyframes = upsertKeyframe(t.keyframes, { frame, value: !newProps.hidden, interpolation: 'step' });
  }

  // Articulation (per part)
  if (newProps.articulation) {
    Object.entries(newProps.articulation).forEach(([part, angle]) => {
      if (typeof angle !== 'number') return;
      const t = ensureTrack(object.id, 'articulation', part) as ArticulationTrack;
      t.keyframes = upsertKeyframe(t.keyframes, { frame, value: angle, interpolation: 'linear' });
    });
  }

  return { ...timeline, tracks };
}

export function findAdjacentKeyframe(tracks: TimelineTrack[], current: number, dir: 'prev' | 'next'): number | null {
  const allFrames = new Set<number>();
  tracks.forEach(t => (t as any).keyframes.forEach((kf: any) => allFrames.add(kf.frame)));
  const sorted = Array.from(allFrames).sort((a, b) => a - b);
  if (dir === 'prev') {
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i] < current) return sorted[i];
    }
  } else {
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] > current) return sorted[i];
    }
  }
  return null;
}
