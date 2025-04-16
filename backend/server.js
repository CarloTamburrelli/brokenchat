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

const isValidNickname = (nickname) => {
  const regex = /^[a-zA-Z0-9_]{6,17}$/;
  return regex.test(nickname);
};


// Rotta per creare una nuova chat
app.post('/create-chat', async (req, res) => {
  const { chatName, yourNickname, description, token, latitude, longitude } = req.body;

  try {
    // Verifica se esiste già un utente con quel token
    const existingUserResult = await pool.query(
      'SELECT * FROM users WHERE token = $1',
      [token]
    );

    let userId;
    let newToken = jwt.sign(
      { nickname: yourNickname },
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

      if (!isValidNickname(yourNickname)) {
        return res.status(400).json({ message: 'The nickname is not valid, minimum 6 characters and do not use special symbols, only _ and numbers are allowed' });
      }

      const check = await pool.query(
        `SELECT 1 FROM users WHERE LOWER(nickname) = LOWER($1) LIMIT 1`,
        [yourNickname]
      );
    
      if (check.rowCount > 0) {
        return res.status(409).json({ message: "Nickname already used!" });
      }

      // Se l'utente non esiste, crea un nuovo utente
      // Genera un nuovo token

      const userResult = await pool.query(
        'INSERT INTO users (nickname, token, subscription) VALUES ($1, $2, NOW()) RETURNING id',
        [yourNickname, newToken] // role_type = 1 → Admin
      );

      userId = userResult.rows[0].id;

    }


    if ((chatName && chatName.length < 6) || (description && description.length < 10)) {
      return res.status(400).json({ message: 'The chat name or description is not valid' });
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
     WHERE u.token = $1 AND r.role_type IS DISTINCT FROM 4
     ORDER BY r.last_access DESC;`,
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
           LEFT JOIN roles as r ON r.user_id = u.id AND r.chat_id = c.id 
           WHERE r.role_type IS DISTINCT FROM 4`
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


app.post("/report", async (req, res) => {
  try {
    const { reporter_id, reported_user_id, chat_id, message, token } = req.body;

    if (!reporter_id || !reported_user_id || !chat_id || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const userCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND token = $2",
      [reporter_id, token]
    );

    if (userCheck.rowCount === 0) {
      return res.status(401).json({ error: "Unauthorized: Invalid user or token" });
    }

    await pool.query(
        "INSERT INTO reports (reporter_id, reported_user_id, chat_id, message) VALUES ($1, $2, $3, $4)",
        [reporter_id, reported_user_id, chat_id, message]
    );
    res.json({ message: "Report successfully submitted" });
  } catch (error) {
      console.error("Error reporting message:", error);
      res.status(500).json({ error: "Internal server error" });
  }
});


app.get('/get-user', async (req, res) => {
  const { token, filter, lat, lon } = req.query;  // Prendi i parametri dalla query

  //const [lat, lon] = ["44.4974349", "11.3714015"];

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
     WHERE c.is_private = false AND r.role_type IS DISTINCT FROM 4
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

app.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Recupera i dati dell'utente dalla tabella "users"
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    // Rispondi con i dati dell'utente
    const user = result.rows[0];

    res.status(200).json({
      user
    });

  } catch (error) {
    console.error('Errore nel recupero dei dati dell\'utente', error);
    res.status(500).json({ message: 'Errore nel recupero dei dati' });
  }
});


async function deleteRoom(chatId, token) {
  
  try {
    // Verifica se il token è valido per l'amministratore
    const result = await pool.query('SELECT * FROM users WHERE token = $1', [token]);

    if (result.rows.length === 0) {
      // Se il token non è valido, restituisci un errore
      console.log(chatId, "Token non valido o amministratore non autorizzato a rimuovere la chat")
      return false;
    }

    // Inizia la transazione
    await pool.query('BEGIN');

    // Elimina i messaggi associati alla chat
    await pool.query('DELETE FROM messages WHERE chat_id = $1', [chatId]);

    // Elimina i ruoli associati alla chat
    await pool.query('DELETE FROM roles WHERE chat_id = $1', [chatId]);

    // Elimina i reports associati alla chat
    await pool.query('DELETE FROM reports WHERE chat_id = $1', [chatId]);

    // Elimina la chat
    await pool.query('DELETE FROM chats WHERE id = $1', [chatId]);

    // Commit della transazione se tutte le query vanno a buon fine
    await pool.query('COMMIT');

    await redisClient.del(`online_users:${chatId}`); 

    return true;

  } catch (err) {
    await pool.query('ROLLBACK');  // Se c'è un errore, annulla tutte le operazioni
    console.error("Errore cancellazione chat:", err);
    return false;
  }
};

app.post('/chat/:chatId', async (req, res) => {
  const { chatId } = req.params;
  const { title, description } = req.body;
  const token = req.query.token;

  if (!token || !title || !description) {
    return res.status(400).json({ error: 'Missing token or required data.' });
  }

  try {
    // Verifica che il token corrisponda a un utente che ha ruolo admin (role_type = 1) in questa chat
    const result = await pool.query(`
      SELECT users.id FROM users
      INNER JOIN roles ON roles.user_id = users.id
      WHERE users.token = $1 AND roles.chat_id = $2 AND roles.role_type = 1
    `, [token, chatId]);

    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'Unauthorized: not admin of this chat.' });
    }

    // Aggiorna la chat se il token è valido e l’utente è admin
    await pool.query(
      'UPDATE chats SET name = $1, description = $2 WHERE id = $3',
      [title, description, chatId]
    );

    res.status(200).json({});
  } catch (err) {
    console.error("Errore aggiornamento chat:", err);
    res.sendStatus(500);
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
         u.id as user_id,
         c.description,
         u_admin.nickname as nickname_admin, 
         CASE 
            WHEN u.id = u_admin.id THEN 1
            ELSE 0
         END AS am_i_admin,
         u_admin.id as user_admin_id,
         u_admin.subscription as user_admin_subscription,
         c.created_at,
         CASE 
            WHEN r.role_type = 4 THEN 1
            ELSE 0
         END AS is_banned       
       FROM chats as c
       LEFT JOIN users as u ON u.token = $2 
       LEFT JOIN roles as r ON r.user_id = u.id AND r.chat_id = c.id
       LEFT JOIN roles as r_admin ON r_admin.role_type = 1 AND r_admin.chat_id = c.id
       LEFT JOIN users as u_admin ON u_admin.id = r_admin.user_id
       WHERE c.id = $1`,
      [chatId, token]
    );

    // Se non viene trovata la chat, rispondi con un errore
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Chat non trovata' });
    }

    // Restituisci i dati della chat
    const chatData = result.rows[0];

    if (chatData.is_banned == 1) {
      return res.status(403).json({ message: 'You have been banned from this chat by the administrator.' });
    }

    const messagesResult = await pool.query(
      `SELECT m.id, u.nickname, m.message , m.user_id 
       FROM messages as m
       JOIN users as u ON u.id = m.user_id 
       WHERE m.chat_id = $1  
       ORDER BY m.created_at ASC`, 
      [chatId]
    );


    let banUsersList = [];

    if (chatData.am_i_admin == 1) {
      const banUsersListTmp = await pool.query(
        `SELECT users.nickname || '####' || users.id AS banned_user
         FROM users
         JOIN roles ON users.id = roles.user_id
         WHERE roles.chat_id = $1 AND roles.role_type = 4`,
        [chatId]
      );

      banUsersList = banUsersListTmp.rows.map(row => Object.values(row)[0]);

      console.log("finito", banUsersList)
    }

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
      messages: messagesResult.rows,
      ban_user_list: banUsersList,
    });
  } catch (err) {
    console.error('Errore nel recuperare i dati della chat:', err);
    res.status(500).json({ message: 'Errore nel recuperare i dati della chat' });
  }
});

app.put('/unban/:chatId/:userId', async (req, res) => {
  const { chatId, userId } = req.params;
  const { token } = req.query;

  try {
    // Verifica che il token appartenga a un admin nella chat
    const adminCheck = await pool.query(
      `SELECT users.id FROM users
       JOIN roles ON users.id = roles.user_id
       WHERE roles.chat_id = $1 AND roles.role_type = 1 AND users.token = $2`,
      [chatId, token]
    );

    if (adminCheck.rowCount === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Aggiorna il ruolo dell’utente da bannato a normale (role_type = 3)
    await pool.query(
      `UPDATE roles
       SET role_type = 3
       WHERE user_id = $1 AND chat_id = $2`,
      [userId, chatId]
    );

    res.status(200).json({ message: 'User unbanned successfully.' });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.put('/ban/:chatId/:userId', async (req, res) => {
  const { chatId, userId } = req.params;
  const token = req.query.token;

  try {
    const result = await pool.query(`
      SELECT admin.id AS admin_id, target.nickname AS target_name
      FROM users AS admin
      JOIN roles ON admin.id = roles.user_id
      JOIN users AS target ON target.id = $3
      WHERE roles.chat_id = $1 AND roles.role_type = 1 AND admin.token = $2
    `, [chatId, token, userId]);

    if (result.rowCount === 0) {
      return res.status(403).json({ error: "You are not an admin of this chat." });
    }

    await pool.query(
      `UPDATE roles SET role_type = 4 WHERE user_id = $1 AND chat_id = $2`,
      [userId, chatId]
    );

    await redisClient.srem(`online_users:${chatId}`, `${result.rows[0].target_name}####${userId}`);

    io.to(`user:${chatId}_${userId}`).emit('banned', {
      message: "You have been banned from the chat",
      chatId,
    })

    const users = await redisClient.smembers(`online_users:${chatId}`);
    io.to(chatId).emit('alert_message', { message: "", users });

    res.status(200).json({});
  } catch (err) {
    console.error("Error banning user:", err);
    res.status(500).send("Error during user ban for user_id="+userId);
  }

});

app.get("/users", async (req, res) => {
  const { query, token } = req.query;

  try {
    const userResult = await pool.query(
      "SELECT id FROM users WHERE token = $1",
      [token]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const userId = userResult.rows[0].id;

    const users = await pool.query(
      `SELECT 
        u.id AS user_id, 
        u.nickname, 
        pm.id,
        cm.message AS last_message,
        cm.created_at AS last_message_time,
        CASE 
          WHEN pm.user_id1 = u.id THEN pm.read_1 
          ELSE pm.read_2 
        END AS is_read
      FROM users u
      LEFT JOIN conversations pm 
        ON ((pm.user_id1 = u.id AND pm.user_id2 = $1) 
        OR (pm.user_id2 = u.id AND pm.user_id1 = $1))
      LEFT JOIN LATERAL (
        SELECT message, created_at
        FROM messages
        WHERE conversation_id = pm.id
        ORDER BY created_at DESC
        LIMIT 1
      ) cm ON true
      WHERE u.nickname ILIKE $2 AND u.id <> $1
      LIMIT 10;`,
      [userId, `%${query}%`]
    );

    res.json(users.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error searching users");
  }
});

app.get("/conversation/:conversationId", async (req, res) => {
  const { conversationId } = req.params;
  const { token } = req.query;

  try {
      // 1️⃣ Controlliamo se il token corrisponde a un utente della conversazione
      const conversationQuery = `
          SELECT c.id, c.user_id1, c.user_id2, u1.id AS auth_user_id, u1.nickname AS auth_user_nickname,
                 u2.id AS target_user_id, u2.nickname AS target_user_nickname
          FROM conversations c
          JOIN users u1 ON u1.token = $1
          JOIN users u2 ON (c.user_id1 = u1.id AND c.user_id2 = u2.id) OR (c.user_id2 = u1.id AND c.user_id1 = u2.id)
          WHERE c.id = $2;
      `;

      const conversationResult = await pool.query(conversationQuery, [token, conversationId]);

      if (conversationResult.rows.length === 0) {
          return res.status(403).json({ error: "Accesso negato o conversazione non trovata." });
      }

      const conversation = conversationResult.rows[0];

      // 2️⃣ Recuperiamo i messaggi della conversazione
      const messagesQuery = `SELECT m.id, u.nickname, m.message , m.user_id 
       FROM messages as m
       JOIN users as u ON u.id = m.user_id 
       WHERE m.conversation_id = $1  
       ORDER BY m.created_at ASC
      `;

      const messagesResult = await pool.query(messagesQuery, [conversationId]);

      // 3️⃣ Rispondiamo con i dati
      return res.json({
          messages: messagesResult.rows,
          auth_user: {
              id: conversation.auth_user_id,
              nickname: conversation.auth_user_nickname,
          },
          target_user: {
              id: conversation.target_user_id,
              nickname: conversation.target_user_nickname,
          }
      });

  } catch (error) {
      console.error("Errore nel recupero dei messaggi:", error);
      res.status(500).json({ error: "Errore interno del server" });
  }
});

app.get("/conversations/all", async (req, res) => {
  const { token } = req.query;

  try {
    // Trova l'utente con il token
    const userQuery = 'SELECT * FROM users WHERE token = $1';
    const userResult = await pool.query(userQuery, [token]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const userId = userResult.rows[0].id;

    // Recupera tutte le conversazioni dell'utente con solo l'ultimo messaggio
    const conversationsQuery = `
      SELECT c.id, 
             CASE
                WHEN c.user_id1 = $1 THEN u2.nickname
                ELSE u1.nickname
             END AS nickname,
             cm.message AS last_message,
             cm.created_at AS last_message_time,
             CASE
                WHEN c.user_id1 = $1 THEN c.user_id2
                ELSE c.user_id1
             END AS user_id
      FROM conversations c
      LEFT JOIN LATERAL (
        SELECT message, created_at
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) cm ON true
      LEFT JOIN users u1 ON c.user_id1 = u1.id
      LEFT JOIN users u2 ON c.user_id2 = u2.id
      WHERE c.user_id1 = $1 OR c.user_id2 = $1
      ORDER BY cm.created_at DESC
    `;
    
    const conversationResult = await pool.query(conversationsQuery, [userId]);

    // Ritorna le conversazioni con l'ultimo messaggio
    return res.json({
      conversations: conversationResult.rows
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/conversations", async (req, res) => {
  const { token, user_id } = req.query;

  if (!token || !user_id) {
    return res.status(400).json({ error: "Token e user_id sono obbligatori" });
  }

  try {
    // Eseguo una singola query per recuperare sia l'utente autenticato, sia il target, sia la conversazione
    const result = await pool.query(
      `WITH auth_user AS (
          SELECT id, nickname FROM users WHERE token = $1
        ),
        target_user AS (
          SELECT id, nickname FROM users WHERE id = $2
        )
      SELECT 
        au.id AS auth_user_id, au.nickname AS auth_user_nickname,
        tu.id AS target_user_id, tu.nickname AS target_user_nickname,
        pm.id AS conversation_id
      FROM auth_user au
      CROSS JOIN target_user tu
      LEFT JOIN conversations pm 
        ON ((pm.user_id1 = au.id AND pm.user_id2 = tu.id) 
         OR (pm.user_id1 = tu.id AND pm.user_id2 = au.id))`,
      [token, user_id]
    );

    if (result.rows.length === 0 || !result.rows[0].auth_user_id) {
      return res.status(401).json({ error: "Token non valido" });
    }

    if (!result.rows[0].target_user_id) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    const row = result.rows[0];

    res.json({
      conversation_id: row.conversation_id || null,
      auth_user: { id: row.auth_user_id, nickname: row.auth_user_nickname },
      target_user: { id: row.target_user_id, nickname: row.target_user_nickname },
    });
  } catch (error) {
    console.error("Errore nel recupero della conversazione:", error);
    res.status(500).json({ error: "Errore del server" });
  }
});


app.post('/create-conversation', async (req, res) => {
  const { token, user_id } = req.body;

  // Verifica il token dell'utente
  try {
    // Recupera l'utente autenticato in base al token
    const userResult = await pool.query('SELECT id, nickname FROM users WHERE token = $1', [token]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Token non valido" });
    }

    const authUserId = userResult.rows[0].id;

    // Verifica se esiste già una conversazione tra questi due utenti
    const result = await pool.query(
      `SELECT id FROM conversations WHERE 
        (user_id1 = $1 AND user_id2 = $2) OR
        (user_id1 = $2 AND user_id2 = $1)`,
      [authUserId, user_id]
    );

    if (result.rows.length > 0) {
      // Se la conversazione esiste, restituisci l'ID
      return res.json({ conversation_id: result.rows[0].id });
    }

    // Se la conversazione non esiste, creala
    const insertResult = await pool.query(
      `INSERT INTO conversations (user_id1, user_id2) 
      VALUES ($1, $2) RETURNING id`,
      [authUserId, user_id]
    );

    // Restituisci l'ID della conversazione appena creata
    res.json({ conversation_id: insertResult.rows[0].id });

  } catch (err) {
    console.error("Errore nel creare la conversazione:", err);
    res.status(500).json({ error: "Errore interno del server" });
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

    if (!isValidNickname(nickname)) {
      return res.status(400).json({ message: 'The nickname is not valid, minimum 6 characters and do not use special symbols, only _ and numbers are allowed' });
    }

    const check = await pool.query(
      `SELECT 1 FROM users WHERE LOWER(nickname) = LOWER($1) LIMIT 1`,
      [nickname]
    );
  
    if (check.rowCount > 0) {
      return res.status(409).json({ message: "Nickname already used!" });
    }


    // Esegui l'UPDATE sul database
    const result = await pool.query(
      `UPDATE users SET nickname = $1 WHERE token = $2 RETURNING *`,
      [nickname, token]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
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

    socket.userId = user_id;
    socket.chatId = chatId;
    socket.nickname = nickname;
    socket.join(chatId);
    socket.join(`user:${chatId}_${user_id}`); //for ban
    await redisClient.sadd(`online_users:${chatId}`, `${nickname}####${user_id}`);
    const users = await redisClient.smembers(`online_users:${chatId}`);
    io.to(chatId).emit('alert_message', { message: "", users });
    
  });

  socket.on('leave-room', async (chatId) => {
    console.log("Un utente si è disconnesso",chatId, socket.nickname, socket.userId);
    if (socket.chatId && socket.nickname) {
      await redisClient.srem(`online_users:${chatId}`, `${socket.nickname}####${socket.userId}`);
      const users = await redisClient.smembers(`online_users:${chatId}`);
      io.to(chatId).emit('alert_message', { message: "", users });
      socket.leave(socket.chatId);
      socket.chatId = null; // Rimuoviamo l'ID della chat attuale
    }
  });

  // Ascolta per l'evento "message" (invio di un messaggio)
  socket.on('message', async (chatId, newMessage, userId) => {
    // Invia il messaggio a tutti gli utenti della stanza
    try {
      // Salva il messaggio nel database
      const is_a_multimedia_message = newMessage.audio ? true : false;

      await pool.query(
        'INSERT INTO messages (chat_id, user_id, message) VALUES ($1, $2, $3)',
        [chatId, userId, !is_a_multimedia_message ? newMessage.text : '']
      );
      
      // Emetti il messaggio alla chat
      io.to(chatId).emit('broadcast_messages', newMessage);
  
      // Controlla il numero di messaggi nella chat
      const result = await pool.query(
        'SELECT COUNT(*) FROM messages WHERE chat_id = $1',
        [chatId]
      );
      const messageCount = parseInt(result.rows[0].count, 10);
  
      // Se ci sono più di 50 messaggi, elimina il primo
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

  socket.on("delete_chat_process", async ( chatId, token ) => {
    if (socket.chatId) {
      if (deleteRoom(chatId, token)) {
        io.to(socket.chatId).emit("alert_message", {message : "The administrator has removed the chat from our system!", users: null, deleteChat: true});
      }
    }
  });

  socket.on("update_chat_data", async ( name, description ) => {
    if (socket.chatId) {
      io.to(socket.chatId).emit("alert_message", {message : "The administrator has changed some chat values", users: null, editChat: { name, description }, });
    }
  });

  socket.on('join-private-room', async (conversation_id, user, callback) => {

    console.log("sono qui... e faccio accesso alla chat privata", conversation_id, user)

    socket.user_id = user.id;
    socket.conversation_id = conversation_id;
    socket.nickname = user.nickname;
    socket.join(conversation_id);


    if (callback) {
      callback({ success: true, message: 'Room joined successfully' });
    }

    //await redisClient.sadd(`online_users:${chatId}`, `${nickname}####${user_id}`);
    //const users = await redisClient.smembers(`online_users:${chatId}`);
  });

  socket.on('leave-private-room', async (conversation_id) => {
    console.log("Un utente si è disconnesso dalla chat privata",conversation_id, socket.nickname, socket.user_id);
    if (socket.conversation_id && socket.nickname) {
      //await redisClient.srem(`online_users:${chatId}`, `${socket.nickname}####${socket.userId}`);
      //const users = await redisClient.smembers(`online_users:${chatId}`);
      socket.leave(socket.conversation_id);
      socket.conversation_id = null; // Rimuoviamo l'ID della chat attuale
    }
  });

  socket.on('private-message', async (chatId, newMessage) => {

    console.log("private message! ", socket.conversation_id)

    if (!socket.conversation_id) {
      return;
    }

    // Invia il messaggio a tutti gli utenti della stanza
    try {
      // Salva il messaggio nel database
      const is_a_multimedia_message = newMessage.audio ? true : false;

      await pool.query(
        'INSERT INTO messages (conversation_id, user_id, message) VALUES ($1, $2, $3)',
        [socket.conversation_id, socket.user_id, !is_a_multimedia_message ? newMessage.text : '']
      );
      
      // Emetti il messaggio alla chat
      io.to(socket.conversation_id).emit('broadcast_private_messages', newMessage);
  
      // Controlla il numero di messaggi nella chat
      const result = await pool.query(
        'SELECT COUNT(*) FROM messages WHERE conversation_id = $1',
        [socket.conversation_id]
      );
      const messageCount = parseInt(result.rows[0].count, 10);
  
      // Se ci sono più di 50 messaggi, elimina il primo
      if (messageCount > 50) {
        await pool.query(`
          DELETE FROM messages
          WHERE id = (
            SELECT id FROM messages
            WHERE conversation_id = $1
            ORDER BY id ASC
            LIMIT 1
          )`, [socket.conversation_id]);
        console.log(`Il primo messaggio è stato eliminato dalla conversazione ${socket.conversation_id}`);
      }
  
      console.log(`Messaggio inviato alla conversazione ${socket.conversation_id}: ${newMessage}`);
    } catch (err) {
      console.error('Errore nel salvataggio del messaggio:', err);
    }
  });

  socket.on("disconnect", async (reason) => {

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
            const users = await redisClient.smembers(`online_users:${socket.chatId}`);
            io.to(socket.chatId).emit('alert_message', { message: "", users });
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


