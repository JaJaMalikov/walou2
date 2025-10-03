import React from 'react';
import type { SvgObject } from '../types';
import { ARTICULABLE_PARTS } from '../types';
import { ChevronsRightLeftIcon } from './icons';

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


const PropertyInput: React.FC<{ label: string; name: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, name, value, onChange }) => (
  <div className="inspector-input-wrapper">
    <label htmlFor={name}>{label}</label>
    <input
      type="number"
      id={name}
      name={name}
      value={Math.round(value)}
      onChange={onChange}
      className="inspector-input"
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
  
  if (!selectedObject) {
    return (
      <div className="inspector-placeholder">
        <p>No object selected</p>
      </div>
    );
  }

  return (
    <div className="inspector-panel">
      <h2>Inspector</h2>
      <div className="space-y-4">
        <div className="inspector-section">
            <label className="inspector-label">Object ID</label>
            <div className="inspector-id-display">
                {selectedObject.id}
            </div>
        </div>

        <div className="inspector-section">
          <div className="inspector-label-header">
            <label className="inspector-label">Transform</label>
            <button title="Flip Horizontal" className="menu-button" onClick={handleFlip}>
              <ChevronsRightLeftIcon />
            </button>
          </div>
          <div className="inspector-group">
             <div className="inspector-row">
                 <PropertyInput label="X" name="x" value={selectedObject.x} onChange={handleChange} />
                 <PropertyInput label="Y" name="y" value={selectedObject.y} onChange={handleChange} />
             </div>
             <div className="inspector-row">
                 <PropertyInput label="Width" name="width" value={selectedObject.width} onChange={handleChange} />
                 <PropertyInput label="Height" name="height" value={selectedObject.height} onChange={handleChange} />
             </div>
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
                <label className="inspector-label">Attached Objects</label>
                <div className="inspector-group">
                    {attachedChildren.map(child => (
                        <div key={child.id} className="attached-object-row">
                            <span>{child.id}</span>
                            <button onClick={() => onDetachObject(child.id)} className="detach-button">Detach</button>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};