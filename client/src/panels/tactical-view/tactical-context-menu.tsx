
import React from 'react';
import { Eye, MessageCircle, Package, Footprints, Sword, Target, Users, Skull } from 'lucide-react';
import { combatSystem } from '@shared/combat-system';

interface TacticalContextMenuProps {
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    entityId: string;
    entity: any;
    actions: any[];
    clickPosition?: { x: number; y: number };
  };
  contextMenuRef: React.RefObject<HTMLDivElement>;
  onActionClick: (action: any, targetEntityId: string) => void;
  onMoveToPosition: (position?: { x: number; y: number }) => void;
  onClose: () => void;
}

export default function TacticalContextMenu({
  contextMenu,
  contextMenuRef,
  onActionClick,
  onMoveToPosition,
  onClose
}: TacticalContextMenuProps) {
  if (!contextMenu.visible) return null;

  return (
    <div
      ref={contextMenuRef}
      className="fixed bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 py-2 min-w-48 max-w-64"
      style={{
        left: `${Math.min(contextMenu.x, window.innerWidth - 250)}px`,
        top: `${Math.min(contextMenu.y, window.innerHeight - 300)}px`,
      }}
    >
      {/* Entity Info Header */}
      <div className="px-3 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          {contextMenu.entity.type === "hostile" && (
            <Skull className="w-4 h-4 text-red-400" />
          )}
          {(contextMenu.entity.type === "neutral" || contextMenu.entity.type === "npc") && (
            <Users className="w-4 h-4 text-orange-400" />
          )}
          {contextMenu.entityId.startsWith("loot-") && (
            <Package className="w-4 h-4 text-yellow-400" />
          )}
          <div>
            <div className="text-white font-medium">
              {contextMenu.entity.name}
            </div>
            {!contextMenu.entityId.startsWith("loot-") && (
              <div className="text-xs text-gray-400">
                {contextMenu.entity.hp}/{contextMenu.entity.maxHp} HP
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Info Actions */}
      <div className="px-3 py-2 border-b border-gray-700">
        <button
          className="flex items-center gap-2 w-full px-2 py-1 text-sm text-gray-300 hover:bg-gray-800 rounded"
          onClick={() => {
            console.log(`Examining ${contextMenu.entity.name}`);
            onClose();
          }}
        >
          <Eye className="w-4 h-4" />
          Examine
        </button>

        {contextMenu.entity.type === "npc" && (
          <button
            className="flex items-center gap-2 w-full px-2 py-1 text-sm text-gray-300 hover:bg-gray-800 rounded"
            onClick={() => {
              console.log(`Talking to ${contextMenu.entity.name}`);
              onClose();
            }}
          >
            <MessageCircle className="w-4 h-4" />
            Talk
          </button>
        )}

        {contextMenu.entityId.startsWith("loot-") && (
          <button
            className="flex items-center gap-2 w-full px-2 py-1 text-sm text-gray-300 hover:bg-gray-800 rounded"
            onClick={() => {
              console.log(`Picking up ${contextMenu.entity.name}`);
              onClose();
            }}
          >
            <Package className="w-4 h-4" />
            Pick Up
          </button>
        )}
      </div>

      {/* Movement Actions */}
      {contextMenu.clickPosition &&
        combatSystem.getSelectedEntity()?.type === "player" && (
          <div className="px-3 py-2 border-b border-gray-700">
            <div className="text-xs text-gray-500 mb-2">Movement</div>
            <button
              className="flex items-center gap-2 w-full px-2 py-1 text-sm text-gray-300 hover:bg-gray-800 rounded"
              onClick={() => onMoveToPosition(contextMenu.clickPosition)}
            >
              <Footprints className="w-4 h-4 text-green-400" />
              <div>
                <div>Move Here</div>
                <div className="text-xs text-gray-500">
                  Position: {contextMenu.clickPosition.x.toFixed(0)},{" "}
                  {contextMenu.clickPosition.y.toFixed(0)}
                </div>
              </div>
            </button>
          </div>
        )}

      {/* Grid-specific actions */}
      {contextMenu.entityId === "grid" &&
        combatSystem.getSelectedEntity()?.type === "player" && (
          <div className="px-3 py-2">
            <div className="text-xs text-gray-500 mb-2">Grid Actions</div>
            <button
              className="flex items-center gap-2 w-full px-2 py-1 text-sm text-gray-300 hover:bg-gray-800 rounded"
              onClick={() => {
                const selectedEntity = combatSystem.getSelectedEntity();
                if (selectedEntity && contextMenu.clickPosition) {
                  const success = combatSystem.queueMoveAction(
                    selectedEntity.id,
                    contextMenu.clickPosition,
                  );
                  if (success) {
                    console.log(
                      `${selectedEntity.name} moving to ${contextMenu.clickPosition.x.toFixed(1)}, ${contextMenu.clickPosition.y.toFixed(1)}`,
                    );
                  }
                }
                onClose();
              }}
            >
              <Footprints className="w-4 h-4 text-green-400" />
              <div>
                <div>Move to Position</div>
                <div className="text-xs text-gray-500">
                  Grid: {contextMenu.clickPosition?.x.toFixed(0)},{" "}
                  {contextMenu.clickPosition?.y.toFixed(0)}
                </div>
              </div>
            </button>
          </div>
        )}

      {/* Combat Actions */}
      {contextMenu.actions.length > 0 &&
        contextMenu.entity.type === "hostile" && (
          <div className="px-3 py-2">
            <div className="text-xs text-gray-500 mb-2">
              Combat Actions
            </div>
            {contextMenu.actions.map((action) => (
              <button
                key={action.id}
                className="flex items-center gap-2 w-full px-2 py-1 text-sm text-gray-300 hover:bg-gray-800 rounded"
                onClick={() => onActionClick(action, contextMenu.entityId)}
              >
                {action.type === "attack" && (
                  <Sword className="w-4 h-4 text-red-400" />
                )}
                {action.type === "ability" && (
                  <Target className="w-4 h-4 text-blue-400" />
                )}
                <div>
                  <div>{action.name}</div>
                  <div className="text-xs text-gray-500">
                    {action.type === "attack" && `Damage: ${action.damage || "N/A"}`}
                    {action.type === "ability" && `Cooldown: ${action.cooldown || 0}ms`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
    </div>
  );
}
