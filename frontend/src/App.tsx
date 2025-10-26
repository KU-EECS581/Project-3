/**
 * @file App.tsx
 * @description Main application component.
 * @author Riley Meyerkorth
 * @date 2025-10-24
 */

import { useCallback } from 'react';
import './App.css'
import { CreatePlayerForm } from './components'
import { useUserData } from './hooks';

function App() {
  const userData = useUserData();

  const handleCreatePlayer = useCallback((name: string) => {
    console.log("Creating player with name:", name);
    userData.saveUser({ name: name, balance: 1000, dateCreated: new Date(), dateUpdated: new Date() });
  }, [userData]);

  const handleResetPlayer = useCallback(() => {
    userData.clearUser();
  }, [userData]);

  return (
    <>
      <h1>EECS 581 - Casino</h1>

      <CreatePlayerForm hidden={userData.exists} onCreatePlayer={handleCreatePlayer} />

      <button onClick={handleResetPlayer}>Reset Player Data</button>
    </>
  )
}

export default App
