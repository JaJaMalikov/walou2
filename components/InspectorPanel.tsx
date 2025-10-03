import React, { useMemo, useEffect, useState } from 'react';
import type { SvgObject } from '../types';
import { ARTICULABLE_PARTS } from '../types';
import { ChevronsRightLeftIcon, SlidersIcon, RotateCwIcon, EyeIcon } from './icons';
import { getSvgDimensions } from './utils';

interface InspectorPanelProps {
  selectedObject: SvgObject | null;
  svgObjects: SvgObject[];
  onUpdateObject: (id: string, newProps: Partial<SvgObject>) => void;
  onDetachObject: (childId: string) => void;
  compact?: boolean;
}


const MIRROR_MAP: { [key: string]: string } = {
    'haut_bras_droite': 'haut_bras_gauche', 'haut_bras_gauche': 'haut_bras_droite',
    'avant_bras_droite': 'avant_bras_gauche', 'avant_bras_gauche': 'avant_bras_droite',
    'main_droite': 'main_gauche', 'main_gauche': 'main_droite',
    'cuisse_droite': 'cuisse_gauche', 'cuisse_gauche': 'cuisse_droite',
    'tibia_droite': 'tibia_gauche', 'tibia_gauche': 'tibia_droite',
    'pied_droite': 'pied_gauche', 'pied_gauche': 'pied_droite',
};


const PropertyInput: React.FC<{
  label: string;
  name: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (v: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  layout?: 'inline' | 'stacked';
}> = ({ label, name, value, onChange, onValueChange, disabled, min, max, step = 1, layout = 'inline' }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!onValueChange) return;
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const delta = (e.shiftKey ? 10 : 1) * step * (e.key === 'ArrowUp' ? 1 : -1);
    let next = (Number.isFinite(value) ? value : 0) + delta;
    if (typeof min === 'number') next = Math.max(min, next);
    if (typeof max === 'number') next = Math.min(max, next);
    onValueChange(Math.round(next));
  };
  return (
    <div className={`inspector-input-wrapper ${layout === 'stacked' ? 'stacked' : ''}`}>
      <label htmlFor={name}>{label}</label>
      <input
        type="number"
        id={name}
        name={name}
        value={Math.round(value)}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        className="inspector-input"
        disabled={disabled}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
};

const ArticulationInput: React.FC<{ partName: string; value: number; onChange: (angle: number) => void;}> = ({ partName, value, onChange }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const delta = (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? 1 : -1);
    let next = (Number.isFinite(value) ? value : 0) + delta;
    next = Math.max(-180, Math.min(180, next));
    onChange(Math.round(next));
  };
  return (
    <div className="articulation-row">
      <label htmlFor={`rot-${partName}`} title={partName}>
        {partName.replace(/_/g, ' ')}
      </label>
      <input
        type="number"
        id={`rot-${partName}`}
        name={`rot-${partName}`}
        min={-180}
        max={180}
        value={Math.round(value)}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          const clamped = isNaN(n) ? 0 : Math.max(-180, Math.min(180, n));
          onChange(clamped);
        }}
        onKeyDown={handleKeyDown}
        className="inspector-input"
      />
    </div>
  );
};


type TabKey = 'general' | 'articulation' | 'affichage';

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ selectedObject, svgObjects, onUpdateObject, onDetachObject, compact = false }) => {
  
  const attachedChildren = selectedObject ? svgObjects.filter(obj => obj.attachmentInfo?.parentId === selectedObject.id) : [];
  const isAttached = !!selectedObject?.attachmentInfo;
  const baseDims = useMemo(() => {
    if (!selectedObject) return { width: 0, height: 0 };
    return getSvgDimensions(selectedObject.content);
  }, [selectedObject]);
  const scalePercent = useMemo(() => {
    if (!selectedObject || baseDims.width === 0) return 100;
    return Math.round((selectedObject.width / baseDims.width) * 100);
  }, [selectedObject, baseDims]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedObject) return;
    const { name, value } = e.target;
    let numericValue = parseFloat(value) || 0;
    if (name === 'rotation') {
      // Clamp rotation to [-180, 180]
      if (numericValue > 180) numericValue = 180;
      if (numericValue < -180) numericValue = -180;
    }
    onUpdateObject(selectedObject.id, { [name]: numericValue });
  };

  const handleArticulationChange = (partName: string, angle: number) => {
    if (!selectedObject) return;
    const current = selectedObject.articulation || {};
    onUpdateObject(selectedObject.id, {
        articulation: { ...current, [partName]: angle }
    });
  };

  const handleFlip = () => {
    if (!selectedObject) return;
    onUpdateObject(selectedObject.id, { flipped: !selectedObject.flipped });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedObject) return;
    onUpdateObject(selectedObject.id, { name: e.target.value });
  };

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedObject) return;
    const raw = parseFloat(e.target.value);
    const percent = isNaN(raw) ? 100 : raw;
    if (baseDims.width <= 0 || baseDims.height <= 0) return;
    const ratio = percent / 100;
    const newWidth = Math.max(1, Math.round(baseDims.width * ratio));
    const newHeight = Math.max(1, Math.round(baseDims.height * ratio));
    onUpdateObject(selectedObject.id, { width: newWidth, height: newHeight });
  };

  const resetAllArticulation = () => {
    if (!selectedObject) return;
    onUpdateObject(selectedObject.id, { articulation: {} });
  };

  const mirrorArticulation = () => {
    if (!selectedObject) return;
    const current = selectedObject.articulation || {};
    const next: { [k: string]: number } = {};
    // First copy non-mirrored parts as-is
    ARTICULABLE_PARTS.forEach((p) => {
      if (!MIRROR_MAP[p]) {
        if (current[p] !== undefined) next[p] = current[p]!;
      }
    });
    // Then handle mirrored pairs once (start from *_gauche)
    ARTICULABLE_PARTS.forEach((left) => {
      if (!/_gauche$/.test(left)) return;
      const right = MIRROR_MAP[left];
      if (!right) return;
      const leftVal = current[left] ?? 0;
      const rightVal = current[right] ?? 0;
      next[left] = -rightVal;
      next[right] = -leftVal;
    });
    onUpdateObject(selectedObject.id, { articulation: next });
  };

  const copyLeftToRight = () => {
    if (!selectedObject) return;
    const current = selectedObject.articulation || {};
    const next = { ...(current as any) } as { [k: string]: number };
    ARTICULABLE_PARTS.forEach((left) => {
      if (!/_gauche$/.test(left)) return;
      const right = MIRROR_MAP[left];
      if (!right) return;
      const leftVal = current[left] ?? 0;
      next[right] = -leftVal;
    });
    onUpdateObject(selectedObject.id, { articulation: next });
  };

  const copyRightToLeft = () => {
    if (!selectedObject) return;
    const current = selectedObject.articulation || {};
    const next = { ...(current as any) } as { [k: string]: number };
    ARTICULABLE_PARTS.forEach((right) => {
      if (!/_droite$/.test(right)) return;
      const left = MIRROR_MAP[right];
      if (!left) return;
      const rightVal = current[right] ?? 0;
      next[left] = -rightVal;
    });
    onUpdateObject(selectedObject.id, { articulation: next });
  };

  // Articulation listview state
  const [selectedPart, setSelectedPart] = useState<string>('tete');
  useEffect(() => {
    // Ensure selectedPart exists among articulables
    if (!ARTICULABLE_PARTS.includes(selectedPart)) setSelectedPart(ARTICULABLE_PARTS[0] || '');
  }, [selectedPart]);

  // Tabs
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  useEffect(() => {
    // If current selection cannot show articulation, ensure a valid tab
    if (activeTab === 'articulation' && selectedObject?.category !== 'pantins') {
      setActiveTab('general');
    }
  }, [activeTab, selectedObject?.category]);

  const zeroLeft = () => {
    if (!selectedObject) return;
    const current = selectedObject.articulation || {};
    const next = { ...(current as any) } as { [k: string]: number };
    ARTICULABLE_PARTS.forEach((left) => {
      if (/_gauche$/.test(left)) {
        next[left] = 0;
      }
    });
    onUpdateObject(selectedObject.id, { articulation: next });
  };

  const zeroRight = () => {
    if (!selectedObject) return;
    const current = selectedObject.articulation || {};
    const next = { ...(current as any) } as { [k: string]: number };
    ARTICULABLE_PARTS.forEach((right) => {
      if (/_droite$/.test(right)) {
        next[right] = 0;
      }
    });
    onUpdateObject(selectedObject.id, { articulation: next });
  };
  
  if (!selectedObject) {
    return (
      <div className="inspector-placeholder">
        <p>Aucun objet sélectionné</p>
      </div>
    );
  }

  return (
    <div className={`inspector-panel ${compact ? 'compact' : ''}`}>
      <h2>Inspecteur</h2>
      {selectedObject && (
        <div className="inspector-tabs">
          <button
            className={`inspector-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
            title="Général"
          >
            <SlidersIcon width={16} height={16} />
          </button>
          {selectedObject.category === 'pantins' && (
            <button
              className={`inspector-tab ${activeTab === 'articulation' ? 'active' : ''}`}
              onClick={() => setActiveTab('articulation')}
              title="Articulation"
            >
              <RotateCwIcon width={16} height={16} />
            </button>
          )}
          <button
            className={`inspector-tab ${activeTab === 'affichage' ? 'active' : ''}`}
            onClick={() => setActiveTab('affichage')}
            title="Affichage"
          >
            <EyeIcon width={16} height={16} />
          </button>
        </div>
      )}
      <div className="space-y-4">
        {activeTab === 'general' && (
        <div className="inspector-section">
          <label className="inspector-label" htmlFor="obj-name">Nom</label>
          <input
            id="obj-name"
            type="text"
            className="inspector-input"
            value={selectedObject.name ?? ''}
            onChange={handleNameChange}
            placeholder={selectedObject.id}
          />
        </div>
        )}

        {activeTab === 'general' && (
        <div className="inspector-section">
            <label className="inspector-label">ID de l'objet</label>
            <div className="inspector-id-display">
                {selectedObject.id}
            </div>
        </div>
        )}

        {activeTab === 'general' && (
        <div className="inspector-section">
          <div className="inspector-label-header">
            <label className="inspector-label">Transformation</label>
            <button title="Retourner horizontalement" className="menu-button" onClick={handleFlip} disabled={isAttached}>
              <ChevronsRightLeftIcon />
            </button>
          </div>
          <div className="inspector-group">
             {isAttached && selectedObject.attachmentInfo ? (
               <div className="inspector-note" style={{ fontSize: 12, color: '#666' }}>
                 Position relative au parent — modifications désactivées.
                 <br />
                 Attaché à: {selectedObject.attachmentInfo.parentId} / {selectedObject.attachmentInfo.limbId}
               </div>
             ) : (
               <>
                 <div className={`inspector-row ${compact ? 'one-col' : ''}`}>
                   <PropertyInput
                     label="X"
                     name="x"
                     value={selectedObject.x}
                     onChange={handleChange}
                     onValueChange={(v) => onUpdateObject(selectedObject.id, { x: v })}
                      disabled={isAttached}
                      layout={compact ? 'stacked' : 'inline'}
                   />
                    <PropertyInput
                      label="Y"
                      name="y"
                      value={selectedObject.y}
                      onChange={handleChange}
                      onValueChange={(v) => onUpdateObject(selectedObject.id, { y: v })}
                      disabled={isAttached}
                      layout={compact ? 'stacked' : 'inline'}
                    />
                 </div>
                 <div className="inspector-row one-col">
                   <PropertyInput
                     label="Échelle (%)"
                     name="scale"
                     value={scalePercent}
                     onChange={handleScaleChange}
                     onValueChange={(percent) => {
                       if (!selectedObject) return;
                       if (baseDims.width <= 0 || baseDims.height <= 0) return;
                       const ratio = (isNaN(percent) ? 100 : percent) / 100;
                       const newWidth = Math.max(1, Math.round(baseDims.width * ratio));
                       const newHeight = Math.max(1, Math.round(baseDims.height * ratio));
                       onUpdateObject(selectedObject.id, { width: newWidth, height: newHeight });
                     }}
                     min={1}
                     max={1000}
                     step={1}
                     disabled={isAttached}
                     layout="stacked"
                   />
                 </div>
                  {selectedObject.category !== 'pantins' && (
                    <div className="inspector-row one-col">
                     <PropertyInput
                       label="Rotation (°)"
                       name="rotation"
                       value={selectedObject.rotation ?? 0}
                       onChange={handleChange}
                       onValueChange={(v) => {
                         let n = v;
                         if (n > 180) n = 180;
                         if (n < -180) n = -180;
                         onUpdateObject(selectedObject.id, { rotation: n });
                       }}
                       min={-180}
                       max={180}
                       step={1}
                       disabled={isAttached}
                       layout="stacked"
                     />
                   </div>
                 )}
               </>
             )}
          </div>
        </div>
        )}
        
        {selectedObject.category === 'pantins' && activeTab === 'articulation' && (
          <div className="inspector-section">
            <div className="inspector-label-header">
              <label className="inspector-label">Articulation</label>
              <div className="inspector-actions" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="menu-button" title="Réinitialiser tout" onClick={resetAllArticulation}>Réinitialiser</button>
                <button className="menu-button" title="Miroir gauche ↔ droite" onClick={mirrorArticulation}>Miroir G↔D</button>
                <button className="menu-button" title="Copier gauche → droite" onClick={copyLeftToRight}>Copier G→D</button>
                <button className="menu-button" title="Copier droite → gauche" onClick={copyRightToLeft}>Copier D→G</button>
                <button className="menu-button" title="Zéroter les articulations du côté gauche" onClick={zeroLeft}>Zéroter G</button>
                <button className="menu-button" title="Zéroter les articulations du côté droit" onClick={zeroRight}>Zéroter D</button>
              </div>
            </div>
            <div className="inspector-group">
              {/* Navigation between parts */}
              {(() => {
                const idx = Math.max(0, ARTICULABLE_PARTS.indexOf(selectedPart));
                const len = ARTICULABLE_PARTS.length;
                const goPrev = () => setSelectedPart(ARTICULABLE_PARTS[(idx - 1 + len) % len]);
                const goNext = () => setSelectedPart(ARTICULABLE_PARTS[(idx + 1) % len]);
                return (
                  <div className="inspector-row one-col">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button className="menu-button" onClick={goPrev} title="Précédent">◀</button>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                        {selectedPart.replace(/_/g, ' ')}
                      </span>
                      <button className="menu-button" onClick={goNext} title="Suivant">▶</button>
                    </div>
                  </div>
                );
              })()}

              {/* Single input for the selected part */}
              {(() => {
                const isFlipped = selectedObject.flipped;
                const controlled = (isFlipped && MIRROR_MAP[selectedPart]) ? MIRROR_MAP[selectedPart] : selectedPart;
                let current = selectedObject.articulation?.[controlled] || 0;
                if (isFlipped) current = -current;
                return (
                  <div className="inspector-row one-col">
                    <PropertyInput
                      label={selectedPart.replace(/_/g, ' ')}
                      name={`art-${selectedPart}`}
                      value={current}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10) || 0;
                        const final = isFlipped ? -n : n;
                        handleArticulationChange(controlled, final);
                      }}
                      onValueChange={(v) => {
                        const n = Math.max(-180, Math.min(180, v));
                        const final = isFlipped ? -n : n;
                        handleArticulationChange(controlled, final);
                      }}
                      min={-180}
                      max={180}
                      step={1}
                      layout="stacked"
                    />
                  </div>
                );
              })()}

              {/* List of parts with live angles */}
              <div className="inspector-row one-col" style={{ gap: 4 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                  {ARTICULABLE_PARTS.map((part) => {
                    const isFlipped = selectedObject.flipped;
                    const controlled = (isFlipped && MIRROR_MAP[part]) ? MIRROR_MAP[part] : part;
                    let val = selectedObject.articulation?.[controlled] || 0;
                    if (isFlipped) val = -val;
                    const isActive = selectedPart === part;
                    return (
                      <button
                        key={part}
                        className="menu-button"
                        style={{ justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: isActive ? 'rgba(75,85,99,0.6)' : 'transparent' }}
                        onClick={() => setSelectedPart(part)}
                        title={part.replace(/_/g, ' ')}
                      >
                        <span style={{ textAlign: 'left', color: 'var(--color-text-secondary)' }}>{part.replace(/_/g, ' ')}</span>
                        <span style={{ minWidth: 28, textAlign: 'right' }}>{Math.round(val)}°</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'affichage' && (
          <>
            <div className="inspector-section">
              <label className="inspector-label">Affichage</label>
              <div className="inspector-group">
                <div className="inspector-row" style={{ alignItems: 'center', gap: 8 }}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={!!selectedObject.locked}
                      onChange={(e) => onUpdateObject(selectedObject.id, { locked: e.target.checked })}
                    />
                    Verrouiller déplacement/redimensionnement
                  </label>
                </div>
                <div className="inspector-row" style={{ alignItems: 'center', gap: 8 }}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={!!selectedObject.hidden}
                      onChange={(e) => onUpdateObject(selectedObject.id, { hidden: e.target.checked })}
                    />
                    Masquer l'objet
                  </label>
                </div>
              </div>
            </div>

            {!selectedObject.attachmentInfo && (
              <div className="inspector-section">
                <label className="inspector-label">Ordre</label>
                <div className="inspector-group">
                  <div className="inspector-row" style={{ gap: 8 }}>
                    <button
                      className="menu-button"
                      onClick={() => onUpdateObject(selectedObject.id, { zIndex: (selectedObject.zIndex ?? 0) - 1 })}
                      title="Descendre d'un plan"
                    >
                      Descendre
                    </button>
                    <button
                      className="menu-button"
                      onClick={() => onUpdateObject(selectedObject.id, { zIndex: (selectedObject.zIndex ?? 0) + 1 })}
                      title="Monter d'un plan"
                    >
                      Monter
                    </button>
                    <button
                      className="menu-button"
                      onClick={() => {
                        const others = svgObjects.filter(o => !o.attachmentInfo && o.id !== selectedObject.id && !o.hidden);
                        const maxZ = others.reduce((m, o) => Math.max(m, o.zIndex ?? 0), 0);
                        onUpdateObject(selectedObject.id, { zIndex: maxZ + 10 });
                      }}
                      title="Envoyer tout devant"
                    >
                      Devant
                    </button>
                    <button
                      className="menu-button"
                      onClick={() => {
                        const others = svgObjects.filter(o => !o.attachmentInfo && o.id !== selectedObject.id && !o.hidden);
                        const minZ = others.reduce((m, o) => Math.min(m, o.zIndex ?? 0), 0);
                        onUpdateObject(selectedObject.id, { zIndex: minZ - 10 });
                      }}
                      title="Envoyer tout derrière"
                    >
                      Derrière
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {selectedObject && selectedObject.category === 'pantins' && attachedChildren.length > 0 && (
            <div className="inspector-section">
                <label className="inspector-label">Objets attachés</label>
                <div className="inspector-group">
                    {attachedChildren.map(child => (
                        <div key={child.id} className="attached-object-row">
                            <span>{child.name ?? child.id}</span>
                            <button onClick={() => onDetachObject(child.id)} className="detach-button">Détacher</button>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
