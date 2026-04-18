import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import http from "http";
import path from "path";
import crypto from "crypto";
import { DatabaseSync } from "node:sqlite";

// Setup DB
const db = new DatabaseSync('./database.sqlite');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    ID TEXT PRIMARY KEY,
    RealName TEXT,
    Email TEXT,
    Password TEXT,
    ProfilePhotos TEXT,
    TrustScore REAL,
    Thumbnail TEXT,
    Bio TEXT
  );
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
    Thumbnail TEXT
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
`);

const parseJSON = (str: any, def: any = []) => { 
  try { 
    return str ? JSON.parse(str) : def; 
  } catch { 
    return def; 
  } 
};

const mapUser = (row: any) => ({ ...row, ProfilePhotos: parseJSON(row.ProfilePhotos) });
const mapParty = (row: any) => ({ ...row, PartyPhotos: parseJSON(row.PartyPhotos), VibeTags: parseJSON(row.VibeTags), Rules: parseJSON(row.Rules) });
const mapChat = (row: any) => ({ ...row, RecentMessages: parseJSON(row.RecentMessages), ParticipantIDs: parseJSON(row.ParticipantIDs), IsGroup: Boolean(row.IsGroup) });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Seed DB if empty
  const existingPartiesStmt = db.prepare('SELECT * FROM parties');
  const existingParties = existingPartiesStmt.all();
  
  if (existingParties.length === 0) {
    const dummyId = 'party_1';
    
    // Insert party
    const insertParty = db.prepare(
      `INSERT INTO parties (ID, HostID, Title, Description, PartyPhotos, StartTime, DurationHours, Status, Address, City, GeoLat, GeoLon, MaxCapacity, CurrentGuestCount, VibeTags, Rules, ChatRoomID, Thumbnail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertParty.run(
        dummyId, 
        'host_xyz', 
        'Neon Rooftop Bash', 
        'An exclusive rooftop experience.', 
        JSON.stringify(['https://images.unsplash.com/photo-1574169208507-84376144848b?q=80&w=800&auto=format&fit=crop']), 
        new Date(Date.now() + 4 * 3600 * 1000).toISOString(), 
        4, 
        'OPEN', 
        '123 Fake St', 
        'Brooklyn, NY', 
        40.7, 
        -73.9, 
        50, 
        15, 
        JSON.stringify(['Rooftop', 'House Music']), 
        JSON.stringify(['BYOB', 'Good Vibes Only']), 
        'chat_1', 
        'https://images.unsplash.com/photo-1574169208507-84376144848b?q=80&w=800&auto=format&fit=crop'
    );

    const insertChat = db.prepare(
      `INSERT INTO chats (ID, PartyID, Title, ImageUrl, RecentMessages, IsGroup, ParticipantIDs) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    insertChat.run(
        'chat_1', dummyId, 'Neon Rooftop Bash', 'https://images.unsplash.com/photo-1574169208507-84376144848b?q=80&w=800&auto=format&fit=crop', JSON.stringify([]), 1, JSON.stringify(['host_xyz'])
    );
  }

  app.use(express.json());

  // API Endpoints
  const getUserStmt = db.prepare('SELECT * FROM users WHERE Email = ?');
  const getUserByIdStmt = db.prepare('SELECT * FROM users WHERE ID = ?');
  const insertUserStmt = db.prepare(
    'INSERT INTO users (ID, RealName, Email, Password, ProfilePhotos, TrustScore, Thumbnail, Bio) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const hashPwd = (pw: string) => crypto.createHash('sha256').update(pw).digest('hex');

  app.post('/login', (req, res) => {
    const { email, password } = req.body;
    let userRow = getUserStmt.get(email);
    if (!userRow || userRow.Password !== hashPwd(password)) {
       return res.status(401).json({ error: "Invalid username or password" });
    }
    const safeUser = { ...userRow };
    delete safeUser.Password;
    res.json(mapUser(safeUser));
  });

  app.post('/register', (req, res) => {
    const { user, password } = req.body;
    const existingRow = getUserStmt.get(user.Email);
    if (existingRow) {
       return res.status(400).json({ error: "User already exists with this email" });
    }

    const newID = 'user_' + Date.now();
    insertUserStmt.run(
      newID, user.RealName, user.Email, hashPwd(password), JSON.stringify(user.ProfilePhotos || []), 100, user.Thumbnail || '', user.Bio || ''
    );
    const userRow = getUserByIdStmt.get(newID);
    const safeUser = { ...userRow };
    delete safeUser.Password;
    res.json(mapUser(safeUser));
  });

  app.get('/assets/:hash', (req, res) => {
     res.redirect(req.params.hash);
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
  const getPartiesStmt = db.prepare('SELECT * FROM parties');
  const insertPartyStmt = db.prepare(`
    INSERT INTO parties (ID, HostID, Title, Description, PartyPhotos, StartTime, DurationHours, Status, Address, City, GeoLat, GeoLon, MaxCapacity, CurrentGuestCount, VibeTags, Rules, ChatRoomID, Thumbnail) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertChatWSRoomStmt = db.prepare(`
     INSERT INTO chats (ID, PartyID, Title, ImageUrl, RecentMessages, IsGroup, ParticipantIDs) 
     VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const getPartyByIdStmt = db.prepare('SELECT * FROM parties WHERE ID = ?');
  const updateUserStmt = db.prepare('UPDATE users SET RealName = ?, Bio = ?, Thumbnail = ? WHERE ID = ?');

  wss.on('connection', (ws, req) => {
    ws.on('message', (message) => {
       try {
          const { Event, Payload, Token } = JSON.parse(message.toString());
          const send = (ev: string, data: any) => {
             if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ Event: ev, Payload: data }));
             }
          };

          const broadcast = (ev: string, data: any) => {
             wss.clients.forEach(client => {
                if (client.readyState === ws.OPEN) {
                   client.send(JSON.stringify({ Event: ev, Payload: data }));
                }
             })
          };

          switch (Event) {
             case 'GET_CHATS': {
               const allChats = getChatsStmt.all();
               const userChats = allChats.map(mapChat).filter((c: any) => c.ParticipantIDs?.includes(Token));
               send('CHATS_LIST', userChats);
               break;
             }
             case 'GET_FEED': {
               const dbParties = getPartiesStmt.all();
               send('FEED_UPDATE', dbParties.map(mapParty).filter((p: any) => p.HostID !== Token));
               break;
             }
             case 'SWIPE':
               break;
             case 'CREATE_PARTY': {
               const pID = 'party_' + Date.now();
               const imgUrl = Payload.PartyPhotos?.[0] || Payload.Thumbnail || '';
               
               insertPartyStmt.run(
                 pID, Token, Payload.Title, Payload.Description, JSON.stringify(Payload.PartyPhotos || []), Payload.StartTime, Payload.DurationHours, 'OPEN', Payload.Address, Payload.City, Payload.GeoLat || 0, Payload.GeoLon || 0, Payload.MaxCapacity, 1, JSON.stringify(Payload.VibeTags || []), JSON.stringify(Payload.Rules || []), Payload.ChatRoomID, imgUrl
               );
               
               insertChatWSRoomStmt.run(
                 Payload.ChatRoomID, pID, Payload.Title, imgUrl, JSON.stringify([]), 1, JSON.stringify([Token])
               );
               
               const newlyCreatedParty = getPartyByIdStmt.get(pID);
               if (newlyCreatedParty) send('PARTY_CREATED', mapParty(newlyCreatedParty));

               // Broadcast updated feed
               const updatedParties = getPartiesStmt.all();
               broadcast('FEED_UPDATE', updatedParties.map(mapParty));

               // Send user their updated chats
               const updatedChats = getChatsStmt.all();
               send('CHATS_LIST', updatedChats.map(mapChat).filter((c: any) => c.ParticipantIDs?.includes(Token)));
               break;
             }
             case 'UPDATE_PROFILE': {
               updateUserStmt.run(Payload.RealName, Payload.Bio, Payload.Thumbnail, Token);
               const updatedUser = getUserByIdStmt.get(Token);
               if(updatedUser) send('PROFILE_UPDATED', mapUser(updatedUser));
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
