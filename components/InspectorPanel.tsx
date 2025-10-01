import React, { useState, useEffect } from 'react';
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
  <div className="flex items-center">
    <label htmlFor={name} className="w-12 text-sm text-gray-400">{label}</label>
    <input
      type="number"
      id={name}
      name={name}
      value={Math.round(value)}
      onChange={onChange}
      className="w-full bg-gray-900 rounded-md p-1.5 text-right border border-gray-600 focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
    />
  </div>
);

const ArticulationSlider: React.FC<{ partName: string; value: number; onChange: (partName: string, angle: number) => void;}> = ({ partName, value, onChange }) => (
    <div className="grid grid-cols-3 items-center gap-2">
        <label htmlFor={`rot-${partName}`} className="text-sm text-gray-300 truncate col-span-1" title={partName}>
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
            className="w-full col-span-2 accent-blue-500"
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
      <div className="p-4 h-full flex items-center justify-center">
        <p className="text-gray-500">No object selected</p>
      </div>
    );
  }

  return (
    <div className="p-4 text-white">
      <h2 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2">Inspector</h2>
      <div className="space-y-4">
        <div>
            <label className="text-sm text-gray-400 block mb-2">Object ID</label>
            <div className="p-2 bg-gray-700 rounded-md text-sm text-gray-300 truncate">
                {selectedObject.id}
            </div>
        </div>

        <div>
          <label className="text-sm text-gray-400">Transform</label>
          <div className="p-2.5 bg-gray-700 rounded-md mt-1 space-y-2">
             <div className="grid grid-cols-2 gap-2">
                 <PropertyInput label="X" name="x" value={selectedObject.x} onChange={handleChange} />
                 <PropertyInput label="Y" name="y" value={selectedObject.y} onChange={handleChange} />
             </div>
             <div className="grid grid-cols-2 gap-2">
                 <PropertyInput label="Width" name="width" value={selectedObject.width} onChange={handleChange} />
                 <PropertyInput label="Height" name="height" value={selectedObject.height} onChange={handleChange} />
             </div>
          </div>
        </div>
        
        {selectedObject.category === 'pantins' && (
            <div>
                <label className="text-sm text-gray-400">Articulation</label>
                <div className="p-2.5 bg-gray-700 rounded-md mt-1 space-y-2">
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
