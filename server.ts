import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import http from "http";
import path from "path";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";

// Setup DB
const db = new Database('./database.sqlite');
db.pragma('journal_mode = WAL');

// Helper to check if a column exists and add it if missing
function ensureColumn(tableName: string, columnName: string, columnDef: string) {
  try {
    const info = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
    const exists = info.some(col => col.name === columnName);
    if (!exists) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
      console.log(`Migration: Added column ${columnName} to ${tableName}`);
    }
  } catch (e) {
    console.error(`Migration failed for ${tableName}.${columnName}`, e);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    ID TEXT PRIMARY KEY,
    RealName TEXT,
    Email TEXT,
    Password TEXT,
    ProfilePhotos TEXT,
    TrustScore REAL,
    Thumbnail TEXT,
    Bio TEXT,
    Instagram TEXT,
    Twitter TEXT,
    Gender TEXT,
    HeightCm REAL,
    JobTitle TEXT,
    Company TEXT,
    School TEXT,
    Degree TEXT
  );
`);

// MIGRATIONS: Add new columns if they don't exist
ensureColumn('users', 'HostedCount', 'INTEGER DEFAULT 0');
ensureColumn('users', 'HostingRating', 'REAL DEFAULT 0');
ensureColumn('users', 'Reach', 'INTEGER DEFAULT 0');

db.exec(`
  CREATE TABLE IF NOT EXISTS parties (
    ID TEXT PRIMARY KEY,
    HostID TEXT,
    Title TEXT,
    Description TEXT,
    PartyPhotos TEXT,
    StartTime TEXT,
    DurationHours INTEGER,
    Status TEXT,
    Address TEXT,
    City TEXT,
    GeoLat REAL,
    GeoLon REAL,
    MaxCapacity INTEGER,
    CurrentGuestCount INTEGER,
    VibeTags TEXT,
    Rules TEXT,
    ChatRoomID TEXT,
    Thumbnail TEXT,
    CrowdfundTarget REAL,
    CrowdfundCurrent REAL,
    PartyType TEXT
  );
  CREATE TABLE IF NOT EXISTS chats (
    ID TEXT PRIMARY KEY,
    PartyID TEXT,
    Title TEXT,
    ImageUrl TEXT,
    RecentMessages TEXT,
    IsGroup INTEGER,
    ParticipantIDs TEXT
  );
  CREATE TABLE IF NOT EXISTS registrations (
    ID TEXT PRIMARY KEY,
    PartyID TEXT,
    UserID TEXT,
    Status TEXT, -- 'PENDING', 'APPROVED'
    Timestamp TEXT
  );
`);

const parseJSON = (str: any, def: any = []) => { 
  try { 
    return str ? JSON.parse(str) : def; 
  } catch { 
    return def; 
  } 
};

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // radius of earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const mapUser = (row: any) => ({ ...row, ProfilePhotos: parseJSON(row.ProfilePhotos) });
const mapParty = (row: any) => ({ ...row, PartyPhotos: parseJSON(row.PartyPhotos), VibeTags: parseJSON(row.VibeTags), Rules: parseJSON(row.Rules) });
const mapChat = (row: any) => ({ ...row, RecentMessages: parseJSON(row.RecentMessages), ParticipantIDs: parseJSON(row.ParticipantIDs), IsGroup: Boolean(row.IsGroup) });

function getEnrichedParties(db: any) {
  const parties = db.prepare('SELECT * FROM parties').all().map(mapParty);
  return parties.map((p: any) => {
    const hostData = db.prepare('SELECT RealName, Thumbnail, ProfilePhotos FROM users WHERE ID = ?').get(p.HostID) as any;
    if (hostData) {
       p.HostName = hostData.RealName || "";
       p.HostThumbnail = hostData.Thumbnail || parseJSON(hostData.ProfilePhotos)?.[0] || "";
    }
    return p;
  });
}

function getEnrichedChats(db: any, userID: string) {
  const allChats = db.prepare('SELECT * FROM chats').all();
  return allChats.map((c: any) => {
    const chat = mapChat(c);
    if (!chat.IsGroup) {
      const otherID = chat.ParticipantIDs?.find((id: string) => id !== userID);
      if (otherID) {
        const other = db.prepare('SELECT RealName, Thumbnail, ProfilePhotos FROM users WHERE ID = ?').get(otherID) as any;
        if (other) {
           chat.Title = other.RealName || chat.Title;
           chat.ImageUrl = other.Thumbnail || parseJSON(other.ProfilePhotos)?.[0] || chat.ImageUrl;
        }
      }
    }
    return chat;
  }).filter((c: any) => c.ParticipantIDs?.includes(userID));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Request logging
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // API Endpoints
  const getUserStmt = db.prepare('SELECT * FROM users WHERE Email = ?');
  const getUserByIdStmt = db.prepare('SELECT * FROM users WHERE ID = ?');
  const insertUserStmt = db.prepare(
    'INSERT INTO users (ID, RealName, Email, Password, ProfilePhotos, TrustScore, Thumbnail, Bio, Instagram, Twitter, Gender, HeightCm, JobTitle, Company, School, Degree, HostedCount, HostingRating, Reach) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  app.get('/api/users/:id', (req, res) => {
    const userRow = getUserByIdStmt.get(req.params.id) as any;
    if (!userRow) return res.status(404).json({ error: "User not found" });
    const safeUser = { ...userRow };
    delete safeUser.Password;
    res.json(mapUser(safeUser));
  });

  app.post('/login', (req, res) => {
    const { email, password } = req.body;
    let userRow = getUserStmt.get(email) as any;
    
    if (!userRow || !bcrypt.compareSync(password, userRow.Password as string)) {
       return res.status(401).json({ error: "Invalid username or password" });
    }
    const safeUser = { ...userRow };
    delete safeUser.Password;
    res.json(mapUser(safeUser));
  });

  app.post('/register', (req, res) => {
    const { user, password } = req.body;
    
    if (!password || password.length < 8) {
       return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }
    
    const existingRow = getUserStmt.get(user.Email);
    if (existingRow) {
       return res.status(400).json({ error: "User already exists with this email" });
    }

    const newID = 'user_' + Date.now();
    const hash = bcrypt.hashSync(password, 10);
    
    insertUserStmt.run(
      newID, user.RealName, user.Email, hash, JSON.stringify(user.ProfilePhotos || []), 100, user.Thumbnail || '', user.Bio || '', user.Instagram || '', user.Twitter || '', user.Gender || '', user.HeightCm || 0, user.JobTitle || '', user.Company || '', user.School || '', user.Degree || '', 0, 0, 0
    );
    const userRow = getUserByIdStmt.get(newID);
    const safeUser = { ...userRow } as any;
    delete safeUser.Password;
    res.json(mapUser(safeUser));
  });

  app.all('/register', (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: "Only POST allowed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);
  
  // WebSocket Server
  const wss = new WebSocketServer({ server, path: '/ws' });

  const getChatsStmt = db.prepare('SELECT * FROM chats');
  const insertPartyStmt = db.prepare(`
    INSERT INTO parties (ID, HostID, Title, Description, PartyPhotos, StartTime, DurationHours, Status, Address, City, GeoLat, GeoLon, MaxCapacity, CurrentGuestCount, VibeTags, Rules, ChatRoomID, Thumbnail, CrowdfundTarget, CrowdfundCurrent, PartyType) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertChatWSRoomStmt = db.prepare(`
     INSERT INTO chats (ID, PartyID, Title, ImageUrl, RecentMessages, IsGroup, ParticipantIDs) 
     VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const getPartyByIdStmt = db.prepare('SELECT * FROM parties WHERE ID = ?');
  const updateUserStmt = db.prepare('UPDATE users SET RealName = ?, Bio = ?, Thumbnail = ?, ProfilePhotos = ?, Instagram = ?, Twitter = ?, Gender = ?, HeightCm = ?, JobTitle = ?, Company = ?, School = ?, Degree = ?, HostedCount = ?, HostingRating = ?, Reach = ? WHERE ID = ?');

  wss.on('connection', (ws: any, req) => {
    ws.on('message', (message: any) => {
       try {
          const { Event, Payload, Token } = JSON.parse(message.toString());
          if (Token) ws.userID = Token;
          
          const send = (ev: string, data: any) => {
             if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ Event: ev, Payload: data }));
             }
          };

          const broadcast = (ev: string, data: any) => {
             wss.clients.forEach(client => {
                if (client.readyState === 1) { // 1 is OPEN
                   client.send(JSON.stringify({ Event: ev, Payload: data }));
                }
             })
          };

          const broadcastChats = () => {
             wss.clients.forEach((client: any) => {
                if (client.readyState === 1 && client.userID) {
                   client.send(JSON.stringify({ Event: 'CHATS_LIST', Payload: getEnrichedChats(db, client.userID) }));
                }
             });
          };

          switch (Event) {
             case 'GET_CHATS': {
               send('CHATS_LIST', getEnrichedChats(db, Token));
               break;
             }
             case 'GET_FEED': {
               const { Lat, Lon } = Payload || {};
               let mappedParties = getEnrichedParties(db);
               
               if (typeof Lat === 'number' && typeof Lon === 'number') {
                 mappedParties.sort((a: any, b: any) => {
                   const distA = getDistance(Lat, Lon, a.GeoLat || 0, a.GeoLon || 0);
                   const distB = getDistance(Lat, Lon, b.GeoLat || 0, b.GeoLon || 0);
                   return distB - distA; // Descending distance (farthest first, closest last)
                 });
               }
               
               send('FEED_UPDATE', mappedParties);
               break;
             }
             case 'SWIPE': {
                const { PartyID, Direction } = Payload;
                if (Direction === 'right') {
                   const regID = `reg_${Date.now()}_${Token}`;
                   const existing = db.prepare('SELECT * FROM registrations WHERE PartyID = ? AND UserID = ?').get(PartyID, Token);
                   if (!existing) {
                      db.prepare('INSERT INTO registrations (ID, PartyID, UserID, Status, Timestamp) VALUES (?, ?, ?, ?, ?)').run(
                         regID, PartyID, Token, 'PENDING', new Date().toISOString()
                      );
                   }
                }
                break;
             }
             case 'CREATE_PARTY': {
               if (!Payload.Title?.trim() || Payload.Title.length < 3) {
                  return send('ERROR', { message: 'Title too short' });
               }
               if (!Payload.Description?.trim() || Payload.Description.length < 10) {
                  return send('ERROR', { message: 'Description too short' });
               }
               if (!Payload.City?.trim()) {
                  return send('ERROR', { message: 'City is required' });
               }
               if (!Payload.Address?.trim()) {
                  return send('ERROR', { message: 'Address is required' });
               }
               if (!Payload.PartyType?.trim()) {
                  return send('ERROR', { message: 'Party vibe/type is required' });
               }
               if (!Payload.StartTime) {
                  return send('ERROR', { message: 'Start time is required' });
               }
               if (!Payload.GeoLat || !Payload.GeoLon) {
                  return send('ERROR', { message: 'Map location is required' });
               }
               if (Number(Payload.MaxCapacity) <= 0 || Number(Payload.MaxCapacity) > 300) {
                  return send('ERROR', { message: 'Capacity must be between 1 and 300' });
               }
               if (Number(Payload.DurationHours) <= 0 || Number(Payload.DurationHours) > 6) {
                  return send('ERROR', { message: 'Duration must be between 1 and 6 hours' });
               }
               if (!Payload.PartyPhotos?.length) {
                  return send('ERROR', { message: 'At least one photo required' });
               }

               const pID = 'party_' + Date.now();
               const imgUrl = Payload.PartyPhotos?.[0] || Payload.Thumbnail || '';
               
               insertPartyStmt.run(
                 pID, 
                 Token, 
                 Payload.Title, 
                 Payload.Description, 
                 JSON.stringify(Payload.PartyPhotos || []), 
                 Payload.StartTime, 
                 Payload.DurationHours, 
                 'OPEN', 
                 Payload.Address, 
                 Payload.City, 
                 Payload.GeoLat || 0, 
                 Payload.GeoLon || 0, 
                 Payload.MaxCapacity, 
                 1, 
                 JSON.stringify(Payload.VibeTags || []), 
                 JSON.stringify(Payload.Rules || []), 
                 Payload.ChatRoomID, 
                 imgUrl,
                 Payload.CrowdfundTarget || 0,
                 0, // CrowdfundCurrent
                 Payload.PartyType || 'OTHER'
               );
               
               insertChatWSRoomStmt.run(
                 Payload.ChatRoomID, pID, Payload.Title, imgUrl, JSON.stringify([]), 1, JSON.stringify([Token])
               );
               
               const newlyCreatedParty = getPartyByIdStmt.get(pID);
               if (newlyCreatedParty) send('PARTY_CREATED', mapParty(newlyCreatedParty));

               const updatedParties = getEnrichedParties(db);
               broadcast('FEED_UPDATE', updatedParties);

               const updatedChats = getChatsStmt.all() as any[];
               send('CHATS_LIST', updatedChats.map(mapChat).filter((c: any) => c.ParticipantIDs?.includes(Token)));
               break;
             }
             case 'UPDATE_PROFILE': {
                updateUserStmt.run(
                    Payload.RealName, 
                    Payload.Bio, 
                    Payload.Thumbnail, 
                    JSON.stringify(Payload.ProfilePhotos || (Payload.Thumbnail ? [Payload.Thumbnail] : [])), 
                    Payload.Instagram || '', 
                    Payload.Twitter || '', 
                    Payload.Gender || '',
                    Payload.HeightCm || 0,
                    Payload.JobTitle || '',
                    Payload.Company || '',
                    Payload.School || '',
                    Payload.Degree || '',
                    Payload.HostedCount || 0,
                    Payload.HostingRating || 0,
                    Payload.Reach || 0,
                    Token
                );
                const updatedUser = getUserByIdStmt.get(Token);
                if(updatedUser) send('PROFILE_UPDATED', mapUser(updatedUser));
                break;
             }
             case 'CREATE_DM': {
                const { TargetUserID } = Payload;
                const me = getUserByIdStmt.get(Token) as any;
                const other = getUserByIdStmt.get(TargetUserID) as any;
                if (me && other) {
                   const allChats = getChatsStmt.all().map(mapChat) as any[];
                   const existing = allChats.find((c: any) => c.IsGroup === false && c.ParticipantIDs.includes(Token) && c.ParticipantIDs.includes(TargetUserID));
                   
                   let chatID;
                   if (existing) {
                      chatID = existing.ID;
                   } else {
                      chatID = 'dm_' + Date.now() + '_' + Token + '_' + TargetUserID;
                      insertChatWSRoomStmt.run(
                        chatID, 'DM', `${me.RealName} & ${other.RealName}`, '', JSON.stringify([]), 0, JSON.stringify([Token, TargetUserID])
                      );
                   }
                   const updatedChats = getChatsStmt.all().map(mapChat) as any[];
                   broadcastChats();
                   send('DM_CREATED', { ChatID: chatID });
                }
                break;
             }
             case 'SEND_MESSAGE': {
                const { ChatID, Content } = Payload;
                const chatRow = db.prepare('SELECT * FROM chats WHERE ID = ?').get(ChatID);
                if (chatRow) {
                   const chat = mapChat(chatRow);
                   const newMessage = {
                      SenderID: Token,
                      Timestamp: new Date().toISOString(),
                      Content
                   };
                   const updatedMessages = [...(chat.RecentMessages || []), newMessage];
                   db.prepare('UPDATE chats SET RecentMessages = ? WHERE ID = ?').run(
                      JSON.stringify(updatedMessages), ChatID
                   );
                   
                   const refreshedChats = db.prepare('SELECT * FROM chats').all().map(mapChat);
                   broadcast('CHATS_LIST', refreshedChats);
                }
                break;
             }
             case 'GET_REGISTRATIONS': {
                const { PartyID } = Payload;
                const regs = db.prepare('SELECT registrations.*, users.RealName, users.Thumbnail as UserThumbnail FROM registrations JOIN users ON registrations.UserID = users.ID WHERE PartyID = ?').all(PartyID);
                send('REGISTRATIONS_LIST', regs);
                break;
             }
             case 'APPROVE_JOIN_REQUEST': {
                const { RegistrationID } = Payload;
                const reg = db.prepare('SELECT * FROM registrations WHERE ID = ?').get(RegistrationID) as any;
                if (reg && reg.Status === 'PENDING') {
                   db.prepare('UPDATE registrations SET Status = ? WHERE ID = ?').run('APPROVED', RegistrationID);
                   const party = db.prepare('SELECT * FROM parties WHERE ID = ?').get(reg.PartyID) as any;
                   if (party) {
                      const chat = db.prepare('SELECT * FROM chats WHERE ID = ?').get(party.ChatRoomID) as any;
                      if (chat) {
                         const pIDs = JSON.parse(chat.ParticipantIDs);
                         if (!pIDs.includes(reg.UserID)) {
                            pIDs.push(reg.UserID);
                            db.prepare('UPDATE chats SET ParticipantIDs = ? WHERE ID = ?').run(JSON.stringify(pIDs), party.ChatRoomID);
                            db.prepare('UPDATE parties SET CurrentGuestCount = CurrentGuestCount + 1 WHERE ID = ?').run(reg.PartyID);
                         }
                      }
                   }
                   const regs = db.prepare('SELECT registrations.*, users.RealName, users.Thumbnail as UserThumbnail FROM registrations JOIN users ON registrations.UserID = users.ID WHERE PartyID = ?').all(reg.PartyID);
                   send('REGISTRATIONS_LIST', regs);
                   const refreshedParties = getEnrichedParties(db);
                   broadcast('FEED_UPDATE', refreshedParties);
                   const refreshedChats = db.prepare('SELECT * FROM chats').all().map(mapChat);
                   broadcast('CHATS_LIST', refreshedChats);
                }
                break;
             }
             case 'DELETE_PARTY': {
                const { PartyID } = Payload;
                const party = db.prepare('SELECT * FROM parties WHERE ID = ?').get(PartyID) as any;
                if (party && party.HostID === Token) {
                   db.prepare('DELETE FROM parties WHERE ID = ?').run(PartyID);
                   db.prepare('DELETE FROM chats WHERE ID = ?').run(party.ChatRoomID);
                   db.prepare('DELETE FROM registrations WHERE PartyID = ?').run(PartyID);
                   
                   const refreshedParties = getEnrichedParties(db);
                   broadcast('FEED_UPDATE', refreshedParties);
                   const refreshedChats = db.prepare('SELECT * FROM chats').all().map(mapChat);
                   broadcast('CHATS_LIST', refreshedChats);
                }
                break;
             }
          }
       } catch (e) {
          console.error('WS Error processing message', e);
       }
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server + SQLite WS running on port ${PORT}`);
  });
}

startServer();
