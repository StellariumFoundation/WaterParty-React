import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Party, ChatRoom } from './types';
import { WS_BASE, API_BASE } from './constants';
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
  addLocalChat: (chat: ChatRoom) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [feed, setFeed] = useState<Party[]>([]);
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const messageQueueRef = useRef<{ event: string; payload: any }[]>([]);
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

  const fastHTTPFetchAll = async (userId: string) => {
    try {
      // 1. Instantly fetch updated user profile
      fetch(`${API_BASE}/api/users/${userId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && !data.error) {
            setUser(data);
            localStorage.setItem('waterparty_user', JSON.stringify(data));
          }
        }).catch(() => {});

      // 2. Instantly fetch chats directly
      fetch(`${API_BASE}/api/chats?userId=${userId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && !data.error) {
            setChats(data);
          }
        }).catch(() => {});

      // 3. Instantly fetch latest parties feed
      fetch(`${API_BASE}/api/feed?userId=${userId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && !data.error) {
            setFeed(data);
          }
        }).catch(() => {});
    } catch (e) {}
  };

  useEffect(() => {
    const stored = localStorage.getItem('waterparty_user');
    if (stored) {
      try { 
        const parsed = JSON.parse(stored);
        setUser(parsed);
        fastHTTPFetchAll(parsed.ID);
      } catch(e){}
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
          send('GET_FEED', { Lat: coords?.lat || 0, Lon: coords?.lon || 0 });
          
          // Flush any messages queued during startup/connecting phase
          while (messageQueueRef.current.length > 0) {
             const queued = messageQueueRef.current.shift();
             if (queued) {
                send(queued.event, queued.payload);
             }
          }
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
    } else {
      // Queue the message to make sure it's sent as soon as the WebSocket connection is active!
      const exists = messageQueueRef.current.some(m => m.event === event && JSON.stringify(m.payload) === JSON.stringify(payload));
      if (!exists) {
        messageQueueRef.current.push({ event, payload });
      }
    }
  };

  const login = (u: User) => {
    setUser(u);
    localStorage.setItem('waterparty_user', JSON.stringify(u));
    fastHTTPFetchAll(u.ID);
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

  const addLocalChat = (chat: ChatRoom) => {
    setChats(prev => {
      if (prev.some(c => c.ID === chat.ID)) {
        return prev.map(c => c.ID === chat.ID ? chat : c);
      }
      return [...prev, chat];
    });
  };

  return (
    <StoreContext.Provider value={{ user, feed, chats, registrations, coords, login, logout, sendSocketMessage, removeFromFeed, refreshLocation, addLocalChat }}>
      {children}
    </StoreContext.Provider>
  )
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
};
