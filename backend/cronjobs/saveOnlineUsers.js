const cron = require('node-cron');
const { Pool } = require('pg'); // per connettersi a PostgreSQL
const redis = require('ioredis');

// Configura il database PostgreSQL
const dbClient = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Connetti al DB
dbClient.connect();

// Configura Redis
const redisClient = redis.createClient({
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379
});

// Funzione per salvare utenti online nel database ogni 24 ore
async function saveOnlineUsers() {
    console.log("Avvio cronjob...")
    try {
        const chatKeys = await redisClient.keys("online_users:*");
        let usersOnline = {};

        for (const key of chatKeys) {
            const [_, chatId, nickname] = key.split(':');  
            if (!usersOnline[chatId]) usersOnline[chatId] = [];
            usersOnline[chatId].push(nickname);
        }

        for (const chatId in usersOnline) {
            await pool.query(
                `INSERT INTO online_users (chat_id, users, updated_at) 
                 VALUES ($1, $2, NOW()) 
                 ON CONFLICT (chat_id) DO UPDATE 
                 SET users = $2, updated_at = NOW()`, 
                [chatId, usersOnline[chatId]]
            );
        }

        console.log("✔ Online users salvati su PostgreSQL");
    } catch (err) {
        console.error("❌ Errore nel cronjob:", err);
    }
}

// Esegue la funzione ogni 24 ore
cron.schedule('*/45 * * * * *', saveOnlineUsers, {
  scheduled: true,
  timezone: "Europe/Rome"
});

console.log("⏳ Cron job avviato: Salvataggio utenti online ogni 45 secondi.");
