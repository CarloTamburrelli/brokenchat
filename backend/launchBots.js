// launchBots.js

const bots = require('./bots');
const Redis = require('ioredis');
const { Pool } = require('pg'); // per connettersi a PostgreSQL
const yargs = require('yargs');

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379
});


redisClient.on("connect", () => console.log("🔥 Connesso a Redis!"));

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });


async function joinBots(chatIds) {
    const assignedBots = bots.slice(0, chatIds.length); // prendi N bot per N chat
  
    for (let i = 0; i < chatIds.length; i++) {
      const chatId = chatIds[i];
      const bot = assignedBots[i];
  
      if (!bot) continue; // nel caso ci siano meno bot che chat
  
      await redisClient.sadd(`bots_chat:${chatId}`, `${bot.id}`);
      await redisClient.sadd(`online_users:${chatId}`, `${bot.nickname}####${bot.id}`);
  
      await pool.query(
        `INSERT INTO roles (user_id, role_type, chat_id, last_access)
         VALUES ($1, 3, $2, NOW())
         ON CONFLICT (user_id, chat_id) DO NOTHING`,
        [bot.id, chatId]
      );
    }
  
    console.log('✅ Ogni bot è stato assegnato a una stanza');
    process.exit();
}
  

async function leaveBots(chatIds) {
  for (const chatId of chatIds) {
    for (const bot of bots) {
        await redisClient.srem(`bots_chat:${chatId}`, `${bot.id}`);
        await redisClient.srem(`online_users:${chatId}`, `${bot.nickname}####${bot.id}`);
    }
  }
  console.log('🧹 Bot rimossi dalle stanze');
  process.exit();
}

(async () => {
    const argv = yargs
      .command('join', 'Fai entrare i bot nelle chat', (yargs) => {
        return yargs.option('chat', {
          alias: 'c',
          type: 'array',
          description: 'Chat ID in cui far entrare i bot',
          demandOption: true
        });
      })
      .command('leave', 'Rimuovi i bot da tutte le stanze', () => {})
      .demandCommand(1, '❌ Specifica un comando: join o leave')
      .help()
      .argv;
  
    const action = argv._[0]; // join o leave
  
    if (action === 'join') {
      const chatIds = argv.chat;
      await joinBots(chatIds);
    } else if (action === 'leave') {
      // TODO: prendi tutte le chat da Redis o dal DB, se necessario
      // oppure fai leave globale
      const keys = await redisClient.keys('bots_chat:*');
      const chatIds = keys.map(k => k.split(':')[1]);
      await leaveBots(chatIds);
    } else {
      console.log('❌ Comando non riconosciuto');
      process.exit(1);
    }
  })();
