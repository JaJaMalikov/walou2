import React from 'react';
import type { SvgObject } from '../types';

interface InspectorPanelProps {
  selectedObject: SvgObject | null;
  onUpdateObject: (id: string, newProps: Partial<SvgObject>) => void;
}

const ARTICULABLE_PARTS = [
    'tete', 'haut_bras_droite', 'avant_bras_droite', 'main_droite',
    'haut_bras_gauche', 'avant_bras_gauche', 'main_gauche',
    'cuisse_droite', 'tibia_droite', 'pied_droite',
    'cuisse_gauche', 'tibia_gauche', 'pied_gauche',
];

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

const ArticulationSlider: React.FC<{ partName: string; value: number; onChange: (partName: string, angle: number) => void;}> = ({ partName, value, onChange }) => (
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
            onChange={(e) => onChange(partName, parseInt(e.target.value, 10))}
        />
    </div>
);


export const InspectorPanel: React.FC<InspectorPanelProps> = ({ selectedObject, onUpdateObject }) => {
  
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
          <label className="inspector-label">Transform</label>
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
                    {ARTICULABLE_PARTS.map(partName => (
                        <ArticulationSlider 
                            key={partName}
                            partName={partName}
                            value={selectedObject.articulation?.[partName] || 0}
                            onChange={handleArticulationChange}
                        />
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};