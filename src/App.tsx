/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { SwipePage } from './pages/SwipePage';
import { MessagesPage } from './pages/MessagesPage';
import { CreatePartyPage } from './pages/CreatePartyPage';
import { ChatRoomPage } from './pages/ChatRoomPage';
import { ProfilePage } from './pages/ProfilePage';
import { StoreProvider, useStore } from './lib/Store';
import { AuthPage } from './pages/AuthPage';
import { getAssetUrl } from './lib/constants';

function MainApp() {
  const location = useLocation();
  const { user } = useStore();
  
  if (!user) return <AuthPage />;

  return (
    <div className="bg-[#090A10] h-[100dvh] w-full font-sans text-white flex flex-col overflow-hidden selection:bg-[#00D2FF]/30">
      
      {/* Main Panel */}
      <div className="flex-1 relative flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Core Screen Space with custom responsive constraints */}
        <main className="flex-1 relative overflow-hidden bg-gradient-to-b from-[#121320] to-[#0A0B14]">
          <Routes>
            <Route path="/" element={<SwipePage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/chat/:chatId" element={<ChatRoomPage />} />
            <Route path="/create" element={<CreatePartyPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </main>
        
        {/* Bottom Navigation */}
        {!location.pathname.startsWith('/chat/') && (
          <div className="fixed bottom-0 left-0 w-full h-[64px] z-[100] pb-env(safe-area-inset-bottom)">
            <BottomNav />
          </div>
        )}
        
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <StoreProvider>
        <MainApp />
      </StoreProvider>
    </Router>
  );
}
