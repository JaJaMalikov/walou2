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

export const ARTICULABLE_PARTS = [
    'tete', 'haut_bras_droite', 'avant_bras_droite', 'main_droite',
    'haut_bras_gauche', 'avant_bras_gauche', 'main_gauche',
    'cuisse_droite', 'tibia_droite', 'pied_droite',
    'cuisse_gauche', 'tibia_gauche', 'pied_gauche',
];


export type CanvasRef = {
  spawnAndAddObject: (svgContent: string, category: AssetCategory) => void;
  setBackground: (imageUrl: string) => void;
  fitView: () => void;
  calculateAndSetAttachment: (childId: string, parentId: string, limbId: string) => void;
  calculateAndDetachObject: (childId: string) => void;
  hasBackground: () => boolean;
  addSpotlight: () => void;
};
