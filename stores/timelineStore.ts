import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { SvgObject, TimelineState, TimelineTrack } from '../types';
import { computeOverrides, clampFrame, addKeyframesFromUpdate } from '../components/timelineUtils';

const DEFAULT_FPS = 24;
const DEFAULT_DURATION = 240; // 10s

type TimelineActions = {
  setPartial: (patch: Partial<TimelineState>) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  clear: () => void;
  scrubTo: (frame: number) => void;
  setTracks: (tracks: TimelineTrack[]) => void;
  deleteKeyframe: (trackId: string, frame: number) => void;
  captureFromUpdate: (object: SvgObject, patch: Partial<SvgObject>) => void;
};

export type TimelineStore = TimelineState & TimelineActions;

export const useTimelineStore = create<TimelineStore>()(
  persist(
    immer<TimelineStore>((set, get) => ({
      fps: DEFAULT_FPS,
      duration: DEFAULT_DURATION,
      currentFrame: 0,
      isPlaying: false,
      loop: true,
      tracks: [],
      autoKeyframe: true,

      setPartial: (patch) => set((s) => Object.assign(s, patch)),
      play: () => set((s) => { s.isPlaying = true; }),
      pause: () => set((s) => { s.isPlaying = false; }),
      stop: () => set((s) => { s.isPlaying = false; s.currentFrame = 0; }),
      clear: () => set((s) => { s.isPlaying = false; s.currentFrame = 0; s.tracks = []; }),
      scrubTo: (frame) => set((s) => { s.currentFrame = clampFrame(Math.round(frame), 0, s.duration); }),
      setTracks: (tracks) => set((s) => { s.tracks = tracks; }),
      deleteKeyframe: (trackId, frame) => set((s) => {
        s.tracks = s.tracks.map(t => (t.id === trackId ? { ...t, keyframes: (t as any).keyframes.filter((k: any) => k.frame !== frame) } : t));
      }),
      captureFromUpdate: (object, patch) => set((s) => {
        if (!s.autoKeyframe || s.isPlaying) return;
        const updated = addKeyframesFromUpdate({ ...s }, object, patch);
        s.tracks = updated.tracks;
      }),
    })),
    {
      name: 'timelineState',
      // Don’t persist volatile play state
      partialize: (s) => {
        const { isPlaying, ...rest } = s;
        return rest as any;
      },
    }
  )
);

// Derived selector for Canvas overrides
export const selectOverrides = (s: TimelineState) => computeOverrides({ currentFrame: s.currentFrame, tracks: s.tracks });

