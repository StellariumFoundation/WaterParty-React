import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import http from "http";
import path from "path";
import bcrypt from "bcryptjs";
import { createClient } from "@libsql/client";

// Setup Turso Database (libSQL)
const dbUrl = process.env.TURSO_DATABASE_URL || "file:./database.sqlite";
const dbToken = process.env.TURSO_AUTH_TOKEN || "";

const db = createClient({
  url: dbUrl,
  authToken: dbToken,
});

// Helper to check if a column exists and add it if missing
async function ensureColumn(tableName: string, columnName: string, columnDef: string) {
  try {
    const info = await db.execute(`PRAGMA table_info(${tableName})`);
    const exists = info.rows.some((col: any) => col.name === columnName);
    if (!exists) {
      await db.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
      console.log(`Migration: Added column ${columnName} to ${tableName}`);
    }
  } catch (e) {
    console.error(`Migration failed for ${tableName}.${columnName}`, e);
  }
}

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

async function getEnrichedParties() {
  const result = await db.execute('SELECT * FROM parties');
  const parties = result.rows.map((row: any) => mapParty(row));
  const enriched = [];
  for (const p of parties) {
    const hostResult = await db.execute({
      sql: 'SELECT RealName, Thumbnail, ProfilePhotos FROM users WHERE ID = ?',
      args: [p.HostID]
    });
    const hostData = hostResult.rows[0] as any;
    if (hostData) {
       p.HostName = hostData.RealName || "";
       p.HostThumbnail = hostData.Thumbnail || parseJSON(hostData.ProfilePhotos)?.[0] || "";
    }
    enriched.push(p);
  }
  return enriched;
}

async function getEnrichedChats(userID: string) {
  const result = await db.execute('SELECT * FROM chats');
  const allChats = result.rows.map((row: any) => mapChat(row));
  const enriched = [];
  for (const chat of allChats) {
    if (!chat.IsGroup) {
      const otherID = chat.ParticipantIDs?.find((id: string) => id !== userID);
      if (otherID) {
        const otherResult = await db.execute({
          sql: 'SELECT RealName, Thumbnail, ProfilePhotos FROM users WHERE ID = ?',
          args: [otherID]
        });
        const other = otherResult.rows[0] as any;
        if (other) {
           chat.Title = other.RealName || chat.Title;
           chat.ImageUrl = other.Thumbnail || parseJSON(other.ProfilePhotos)?.[0] || chat.ImageUrl;
        }
      }
    }
    enriched.push(chat);
  }
  return enriched.filter((c: any) => c.ParticipantIDs?.includes(userID));
}

async function startServer() {
  // DB Initialization Schema
  try {
    await db.executeMultiple(`
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
    await ensureColumn('users', 'HostedCount', 'INTEGER DEFAULT 0');
    await ensureColumn('users', 'HostingRating', 'REAL DEFAULT 0');
    await ensureColumn('users', 'Reach', 'INTEGER DEFAULT 0');

    await db.executeMultiple(`
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
        Status TEXT,
        Timestamp TEXT
      );
    `);
    console.log("Database initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize database schema:", err);
  }

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  let broadcastChatsGlobal: () => void = () => {};

  // CORS & Request logging
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // REST API Endpoints
  app.post(['/login', '/login/'], async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await db.execute({
        sql: 'SELECT * FROM users WHERE Email = ?',
        args: [email]
      });
      const userRow = result.rows[0] as any;
      
      if (!userRow || !bcrypt.compareSync(password, userRow.Password as string)) {
         return res.status(401).json({ error: "Invalid username or password" });
      }
      const safeUser = { ...userRow };
      delete safeUser.Password;
      res.json(mapUser(safeUser));
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Internal server error" });
    }
  });

  app.post(['/register', '/register/'], async (req, res) => {
    try {
      const { user, password } = req.body;
      
      if (!password || password.length < 8) {
         return res.status(400).json({ error: "Password must be at least 8 characters long" });
      }
      
      const existingResult = await db.execute({
        sql: 'SELECT * FROM users WHERE Email = ?',
        args: [user.Email]
      });
      const existingRow = existingResult.rows[0];
      if (existingRow) {
         return res.status(400).json({ error: "User already exists with this email" });
      }

      const newID = 'user_' + Date.now();
      const hash = bcrypt.hashSync(password, 10);
      
      await db.execute({
        sql: 'INSERT INTO users (ID, RealName, Email, Password, ProfilePhotos, TrustScore, Thumbnail, Bio, Instagram, Twitter, Gender, HeightCm, JobTitle, Company, School, Degree, HostedCount, HostingRating, Reach) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          newID, user.RealName, user.Email, hash, JSON.stringify(user.ProfilePhotos || []), 100, user.Thumbnail || '', user.Bio || '', user.Instagram || '', user.Twitter || '', user.Gender || '', user.HeightCm || 0, user.JobTitle || '', user.Company || '', user.School || '', user.Degree || '', 0, 0, 0
        ]
      });
      const userResult = await db.execute({
        sql: 'SELECT * FROM users WHERE ID = ?',
        args: [newID]
      });
      const userRow = userResult.rows[0] as any;
      const safeUser = { ...userRow };
      delete safeUser.Password;
      res.json(mapUser(safeUser));
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Internal server error" });
    }
  });

  app.get(['/api/feed', '/api/feed/'], async (req, res) => {
    try {
      const { lat, lon } = req.query;
      let mappedParties = await getEnrichedParties();
      
      if (lat && lon) {
        const Lat = parseFloat(lat as string);
        const Lon = parseFloat(lon as string);
        if (!isNaN(Lat) && !isNaN(Lon)) {
          mappedParties.sort((a: any, b: any) => {
            const distA = getDistance(Lat, Lon, a.GeoLat || 0, a.GeoLon || 0);
            const distB = getDistance(Lat, Lon, b.GeoLat || 0, b.GeoLon || 0);
            return distB - distA; // Descending
          });
        }
      }
      res.json(mappedParties);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Internal server error" });
    }
  });

  app.get(['/api/chats', '/api/chats/'], async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] || req.query.userId;
      if (!userId) {
        return res.status(400).json({ error: "Missing x-user-id header or userId query parameter" });
      }
      const chats = await getEnrichedChats(userId as string);
      res.json(chats);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Internal server error" });
    }
  });

  app.post(['/api/chats/dm', '/api/chats/dm/'], async (req, res) => {
    try {
      const { sourceUserId, targetUserId } = req.body;
      if (!sourceUserId || !targetUserId) {
        return res.status(400).json({ error: "Missing sourceUserId or targetUserId" });
      }

      const meResult = await db.execute({
        sql: 'SELECT * FROM users WHERE ID = ?',
        args: [sourceUserId]
      });
      const me = meResult.rows[0] as any;

      const otherResult = await db.execute({
        sql: 'SELECT * FROM users WHERE ID = ?',
        args: [targetUserId]
      });
      const other = otherResult.rows[0] as any;

      if (!me || !other) {
        return res.status(404).json({ error: "User not found" });
      }

      const allChatsResult = await db.execute('SELECT * FROM chats');
      const allChats = allChatsResult.rows.map(row => mapChat(row as any));
      const existing = allChats.find((c: any) => 
        c.IsGroup === false && 
        c.ParticipantIDs.includes(sourceUserId) && 
        c.ParticipantIDs.includes(targetUserId)
      );

      let chatID;
      if (existing) {
        chatID = existing.ID;
      } else {
        chatID = 'dm_' + Date.now() + '_' + sourceUserId + '_' + targetUserId;
        await db.execute({
          sql: `INSERT INTO chats (ID, PartyID, Title, ImageUrl, RecentMessages, IsGroup, ParticipantIDs) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            chatID, 'DM', `${me.RealName} & ${other.RealName}`, '', JSON.stringify([]), 0, JSON.stringify([sourceUserId, targetUserId])
          ]
        });
      }

      broadcastChatsGlobal();

      res.json({ ChatID: chatID });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Internal server error" });
    }
  });

  app.get(['/api/users/:id', '/api/users/:id/'], async (req, res) => {
    try {
      const result = await db.execute({
        sql: 'SELECT * FROM users WHERE ID = ?',
        args: [req.params.id]
      });
      const userRow = result.rows[0] as any;
      if (!userRow) return res.status(404).json({ error: "User not found" });
      const safeUser = { ...userRow };
      delete safeUser.Password;
      res.json(mapUser(safeUser));
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Internal server error" });
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
    // Production statics handling (if full-stack is packaged)
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      // If it starts with an API path but missed, fall through
      if (req.path.startsWith('/api') || req.path === '/login' || req.path === '/register') {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Final catch-all for unknown API routes - return JSON 404, not HTML
  app.use((req, res) => {
    console.log(`DEBUG: Unmatched route hit: ${req.method} ${req.url}`);
    res.status(404).json({ error: "API endpoint not found", path: req.url });
  });

  const server = http.createServer(app);
  
  // WebSocket Server
  const wss = new WebSocketServer({ server, path: '/ws' });

  broadcastChatsGlobal = () => {
    wss.clients.forEach(async (client: any) => {
       if (client.readyState === 1 && client.userID) {
          try {
            const enriched = await getEnrichedChats(client.userID);
            client.send(JSON.stringify({ Event: 'CHATS_LIST', Payload: enriched }));
          } catch (e) {
            console.error("Failed to broadcast chats to client", client.userID, e);
          }
       }
    });
  };

  wss.on('connection', (ws: any, req) => {
    ws.on('message', async (message: any) => {
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
             wss.clients.forEach(async (client: any) => {
                if (client.readyState === 1 && client.userID) {
                   try {
                     const enriched = await getEnrichedChats(client.userID);
                     client.send(JSON.stringify({ Event: 'CHATS_LIST', Payload: enriched }));
                   } catch (e) {
                     console.error("Failed to broadcast chats to client", client.userID, e);
                   }
                }
             });
          };

          switch (Event) {
             case 'GET_CHATS': {
               const enriched = await getEnrichedChats(Token);
               send('CHATS_LIST', enriched);
               break;
             }
             case 'GET_FEED': {
               const { Lat, Lon } = Payload || {};
               let mappedParties = await getEnrichedParties();
               
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
                   const existingResult = await db.execute({
                     sql: 'SELECT * FROM registrations WHERE PartyID = ? AND UserID = ?',
                     args: [PartyID, Token]
                   });
                   const existing = existingResult.rows[0];
                   if (!existing) {
                      await db.execute({
                        sql: 'INSERT INTO registrations (ID, PartyID, UserID, Status, Timestamp) VALUES (?, ?, ?, ?, ?)',
                        args: [regID, PartyID, Token, 'PENDING', new Date().toISOString()]
                      });
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
               
               await db.execute({
                 sql: `INSERT INTO parties (ID, HostID, Title, Description, PartyPhotos, StartTime, DurationHours, Status, Address, City, GeoLat, GeoLon, MaxCapacity, CurrentGuestCount, VibeTags, Rules, ChatRoomID, Thumbnail, CrowdfundTarget, CrowdfundCurrent, PartyType) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                 args: [
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
                 ]
               });
               
               await db.execute({
                 sql: `INSERT INTO chats (ID, PartyID, Title, ImageUrl, RecentMessages, IsGroup, ParticipantIDs) 
                       VALUES (?, ?, ?, ?, ?, ?, ?)`,
                 args: [
                   Payload.ChatRoomID, pID, Payload.Title, imgUrl, JSON.stringify([]), 1, JSON.stringify([Token])
                 ]
               });
               
               const newlyCreatedResult = await db.execute({
                 sql: 'SELECT * FROM parties WHERE ID = ?',
                 args: [pID]
               });
               const newlyCreatedParty = newlyCreatedResult.rows[0];
               if (newlyCreatedParty) send('PARTY_CREATED', mapParty(newlyCreatedParty));

               const updatedParties = await getEnrichedParties();
               broadcast('FEED_UPDATE', updatedParties);

               const chatsResult = await db.execute('SELECT * FROM chats');
               const updatedChats = chatsResult.rows.map(row => mapChat(row as any));
               send('CHATS_LIST', updatedChats.filter((c: any) => c.ParticipantIDs?.includes(Token)));
               break;
             }
             case 'UPDATE_PROFILE': {
                await db.execute({
                  sql: 'UPDATE users SET RealName = ?, Bio = ?, Thumbnail = ?, ProfilePhotos = ?, Instagram = ?, Twitter = ?, Gender = ?, HeightCm = ?, JobTitle = ?, Company = ?, School = ?, Degree = ? WHERE ID = ?',
                  args: [
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
                    Token
                  ]
                });
                const updatedUserResult = await db.execute({
                  sql: 'SELECT * FROM users WHERE ID = ?',
                  args: [Token]
                });
                const updatedUser = updatedUserResult.rows[0];
                if (updatedUser) { 
                   send('PROFILE_UPDATED', mapUser(updatedUser)); 
                   const enrichedParties = await getEnrichedParties();
                   broadcast('FEED_UPDATE', enrichedParties); 
                   broadcastChats(); 
                }
                break;
             }
             case 'CREATE_DM': {
                const { TargetUserID } = Payload;
                const meResult = await db.execute({
                  sql: 'SELECT * FROM users WHERE ID = ?',
                  args: [Token]
                });
                const me = meResult.rows[0] as any;
                const otherResult = await db.execute({
                  sql: 'SELECT * FROM users WHERE ID = ?',
                  args: [TargetUserID]
                });
                const other = otherResult.rows[0] as any;
                if (me && other) {
                   const allChatsResult = await db.execute('SELECT * FROM chats');
                   const allChats = allChatsResult.rows.map(row => mapChat(row as any));
                   const existing = allChats.find((c: any) => c.IsGroup === false && c.ParticipantIDs.includes(Token) && c.ParticipantIDs.includes(TargetUserID));
                   
                   let chatID;
                   if (existing) {
                      chatID = existing.ID;
                   } else {
                      chatID = 'dm_' + Date.now() + '_' + Token + '_' + TargetUserID;
                      await db.execute({
                        sql: `INSERT INTO chats (ID, PartyID, Title, ImageUrl, RecentMessages, IsGroup, ParticipantIDs) 
                              VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        args: [
                          chatID, 'DM', `${me.RealName} & ${other.RealName}`, '', JSON.stringify([]), 0, JSON.stringify([Token, TargetUserID])
                        ]
                      });
                   }
                   broadcastChats();
                   send('DM_CREATED', { ChatID: chatID });
                }
                break;
             }
             case 'SEND_MESSAGE': {
                const { ChatID, Content } = Payload;
                const chatResult = await db.execute({
                  sql: 'SELECT * FROM chats WHERE ID = ?',
                  args: [ChatID]
                });
                const chatRow = chatResult.rows[0];
                if (chatRow) {
                   const chat = mapChat(chatRow);
                   const newMessage = {
                      SenderID: Token,
                      Timestamp: new Date().toISOString(),
                      Content
                   };
                   const updatedMessages = [...(chat.RecentMessages || []), newMessage];
                   await db.execute({
                     sql: 'UPDATE chats SET RecentMessages = ? WHERE ID = ?',
                     args: [JSON.stringify(updatedMessages), ChatID]
                   });
                   
                   broadcastChats();
                }
                break;
             }
             case 'GET_REGISTRATIONS': {
                const { PartyID } = Payload;
                const regsResult = await db.execute({
                  sql: 'SELECT registrations.*, users.RealName, users.Thumbnail as UserThumbnail, users.ProfilePhotos as UserProfilePhotos FROM registrations JOIN users ON registrations.UserID = users.ID WHERE PartyID = ?',
                  args: [PartyID]
                });
                const regs = regsResult.rows;
                send('REGISTRATIONS_LIST', regs.map((r: any) => ({ ...r, UserProfilePhotos: parseJSON(r.UserProfilePhotos) })));
                break;
             }
             case 'APPROVE_JOIN_REQUEST': {
                const { RegistrationID } = Payload;
                const regResult = await db.execute({
                  sql: 'SELECT * FROM registrations WHERE ID = ?',
                  args: [RegistrationID]
                });
                const reg = regResult.rows[0] as any;
                if (reg && reg.Status === 'PENDING') {
                   await db.execute({
                     sql: 'UPDATE registrations SET Status = ? WHERE ID = ?',
                     args: ['APPROVED', RegistrationID]
                   });
                   const partyResult = await db.execute({
                     sql: 'SELECT * FROM parties WHERE ID = ?',
                     args: [reg.PartyID]
                   });
                   const party = partyResult.rows[0] as any;
                   if (party) {
                      const chatResult = await db.execute({
                        sql: 'SELECT * FROM chats WHERE ID = ?',
                        args: [party.ChatRoomID]
                      });
                      const chat = chatResult.rows[0] as any;
                      if (chat) {
                         const pIDs = JSON.parse(chat.ParticipantIDs);
                         if (!pIDs.includes(reg.UserID)) {
                            pIDs.push(reg.UserID);
                            await db.execute({
                              sql: 'UPDATE chats SET ParticipantIDs = ? WHERE ID = ?',
                              args: [JSON.stringify(pIDs), party.ChatRoomID]
                            });
                            await db.execute({
                              sql: 'UPDATE parties SET CurrentGuestCount = CurrentGuestCount + 1 WHERE ID = ?',
                              args: [reg.PartyID]
                            });
                         }
                      }
                   }
                   const regsResult = await db.execute({
                     sql: 'SELECT registrations.*, users.RealName, users.Thumbnail as UserThumbnail, users.ProfilePhotos as UserProfilePhotos FROM registrations JOIN users ON registrations.UserID = users.ID WHERE PartyID = ?',
                     args: [reg.PartyID]
                   });
                   const regs = regsResult.rows;
                   send('REGISTRATIONS_LIST', regs.map((r: any) => ({ ...r, UserProfilePhotos: parseJSON(r.UserProfilePhotos) })));
                   const refreshedParties = await getEnrichedParties();
                   broadcast('FEED_UPDATE', refreshedParties);
                   broadcastChats();
                }
                break;
             }
             case 'DELETE_PARTY': {
                const { PartyID } = Payload;
                const partyResult = await db.execute({
                  sql: 'SELECT * FROM parties WHERE ID = ?',
                  args: [PartyID]
                });
                const party = partyResult.rows[0] as any;
                if (party && party.HostID === Token) {
                   await db.execute({
                     sql: 'DELETE FROM parties WHERE ID = ?',
                     args: [PartyID]
                   });
                   await db.execute({
                     sql: 'DELETE FROM chats WHERE ID = ?',
                     args: [party.ChatRoomID]
                   });
                   await db.execute({
                     sql: 'DELETE FROM registrations WHERE PartyID = ?',
                     args: [PartyID]
                   });
                   
                   const refreshedParties = await getEnrichedParties();
                   broadcast('FEED_UPDATE', refreshedParties);
                   broadcastChats();
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
    console.log(`Express server + Turso libSQL WS running on port ${PORT}`);
  });
}

startServer();
