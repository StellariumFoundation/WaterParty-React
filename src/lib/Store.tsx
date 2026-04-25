import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Party, ChatRoom } from './types';
import { WS_BASE } from './constants';
import { Geolocation } from '@capacitor/geolocation';

interface StoreContextType {
  user: User | null;
  feed: Party[];
  chats: ChatRoom[];
  registrations: any[];
  coords: { lat: number; lon: number } | null;
  login: (u: User) => void;
  logout: () => void;
  sendSocketMessage: (event: string, payload: any) => void;
  removeFromFeed: (id: string) => void;
  refreshLocation: (onSuccess?: (coords: { lat: number; lon: number }) => void) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [feed, setFeed] = useState<Party[]>([]);
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const navigate = useRef<ReturnType<typeof useNavigate> | null>(null);
  const navTrigger = useNavigate();
  
  useEffect(() => {
    navigate.current = navTrigger;
  }, [navTrigger]);

  const refreshLocation = async (onSuccess?: (coords: { lat: number; lon: number }) => void) => {
    try {
      if (window.location.protocol !== 'file:' && !(window as any).Capacitor) {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const newCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
            setCoords(newCoords);
            if (onSuccess) onSuccess(newCoords);
          }, (error) => {
            console.error("Browser location error:", error);
          });
        }
      } else {
        await Geolocation.requestPermissions();
        const pos = await Geolocation.getCurrentPosition();
        const newCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setCoords(newCoords);
        if (onSuccess) onSuccess(newCoords);
      }
    } catch (e) {
      console.warn("Location permission denied or unavailable:", e);
    }
  };

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
           } else if (data.Event === 'REGISTRATIONS_LIST') {
             setRegistrations(data.Payload || []);
           } else if (data.Event === 'DM_CREATED') {
             if (navigate.current) navigate.current(`/chat/${data.Payload.ChatID}`);
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
    <StoreContext.Provider value={{ user, feed, chats, registrations, coords, login, logout, sendSocketMessage, removeFromFeed, refreshLocation }}>
      {children}
    </StoreContext.Provider>
  )
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
};
