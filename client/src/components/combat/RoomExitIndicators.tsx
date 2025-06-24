
/**
 * File: RoomExitIndicators.tsx
 * Responsibility: Renders gate-style exit indicators for room connections
 * Notes: Extracted from combat-view-panel.tsx to reduce component complexity
 */

import React from "react";

interface RoomConnection {
  direction: string;
  isLocked?: boolean;
  keyRequired?: string;
}

interface RoomExitIndicatorsProps {
  roomConnections: RoomConnection[];
}

export default function RoomExitIndicators({ roomConnections }: RoomExitIndicatorsProps) {
  const getGateStyle = (direction: string) => {
    switch (direction) {
      case "north":
        return {
          style: {
            top: "2px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "48px",
            height: "12px",
          },
          className: "rounded-b-lg",
          arrow: "↑",
        };
      case "south":
        return {
          style: {
            bottom: "2px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "48px",
            height: "12px",
          },
          className: "rounded-t-lg",
          arrow: "↓",
        };
      case "east":
        return {
          style: {
            right: "2px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "12px",
            height: "48px",
          },
          className: "rounded-l-lg",
          arrow: "→",
        };
      case "west":
        return {
          style: {
            left: "2px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "12px",
            height: "48px",
          },
          className: "rounded-r-lg",
          arrow: "←",
        };
      case "up":
      case "down":
        return {
          style: {
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "32px",
            height: "32px",
          },
          className: "rounded-full",
          arrow: null,
        };
      default:
        return null;
    }
  };

  return (
    <>
      {roomConnections.map((connection) => {
        const gateConfig = getGateStyle(connection.direction);
        if (!gateConfig) return null;

        return (
          <div
            key={connection.direction}
            className={`absolute ${gateConfig.className} ${
              connection.isLocked
                ? "bg-red-400 border-2 border-red-300"
                : "bg-green-400 border-2 border-green-300"
            } transition-all duration-200 hover:scale-110 cursor-pointer`}
            style={{
              ...gateConfig.style,
              zIndex: 25,
              boxShadow: connection.isLocked 
                ? "0 0 8px rgba(239, 68, 68, 0.4)" 
                : "0 0 8px rgba(34, 197, 94, 0.4)",
            }}
            title={`${connection.isLocked ? "🔒 Locked " : "🚪 "}Exit: ${connection.direction}${connection.keyRequired ? ` (Key: ${connection.keyRequired})` : ""}`}
          >
            {/* Gate indicator dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={`w-2 h-2 rounded-full animate-pulse ${
                  connection.isLocked ? "bg-red-100" : "bg-green-100"
                }`}
              />
            </div>

            {/* Directional arrow for vertical/horizontal gates */}
            {gateConfig.arrow && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={`text-xs font-bold ${
                    connection.isLocked ? "text-red-100" : "text-green-100"
                  }`}
                >
                  {gateConfig.arrow}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
