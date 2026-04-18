/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { SwipePage } from './pages/SwipePage';
import { MessagesPage } from './pages/MessagesPage';
import { CreatePartyPage } from './pages/CreatePartyPage';
import { ProfilePage } from './pages/ProfilePage';
import { StoreProvider, useStore } from './lib/Store';
import { AuthPage } from './pages/AuthPage';

function MainApp() {
  const { user } = useStore();
  
  if (!user) return <AuthPage />;

  return (
    <Router>
      <div className="bg-[#0F0F13] min-h-[100dvh] flex justify-center w-full font-sans text-white selection:bg-[#00D2FF]/30">
        <div className="w-full max-w-md h-[100dvh] bg-gradient-to-b from-[#1A1A24] to-[#0F0F13] relative flex flex-col xl:shadow-[0_40px_100px_rgba(0,0,0,0.6)] xl:rounded-[40px] xl:my-4 xl:h-[calc(100vh-2rem)] overflow-hidden xl:border-8 xl:border-[#2A2A35]">
          
          <main className="flex-1 relative overflow-hidden">
            <Routes>
              <Route path="/" element={<SwipePage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/create" element={<CreatePartyPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </main>
          
          <BottomNav />
          
        </div>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <MainApp />
    </StoreProvider>
  );
}
