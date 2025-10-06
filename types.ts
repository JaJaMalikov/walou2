export type Axis = 'x' | 'y';
export type Direction = 'up' | 'down' | 'left' | 'right';

export type AssetCategory = 'pantins' | 'objets' | 'decors';

export interface Asset {
  name: string;
  path: string;
  category: AssetCategory;
  content?: string; // For SVGs
}

export interface SvgObject {
  id: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  category: AssetCategory;
  name?: string;
  zIndex?: number;
  locked?: boolean;
  hidden?: boolean;
  articulation?: { [key: string]: number }; // e.g. { tete: -15, bras_gauche: 20 }
  flipped?: boolean;
  rotation?: number; // degrees, for generic objects
  spotlight?: {
    shape?: 'ellipse' | 'cone';
    coneAngle?: number; // degrees for cone opening
    color: string; // hex color
    intensity: number; // 0-100
    softness: number; // 0-100
    offsetX?: number; // -100..100 (% of width)
    offsetY?: number; // -100..100 (% of height)
    range?: number; // 10..200 (%) portée
  };
  attachmentInfo?: {
    parentId: string;
    limbId: string;
    transform: string; // To store the relative CSS transform matrix
  };
}

// Static articulation list removed; use data-* from SVGs to discover parts dynamically.


export type CanvasRef = {
  spawnAndAddObject: (svgContent: string, category: AssetCategory) => void;
  setBackground: (imageUrl: string) => void;
  fitView: () => void;
  calculateAndSetAttachment: (childId: string, parentId: string, limbId: string) => void;
  calculateAndDetachObject: (childId: string) => void;
  hasBackground: () => boolean;
  addSpotlight: () => void;
};

// Timeline types
export type TimelineInterpolation = 'linear' | 'step';

export type TimelineProperty = 'position' | 'rotation' | 'visibility' | 'articulation';

export interface TimelineKeyframe<T> {
  frame: number;
  value: T;
  interpolation?: TimelineInterpolation;
}

export interface TimelineTrackBase {
  id: string; // unique track id
  objectId: string; // target object id
  property: TimelineProperty;
}

export interface PositionTrack extends TimelineTrackBase {
  property: 'position';
  keyframes: TimelineKeyframe<{ x: number; y: number }>[];
}

export interface RotationTrack extends TimelineTrackBase {
  property: 'rotation';
  keyframes: TimelineKeyframe<number>[];
}

export interface VisibilityTrack extends TimelineTrackBase {
  property: 'visibility';
  keyframes: TimelineKeyframe<boolean>[];
}

export interface ArticulationTrack extends TimelineTrackBase {
  property: 'articulation';
  part: string; // articulable part id
  keyframes: TimelineKeyframe<number>[]; // angle in degrees
}

export type TimelineTrack = PositionTrack | RotationTrack | VisibilityTrack | ArticulationTrack;

export interface TimelineState {
  fps: number; // frames per second
  duration: number; // total frames
  currentFrame: number;
  isPlaying: boolean;
  loop: boolean;
  tracks: TimelineTrack[];
  autoKeyframe?: boolean;
}

export type SvgOverrides = Record<string, Partial<SvgObject>>;
