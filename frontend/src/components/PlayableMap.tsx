/**
 * @file PlayableMap.tsx
 * @description Component representing the playable map area.
 * @author Riley Meyerkorth
 * @date 2025-10-25
 */

interface PlayableMapProps extends React.ComponentProps<'div'> {
    onMovement?: () => void;
}

export function PlayableMap({ onMovement, ref, hidden }: PlayableMapProps) {
    return (
        <div
            hidden={hidden}
            ref={ref}
            style={{ border: '1px solid black', backgroundColor: 'green', width: '500px', height: '500px', marginTop: '20px' }} // TODO: move styling to CSS
            onClick={onMovement}
        >
            <p>This is the playable map. Shops, tables, etc. will go here.</p>
            <p>Sizing, colors, etc. are all subject to change.</p>
            <p>This is a placeholder.</p>
      </div>
    );
}