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
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, targetId, svgObjects, onAttach, onDetach, onClose }) => {
  const [showAttachSubMenu, setShowAttachSubMenu] = useState(false);

  const targetObject = svgObjects.find(obj => obj.id === targetId);
  const puppets = svgObjects.filter(obj => obj.category === 'pantins' && obj.id !== targetId);

  const handleAttachClick = (puppetId: string, limbId: string) => {
    if (targetId) {
      onAttach(targetId, puppetId, limbId);
    }
  };

  const getPuppetName = (pantin: SvgObject) => {
    // A real implementation might get a friendlier name
    return pantin.id;
  }

  const canDetach = !!targetObject?.attachmentInfo;
  const handleDetachClick = () => {
    if (targetId && canDetach) {
      onDetach(targetId);
      onClose();
    }
  };

  return (
    <div className="context-menu" style={{ top: y, left: x }}>
      <ul>
        <li 
          className="context-menu-item with-submenu"
          onMouseEnter={() => setShowAttachSubMenu(true)}
          onMouseLeave={() => setShowAttachSubMenu(false)}
        >
          Attach to...
          {showAttachSubMenu && (
            <div className="context-submenu">
              {puppets.length > 0 ? (
                puppets.map(puppet => (
                  <div key={puppet.id} className="submenu-group">
                    <span className="submenu-group-title">{getPuppetName(puppet)}</span>
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
                <div className="submenu-placeholder">No puppets on scene</div>
              )}
            </div>
          )}
        </li>
        <li 
          className={`context-menu-item ${canDetach ? '' : 'disabled'}`}
          onClick={canDetach ? handleDetachClick : undefined}
        >
          Detach
        </li>
      </ul>
    </div>
  );
};
