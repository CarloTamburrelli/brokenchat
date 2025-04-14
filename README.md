# Broken Chat

![alt text](preview.png "First preview app")

Una sistema di chat che puoi usare come vuoi, tutto sparira' se tutti escono!

**TODO**

- sistema di ban
- messaggi privati:
  - invio notifiche FCM (dobbiamo avere prima un server?)
  - mostra messaggio gia' letto o da leggere con numerino e grafica diversa in messaggi privati
  - mostra online con scritta celeste nel nome o grigio (online su tutta la piattaforma, mi raccomand)
  - metti km di distanza (con spunta opzionale se vuoi disabilitare questa opzione :), puoi cliccare  sul km per annullare questa informazione pero' anche tu non vedrai questo!! :D
- rendi i nickname univoci! :D


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