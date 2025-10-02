
import React, { useState, useEffect } from 'react';
import { Asset, AssetCategory } from '../types';
import { UserIcon, ShapesIcon, ImageIcon } from './icons';

interface AssetPanelProps {
  onAddObject: (svgContent: string, category: AssetCategory) => void;
  onSetBackground: (imageUrl: string) => void;
}

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
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AssetCategory>('pantins');

  useEffect(() => {
    const fetchAssets = async () => {
      setIsLoading(true);
      try {
        const manifestResponse = await fetch('/assets/assets-manifest.json');
        if (!manifestResponse.ok) {
          throw new Error('Failed to fetch asset manifest');
        }
        const manifestAssets: Omit<Asset, 'content'>[] = await manifestResponse.json();

        const loadedAssets = await Promise.all(
          manifestAssets.map(async (asset) => {
            if (asset.path.endsWith('.svg')) {
              try {
                const response = await fetch(asset.path);
                if (!response.ok) {
                  console.error(`Failed to fetch ${asset.path}`);
                  return { ...asset, content: undefined };
                }
                const content = await response.text();
                return { ...asset, content };
              } catch (svgError) {
                 console.error(`Error fetching SVG content for ${asset.name}:`, svgError);
                 return { ...asset, content: undefined };
              }
            }
            // For non-SVG files like PNGs, just return the asset with its path
            return asset;
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
    <div className="asset-panel-container">
      <div className="asset-tabs">
        {(Object.keys(categoryNames) as AssetCategory[]).map((category) => {
          const Icon = categoryIcons[category];
          return (
            <button
              key={category}
              onClick={() => setActiveTab(category)}
              className={`asset-tab ${activeTab === category ? 'active' : ''}`}
              aria-current={activeTab === category}
              title={categoryNames[category]}
            >
              <Icon />
            </button>
          );
        })}
      </div>

      <div className="asset-grid-container">
        {isLoading ? (
          <div className="asset-placeholder">
            <p>Loading Assets...</p>
          </div>
        ) : (
          <div className="asset-grid">
            {visibleAssets.length > 0 ? (
                visibleAssets.map((asset) => (
                  <button
                    key={asset.name}
                    onClick={() => {
                        if (asset.category === 'decors') {
                            onSetBackground(asset.path);
                        } else if (asset.content) {
                            onAddObject(asset.content, asset.category);
                        }
                    }}
                    className="asset-item"
                    title={`Add ${asset.name}`}
                  >
                    <div className="asset-item-thumbnail">
                        {asset.path.endsWith('.svg') ? (
                             <img src={asset.path} alt={asset.name} />
                        ) : (
                             <img src={asset.path} alt={asset.name} />
                        )}
                    </div>
                  </button>
                ))
            ) : (
                <div className="asset-placeholder">
                    <p>No assets in this category.</p>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
