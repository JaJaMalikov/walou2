import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { SvgObject } from '../types';

type EditorActions = {
  addObject: (obj: SvgObject) => void;
  updateObject: (id: string, patch: Partial<SvgObject>) => void;
  deleteObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  reset: () => void;
};

type EditorState = {
  svgObjects: SvgObject[];
  selectedObjectId: string | null;
} & EditorActions;

export const useEditorStore = create<EditorState>()(
  persist(
    immer<EditorState>((set, get) => ({
      svgObjects: [],
      selectedObjectId: null,

      addObject: (obj) => set((s) => { s.svgObjects.push(obj); }),
      updateObject: (id, patch) => set((s) => {
        const o = s.svgObjects.find(o => o.id === id);
        if (!o) return;
        Object.assign(o, patch);
        if (patch.articulation && o.articulation) {
          o.articulation = { ...o.articulation, ...patch.articulation };
        }
      }),
      deleteObject: (id) => set((s) => {
        s.svgObjects = s.svgObjects.filter(o => o.id !== id);
        if (s.selectedObjectId === id) s.selectedObjectId = null;
      }),
      selectObject: (id) => set((s) => { s.selectedObjectId = id; }),
      reset: () => set((s) => { s.svgObjects = []; s.selectedObjectId = null; }),
    })),
    { name: 'canvasState' }
  )
);

