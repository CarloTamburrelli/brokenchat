# Broken Chat

![alt text](preview.png "First preview app")

Una sistema di chat che puoi usare come vuoi, tutto sparira' se tutti escono!

**TODO**

- messaggi privati:
  - invio notifiche FCM (dobbiamo avere prima un server?)
  - hai inserito le notifiche push, devi migliorare la risposta, perche' adesso restituisce un json e il link alla notifica e' sbagliato, inoltre la notifica deve essere inviata solo se l'utente non e' online (altrimenti gia' ci pensa la notifica colorata di fianco che ho mess) SEMBRA NON FUNZIONI CON IOS!:D


mi piacciono i colori bg-gray-800 e bg-gray-700:

<div className="flex items-center p-4 bg-gray-800 text-white">
        {/* Input della chat */}
        <input
          type="text"
          placeholder="Scrivi un messaggio..."
          className="flex-1 p-2 bg-gray-700 text-white rounded-l-md"
        />
        
        {/* Bottone di invio */}
        <button className="ml-4 p-2 bg-blue-500 hover:bg-blue-700 text-white rounded-r-md">
          Invia
        </button>
      </div>