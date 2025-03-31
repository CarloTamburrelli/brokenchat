# Broken Chat

![alt text](preview.png "First preview app")

Una sistema di chat che puoi usare come vuoi, tutto sparira' se tutti escono!

**TODO**

- sistema di ban e modifica dati room
- messaggi privati


sistema ricezione dei messaggi privati e forse esteticamente cambia la grafica in maniera che l'utente a cui scrivi abbia scritte a sinistra e tu scritte a destr

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