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
                backgroundColor: debug ? 'rgba(255, 0, 0, 0.3)' : 'transparent',
                border: debug ? '2px solid red' : 'none',
            }}>
            {/* Always show sprite if it exists */}
            {entity.spritePath && (
                <img
                    src={entity.spritePath}
                    alt={entity.name}
                    style={{
                        width: `${entity.size.width}px`,
                        height: `${entity.size.height}px`,
                        objectFit: 'cover',
                        display: 'block',
                    }}
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        // Only show text on error if in debug mode
                        if (debug) {
                            const parent = target.parentElement;
                            if (parent) {
                                parent.style.color = 'white';
                                parent.style.fontSize = '12px';
                                parent.style.fontWeight = 'bold';
                                parent.style.display = 'flex';
                                parent.style.alignItems = 'center';
                                parent.style.justifyContent = 'center';
                                parent.textContent = entity.name;
                            }
                        }
                    }}
                />
            )}
            {/* Show text if no sprite - only in debug mode */}
            {!entity.spritePath && debug && (
                <span style={{ 
                    color: 'white', 
                    fontSize: '12px', 
                    fontWeight: 'bold',
                }}>
                    {entity.name}
                </span>
            )}
            {/* Debug label on top */}
            { debug && (
                <span style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    textShadow: '1px 1px 2px black',
                    pointerEvents: 'none',
                    zIndex: 1000,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    padding: '2px 4px',
                }}>
                    {entity.name}
                </span>
            )}
        </div>
    )
}