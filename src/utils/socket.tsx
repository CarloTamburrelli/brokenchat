import { io } from "socket.io-client";
import { BROKEN_CHAT_BASE_URL } from "../utils/consts";


export const socket = io(BROKEN_CHAT_BASE_URL, {
  autoConnect: false, // Evita la connessione automatica
  reconnection: true, // Riattiva il tentativo di riconnessione
  reconnectionAttempts: 5, // Numero massimo di tentativi
  reconnectionDelay: 1000, // Tempo di attesa tra i tentativi
});
