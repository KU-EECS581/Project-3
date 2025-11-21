/**
 * @file ShopPage.tsx
 * @description Placeholder in-world shop page.
 * @class ShopPage
 * @module Pages/Map
 * @inputs Navigation
 * @outputs Back navigation
 * @external_sources React Router
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import { useCallback } from "react";
import { useNavigate } from "react-router";
import { RoutePath } from "../enums";

export function ShopPage() {
    const navigate = useNavigate();

    const handleBackToMap = useCallback(() => {
        navigate(RoutePath.MAP); // Navigate back to the previous page (game world)
    }, [navigate]);

    return (
        <div>
            <h1>Welcome to the shop</h1>
            {/* Add shop components here */}
            <button onClick={handleBackToMap}>Back to Map</button>
        </div>
    );
}