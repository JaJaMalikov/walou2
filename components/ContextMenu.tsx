import React, { useState } from 'react';
import type { SvgObject } from '../types';
import { ARTICULABLE_PARTS } from '../types';

interface ContextMenuProps {
  x: number;
  y: number;
  targetId: string | null;
  svgObjects: SvgObject[];
  onAttach: (childId: string, parentId: string, limbId: string) => void;
  onDetach: (childId: string) => void;
  onClose: () => void;
  onUpdateObject: (id: string, newProps: Partial<SvgObject>) => void;
  onDelete: (id: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, targetId, svgObjects, onAttach, onDetach, onClose, onUpdateObject, onDelete }) => {
  const [showAttachSubMenu, setShowAttachSubMenu] = useState(false);

  const targetObject = svgObjects.find(obj => obj.id === targetId);
  const puppets = svgObjects.filter(obj => obj.category === 'pantins' && obj.id !== targetId);

  const handleAttachClick = (puppetId: string, limbId: string) => {
    if (targetId) {
      onAttach(targetId, puppetId, limbId);
    }
  };

  const getDisplayName = (obj: SvgObject) => obj.name ?? obj.id;

  const canDetach = !!targetObject?.attachmentInfo;
  const handleDetachClick = () => {
    if (targetId && canDetach) {
      onDetach(targetId);
      onClose();
    }
  };

  const isAttached = !!targetObject?.attachmentInfo;
  const canOrder = !!targetObject && !isAttached;
  const isLocked = !!targetObject?.locked;
  const isHidden = !!targetObject?.hidden;

  const adjustZ = (delta: number) => {
    if (!targetObject) return;
    onUpdateObject(targetObject.id, { zIndex: (targetObject.zIndex ?? 0) + delta });
    onClose();
  };

  const bringToFront = () => {
    if (!targetObject) return;
    const others = svgObjects.filter(o => !o.attachmentInfo && o.id !== targetObject.id && !o.hidden);
    const maxZ = others.reduce((m, o) => Math.max(m, o.zIndex ?? 0), 0);
    onUpdateObject(targetObject.id, { zIndex: maxZ + 10 });
    onClose();
  };

  const sendToBack = () => {
    if (!targetObject) return;
    const others = svgObjects.filter(o => !o.attachmentInfo && o.id !== targetObject.id && !o.hidden);
    const minZ = others.reduce((m, o) => Math.min(m, o.zIndex ?? 0), 0);
    onUpdateObject(targetObject.id, { zIndex: minZ - 10 });
    onClose();
  };

  const toggleLocked = () => {
    if (!targetObject) return;
    onUpdateObject(targetObject.id, { locked: !isLocked });
    onClose();
  };

  const toggleHidden = () => {
    if (!targetObject) return;
    onUpdateObject(targetObject.id, { hidden: !isHidden });
    onClose();
  };

  const handleDelete = () => {
    if (!targetObject) return;
    const label = targetObject.name ?? targetObject.id;
    if (window.confirm(`Supprimer définitivement « ${label} » ?`)) {
      onDelete(targetObject.id);
      onClose();
    }
  };

  return (
    <div className="context-menu" style={{ top: y, left: x }}>
      <ul>
        {targetObject && (
          <li className="context-menu-title">{getDisplayName(targetObject)}</li>
        )}
        <li 
          className="context-menu-item with-submenu"
          onMouseEnter={() => setShowAttachSubMenu(true)}
          onMouseLeave={() => setShowAttachSubMenu(false)}
        >
          Attacher à…
          {showAttachSubMenu && (
            <div className="context-submenu">
              {puppets.length > 0 ? (
                puppets.map(puppet => (
                  <div key={puppet.id} className="submenu-group">
                    <span className="submenu-group-title">{getDisplayName(puppet)}</span>
                    <ul>
                      {ARTICULABLE_PARTS.map(limb => (
                        <li 
                          key={`${puppet.id}-${limb}`}
                          className="context-menu-item"
                          onClick={() => handleAttachClick(puppet.id, limb)}
                        >
                          {limb.replace(/_/g, ' ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <div className="submenu-placeholder">Aucun pantin dans la scène</div>
              )}
            </div>
          )}
        </li>
        <li 
          className={`context-menu-item ${canDetach ? '' : 'disabled'}`}
          onClick={canDetach ? handleDetachClick : undefined}
        >
          Détacher
        </li>
        <li className={`context-menu-separator`} />
        <li 
          className={`context-menu-item ${canOrder ? '' : 'disabled'}`}
          onClick={canOrder ? () => adjustZ(-1) : undefined}
        >
          Descendre
        </li>
        <li 
          className={`context-menu-item ${canOrder ? '' : 'disabled'}`}
          onClick={canOrder ? () => adjustZ(1) : undefined}
        >
          Monter
        </li>
        <li 
          className={`context-menu-item ${canOrder ? '' : 'disabled'}`}
          onClick={canOrder ? bringToFront : undefined}
        >
          Devant
        </li>
        <li 
          className={`context-menu-item ${canOrder ? '' : 'disabled'}`}
          onClick={canOrder ? sendToBack : undefined}
        >
          Derrière
        </li>
        <li className={`context-menu-separator`} />
        <li 
          className={`context-menu-item`}
          onClick={toggleLocked}
        >
          {isLocked ? 'Déverrouiller' : 'Verrouiller'}
        </li>
        <li 
          className={`context-menu-item`}
          onClick={toggleHidden}
        >
          {isHidden ? 'Afficher' : 'Masquer'}
        </li>
        <li className={`context-menu-separator`} />
        <li 
          className={`context-menu-item`}
          onClick={handleDelete}
          style={{ color: '#c30' }}
        >
          Supprimer
        </li>
      </ul>
    </div>
  );
};
