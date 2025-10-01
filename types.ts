
export type Axis = 'x' | 'y';
export type Direction = 'up' | 'down' | 'left' | 'right';

export type AssetCategory = 'pantins' | 'objets' | 'decors';

export interface Asset {
  name: string;
  path: string;
  category: AssetCategory;
  content?: string;
}

export type CanvasRef = {
  addObject: (svgContent: string) => void;
};