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
  articulation?: { [key: string]: number }; // e.g. { tete: -15, bras_gauche: 20 }
  flipped?: boolean;
  rotation?: number; // degrees, for generic objects
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
};
