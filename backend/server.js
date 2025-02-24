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
  const { chatName, yourName, isPrivate, token } = req.body;

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
      'INSERT INTO chats (name, is_private) VALUES ($1, $2) RETURNING id',
      [chatName, isPrivate]
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

app.get('/get-user', async (req, res) => {
  const { token } = req.query;  // Prendi il token dalla query

  try {
    // Query per ottenere le chat a cui partecipa l'utente
    const result = await pool.query(
      `SELECT
          u.nickname AS username,
          r.role_type AS role,
          c.id AS chatId,
          c.name AS chatName,
          c.is_private AS isPrivate
      FROM
          users u
      JOIN
          roles r ON u.id = r.user_id
      JOIN
          chats c ON r.chat_id = c.id
      WHERE
          u.token = $1`,
      [token]  // Token dell'utente
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utente non trovato o token non valido' });
    }

    // Restituisci l'utente e le chat a cui partecipa
    const userData = result.rows.map(row => ({
      role: row.role,
      chatId: row.chatid,
      chatName: row.chatname,
      isPrivate: row.isprivate,
      chatLink: `/chat/${row.chatid}`  // Link per accedere alla chat
    }));

    const nickname = result.rows[0].username;


    res.status(200).json({ userData, nickname});
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
         u.nickname  
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

    res.status(200).json(chatData);
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
    socket.chatId = chatId;
    socket.nickname = nickname;
    socket.join(chatId);
    console.log(`L'utente ${nickname} si e' connesso alla chat!`);
    io.to(chatId).emit('alert_message', `L'utente ${nickname} si e' connesso alla chat!`);
  });

  // Ascolta per l'evento "message" (invio di un messaggio)
  socket.on('message', (chatId, message) => {
    // Invia il messaggio a tutti gli utenti della stanza
    io.to(chatId).emit('broadcast_messages', message);
    console.log(`Messaggio inviato alla chat ${chatId}: ${message}`);
  });
  

  // Gestisci la disconnessione
  socket.on('disconnect', (chatId, nickname) => {
    console.log('Un utente si è disconnesso');
    //io.to(chatId).emit('alert_message', `L'utente ${nickname} si e' disconnesso dalla chat!`);
    if (socket.chatId && socket.nickname) {
      io.to(socket.chatId).emit('alert_message', `L'utente ${socket.nickname} si è disconnesso dalla chat!`);
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
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server in esecuzione sulla porta ${PORT}`);
});


