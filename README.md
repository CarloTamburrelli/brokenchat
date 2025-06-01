# Broken Chat

![alt text](preview.png "First preview app")


**FUTURE TODO**
 - cronjob automatic delete chats after 3 days
  *FOR APP*
    - invio notifiche FCM [app]
 - mettere un log sull'output del server 


QUERY:

CREATE TABLE feedbacks (
  id SERIAL PRIMARY KEY,
  user_id int4 NOT NULL,
  comment TEXT NOT NULL
);



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