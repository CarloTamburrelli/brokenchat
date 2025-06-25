const cron = require('node-cron');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});


cron.schedule('0 0 */7 * *', async () => {
  try {
    console.log('Avvio task di pulizia chat...');

    const result = await pool.query(`
      DELETE FROM chats
      WHERE id IN (
        SELECT chats.id
        FROM chats
        LEFT JOIN messages ON messages.chat_id = chats.id
        GROUP BY chats.id, chats.created_at
        HAVING (
          COUNT(messages.id) = 0 AND chats.created_at < NOW() - INTERVAL '7 days'
        ) OR (
          COUNT(messages.id) > 0 AND MAX(messages.created_at) < NOW() - INTERVAL '7 days'
        )
      )
    `);

    console.log(`Pulizia completata. Chat eliminate: ${result.rowCount}`);
  } catch (err) {
    console.error('Errore durante la pulizia delle chat:', err);
  }
});
