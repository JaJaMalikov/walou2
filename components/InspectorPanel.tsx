import React, { useMemo } from 'react';
import type { SvgObject } from '../types';
import { ARTICULABLE_PARTS } from '../types';
import { ChevronsRightLeftIcon } from './icons';
import { getSvgDimensions } from './utils';

interface InspectorPanelProps {
  selectedObject: SvgObject | null;
  svgObjects: SvgObject[];
  onUpdateObject: (id: string, newProps: Partial<SvgObject>) => void;
  onDetachObject: (childId: string) => void;
}


const MIRROR_MAP: { [key: string]: string } = {
    'haut_bras_droite': 'haut_bras_gauche', 'haut_bras_gauche': 'haut_bras_droite',
    'avant_bras_droite': 'avant_bras_gauche', 'avant_bras_gauche': 'avant_bras_droite',
    'main_droite': 'main_gauche', 'main_gauche': 'main_droite',
    'cuisse_droite': 'cuisse_gauche', 'cuisse_gauche': 'cuisse_droite',
    'tibia_droite': 'tibia_gauche', 'tibia_gauche': 'tibia_droite',
    'pied_droite': 'pied_gauche', 'pied_gauche': 'pied_droite',
};


const PropertyInput: React.FC<{ label: string; name: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; disabled?: boolean; }> = ({ label, name, value, onChange, disabled }) => (
  <div className="inspector-input-wrapper">
    <label htmlFor={name}>{label}</label>
    <input
      type="number"
      id={name}
      name={name}
      value={Math.round(value)}
      onChange={onChange}
      className="inspector-input"
      disabled={disabled}
    />
  </div>
);

const ArticulationSlider: React.FC<{ partName: string; value: number; onChange: (angle: number) => void;}> = ({ partName, value, onChange }) => (
    <div className="articulation-row">
        <label htmlFor={`rot-${partName}`} title={partName}>
            {partName.replace(/_/g, ' ')}
        </label>
        <input
            type="range"
            id={`rot-${partName}`}
            name={`rot-${partName}`}
            min="-180"
            max="180"
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
        />
    </div>
);


export const InspectorPanel: React.FC<InspectorPanelProps> = ({ selectedObject, svgObjects, onUpdateObject, onDetachObject }) => {
  
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
    const numericValue = parseFloat(value) || 0;
    onUpdateObject(selectedObject.id, { [name]: numericValue });
  };

  const handleArticulationChange = (partName: string, angle: number) => {
    if (!selectedObject) return;
    onUpdateObject(selectedObject.id, {
        articulation: { [partName]: angle }
    });
  };

  const handleFlip = () => {
    if (!selectedObject) return;
    onUpdateObject(selectedObject.id, { flipped: !selectedObject.flipped });
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
  
  if (!selectedObject) {
    return (
      <div className="inspector-placeholder">
        <p>Aucun objet sélectionné</p>
      </div>
    );
  }

  return (
    <div className="inspector-panel">
      <h2>Inspecteur</h2>
      <div className="space-y-4">
        <div className="inspector-section">
            <label className="inspector-label">ID de l'objet</label>
            <div className="inspector-id-display">
                {selectedObject.id}
            </div>
        </div>

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
                 <div className="inspector-row">
                   <PropertyInput label="X" name="x" value={selectedObject.x} onChange={handleChange} disabled={isAttached} />
                   <PropertyInput label="Y" name="y" value={selectedObject.y} onChange={handleChange} disabled={isAttached} />
                 </div>
                 <div className="inspector-row">
                   <PropertyInput label="Échelle (%)" name="scale" value={scalePercent} onChange={handleScaleChange} disabled={isAttached} />
                 </div>
               </>
             )}
          </div>
        </div>
        
        {selectedObject.category === 'pantins' && (
            <div className="inspector-section">
                <label className="inspector-label">Articulation</label>
                <div className="inspector-group">
                    {ARTICULABLE_PARTS.map(partName => {
                        const isFlipped = selectedObject.flipped;
                        const controlledPart = (isFlipped && MIRROR_MAP[partName]) ? MIRROR_MAP[partName] : partName;
                        
                        let value = selectedObject.articulation?.[controlledPart] || 0;
                        if (isFlipped) {
                           value = -value;
                        }

                        return (
                            <ArticulationSlider 
                                key={partName}
                                partName={partName}
                                value={value}
                                onChange={(angle) => {
                                    const finalAngle = isFlipped ? -angle : angle;
                                    handleArticulationChange(controlledPart, finalAngle);
                                }}
                            />
                        )
                    })}
                </div>
            </div>
        )}

        {selectedObject && selectedObject.category === 'pantins' && attachedChildren.length > 0 && (
            <div className="inspector-section">
                <label className="inspector-label">Objets attachés</label>
                <div className="inspector-group">
                    {attachedChildren.map(child => (
                        <div key={child.id} className="attached-object-row">
                            <span>{child.id}</span>
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
