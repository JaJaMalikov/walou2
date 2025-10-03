
import React, { useState, useEffect } from 'react';
import { Asset, AssetCategory } from '../types';
import { UserIcon, ShapesIcon, ImageIcon } from './icons';

interface AssetPanelProps {
  onAddObject: (svgContent: string, category: AssetCategory) => void;
  onSetBackground: (imageUrl: string) => void;
  canAddObjects?: () => boolean; // Optional guard from parent
}

const categoryIcons: Record<AssetCategory, React.ElementType> = {
  pantins: UserIcon,
  objets: ShapesIcon,
  decors: ImageIcon,
};
const categoryNames: Record<AssetCategory, string> = {
  decors: 'Décors',
  pantins: 'Pantins',
  objets: 'Objets',
};

export const AssetPanel: React.FC<AssetPanelProps> = ({ onAddObject, onSetBackground, canAddObjects }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AssetCategory>('pantins');
  const canAdd = canAddObjects ? canAddObjects() : true;

  useEffect(() => {
    const fetchAssets = async () => {
      setIsLoading(true);
      try {
        const base = import.meta.env.BASE_URL || '/';
        const manifestResponse = await fetch(`${base}assets-manifest.json`);
        if (!manifestResponse.ok) {
          throw new Error('Échec du chargement du manifeste des assets');
        }
        const manifestAssets: Omit<Asset, 'content'>[] = await manifestResponse.json();

        const loadedAssets = await Promise.all(
          manifestAssets.map(async (asset) => {
            const base = import.meta.env.BASE_URL || '/';
            const resolvedPath = `${base}${asset.path}`;
            if (asset.path.endsWith('.svg')) {
              try {
                const response = await fetch(resolvedPath);
                if (!response.ok) {
                  console.error(`Échec du chargement de ${resolvedPath}`);
                  return { ...asset, content: undefined };
                }
                const content = await response.text();
                return { ...asset, path: resolvedPath, content };
              } catch (svgError) {
                 console.error(`Error fetching SVG content for ${asset.name}:`, svgError);
                 return { ...asset, path: resolvedPath, content: undefined };
              }
            }
            // For non-SVG files like PNGs, just return the asset with its path
            return { ...asset, path: resolvedPath };
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
  const isBlockedTab = (activeTab === 'pantins' || activeTab === 'objets') && !canAdd;

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
        {isBlockedTab && (
          <div className="asset-info" role="note" style={{ padding: '8px 12px', color: '#555', fontSize: 12 }}>
            Ajoutez un décor d'abord pour pouvoir ajouter des pantins/objets.
          </div>
        )}
        {isLoading ? (
          <div className="asset-placeholder">
            <p>Chargement des assets...</p>
          </div>
        ) : (
          <div className="asset-grid">
            {visibleAssets.length > 0 ? (
                visibleAssets.map((asset) => {
                  const isDecor = asset.category === 'decors';
                  const isBlocked = !isDecor && !canAdd;
                  return (
                    <button
                      key={asset.name}
                      onClick={() => {
                          if (isDecor) {
                              onSetBackground(asset.path);
                          } else if (!isBlocked && asset.content) {
                              onAddObject(asset.content, asset.category);
                          }
                      }}
                    className={`asset-item ${isBlocked ? 'disabled' : ''}`}
                    title={isBlocked ? 'Définissez un décor avant d\'ajouter des pantins/objets' : `Ajouter ${asset.name}`}
                      disabled={isBlocked}
                      style={isBlocked ? { cursor: 'not-allowed', opacity: 0.5 } : undefined}
                    >
                      <div className="asset-item-thumbnail">
                          {asset.path.endsWith('.svg') ? (
                               <img src={asset.path} alt={asset.name} />
                          ) : (
                               <img src={asset.path} alt={asset.name} />
                          )}
                      </div>
                    </button>
                  );
                })
            ) : (
                <div className="asset-placeholder">
                    <p>Aucun asset dans cette catégorie.</p>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
