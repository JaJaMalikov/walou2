import React, { useState, useEffect } from 'react';
import type { SvgObject } from '../types';

interface InspectorPanelProps {
  selectedObject: SvgObject | null;
  onUpdateObject: (id: string, newProps: Partial<SvgObject>) => void;
}

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

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ selectedObject, onUpdateObject }) => {
  const [internalObject, setInternalObject] = useState<SvgObject | null>(selectedObject);

  useEffect(() => {
    setInternalObject(selectedObject);
  }, [selectedObject]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!internalObject) return;
    const { name, value } = e.target;
    const numericValue = parseFloat(value) || 0;
    
    const updatedObject = { ...internalObject, [name]: numericValue };
    setInternalObject(updatedObject);
    onUpdateObject(internalObject.id, { [name]: numericValue });
  };
  
  if (!internalObject) {
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
                {internalObject.id}
            </div>
        </div>

        <div>
          <label className="text-sm text-gray-400">Transform</label>
          <div className="p-2.5 bg-gray-700 rounded-md mt-1 space-y-2">
             <div className="grid grid-cols-2 gap-2">
                 <PropertyInput label="X" name="x" value={internalObject.x} onChange={handleChange} />
                 <PropertyInput label="Y" name="y" value={internalObject.y} onChange={handleChange} />
             </div>
             <div className="grid grid-cols-2 gap-2">
                 <PropertyInput label="Width" name="width" value={internalObject.width} onChange={handleChange} />
                 <PropertyInput label="Height" name="height" value={internalObject.height} onChange={handleChange} />
             </div>
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400">Other Properties</label>
           <div className="p-2 bg-gray-700 rounded-md mt-1 text-gray-500 text-sm">
            More properties will be shown here...
          </div>
        </div>
      </div>
    </div>
  );
};