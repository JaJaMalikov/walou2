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