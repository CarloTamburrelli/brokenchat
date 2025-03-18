# Broken Chat

![alt text](preview.png "First preview app")

Una sistema di chat che puoi usare come vuoi, tutto sparira' se tutti escono!

**TODO**

- sistemare homepage:
  - aggiungi slider per raggio
  - aggiungi ordinamento per distanza e popolarita'
  - aggiungi
- sistema di ban
- aggiungi lista utenti connessi e offline
- aggiungi allegati


STAVI FINENDO DI SISTEMARE LA HOME:
- hai fatto query quando sei registrato o meno:
  (bisognerebbe adesso switchare tra chat mie, chat limitrofe e chat popolari) cietta suggeriva imbuto
- devi distinguere le mie chat dalle altre
- aggiungere icona per messaggi privati

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