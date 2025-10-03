import React, { useMemo, useState } from 'react';
import { Rnd } from 'react-rnd';
import type { SvgObject } from '../types';
import { generateSpotlightSvg } from './utils';
import { processSvg } from './utils';

interface PanelState {
  x: number;
  y: number;
  width: number | string;
  height: number | string;
}

interface EffectsPanelProps {
  open: boolean;
  panelState: PanelState;
  onPanelChange: (updates: Partial<PanelState>) => void;
  svgObjects: SvgObject[];
  onUpdateObject: (id: string, newProps: Partial<SvgObject>) => void;
  onDeleteObject: (id: string) => void;
  onAddSpotlight: () => void;
  onClose: () => void;
}

export const EffectsPanel: React.FC<EffectsPanelProps> = ({ open, panelState, onPanelChange, svgObjects, onUpdateObject, onDeleteObject, onAddSpotlight, onClose }) => {
  const spots = useMemo(() => svgObjects.filter(o => !!o.spotlight), [svgObjects]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = useMemo(() => spots.find(s => s.id === activeId) || spots[0] || null, [spots, activeId]);

  if (!open) return null;

  const updateSpot = (patch: Partial<SvgObject['spotlight']>) => {
    if (!active) return;
    const prev = active.spotlight || {} as NonNullable<SvgObject['spotlight']>;
    const next = { ...prev, ...patch } as NonNullable<SvgObject['spotlight']>;
    // Avoid redundant updates that can create render loops
    try {
      if (JSON.stringify(prev) === JSON.stringify(next)) return;
    } catch {}
    const svg = generateSpotlightSvg(active.width, active.height, next as any);
    onUpdateObject(active.id, { spotlight: next, content: processSvg(svg) });
  };

  return (
    <Rnd
      size={{ width: panelState.width, height: panelState.height }}
      position={{ x: panelState.x, y: panelState.y }}
      onDragStop={(_, d) => onPanelChange({ x: d.x, y: d.y })}
      onResizeStop={(_, __, ref, ___, position) => onPanelChange({ width: ref.style.width, height: ref.style.height, ...position })}
      minWidth={280}
      minHeight={220}
      bounds="window"
      style={{ position: 'fixed', zIndex: 220 }}
      dragHandleClassName="effects-panel-header"
      className="floating-menu-rnd effects-panel"
    >
      <div className="floating-menu-content" style={{ padding: 8, gap: 8, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="effects-panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'move' }}>
          <strong>Spots</strong>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="menu-button" onClick={onAddSpotlight} title="Ajouter un spot">+</button>
            <button className="menu-button" onClick={onClose} title="Fermer">×</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, minHeight: 0, flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minHeight: 0, overflowY: 'auto' }}>
            {spots.length === 0 && (
              <div className="asset-placeholder" style={{ padding: 8 }}>Aucun spot</div>
            )}
            {spots.map(s => (
              <button key={s.id} className="menu-button" style={{ justifyContent: 'space-between', background: (active?.id===s.id)?'rgba(75,85,99,0.6)':'transparent' }} onClick={() => setActiveId(s.id)} title={s.name ?? s.id}>
                <span style={{ textOverflow:'ellipsis', overflow:'hidden' }}>{s.name ?? s.id}</span>
                <span style={{ opacity: .8 }}>{Math.round(s.spotlight?.intensity ?? 0)}%</span>
              </button>
            ))}
          </div>
          {/* Controls */}
          <div style={{ display:'flex', flexDirection:'column', gap:6, minHeight: 0, overflowY: 'auto' }}>
            {!active && <div className="asset-placeholder" style={{ padding: 8 }}>Sélectionnez un spot</div>}
            {active && (
              <>
                <div className="inspector-input-wrapper">
                  <label style={{ width: 64 }}>Forme</label>
                  <select className="inspector-input" style={{ textAlign: 'left' }} value={active.spotlight?.shape || 'ellipse'} onChange={e=>updateSpot({ shape: e.target.value as any })}>
                    <option value="ellipse">Ellipse</option>
                    <option value="cone">Cône</option>
                  </select>
                </div>
                { (active.spotlight?.shape || 'ellipse') === 'cone' && (
                  <div className="inspector-input-wrapper">
                    <label style={{ width: 64 }}>Ouvert.</label>
                    <input className="inspector-input" type="number" value={active.spotlight?.coneAngle ?? 45} onChange={e=>updateSpot({ coneAngle: Math.max(5, Math.min(170, parseInt(e.target.value,10)||45)) })} />
                  </div>
                )}
                <div className="inspector-input-wrapper">
                  <label style={{ width: 64 }}>Couleur</label>
                  <input className="inspector-input" type="color" style={{ padding:0, height:32 }} value={active.spotlight?.color || '#ffffff'} onChange={e=>updateSpot({ color: e.target.value })} />
                </div>
                <div className="inspector-input-wrapper">
                  <label style={{ width: 64 }}>Intens.</label>
                  <input className="inspector-input" type="number" value={active.spotlight?.intensity ?? 80} onChange={e=>updateSpot({ intensity: Math.max(0, Math.min(100, parseInt(e.target.value,10)||0)) })} />
                </div>
                <div className="inspector-input-wrapper">
                  <label style={{ width: 64 }}>Douceur</label>
                  <input className="inspector-input" type="number" value={active.spotlight?.softness ?? 60} onChange={e=>updateSpot({ softness: Math.max(0, Math.min(100, parseInt(e.target.value,10)||0)) })} />
                </div>
                <div className="inspector-input-wrapper">
                  <label style={{ width: 64 }}>Portée</label>
                  <input className="inspector-input" type="number" value={active.spotlight?.range ?? 100} onChange={e=>updateSpot({ range: Math.max(10, Math.min(200, parseInt(e.target.value,10)||100)) })} />
                </div>
                <div className="inspector-input-wrapper">
                  <label style={{ width: 64 }}>Décal.X</label>
                  <input className="inspector-input" type="number" value={active.spotlight?.offsetX ?? 0} onChange={e=>updateSpot({ offsetX: Math.max(-100, Math.min(100, parseInt(e.target.value,10)||0)) })} />
                </div>
                <div className="inspector-input-wrapper">
                  <label style={{ width: 64 }}>Décal.Y</label>
                  <input className="inspector-input" type="number" value={active.spotlight?.offsetY ?? 0} onChange={e=>updateSpot({ offsetY: Math.max(-100, Math.min(100, parseInt(e.target.value,10)||0)) })} />
                </div>
                <div style={{ display:'flex', gap:6, marginTop:4 }}>
                  <button className="menu-button" onClick={()=>onAddSpotlight()}>Dupliquer</button>
                  <button className="menu-button delete-button" onClick={()=>active && onDeleteObject(active.id)}>Supprimer</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Rnd>
  );
};
