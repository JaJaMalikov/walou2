import React, { useState, useEffect } from 'react';
import { Asset, AssetCategory } from '../types';
import { UserIcon, ShapesIcon, ImageIcon } from './icons';

interface AssetPanelProps {
  onAddObject: (svgContent: string) => void;
  onSetBackground: (imageUrl: string) => void;
}

// NOTE: Add any new assets to this list.
// For .png files in 'decors', ensure the path is correct.
// For demonstration, you could add:
// { name: 'forest', path: '/assets/decors/forest.png', category: 'decors' },
const initialAssets: Asset[] = [
  { name: 'Manu', path: '/assets/pantins/bab_manu.svg', category: 'pantins' },
  { name: 'Lunettes Manu', path: '/assets/objets/lunettes_manu.svg', category: 'objets' },
  { name: 'Bureau', path: '/assets/decors/bureau.png', category: 'decors' },
];

const categoryIcons: Record<AssetCategory, React.ElementType> = {
  pantins: UserIcon,
  objets: ShapesIcon,
  decors: ImageIcon,
};
const categoryNames: Record<AssetCategory, string> = {
  pantins: 'Pantins',
  objets: 'Objets',
  decors: 'Décors',
};

export const AssetPanel: React.FC<AssetPanelProps> = ({ onAddObject, onSetBackground }) => {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AssetCategory>('pantins');

  useEffect(() => {
    const fetchAssets = async () => {
      setIsLoading(true);
      try {
        const loadedAssets = await Promise.all(
          initialAssets.map(async (asset) => {
            if (asset.path.endsWith('.svg')) {
              const response = await fetch(asset.path);
              if (!response.ok) {
                console.error(`Failed to fetch ${asset.path}`);
                return { ...asset, content: undefined };
              }
              const content = await response.text();
              return { ...asset, content };
            }
            return asset; // For PNGs, just return the asset with its path
          })
        );
        setAssets(loadedAssets);
      } catch (error) {
        console.error("Error loading assets:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssets();
  }, []);

  const visibleAssets = assets.filter(
    (asset) => asset.category === activeTab
  );

  return (
    <div className="h-full w-full flex flex-col bg-gray-800 text-white">
      <div className="flex border-b border-gray-700">
        {(Object.keys(categoryNames) as AssetCategory[]).map((category) => {
          const Icon = categoryIcons[category];
          return (
            <button
              key={category}
              onClick={() => setActiveTab(category)}
              className={`flex-1 p-3 flex items-center justify-center gap-2 text-sm transition-colors ${
                activeTab === category
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700/50'
              }`}
              aria-current={activeTab === category}
              title={categoryNames[category]}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Loading Assets...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {visibleAssets.length > 0 ? (
                visibleAssets.map((asset) => (
                  <button
                    key={asset.name}
                    onClick={() => {
                        if (asset.category === 'decors') {
                            onSetBackground(asset.path);
                        } else if (asset.content) {
                            onAddObject(asset.content);
                        }
                    }}
                    className="aspect-square bg-gray-700 rounded-md p-2 flex items-center justify-center hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    title={`Add ${asset.name}`}
                  >
                    {asset.category === 'decors' ? (
                        <img src={asset.path} alt={asset.name} className="w-full h-full object-contain"/>
                    ) : (
                        <div
                        className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                        dangerouslySetInnerHTML={{ __html: asset.content || '' }}
                        />
                    )}
                  </button>
                ))
            ) : (
                <div className="col-span-2 text-center text-gray-500 pt-8">
                    <p>No assets in this category.</p>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};