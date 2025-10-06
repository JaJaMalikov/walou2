export const processSvg = (svgString: string): string => {
    return svgString.replace(/<svg[^>]*>/, match => 
      match.replace(/ width="[^"]*"/, '').replace(/ height="[^"]*"/, '')
    );
  };

export const getSvgDimensions = (svgString: string): { width: number; height: number } => {
    const viewBoxMatch = svgString.match(/viewBox="([^"]*)"/);
    if (viewBoxMatch) {
        const parts = viewBoxMatch[1].split(' ');
        if (parts.length === 4) return { width: parseFloat(parts[2]), height: parseFloat(parts[3]) };
    }
    const widthMatch = svgString.match(/width="([^"]*)"/);
    const heightMatch = svgString.match(/height="([^"]*)"/);
    if (widthMatch && heightMatch && !widthMatch[1].includes('%') && !heightMatch[1].includes('%')) {
        return { width: parseFloat(widthMatch[1]), height: parseFloat(heightMatch[1]) };
    }
    return { width: 200, height: 200 }; // Fallback
};

// Return list of interactive part ids from a pantin SVG content
export const getInteractiveParts = (svgString: string): string[] => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return [];
    const nodes = svg.querySelectorAll('[data-interactive="true"][id]');
    return Array.from(nodes).map(n => (n as Element).getAttribute('id') || '').filter(Boolean);
  } catch {
    return [];
  }
};

export interface SpotlightParams {
  shape?: 'ellipse' | 'cone';
  coneAngle?: number; // degrees
  color: string; // hex
  intensity: number; // 0-100
  softness: number; // 0-100
  offsetX?: number; // -100..100
  offsetY?: number; // -100..100
  range?: number; // 10..200
}

export const generateSpotlightSvg = (w: number, h: number, params: SpotlightParams): string => {
  const { color, intensity, softness } = params;
  const inner = Math.max(0, Math.min(1, intensity / 100));
  const mid = Math.max(0, Math.min(1, 0.4 * inner));
  const sd = 2 + (Math.max(0, Math.min(100, softness)) / 100) * 18; // 2..20
  const id = Math.floor(Math.random() * 1e9);
  const gradId = `spot-grad-${id}`;
  const filterId = `spot-blur-${id}`;
  const shape = params.shape || 'ellipse';
  if (shape === 'cone') {
    const deg = typeof params.coneAngle === 'number' ? params.coneAngle : 45;
    const rad = Math.max(5, Math.min(170, deg)) * Math.PI / 180;
    const offX = (params.offsetX ?? 0) / 100; // -1..1
    const offY = (params.offsetY ?? 0) / 100; // -1..1
    const x0 = w / 2 + offX * (w * 0.4);
    const y0 = Math.max(0, Math.min(h * 0.5, h * 0.25 + offY * (h * 0.25)));
    // Portée: autoriser >100% pour prolonger le faisceau au-delà du cadre
    const sRange = Math.max(0.1, Math.min(3, (params.range ?? 100) / 100)); // 10% .. 300%
    const L = (h - y0) * sRange; // longueur du cône depuis l'apex
    const yb = y0 + L;
    // Base en fonction de l'angle et de la longueur
    const halfBase = Math.min(w * 1.5, Math.tan(rad / 2) * L);
    const x1 = x0 - halfBase;
    const x2 = x0 + halfBase;
    const lgId = `spot-lg-${id}`;
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible; mix-blend-mode: screen;">
        <defs>
          <linearGradient id="${lgId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="${inner}"/>
            <stop offset="70%" stop-color="${color}" stop-opacity="${mid}"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
          </linearGradient>
          <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="${sd}"/>
          </filter>
        </defs>
        <polygon points="${x0},${y0} ${x1},${yb} ${x2},${yb}" fill="url(#${lgId})" filter="url(#${filterId})" />
      </svg>
    `;
  }
  // ellipse
  const cx = 50 + ((params.offsetX ?? 0) * 0.5); // map -100..100 -> 0..100
  const cy = 50 + ((params.offsetY ?? 0) * 0.5);
  const s = Math.max(0.1, Math.min(3, (params.range ?? 100) / 100));
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible; mix-blend-mode: screen;">
      <defs>
        <radialGradient id="${gradId}" cx="${cx}%" cy="${cy}%" r="65%">
          <stop offset="0%" stop-color="${color}" stop-opacity="${inner}"/>
          <stop offset="60%" stop-color="${color}" stop-opacity="${mid}"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </radialGradient>
        <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="${sd}"/>
        </filter>
      </defs>
      <ellipse cx="${w/2}" cy="${h/2}" rx="${(w/2)*s}" ry="${(h/2)*s}" fill="url(#${gradId})" filter="url(#${filterId})" />
    </svg>
  `;
};
