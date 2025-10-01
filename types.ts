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
}


export type CanvasRef = {
  addObject: (svgContent: string) => void;
  setBackground: (imageUrl: string) => void;
  fitView: () => void;
  updateObject: (id: string, newProps: Partial<SvgObject>) => void;
};