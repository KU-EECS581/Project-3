/**
 * @file App.tsx
 * @description Main application component.
 * @author Riley Meyerkorth
 * @date 2025-10-24
 */

import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router';
import { RoutePath } from './enums';
import { TitlePage, CreateCharacterPage, JoinGamePage } from './pages';
import { UserDataProvider, GameServerProvider } from '@/contexts';

function App() {
  return (
    <UserDataProvider>
      <GameServerProvider>
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
                    path={RoutePath.GAME_WORLD}
                    element={<JoinGamePage />} />
            </Routes>
        </BrowserRouter>
      </GameServerProvider>
    </UserDataProvider>
  )
}

export default App
