/**
 * @file MapDebugPanel.tsx
 * @description Debug overlay: mouse position & character state + disconnect.
 * @class MapDebugPanel
 * @module Components/Debug
 * @inputs self player, mouse position, disconnect handler
 * @outputs Panel UI with metrics/buttons
 * @external_sources N/A
 * @author Riley Meyerkorth
 * @date 2025-10-28
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