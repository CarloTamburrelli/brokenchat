const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Pool } = require('pg'); // per connettersi a PostgreSQL
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379
});

redisClient.flushall((err, res) => {
  if (err) {
    console.error('Errore nel resettare Redis:', err);
  } else {
    console.log('Redis è stato svuotato con successo!');
  }
});

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*", // Permetti il frontend di accedere
    methods: ["GET", "POST"]
  }
});

// Crea una connessione al database PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Middleware per il parsing del JSON
app.use(cors());
app.use(express.json());

redisClient.on("connect", () => console.log("🔥 Connesso a Redis!"));
redisClient.on("error", (err) => console.error("❌ Errore Redis:", err));

app.get('/', async (req, res) => {
  res.status(200).json({ message: 'Very nice' });
});


// Rotta per creare una nuova chat
app.post('/create-chat', async (req, res) => {
  const { chatName, yourName, description, token, latitude, longitude } = req.body;

  try {
    // Verifica se esiste già un utente con quel token
    const existingUserResult = await pool.query(
      'SELECT * FROM users WHERE token = $1',
      [token]
    );

    let userId;
    let newToken = jwt.sign(
      { nickname: yourName },
      process.env.SECRET_KEY,
      { expiresIn: '30d' } // Imposta la scadenza del token
    );

    if (existingUserResult.rows.length > 0) {
      // Se l'utente esiste, prendi il suo ID e aggiorna il token
      userId = existingUserResult.rows[0].id;

      // Aggiorna il token dell'utente
      await pool.query(
        'UPDATE users SET token = $1 WHERE id = $2',
        [newToken, userId]
      );
    } else {
      // Se l'utente non esiste, crea un nuovo utente
      // Genera un nuovo token

      const userResult = await pool.query(
        'INSERT INTO users (nickname, token, subscription) VALUES ($1, $2, NOW()) RETURNING id',
        [yourName, newToken] // role_type = 1 → Admin
      );

      userId = userResult.rows[0].id;

    }

    // Salva la chat nel database PostgreSQL
    const chatResult = await pool.query(
      'INSERT INTO chats (name, description, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING id',
      [chatName, description, latitude, longitude]
    );

    const chatId = chatResult.rows[0].id;

    // 2️⃣ Salva il creatore della chat come admin nella tabella "roles"
    await pool.query(
      'INSERT INTO roles (user_id, role_type, chat_id) VALUES ($1, 1, $2)',
      [userId, chatId] // role_type = 1 → Admin
    );

    res.status(201).json({ message: 'Chat creata con successo!', chatId, token: newToken });

  } catch (err) {
    console.error('Errore nel creare la chat:', err);
    res.status(500).json({ message: 'Errore nel creare la chat' });
  }
});

// Funzione per calcolare la distanza in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  // Verifica che le coordinate siano numeriche e non NaN
  if (
    isNaN(lat1) || isNaN(lon1) ||
    isNaN(lat2) || isNaN(lon2)
  ) {
    return NaN;  // Ritorna NaN se una delle coordinate non è valida
  }


  // Converti latitudine e longitudine da gradi a radianti
  const R = 6371; // Raggio della Terra in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  let distance = Math.round(R * c); // Distanza in km

  // Imposta la distanza minima a 1 km
  if (distance < 1) {
    distance = 1;
  }

  return distance; // Ritorna la distanza
}

const getMyChats = async (token) => {
  const userChatsResult = await pool.query(
    `SELECT c.id, c.name, c.latitude, c.longitude, r.role_type, r.last_access, c.description 
     FROM chats c
     JOIN roles r ON c.id = r.chat_id
     JOIN users u ON u.id = r.user_id
     WHERE u.token = $1`,
    [token]  // Token dell'utente
  );

  const allMyChats = userChatsResult.rows;

  // Crea una pipeline per ottenere il numero di utenti connessi per ogni chat
  const pipeline = redisClient.pipeline();
  for (const chat of allMyChats) {
      pipeline.scard(`online_users:${chat.id}`);
  }

  // Esegui la pipeline e ottieni i risultati
  const results = await pipeline.exec();


  allMyChats.forEach((chat, index) => {
      chat.popularity = results[index][1] || 0
  });


  return allMyChats;
}

const getNearbyChats = async (token, lat, lon) => {
  try {
      // Recupera tutte le chat dal database
      const allChatsResult = await pool.query(
          `SELECT c.*, r.role_type, r.last_access
           FROM chats c
           LEFT JOIN users as u ON u.token = $1
           LEFT JOIN roles as r ON r.user_id = u.id AND r.chat_id = c.id`
      ,[token]);
      const allChats = allChatsResult.rows;

      // Crea una pipeline per ottenere il numero di utenti connessi per ogni chat
      const pipeline = redisClient.pipeline();
      for (const chat of allChats) {
          pipeline.scard(`online_users:${chat.id}`);
      }

      // Esegui la pipeline e ottieni i risultati
      const results = await pipeline.exec();

      // Lista delle chat vicine
      const nearbyChatsList = {};

      // Loop per calcolare la distanza tra l'utente e ogni chat
      allChats.forEach((chat, index) => {
          const distance = calculateDistance(lat, lon, chat.latitude, chat.longitude);

          const chatData = {
              id: chat.id,
              name: chat.name,
              role_type: chat.role_type,
              last_access: chat.last_access,
              popularity: results[index][1] || 0, // Numero di utenti connessi
              description: chat.description
          };

          if (!nearbyChatsList[distance]) {
              nearbyChatsList[distance] = [];
          }
          nearbyChatsList[distance].push(chatData);
      });

      // Ordinamento delle chat per popolarità (in ordine decrescente)
      for (const distance in nearbyChatsList) {
          nearbyChatsList[distance].sort((a, b) => b.popularity - a.popularity);
      }

      return nearbyChatsList;  // Restituisci la lista delle chat vicine ordinate
  } catch (error) {
      console.error('Errore durante il recupero delle chat vicine:', error);
      throw error;
  }
};



app.get('/get-user', async (req, res) => {
  const { token, lat, lon, filter } = req.query;  // Prendi i parametri dalla query

  const FILTERS = ["Popolari", "Vicine", "Mie"];

  try {

    if (filter && FILTERS.includes(filter)) {
      let response = {}
      if (filter == 'Popolari') {
        response.popularChats = await getPopularChats(token);
      } else if (filter == 'Vicine' && (lat && lon && lat !== "0" && lon !== "0")) {
        response.nearbyChats = await getNearbyChats(token, lat, lon);
      } else { // mie
        response.userChats = await getMyChats(token);
      }

      //console.log("sto per restituire...", response)

      return res.status(200).json(response);
    }


    // Cerca l'utente con il token nel database
    const userResult = await pool.query(
      `SELECT u.nickname 
       FROM users u
       WHERE u.token = $1`,
      [token]
    );

    let nickname = null; // nome utente se gia' registrato
    let nearbyChats = {}; // Lista delle chat limitrofe
    let popularChats = []; // Lista delle chat popolari

    // Se l'utente è registrato
    if (userResult.rows.length !== 0) {
      nickname = userResult.rows[0].nickname;  // Ottieni il nickname dell'utente

      // Se l'utente fornisce latitudine e longitudine, aggiorna la sua posizione e ottieni le chat vicine
      if (lat && lon && lat !== "0" && lon !== "0") {
        await pool.query(
          `UPDATE users SET latitude = $1, longitude = $2 WHERE token = $3`,
          [lat, lon, token]
        );

        nearbyChats = await getNearbyChats(token, lat, lon); // Ottieni chat limitrofe
      } else {
        // Se non fornisce latitudine e longitudine, recupera solo le chat popolari
        popularChats = await getPopularChats(token); // Funzione che restituisce chat popolari
      }

      /*console.log({
        nickname,
        userChats,
        nearbyChats,
        popularChats
      })*/


      return res.status(200).json({
        nickname,
        nearbyChats,
        popularChats
      });

    } else {
      // Se l'utente non è registrato
      if (lat && lon && lat !== "0" && lon !== "0") {
        // Se l'utente fornisce latitudine e longitudine, restituisci solo le chat limitrofe
        nearbyChats = await getNearbyChats(token, lat, lon); // Ottieni chat limitrofe

        return res.status(200).json({
          nickname: null,  // Utente non trovato, quindi nickname è null
          userChats: [],
          nearbyChats
        });

      } else {
        // Se non fornisce latitudine e longitudine, restituisci solo le chat popolari
        popularChats = await getPopularChats(token); // Funzione che restituisce chat popolari

        return res.status(200).json({
          nickname: null,  // Utente non trovato, quindi nickname è null
          userChats: [],
          popularChats
        });
      }
    }

  } catch (err) {
    console.error('Errore nel recupero dell\'utente:', err);
    res.status(500).json({ message: 'Errore nel recupero dell\'utente' });
  }
});

// Funzione per ottenere le chat popolari
const getPopularChats = async (token) => {
  const allChatsResult = await pool.query(
    `SELECT c.id, c.name, c.description, r.role_type, r.last_access 
     FROM chats c
     LEFT JOIN users as u ON u.token = $1
     LEFT JOIN roles as r ON r.user_id = u.id AND r.chat_id = c.id
     `
  , [token]);
  const allChats = allChatsResult.rows;

  const pipeline = redisClient.pipeline();

  // Per ogni chat, aggiungi l'operazione per ottenere il numero di utenti connessi
  for (const chat of allChats) {
    pipeline.scard(`online_users:${chat.id}`);
  }

  // Esegui la pipeline
  const results = await pipeline.exec();

  const popularChats = allChats.map((chat, index) => {
    return {
      id: chat.id,
      name: chat.name,
      description: chat.description,
      role_type: chat.role_type,
      last_access: chat.last_access,
      popularity: results[index][1] || 0  // Numero di utenti connessi
    };
  });

  // Ordina le chat per popolarità (in ordine decrescente)
  popularChats.sort((a, b) => b.popularity - a.popularity);

  return popularChats;
};


app.get('/chat/:chatId', async (req, res) => {
  const { chatId } = req.params; // Recupera chatId dall'URL
  const token = req.query.token; // Recupera il token dalla query string

  try {
    // Esegui la query per ottenere i dati della chat dal database
    const result = await pool.query(
      `SELECT 
         c.name, 
         c.is_private, 
         CASE WHEN u.id IS NOT NULL THEN u.id ELSE 0 END as user_id, 
         CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END as already_in,
         u.nickname,
         u.id as user_id  
       FROM chats as c
       LEFT JOIN users as u ON u.token = $2 
       LEFT JOIN roles as r ON r.user_id = u.id AND r.chat_id = c.id
       WHERE c.id = $1`,
      [chatId, token]
    );

    // Se non viene trovata la chat, rispondi con un errore
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Chat non trovata' });
    }

    // Restituisci i dati della chat
    const chatData = result.rows[0];

    const messagesResult = await pool.query(
      `SELECT m.id, u.nickname, m.message 
       FROM messages as m
       JOIN users as u ON u.id = m.user_id 
       WHERE m.chat_id = $1  
       ORDER BY m.created_at ASC`, 
      [chatId]
    );

    // Se la chat è privata e l'utente non è già dentro, bloccalo
    if (chatData.is_private && chatData.already_in === 0) {
      return res.status(403).json({ message: 'Accesso negato: questa chat è privata' });
    } else if (chatData.already_in === 0 && chatData.user_id > 0 ) {
      //non e' privata ma e' registrato allora lo inserisco
      await pool.query(
        'INSERT INTO roles (user_id, role_type, chat_id, last_access) VALUES ($1, 3, $2, NOW())',
        [chatData.user_id, chatId] // role_type = 3 → Utente normale
      );
    } else {
      await pool.query(
        `UPDATE roles SET last_access = NOW() WHERE user_id = $1 AND chat_id = $2`,
        [chatData.user_id, chatId]
      );
    }

    res.status(200).json({
      chat: chatData,
      messages: messagesResult.rows
    });
  } catch (err) {
    console.error('Errore nel recuperare i dati della chat:', err);
    res.status(500).json({ message: 'Errore nel recuperare i dati della chat' });
  }
});

app.post("/register-user", async (req, res) => {
  const { nickname } = req.body;

  if (!nickname.trim()) {
    return res.status(400).json({ message: "Nickname obbligatorio" });
  }

  try {

    let newToken = jwt.sign(
      { nickname: nickname },
      process.env.SECRET_KEY,
      { expiresIn: '30d' } // Imposta la scadenza del token
    );

    // Inserisci l'utente nel database
    await pool.query(
      "INSERT INTO users (nickname, token, subscription) VALUES ($1, $2, NOW()) RETURNING id, token",
      [nickname, newToken]
    );

    res.status(200).json({ token: newToken });
  } catch (err) {
    console.error("Errore durante la registrazione dell'utente:", err);
    res.status(500).json({ message: "Errore interno" });
  }
});

app.post("/update-nickname", async (req, res) => {
  const { nickname, token } = req.body;

  try {
    // Esegui l'UPDATE sul database
    const result = await pool.query(
      `UPDATE users SET nickname = $1 WHERE token = $2 RETURNING *`,
      [nickname, token]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    return res.json({ message: "Nickname aggiornato con successo!" });
  } catch (error) {
    console.error("Errore durante l'update del nickname:", error);
    return res.status(500).json({ error: "Errore durante l'aggiornamento del nickname" });
  }
});

// Gestione della connessione WebSocket
io.on('connection', (socket) => {
  // console.log('Un utente si è connesso');

  // Ascolta per l'evento "join-room" (entrata nella chat)
  socket.on('join-room', async (chatId, nickname, user_id) => {

    await redisClient.sadd(`online_users:${chatId}`, `${nickname}####${user_id}`);
    socket.userId = user_id;
    socket.chatId = chatId;
    socket.nickname = nickname;
    socket.join(chatId);
  
    const alertMessage = `${nickname} si è connesso alla chat ${chatId}!`;
    console.log(alertMessage)
    const users = await redisClient.smembers(`online_users:${chatId}`);
    console.log("utenti collegati", users);
  
    // Esegui un unico emit
    io.to(chatId).emit('alert_message', { message: alertMessage, users });
  });

  socket.on('leave-room', async (chatId) => {
    console.log("Un utente si è disconnessos",chatId, socket.nickname, socket.userId);
    if (socket.chatId && socket.nickname) {
      console.log("entro...");
      await redisClient.srem(`online_users:${chatId}`, `${socket.nickname}####${socket.userId}`);
      const alertMessage = `${socket.nickname} si è disconnesso dalla chatt!`;
      const users = await redisClient.smembers(`online_users:${chatId}`);
      io.to(chatId).emit('alert_message', { message: alertMessage, users });
      socket.leave(socket.chatId);
      socket.chatId = null; // Rimuoviamo l'ID della chat attuale
    }
  });

  // Ascolta per l'evento "message" (invio di un messaggio)
  socket.on('message', async (chatId, newMessage, userId) => {
    // Invia il messaggio a tutti gli utenti della stanza
    try {
      // Salva il messaggio nel database
      await pool.query(
        'INSERT INTO messages (chat_id, user_id, message) VALUES ($1, $2, $3)',
        [chatId, userId, newMessage.text]
      );
      
      // Emetti il messaggio alla chat
      io.to(chatId).emit('broadcast_messages', newMessage);
  
      // Controlla il numero di messaggi nella chat
      const result = await pool.query(
        'SELECT COUNT(*) FROM messages WHERE chat_id = $1',
        [chatId]
      );
      const messageCount = parseInt(result.rows[0].count, 10);
  
      // Se ci sono più di 100 messaggi, elimina il primo
      if (messageCount > 50) {
        await pool.query(`
          DELETE FROM messages
          WHERE id = (
            SELECT id FROM messages
            WHERE chat_id = $1
            ORDER BY id ASC
            LIMIT 1
          )`, [chatId]);
        console.log(`Il primo messaggio è stato eliminato dalla chat ${chatId}`);
      }
  
      console.log(`Messaggio inviato alla chat ${chatId}: ${newMessage}`);
    } catch (err) {
      console.error('Errore nel salvataggio del messaggio:', err);
    }
  });


  socket.on("name_changed", ( oldName, newName ) => {
    if (socket.chatId) {
      socket.nickname = newName;
      io.to(socket.chatId).emit("alert_message", `${oldName} ha cambiato nome in ${newName}`);
    }
  });

  socket.on("disconnect", async () => {

    if (!socket.chatId || !socket.nickname || !socket.userId) {
      console.log("Dati utente mancanti, impossibile rimuovere da Redis.");
      return;
    }

    const redisKey = `online_users:${socket.chatId}`;
    const userString = `${socket.nickname}####${socket.userId}`;

    try {
        const removed = await redisClient.srem(redisKey, userString);
        if (removed) {
            console.log(`Utente ${userString} rimosso da ${redisKey}`);
        } else {
            console.log(`Utente ${userString} non trovato in ${redisKey}`);
        }
    } catch (err) {
        console.error(`Errore durante la rimozione da Redis:`, err);
    }

  })

});

// Avvia il server
const PORT = process.env.PORT || 5002;
server.listen(PORT, () => {
  console.log(`Server in esecuzione sulla porta ${PORT}`);
});


