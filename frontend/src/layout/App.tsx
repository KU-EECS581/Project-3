/**
 * @file App.tsx
 * @description Application root: providers + routing configuration.
 * @class App
 * @module Layout
 * @inputs None (wraps global providers & routes)
 * @outputs Route tree rendering per URL
 * @external_sources React Router, Context Providers
 * @author Riley Meyerkorth
 * @date 2025-10-24
 */

import "@styles/global.css";
import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router';
import { RoutePath } from './enums';
import { TitlePage, CreateCharacterPage, JoinGamePage, GameWorldPage, BankPage, BlackjackGamePage, PokerGamePage, ShopPage, SlotsGamePage } from './pages';
import { UserDataProvider } from '@/contexts';
import { GameServerProvider } from '@/api';
import { DeckProvider } from '@/contexts';

function App() {
  return (
    <UserDataProvider>
      <GameServerProvider>
        <DeckProvider>
          <BrowserRouter>
              <Routes>
                  <Route
                      path={RoutePath.HOME}
                      element={<TitlePage />} />
                  <Route
                      path={RoutePath.CREATE_PLAYER}
                      element={<CreateCharacterPage />} />
                  <Route
                      path={RoutePath.JOIN_GAME}
                      element={<JoinGamePage />} />
                  <Route
                      path={RoutePath.MAP}
                      element={<GameWorldPage />} />
                  <Route
                      path={RoutePath.MAP_BANK}
                      element={<BankPage />} />
                  <Route
                      path={RoutePath.MAP_SHOP}
                      element={<ShopPage />} />
                  <Route
                      path={RoutePath.MAP_SLOTS}
                      element={<SlotsGamePage />} />
                  <Route
                      path={RoutePath.MAP_BLACKJACK}
                      element={<BlackjackGamePage />} />
                  <Route
                      path={RoutePath.MAP_POKER}
                      element={<PokerGamePage />} />
              </Routes>
          </BrowserRouter>
        </DeckProvider>
      </GameServerProvider>
    </UserDataProvider>
  )
}

export default App
