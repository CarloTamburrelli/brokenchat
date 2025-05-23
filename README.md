# Broken Chat

![alt text](preview.png "First preview app")


**FUTURE TODO**
 - cronjob automatic delete chats after 3 days
  *FOR APP*
    - invio notifiche FCM [app]
 - mettere un log sull'output del server 


**TODO**

- stai usando Groq, con un piano gratuito:
  - bisognerebbe creare degli utenti bot (ragazze soprattutto) e farle rispondere nelle chat
  - fai un file a parte con le varie personalità
  - sistema storico


QUERY (3):

ALTER TABLE users
ADD COLUMN is_bot BOOLEAN DEFAULT FALSE;


INSERT INTO users (nickname, is_bot) values
('Cristina', true),
('Marta', true),
('Lea', true),
('Giulia', true),
('Rik', true),
('Emanuela', true),
('Raffaella', true);

ALTER TABLE roles ADD CONSTRAINT unique_user_chat UNIQUE (user_id, chat_id);


mi piacciono i colori bg-gray-800 e bg-gray-700:

<div className="flex items-center p-4 bg-gray-800 text-white">
        {/* Input della chat */}
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 p-2 bg-gray-700 text-white rounded-l-md"
        />
        
        {/* Bottone di invio */}
        <button className="ml-4 p-2 bg-blue-500 hover:bg-blue-700 text-white rounded-r-md">
          Invia
        </button>
      </div>