import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User, Party, ChatRoom } from './types';
import { WS_BASE } from './constants';

interface StoreContextType {
  user: User | null;
  feed: Party[];
  chats: ChatRoom[];
  login: (u: User) => void;
  logout: () => void;
  sendSocketMessage: (event: string, payload: any) => void;
  removeFromFeed: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [feed, setFeed] = useState<Party[]>([]);
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('waterparty_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch(e){}
    }
  }, []);

  useEffect(() => {
    if (!user) {
      socketRef.current?.close();
      socketRef.current = null;
      return;
    }
    
    let ws: WebSocket | null = null;
    const connect = () => {
       ws = new WebSocket(`${WS_BASE}?uid=${user.ID}`);
       socketRef.current = ws;

       ws.onopen = () => {
          const send = (ev: string, payload: any) => {
             ws?.send(JSON.stringify({ Event: ev, Payload: payload, Token: user.ID }));
          };
          send('GET_CHATS', {});
       };

       ws.onmessage = (msg) => {
         try {
           const data = JSON.parse(msg.data);
           if (data.Event === 'FEED_UPDATE') {
             setFeed(data.Payload || []);
           } else if (data.Event === 'CHATS_LIST') {
             setChats(data.Payload || []);
           } else if (data.Event === 'PROFILE_UPDATED') {
             setUser(data.Payload);
             localStorage.setItem('waterparty_user', JSON.stringify(data.Payload));
           }
         } catch(e) {}
       };

       ws.onclose = () => {
         // Minimal reconnect
         setTimeout(() => {
            if (socketRef.current === ws) connect();
         }, 3000);
       };
    };
    
    connect();

    return () => {
      ws?.close();
      socketRef.current = null;
    }
  }, [user?.ID]);

  const sendSocketMessage = (event: string, payload: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN && user) {
      socketRef.current.send(JSON.stringify({
        Event: event, Payload: payload, Token: user.ID
      }));
    }
  };

  const login = (u: User) => {
    setUser(u);
    localStorage.setItem('waterparty_user', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    setFeed([]);
    setChats([]);
    localStorage.removeItem('waterparty_user');
    socketRef.current?.close();
    socketRef.current = null;
  };

  const removeFromFeed = (id: string) => {
     setFeed(prev => prev.filter(p => p.ID !== id));
  }

  return (
    <StoreContext.Provider value={{ user, feed, chats, login, logout, sendSocketMessage, removeFromFeed }}>
      {children}
    </StoreContext.Provider>
  )
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
};
