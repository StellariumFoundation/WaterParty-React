import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import http from "http";
import path from "path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

// Setup DB
async function setupDB() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      ID TEXT PRIMARY KEY,
      RealName TEXT,
      Email TEXT,
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

  return db;
}

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
  const db = await setupDB();
  const app = express();
  const PORT = 3000;

  // Seed DB if empty
  const existingParties = await db.all('SELECT * FROM parties');
  if (existingParties.length === 0) {
    const dummyId = 'party_1';
    await db.run(
      `INSERT INTO parties (ID, HostID, Title, Description, PartyPhotos, StartTime, DurationHours, Status, Address, City, GeoLat, GeoLon, MaxCapacity, CurrentGuestCount, VibeTags, Rules, ChatRoomID, Thumbnail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
      ]
    );

    await db.run(
      `INSERT INTO chats (ID, PartyID, Title, ImageUrl, RecentMessages, IsGroup, ParticipantIDs) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['chat_1', dummyId, 'Neon Rooftop Bash', 'https://images.unsplash.com/photo-1574169208507-84376144848b?q=80&w=800&auto=format&fit=crop', JSON.stringify([]), 1, JSON.stringify(['host_xyz'])]
    );
  }

  app.use(express.json());

  // API Endpoints
  app.post('/login', async (req, res) => {
    const { email } = req.body;
    let userRow = await db.get('SELECT * FROM users WHERE Email = ?', [email]);
    if (!userRow) {
      const newUser = {
         ID: 'user_' + Date.now(),
         RealName: email.split('@')[0],
         Email: email,
         ProfilePhotos: JSON.stringify([]),
         TrustScore: 100,
         Thumbnail: '',
         Bio: ''
      };
      await db.run(
        'INSERT INTO users (ID, RealName, Email, ProfilePhotos, TrustScore, Thumbnail, Bio) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [newUser.ID, newUser.RealName, newUser.Email, newUser.ProfilePhotos, newUser.TrustScore, newUser.Thumbnail, newUser.Bio]
      );
      userRow = await db.get('SELECT * FROM users WHERE ID = ?', [newUser.ID]);
    }
    res.json(mapUser(userRow));
  });

  app.post('/register', async (req, res) => {
    const { user } = req.body;
    const newID = 'user_' + Date.now();
    await db.run(
      'INSERT INTO users (ID, RealName, Email, ProfilePhotos, TrustScore, Thumbnail, Bio) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      [newID, user.RealName, user.Email, JSON.stringify(user.ProfilePhotos || []), 100, user.Thumbnail || '', user.Bio || '']
    );
    const userRow = await db.get('SELECT * FROM users WHERE ID = ?', [newID]);
    res.json(mapUser(userRow));
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

  wss.on('connection', (ws, req) => {
    ws.on('message', async (message) => {
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
             case 'GET_CHATS':
               const allChats = await db.all('SELECT * FROM chats');
               const userChats = allChats.map(mapChat).filter((c: any) => c.ParticipantIDs?.includes(Token));
               send('CHATS_LIST', userChats);
               break;
             case 'GET_FEED':
               const dbParties = await db.all('SELECT * FROM parties');
               // Basic filtering out the host's own parties for feed
               send('FEED_UPDATE', dbParties.map(mapParty).filter(p => p.HostID !== Token));
               break;
             case 'SWIPE':
               break;
             case 'CREATE_PARTY':
               const pID = 'party_' + Date.now();
               const imgUrl = Payload.PartyPhotos?.[0] || Payload.Thumbnail || '';
               
               await db.run(`
                 INSERT INTO parties (ID, HostID, Title, Description, PartyPhotos, StartTime, DurationHours, Status, Address, City, GeoLat, GeoLon, MaxCapacity, CurrentGuestCount, VibeTags, Rules, ChatRoomID, Thumbnail) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 `, 
                 [pID, Token, Payload.Title, Payload.Description, JSON.stringify(Payload.PartyPhotos || []), Payload.StartTime, Payload.DurationHours, 'OPEN', Payload.Address, Payload.City, Payload.GeoLat || 0, Payload.GeoLon || 0, Payload.MaxCapacity, 1, JSON.stringify(Payload.VibeTags || []), JSON.stringify(Payload.Rules || []), Payload.ChatRoomID, imgUrl]
               );
               
               await db.run(`
                 INSERT INTO chats (ID, PartyID, Title, ImageUrl, RecentMessages, IsGroup, ParticipantIDs) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 `,
                 [Payload.ChatRoomID, pID, Payload.Title, imgUrl, JSON.stringify([]), 1, JSON.stringify([Token])]
               );
               
               const newlyCreatedParty = await db.get('SELECT * FROM parties WHERE ID = ?', [pID]);
               send('PARTY_CREATED', mapParty(newlyCreatedParty));

               // Broadcast updated feed
               const updatedParties = await db.all('SELECT * FROM parties');
               broadcast('FEED_UPDATE', updatedParties.map(mapParty));

               // Send user their updated chats
               const updatedChats = await db.all('SELECT * FROM chats');
               send('CHATS_LIST', updatedChats.map(mapChat).filter((c: any) => c.ParticipantIDs?.includes(Token)));
               break;
             case 'UPDATE_PROFILE':
               await db.run('UPDATE users SET RealName = ?, Bio = ?, Thumbnail = ? WHERE ID = ?', [Payload.RealName, Payload.Bio, Payload.Thumbnail, Token]);
               const updatedUser = await db.get('SELECT * FROM users WHERE ID = ?', [Token]);
               if(updatedUser) send('PROFILE_UPDATED', mapUser(updatedUser));
               break;
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
