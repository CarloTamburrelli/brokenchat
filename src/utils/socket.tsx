import { io, Socket } from "socket.io-client";
import { BROKEN_CHAT_BASE_URL } from "../utils/consts";


export const socket: Socket = io(BROKEN_CHAT_BASE_URL, {
  reconnection: true, // Riattiva il tentativo di riconnessione
  reconnectionAttempts: 5, // Numero massimo di tentativi
  reconnectionDelay: 1000, // Tempo di attesa tra i tentativi
  extraHeaders: {
    'ngrok-skip-browser-warning': 'true',
  }
});
