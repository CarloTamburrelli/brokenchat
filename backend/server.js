const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Pool } = require('pg'); // per connettersi a PostgreSQL
const cors = require('cors');
const jwt = require('jsonwebtoken');

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


app.get('/get-user', async (req, res) => {
  const { token, lat, lon } = req.query;  // Prendi i parametri dalla query

  try {
    // Cerca l'utente con il token nel database
    const userResult = await pool.query(
      `SELECT u.nickname 
       FROM users u
       WHERE u.token = $1`,
      [token]
    );

    let nickname = null; //nome utente se gia' registrato
    let userChats = null; //stanze dove ha fatto l'accesso

    if (userResult.rows.length !== 0) {
      // Se l'utente esiste
      
      // Prendi nickname e posizione attuale
      nickname = userResult.rows[0].nickname;
      

      // Se latitudine e longitudine sono presenti, aggiorna la posizione dell'utente
      if (lat && lon) {
        
        console.log(lat, lon, "yoos");


        await pool.query(
          `UPDATE users SET latitude = $1, longitude = $2 WHERE token = $3`,
          [lat, lon, token]
        );
      }

      const userChatsResult = await pool.query(
        `SELECT c.id, c.name, c.latitude, c.longitude
         FROM chats c
         JOIN roles r ON c.id = r.chat_id
         JOIN users u ON u.id = r.user_id
         WHERE u.token = $1`,
        [token]  // Token dell'utente
      );

      userChats = userChatsResult.rows;


      const allChatsResult = await pool.query(
        `SELECT c.*
         FROM chats c`
      );
  
      const allChats = allChatsResult.rows;
  
      // Liste separate per le chat a cui l'utente ha partecipato e le chat limitrofe
      const nearbyChatsList = {};
  
      // Loop per calcolare la distanza tra l'utente e ogni chat
      allChats.forEach((chat) => {
        const distance = calculateDistance(lat, lon, chat.latitude, chat.longitude);
  
        const chatData = {
          id: chat.id,
          name: chat.name,
          popularity: 35, 
          description: chat.description
        };
  
          if (!nearbyChatsList[distance]) {
            nearbyChatsList[distance] = [];
          }
          nearbyChatsList[distance].push(chatData);
  
      });

      res.status(200).json({
          nickname,
          userChats: userChats,  // Chat a cui l'utente partecipa
          nearbyChats: nearbyChatsList,  // Chat limitrofe
      });
  
    } else {

      //se l'utente non esiste
      if (lat && lon) {
        const allChatsResult = await pool.query(
          `SELECT c.*
           FROM chats c`
        );
    
        const allChats = allChatsResult.rows;
    
        // Liste separate per le chat a cui l'utente ha partecipato e le chat limitrofe
        const nearbyChatsList = {};
    
        // Loop per calcolare la distanza tra l'utente e ogni chat
        allChats.forEach((chat) => {
          const distance = calculateDistance(lat, lon, chat.latitude, chat.longitude);
    
          const chatData = {
            id: chat.id,
            name: chat.name,
            popularity: 35, 
            description: chat.description
          };
    
            if (!nearbyChatsList[distance]) {
              nearbyChatsList[distance] = [];
            }
            nearbyChatsList[distance].push(chatData);
    
        });

        res.status(200).json({
            nickname: null,
            nearbyChats: nearbyChatsList,  // Chat limitrofe
        });

      } else {

        res.status(200).json({
          nickname: null,
          popularChats: [],  // Chat limitrofe
        });

      }

    }
    
  } catch (err) {
    console.error('Errore nel recupero dell\'utente:', err);
    res.status(500).json({ message: 'Errore nel recupero dell\'utente' });
  }
});


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
        'INSERT INTO roles (user_id, role_type, chat_id) VALUES ($1, 3, $2)',
        [chatData.user_id, chatId] // role_type = 3 → Utente normale
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
  console.log('Un utente si è connesso');

  // Ascolta per l'evento "join-room" (entrata nella chat)
  socket.on('join-room', (chatId, nickname) => {
    if (socket.chatId) {
      // ⚠️ L'utente sta cambiando chat, quindi esce dalla precedente
      socket.leave(socket.chatId);
      io.to(socket.chatId).emit('alert_message', `L'utente ${socket.nickname} si è disconnesso dalla chat!`);
    }

    socket.chatId = chatId;
    socket.nickname = nickname;
    socket.join(chatId);
    console.log(`L'utente ${nickname} si e' connesso alla chat ${chatId}!`);
    io.to(chatId).emit('alert_message', `L'utente ${nickname} si e' connesso alla chat!`);
  });


  socket.on('leave-room', (chatId, nickname) => {
    console.log('Un utente si è disconnessos');
    if (socket.chatId && socket.nickname) {
      io.to(socket.chatId).emit('alert_message', `L'utente ${socket.nickname} si è disconnesso dalla chat!`);
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
});

// Avvia il server
const PORT = process.env.PORT || 5002;
server.listen(PORT, () => {
  console.log(`Server in esecuzione sulla porta ${PORT}`);
});


