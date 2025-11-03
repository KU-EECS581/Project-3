/**
 * @file EntityComponent.tsx
 * @description Component representing an entity on the map.
 * @author Riley Meyerkorth
 * @date 2025-10-27
 */

import type { MapEntity } from "@/models/MapEntity";

interface EntityComponentProps {
    entity: MapEntity;
    debug?: boolean;
}

export function EntityComponent({ entity, debug }: EntityComponentProps) {

    return (
        <div
            key={entity.name}
            className="entity"
            style={{
                left: `${entity.pos.x}px`,
                top: `${entity.pos.y}px`,
                width: `${entity.size.width}px`,
                height: `${entity.size.height}px`,
                backgroundColor: `${ debug ? 'red' : 'transparent' }`, // Placeholder color if sprite fails to load
            }}>
            { debug && <p>{entity.name}</p> }
        </div>
    )
}