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
}


export type CanvasRef = {
  addObject: (svgContent: string, category: AssetCategory) => void;
  setBackground: (imageUrl: string) => void;
  fitView: () => void;
  updateObject: (id: string, newProps: Partial<SvgObject>) => void;
};
