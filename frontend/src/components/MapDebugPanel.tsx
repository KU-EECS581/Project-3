/**
 * @file MapDebugPanel.tsx
 * @description Debug panel for the game map.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

import type { PlayerCharacter } from "@/models";
import type { MousePosition } from "@uidotdev/usehooks";

interface MapDebugPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    onDisconnectClicked: () => void;
    self?: PlayerCharacter;
    mouse: MousePosition;
}

export function MapDebugPanel({
    onDisconnectClicked,
    self,
    mouse,
    hidden
}: MapDebugPanelProps) {
    return (
        <div hidden={hidden}>
            <button onClick={onDisconnectClicked}>Force Disconnect</button>
            <p>Character Position: {self?.x}, {Math.ceil(self?.y ?? 0)}</p>
            <p>Mouse Position: {mouse.elementX}, {Math.ceil(mouse.elementY ?? 0)}</p>
        </div>
    )
}