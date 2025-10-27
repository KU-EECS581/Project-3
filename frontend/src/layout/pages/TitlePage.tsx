/**
 * @file TitlePage.tsx
 * @description Enhanced title screen with Casino Cavern styling.
 * @author
 *  Riley Meyerkorth (base structure)
 *  Ty Farrington (visual design)
 * @date 2025-10-26
 */

import { useUserData } from "@/hooks";
import { useCallback } from "react";
import { useNavigate } from "react-router";
import { RoutePath } from "../enums";
import casinoImage from "@/assets/home/casino-cavern.png";
import "@styles/global.css";

export function TitlePage() {
  const userData = useUserData();
  const navigate = useNavigate();

  const handleStartGame = useCallback(() => {
    const nextPage = userData.exists ? RoutePath.JOIN_GAME : RoutePath.CREATE_PLAYER;
    navigate(nextPage);
  }, [userData, navigate]);

  const handleResetPlayerData = useCallback(() => {
    if (!confirm("Are you sure you want to reset your player data?")) return;
    userData.clearUser();
  }, [userData]);

  return (
    <div className="container" style={{ textAlign: "center" }}>
      <div
        className="card"
        style={{
          display: "inline-block",
          textAlign: "center",
          paddingBottom: "40px",
          width: "85%",
          maxWidth: "1100px",
        }}
      >
        <h1 className="h1">Casino Cavern</h1>
        <p className="subtle">
          Create a table and invite your friends, or join a preexisting game.
        </p>

        <div className="row" style={{ justifyContent: "center", marginTop: "12px" }}>
          <button className="btn" onClick={handleStartGame}>
            {userData.exists ? "Join Game" : "Create Player"}
          </button>
          <button
            className="btn"
            disabled={!userData.exists}
            onClick={handleResetPlayerData}
          >
            Reset Player Data
          </button>
        </div>

        <div
          style={{
            marginTop: "40px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <img
            src={casinoImage}
            alt="Casino Cavern"
            style={{
              width: "85%",
              maxWidth: "950px",
              borderRadius: "18px",
              boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
              transition: "transform 0.6s ease, box-shadow 0.6s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "scale(1.02)";
              e.currentTarget.style.boxShadow = "0 18px 60px rgba(0,0,0,0.5)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.45)";
            }}
          />
        </div>
      </div>
    </div>
  );
}