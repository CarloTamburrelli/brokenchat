const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Pool } = require('pg'); // per connettersi a PostgreSQL
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
const { sendPushNotification } = require('./web_push');
const crypto = require('crypto');
const Groq = require('groq-sdk');
const bots = require('./bots');

const GROQ_KEYS = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
];

let currentKeyIndex = 0;

function getNextGroqKey() {
  const key = GROQ_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
  return key;
}

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


async function sendNotificationToUser(userId, nickname, message, conversation_id, msg_type) {
  try {
    // Recupera la subscription dell'utente dal DB
    const result = await pool.query('SELECT webpush_subscription FROM users WHERE id = $1', [userId]);

    // Verifica se l'utente esiste
    if (result.rowCount === 0) {
      throw new Error('User not found');
    }
    console.log("eccoci prima dell'invio...", result.rows[0].webpush_subscription)

    // Parse della subscription per ottenere l'oggetto Subscription
    const subscription = result.rows[0].webpush_subscription;

    if (subscription == null){
      //l'utente non ha accettato i permessi quindi nessuna notific
      return;
    }

    let bodyText = message;

    if (msg_type === 2) {
      bodyText = "🎤 Audio sent";
    } else if (msg_type === 3) {
      bodyText = "🌅 Image sent";
    }

    // Costruzione del payload della notifica
    const payload = JSON.stringify({
      title: nickname, // Titolo della notifica
      body: bodyText,   // Corpo della notifica
      data: {
        url: `https://broken.chat/private-messages/${conversation_id}`
      }
    });


    // Invia la notifica push
    await sendPushNotification(subscription, payload);

    console.log('Notifica inviata con successo!');
  } catch (error) {
    console.error('Errore nell\'invio della notifica:', error);
    throw new Error('Errore nell\'invio della notifica');
  }
}


app.get('/', async (req, res) => {
  res.status(200).json({ message: 'Very nice' });
});

const isValidNickname = (nickname) => {
  const regex = /^[a-zA-Z0-9_]{3,17}$/;
  return regex.test(nickname);
};


// Rotta per creare una nuova chat
app.post('/create-chat', async (req, res) => {
  const { chatName, yourNickname, description, token, latitude, longitude } = req.body;

  try {

    if ((chatName && chatName.length < 5) || (description && description.length < 10)) {
      return res.status(400).json({ message: 'The chat name or description is not valid' });
    }

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
        return res.status(400).json({ message: 'The nickname is not valid, minimum 3 characters and do not use special symbols, only _ and numbers are allowed' });
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
        'INSERT INTO users (nickname, token, subscription, latitude, longitude) VALUES ($1, $2, NOW(), $3, $4) RETURNING id',
        [yourNickname, newToken, latitude, longitude] // role_type = 1 → Admin
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
           WHERE r.role_type IS DISTINCT FROM 4 AND c.is_private = false`
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

app.get("/check-webpush-subscription/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Controlla se l'utente ha una subscription
    const result = await pool.query(
      "SELECT webpush_subscription FROM users WHERE id = $1",
      [userId]
    );

    if (result.rowCount === 0 || !result.rows[0].webpush_subscription) {
      return res.json({ subscription: null }); // Nessuna subscription trovata
    }

    return res.json({ subscription: result.rows[0].webpush_subscription }); // Restituisci la subscription se esiste
  } catch (error) {
    console.error("Error checking web push subscription:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.post("/register-webpush", async (req, res) => {
  try {
    const { userId, subscription } = req.body;

    if (!userId || !subscription) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verifica che l'utente sia valido
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [userId]
    );

    if (userCheck.rowCount === 0) {
      return res.status(401).json({ error: "Unauthorized: Invalid user or token" });
    }

    // Salva la subscription nel database
    await pool.query(
      "UPDATE users SET webpush_subscription = $1 WHERE id = $2",
      [subscription, userId]
    );

    res.json({ message: "Web push subscription saved successfully" });
  } catch (error) {
    console.error("Error saving web push subscription:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



app.post("/report", async (req, res) => {
  try {
    const { reporter_id, reported_user_id, chat_id, conversation_id, message, token } = req.body;

    if (!reporter_id || !reported_user_id || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const userCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND token = $2",
      [reporter_id, token]
    );

    if (userCheck.rowCount === 0) {
      return res.status(401).json({ error: "Unauthorized: Invalid user or token" });
    }

    if (chat_id) {
      await pool.query(
        "INSERT INTO reports (reporter_id, reported_user_id, chat_id, message) VALUES ($1, $2, $3, $4)",
        [reporter_id, reported_user_id, chat_id, message]
      );
    } else if (conversation_id) {
      await pool.query(
        "INSERT INTO reports (reporter_id, reported_user_id, conversation_id, message) VALUES ($1, $2, $3, $4)",
        [reporter_id, reported_user_id, conversation_id, message]
      );
    } else {
      return res.status(401).json({ message: "Chat id or conversation id no set" });
    }

    
    res.json({ message: "Report successfully submitted" });
  } catch (error) {
      console.error("Error reporting message:", error);
      res.status(500).json({ error: "Internal server error" });
  }
});


app.get('/am-i-registred', async (req, res) => {

  const { token } = req.query;  // Prendi i parametri dalla query
  const userResult = await pool.query(
    `SELECT u.nickname 
     FROM users u
     WHERE u.token = $1`,
    [token]
  );

  if (userResult.rows.length !== 0) {
    return res.status(200).json({ nickname: userResult.rows[0].nickname });
  } else {
    return res.status(404).json({ message: "User not found"})
  }

})


app.get('/get-user', async (req, res) => {
  const { token, filter, lat, lon, mode } = req.query;  // Prendi i parametri dalla query

  //console.log("sto prendendo le chat...", filter, lat, lon, "Con modo: ", mode, "  Ok???")

  //const [lat, lon] = ["44.4974349", "11.3714015"];

  const FILTERS = ["Popular", "Nearby", "My Chats"];

  try {

    if (filter && FILTERS.includes(filter)) {
      let response = {}
      if (filter == 'Popular') {
        response.popularChats = await getPopularChats(token);
      } else if (filter == 'Nearby' && (lat && lon && lat !== "0" && lon !== "0")) {
        response.nearbyChats = await getNearbyChats(token, lat, lon);
      } else { // mie
        response.userChats = await getMyChats(token);
      }

      //console.log("sto per restituire...", response)

      return res.status(200).json(response);
    }


    // Cerca l'utente con il token nel database
    const userResult = await pool.query(
      `SELECT u.nickname, u.id, u.latitude as last_latitude, u.longitude as last_longitude,
       CASE WHEN u.recovery_code IS NULL THEN 1 ELSE 0 END as recovery_code_is_null 
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
      userId = userResult.rows[0].id;  // Ottieni il nickname dell'utente
      recovery_code_is_null = userResult.rows[0].recovery_code_is_null;  // Ottieni il nickname dell'utente

      const isValid = (v) => v !== null && v !== "0" && v !== 0;

      // Se l'utente fornisce latitudine e longitudine, aggiorna la sua posizione e ottieni le chat vicine
      if (isValid(lat) && isValid(lon)) {
        await pool.query(
          `UPDATE users SET latitude = $1, longitude = $2 WHERE token = $3`,
          [lat, lon, token]
        );

        nearbyChats = await getNearbyChats(token, lat, lon); // Ottieni chat limitrofe
      } else if (isValid(user.last_latitude) && isValid(user.last_longitude)) {
        // se risultano a null prendo le ultime lat e lon salvate a db
        nearbyChats = await getNearbyChats(token, user.last_latitude, user.last_longitude);
      } else {
        // Se non fornisce latitudine e longitudine, recupera solo le chat popolari
        popularChats = await getPopularChats(token); // Funzione che restituisce chat popolari
      }

      const unreadResult = await pool.query(
        `
        SELECT COUNT(*) AS unread_count
        FROM conversations
        WHERE 
          (user_id1 = $1 AND read_1 = false)
          OR
          (user_id2 = $1 AND read_2 = false)
        `,
        [userId]
      );


      return res.status(200).json({
        userId,
        nickname,
        nearbyChats,
        popularChats,
        recovery_code_is_null,
        unread_private_messages_count: parseInt(unreadResult.rows[0].unread_count, 10)
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
      return res.status(404).json({ message: 'Chat not found :(' });
    }

    // Restituisci i dati della chat
    const chatData = result.rows[0];

    if (chatData.is_banned == 1) {
      return res.status(403).json({ message: 'You have been banned from this chat by the administrator.' });
    }

    const messagesResult = await pool.query(
      `SELECT 
        m.id,
        u.nickname,
        m.message,
        m.user_id,
        m.msg_type,
        CASE 
          WHEN q.id IS NOT NULL THEN json_build_object(
            'id', q.id,
            'nickname', uq.nickname,
            'msg_type', q.msg_type,
            'message', q.message
          )
          ELSE NULL
        END AS quoted_msg
      FROM messages AS m
      JOIN users AS u ON u.id = m.user_id 
      LEFT JOIN messages AS q ON q.id = m.quoted_message_id 
      LEFT JOIN users AS uq ON uq.id = q.user_id
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

    }

    // Se la chat è privata e l'utente non è già dentro, bloccalo
    if (chatData.is_private && chatData.already_in === 0) {
      return res.status(403).json({ message: 'Accesso negato: questa chat è privata' });
    } else if (chatData.already_in === 0 && chatData.user_id > 0 ) {
      //e' registrato ma non è mai entrato nella chat
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


    const unreadResult = await pool.query(
      `
      SELECT COUNT(*) AS unread_count
      FROM conversations
      WHERE 
        (user_id1 = $1 AND read_1 = false)
        OR
        (user_id2 = $1 AND read_2 = false)
      `,
      [chatData.user_id]
    );

    res.status(200).json({
      chat: chatData,
      messages: messagesResult.rows,
      ban_user_list: banUsersList,
      unread_private_messages_count: parseInt(unreadResult.rows[0].unread_count, 10)
    });
  } catch (err) {
    console.error('Errore nel recuperare i dati della chat:', err);
    res.status(500).json({ message: 'Errore nel recuperare i dati della chat' });
  }
});

app.put('/delete-account', async (req, res) => {
  const { token, user_id } = req.body;

  if (!token || !user_id) {
    return res.status(400).json({ error: 'Missing token or user_id' });
  }

  try {
    // Verifica che l’utente esista con quel token
    const userCheck = await pool.query(
      `SELECT id FROM users WHERE id = $1 AND token = $2`,
      [user_id, token]
    );

    if (userCheck.rowCount === 0) {
      return res.status(404).json({ error: 'User not found or invalid token' });
    }

    // Aggiorna la colonna con la data di richiesta cancellazione
    await pool.query(
      `UPDATE users
       SET deletion_requested_at = NOW()
       WHERE id = $1`,
      [user_id]
    );

    res.status(200).json({ message: 'Account deletion requested successfully.' });
  } catch (error) {
    console.error('Error processing deletion request:', error);
    res.status(500).json({ error: 'Internal server error' });
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

    io.to(`user:${userId}`).emit('banned', {
      msg: "You have been banned from the chat",
      chat_id: chatId,
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
      "SELECT id, latitude, longitude, geo_hidden FROM users WHERE token = $1",
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
        END AS is_read,
        u.latitude,
        u.longitude,
        u.geo_hidden,
        CASE
          WHEN pm.user_id1 = u.id THEN pm.read_2
          ELSE pm.read_1
        END AS read  
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

    const myLat = userResult.rows[0].latitude;
    const myLon = userResult.rows[0].longitude;
    const iHideGeoLocation = userResult.rows[0].geo_hidden;

    let usersToRetrieve = []

    if (myLat != null && myLon != null && iHideGeoLocation == false) {
      usersToRetrieve = await Promise.all(users.rows.map(async (user) => {

        user.is_online = await redisClient.sismember('online', user.user_id)
        if (user.latitude != null && user.longitude != null && user.geo_hidden == false) {
          const distance = calculateDistance(myLat, myLon, user.latitude, user.longitude);
          return { ...user, distance: Math.round(distance) }; // distanza in km, arrotondata
        } else {
          return { ...user, distance: null };
        }
      }));
    } else {
      usersToRetrieve = await Promise.all(users.rows.map(async (user) => {
        user.is_online = await redisClient.sismember('online', user.user_id)
        return { ...user, distance: null};
      }))
    }

    res.json(usersToRetrieve);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error searching users");
  }
});

app.put('/user/hide-location', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const userResult = await pool.query(
      'SELECT geo_hidden FROM users WHERE token = $1',
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentHidden = userResult.rows[0].geo_hidden;

    // Inverti il valore
    const newHidden = !currentHidden;

    // Aggiorna il database
    await pool.query(
      'UPDATE users SET geo_hidden = $1 WHERE token = $2',
      [newHidden, token]
    );

    return res.status(200).json({ success: true, geo_hidden: newHidden });
  } catch (error) {
    console.error('Error updating geo_hidden:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});


app.post('/user/update-location', async (req, res) => {
  const { latitude, longitude } = req.body;
  const { token } = req.query;

  try {

  const result = await pool.query(
    `UPDATE users SET latitude = $1, longitude = $2 WHERE token = $3 RETURNING *`,
    [latitude, longitude, token]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: "User not updated" });
  }

  return res.json({ message: "User location updated" });
  } catch (err) {
    console.error('Error updating location:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


app.post('/set-recovery-code', async (req, res) => {
  const { recoveryCode, token } = req.body;  // Ottieni il codice di recupero dal corpo della richiesta

  if (!recoveryCode || !token) {
    return res.status(400).json({ message: 'Missing recovery code or token' });
  }

  try {
    // Trasforma il codice di recupero in MD5
    const hashedCode = crypto.createHash('md5').update(recoveryCode).digest('hex');

    // Esegui la query per aggiornare il codice di recupero nel database
    const result = await pool.query(
      `UPDATE users SET recovery_code = $1 WHERE token = $2 RETURNING *`,
      [hashedCode, token]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found or code not updated" });
    }

    return res.status(200).json({});
  } catch (err) {
    console.error('Error setting recovery code:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.post('/get-recovery-profile', async (req, res) => {
  const { nickname, recovery_code } = req.body;

  try {
    // Hash MD5 del nickname e del codice di recupero
    const hashedRecoveryCode = crypto.createHash('md5').update(recovery_code).digest('hex');

    // Query per cercare l'utente
    const result = await pool.query(
      'SELECT token FROM users WHERE nickname = $1 AND recovery_code = $2',
      [nickname, hashedRecoveryCode]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No user found with this nickname and recovery code.' });
    }

    // Restituisci le informazioni dell'utente
    const user = result.rows[0];

    await pool.query(
      `UPDATE users
       SET deletion_requested_at = NULL 
       WHERE token = $1`,
      [user.token]
    );

    return res.json({
      token: user.token,
    });
  } catch (err) {
    console.error('Error retrieving profile:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});


app.get("/conversation/:conversationId", async (req, res) => {
  const { conversationId } = req.params;
  const { token } = req.query;

  try {
      const conversationQuery = `
          SELECT c.id, c.user_id1, c.user_id2, u1.id AS auth_user_id, u1.nickname AS auth_user_nickname,
                 u2.id AS target_user_id, u2.nickname AS target_user_nickname, u1.latitude as my_lat, u1.longitude as my_lon, 
                 u2.latitude, u2.longitude, u1.geo_hidden as geo_hidden_u1, u2.geo_hidden as geo_hidden_u2 
          FROM conversations c
          JOIN users u1 ON u1.token = $1
          JOIN users u2 ON (c.user_id1 = u1.id AND c.user_id2 = u2.id) OR (c.user_id2 = u1.id AND c.user_id1 = u2.id)
          WHERE c.id = $2;
      `;

      const conversationResult = await pool.query(conversationQuery, [token, conversationId]);

      if (conversationResult.rows.length === 0) {
          return res.status(403).json({ message: "Accesso negato o conversazione non trovata." });
      }

      const conversation = conversationResult.rows[0];

      const messagesQuery = `SELECT m.id, u.nickname, m.message , m.user_id, m.msg_type, CASE 
          WHEN q.id IS NOT NULL THEN json_build_object(
            'id', q.id,
            'nickname', uq.nickname,
            'msg_type', q.msg_type,
            'message', q.message
          )
          ELSE NULL
        END AS quoted_msg 
       FROM messages as m
       JOIN users as u ON u.id = m.user_id 
       LEFT JOIN messages AS q ON q.id = m.quoted_message_id 
       LEFT JOIN users AS uq ON uq.id = q.user_id
       WHERE m.conversation_id = $1  
       ORDER BY m.created_at ASC
      `;

      const messagesResult = await pool.query(messagesQuery, [conversationId]);

      await pool.query(
        `UPDATE conversations
         SET 
           read_1 = CASE 
             WHEN user_id1 = $1 THEN true 
             ELSE read_1 
           END,
           read_2 = CASE 
             WHEN user_id2 = $1 THEN true 
             ELSE read_2 
           END
         WHERE id = $2`,
        [conversation.auth_user_id, conversationId]
      );

      let distance = (conversation.my_lat != null && conversation.latitude ) ? calculateDistance(conversation.my_lat, conversation.my_lon, conversation.latitude, conversation.longitude) : null;

      let target_is_online = await redisClient.sismember('online', conversation.target_user_id)
      
      return res.json({
          messages: messagesResult.rows,
          auth_user: {
              id: conversation.auth_user_id,
              nickname: conversation.auth_user_nickname,
              geo_accepted: conversation.my_lat != null,
              geo_hidden: conversation.geo_hidden_u1
          },
          target_user: {
              id: conversation.target_user_id,
              nickname: conversation.target_user_nickname,
              distance,
              geo_hidden: conversation.geo_hidden_u2,
              is_online: target_is_online
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
             cm.msg_type AS last_message_type,
             CASE
                WHEN c.user_id1 = $1 THEN c.user_id2
                ELSE c.user_id1
             END AS user_id,
             CASE
                WHEN c.user_id1 = $1 THEN u2.latitude
                ELSE u1.latitude
             END AS latitude,
             CASE
                WHEN c.user_id1 = $1 THEN u2.longitude
                ELSE u1.longitude
             END AS longitude,
             CASE
                WHEN c.user_id1 = $1 THEN u2.geo_hidden
                ELSE u1.geo_hidden
             END AS geo_hidden_2,
             CASE
                WHEN c.user_id1 = $1 THEN c.read_1
                ELSE c.read_2
             END AS read 
      FROM conversations c
      LEFT JOIN LATERAL (
        SELECT message, created_at, msg_type   
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
    
    const myLat = userResult.rows[0].latitude;
    const myLon = userResult.rows[0].longitude;
    const iHideGeoLocation = userResult.rows[0].geo_hidden;

    let conversationsToRetrieve = []

    if (myLat != null && myLon != null && iHideGeoLocation == false) {
      conversationsToRetrieve = await Promise.all(conversationResult.rows.map(async (conversation) => {

        conversation.is_online = await redisClient.sismember('online', conversation.user_id)

        if (conversation.latitude != null && conversation.longitude != null && conversation.geo_hidden_2 == false) {
          const distance = calculateDistance(myLat, myLon, conversation.latitude, conversation.longitude);
          return { ...conversation, distance: Math.round(distance) }; // distanza in km, arrotondata
        } else {
          return { ...conversation, distance: null };
        }
      }));
    } else {
      conversationsToRetrieve = await Promise.all(conversationResult.rows.map(async (conversation) => {
        conversation.is_online = await redisClient.sismember('online', conversation.user_id)
        return { ...conversation, distance: null};
      }))
    }

    // Ritorna le conversazioni con l'ultimo messaggio
    return res.json({
      conversations: conversationsToRetrieve,
      user_id: userId
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
      SELECT id, nickname, geo_hidden, latitude, longitude FROM users WHERE token = $1
    ),
    target_user AS (
      SELECT id, nickname, geo_hidden, latitude, longitude FROM users WHERE id = $2
    )
  SELECT 
    au.id AS auth_user_id, 
    au.nickname AS auth_user_nickname, 
    au.geo_hidden AS geo_hidden_1, 
    au.latitude AS my_lat, 
    au.longitude AS my_lon,
    
    tu.id AS target_user_id, 
    tu.nickname AS target_user_nickname, 
    tu.geo_hidden AS geo_hidden_2, 
    tu.latitude, 
    tu.longitude,

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

    let distance = (row.my_lat != null && row.longitude && (row.geo_hidden_2 == false)) ? calculateDistance(row.my_lat, row.my_lon, row.latitude, row.longitude) : null;

    let target_is_online = await redisClient.sismember('online', row.target_user_id)
      

    res.json({
      conversation_id: row.conversation_id || null,
      auth_user: { id: row.auth_user_id, nickname: row.auth_user_nickname, geo_hidden: row.geo_hidden_1, geo_accepted: row.my_lat != null },
      target_user: { id: row.target_user_id, nickname: row.target_user_nickname, geo_hidden: row.geo_hidden_2, distance, is_online: target_is_online },
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
  const { nickname, latitude, longitude } = req.body;

  try {

    if (!isValidNickname(nickname)) {
      return res.status(400).json({ message: 'The nickname is not valid, minimum 3 characters and do not use special symbols, only _ and numbers are allowed' });
    }

    const check = await pool.query(
      `SELECT 1 FROM users WHERE LOWER(nickname) = LOWER($1) LIMIT 1`,
      [nickname]
    );
  
    if (check.rowCount > 0) {
      return res.status(409).json({ message: "Nickname already used!" });
    }


    let newToken = jwt.sign(
      { nickname: nickname },
      process.env.SECRET_KEY,
      { expiresIn: '30d' } // Imposta la scadenza del token
    );

    // Inserisci l'utente nel database
    await pool.query(
      "INSERT INTO users (nickname, token, subscription, latitude, longitude) VALUES ($1, $2, NOW(), $3, $4) RETURNING id, token",
      [nickname, newToken, latitude, longitude]
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
      return res.status(400).json({ message: 'The nickname is not valid, minimum 3 characters and do not use special symbols, only _ and numbers are allowed' });
    }

    const check = await pool.query(
      `SELECT 1 FROM users WHERE LOWER(nickname) = LOWER($1) LIMIT 1`,
      [nickname]
    );
  
    if (check.rowCount > 0) {
      return res.status(409).json({ message: "Nickname already used!" });
    }

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

app.get('/sitemap.xml', async (req, res) => {
  try {
    const result = await pool.query('SELECT id FROM chats WHERE is_private = false');
    const baseUrl = 'https://broken.chat';

    const staticUrls = [
      {
        loc: `${baseUrl}/`,
        priority: '1.0',
        changefreq: 'daily',
      },
      {
        loc: `${baseUrl}/create-chat`,
        priority: '0.8',
        changefreq: 'weekly',
      },
    ];

    const dynamicUrls = result.rows.map((chat) => ({
      loc: `${baseUrl}/chat/${chat.id}`,
      priority: '0.5',
      changefreq: 'weekly',
    }));

    const allUrls = [...staticUrls, ...dynamicUrls];

    const urlEntries = allUrls
      .map(
        ({ loc, priority, changefreq }) =>
          `<url>
  <loc>${loc}</loc>
  <priority>${priority}</priority>
  <changefreq>${changefreq}</changefreq>
</url>`
      )
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Errore generazione sitemap:', error);
    res.status(500).send('Errore generazione sitemap');
  }
});



// Gestione della connessione WebSocket
io.on('connection', (socket) => {
  // console.log('Un utente si è connesso');

  socket.on('join-home', async (user_id) => {
    socket.join(`user:${user_id}`);
    await redisClient.sadd('online', user_id);
  });

  socket.on('join-private-messages', async (user_id) => {
    await redisClient.sadd('online', user_id);
  });

  // Ascolta per l'evento "join-room" (entrata nella chat)
  socket.on('join-room', async (chatId, nickname, user_id) => {

    socket.userId = user_id;
    socket.chatId = chatId;
    socket.nickname = nickname;
    socket.join(chatId);
    socket.join(`user:${user_id}`);
    await redisClient.sadd(`online_users:${chatId}`, `${nickname}####${user_id}`);
    await redisClient.sadd('online', user_id);
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
      socket.leave(`user:${socket.userId}`)
      socket.chatId = null; // Rimuoviamo l'ID della chat attuale
    }
  });


  async function handleBotResponse(chatId, bot) {
    try {

      const recentMessagesRes = await pool.query(
        `SELECT m.user_id, m.message, u.nickname, m.msg_type  
        FROM messages as m
        JOIN users as u ON u.id = m.user_id
        WHERE m.chat_id = $1
        ORDER BY m.id DESC
        LIMIT 5`,
        [chatId]
      );
    
      const recentMessages = recentMessagesRes.rows.reverse(); // più vecchi prima
    
      const messagesForGroq = [
        {
          role: "system",
          content:
            `${bot.prompt}\n\n` +
            `Ignora i messaggi che non ti coinvolgono direttamente. ` +
            `Non usare emoji. Non essere prolisso. Non comportarti mai da assistente. Rispondi come se fossi un partecipante reale in una chat pubblica, in modo breve, naturale e coerente con il tono del resto della chat.\n` +
            `Se non hai nulla da dire, restituisci esattamente la stringa: ####`
        },
        ...recentMessages.map(msg => ({
          role: msg.user_id == bot.id ? "assistant" : "user",
          content: msg.user_id == bot.id ? (msg.msg_type == 1 ? msg.message : '') : `${msg.nickname || 'Utente'}: ${msg.msg_type == 1 ?  msg.message: ''}`
        }))
      ];

      //console.log("messaggi recuperati", messagesForGroq)
    
      const apiKey = getNextGroqKey();
      const client_groq = new Groq({ apiKey });
    
      const response = await client_groq.chat.completions.create({
        model: 'gemma2-9b-it',
        messages: messagesForGroq,
      });
    
      const botReplyText = response.choices[0].message.content.replace(/\n{2,}/g, '\n').trim();
    
      //console.log("risposta bot", botReplyText)


      if (botReplyText && !botReplyText.includes("####")) {
        const result_bot_msg = await pool.query(
          `INSERT INTO messages (chat_id, user_id, message, msg_type) VALUES ($1, $2, $3, 1) RETURNING id`,
          [chatId, bot.id, botReplyText]
        );
    
        const botMessage = {
          id: result_bot_msg.rows[0].id,
          user_id: bot.id,
          text: botReplyText,
          msg_type: 1,
          nickname: bot.nickname
        };
    
        //console.log("invio messaggio del bot in broadcast", botMessage);
        io.to(chatId).emit('broadcast_messages', botMessage);
      }

    } catch (err) {
      console.error('Errore in handleBotResponse:', err.message || err);
    }
  }

  socket.on('message', async (chatId, newMessage, userId) => {
    console.log("Sono nella socket message!");
    try {

      const result_message = await pool.query(
        'INSERT INTO messages (chat_id, user_id, message, msg_type, quoted_message_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [chatId, userId, newMessage.text, newMessage.msg_type, newMessage.quoted_msg ? newMessage.quoted_msg.id : null]
      );

      newMessage.id = result_message.rows[0].id;
      
      // Emetti il messaggio alla chat
      io.to(chatId).emit('broadcast_messages', newMessage);

      const botIds = await redisClient.smembers(`bots_chat:${chatId}`);

      if (botIds && botIds.length > 0) {

        const selectedBotId = botIds[0]; // ne prendi solo uno
        const bot = bots.find(b => b.id === selectedBotId);
        if (bot) {
          const delayMs = Math.floor(Math.random() * 4000) + 3000;
          setTimeout(() => {
            handleBotResponse(chatId, bot);
          }, delayMs);
        }
      }
  
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
        //console.log(`Il primo messaggio è stato eliminato dalla chat ${chatId}`);
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

    socket.userId = user.id;
    socket.conversationId = conversation_id;
    socket.nickname = user.nickname;
    socket.join(conversation_id);
    await redisClient.sadd('online', user.id);
    await redisClient.sadd(`private_room:${conversation_id}`, user.id);

    if (callback) {
      callback({ success: true, message: 'Room joined successfully' });
    }

    //const users = await redisClient.smembers(`online_users:${chatId}`);
  });

  socket.on('leave-private-room', async (conversation_id) => {
    console.log("Un utente si è disconnesso dalla chat privata",conversation_id, socket.nickname, socket.userId);
    if (socket.conversationId && socket.nickname) {
      await redisClient.srem(`private_room:${conversation_id}`, socket.userId);
      //const users = await redisClient.smembers(`online_users:${chatId}`);
      socket.leave(socket.conversationId);
      socket.conversationId = null; // Rimuoviamo l'ID della chat attuale
    }
  });

  socket.on('private-message', async (chatId, newMessage) => {

    console.log("private message! ", socket.conversationId)

    if (!socket.conversationId) {
      return;
    }

    try {

      const result_message = await pool.query(
        'INSERT INTO messages (conversation_id, user_id, message, msg_type, quoted_message_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [socket.conversationId, socket.userId, newMessage.text, newMessage.msg_type, newMessage.quoted_msg ? newMessage.quoted_msg.id : null]
      );

      newMessage.id = result_message.rows[0].id;

      const isMember = await redisClient.sismember(`private_room:${socket.conversationId}`, newMessage.target_id);

      newMessage.is_online = await redisClient.sismember('online', newMessage.target_id);
      if (!newMessage.is_online) {
        sendNotificationToUser(newMessage.target_id, socket.nickname, newMessage.text, socket.conversationId, newMessage.msg_type);
      }

      if (!isMember) {


        // il messaggio e' nuovo solo se l'altro utente non si trova nella chat
        await pool.query(
          `UPDATE conversations
          SET 
            read_1 = CASE 
              WHEN user_id1 = $1 THEN true
              ELSE false
            END,
            read_2 = CASE 
              WHEN user_id2 = $1 THEN true
              ELSE false
            END
          WHERE id = $2`,
          [socket.userId, socket.conversationId]
        );

        
        const unreadResult = await pool.query(
          `
          SELECT COUNT(*) AS unread_count
          FROM conversations
          WHERE 
            (user_id1 = $1 AND read_1 = false)
            OR
            (user_id2 = $1 AND read_2 = false)
          `,
          [newMessage.target_id]
        );
        
        io.to(`user:${newMessage.target_id}`).emit('new_private_messages', {
          unread_private_messages_count: parseInt(unreadResult.rows[0].unread_count, 10)
        })

      }

      
      io.to(socket.conversationId).emit('broadcast_private_messages', newMessage);
  
      // Controlla il numero di messaggi nella chat
      const result = await pool.query(
        'SELECT COUNT(*) FROM messages WHERE conversation_id = $1',
        [socket.conversationId]
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
          )`, [socket.conversationId]);
        console.log(`Il primo messaggio è stato eliminato dalla conversazione ${socket.conversationId}`);
      }
  
      console.log(`Messaggio inviato alla conversazione ${socket.conversationId}: ${newMessage}`);
    } catch (err) {
      console.error('Errore nel salvataggio del messaggio:', err);
    }
  });

  socket.on("disconnect", async (reason) => {

    //console.log("MI SONO DISCONNESSO???", reason, "user id", socket.userId, socket.conversationId);

    if (socket.conversationId && socket.userId) {
      await redisClient.srem(`private_room:${socket.conversationId}`, socket.userId);
    }

    if (socket.userId) {
      await redisClient.srem('online', socket.userId);
    }


    if (!socket.chatId || !socket.nickname || !socket.userId) {
      //console.log("Dati utente mancanti, impossibile rimuovere da Redis.");
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


