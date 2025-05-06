# Broken Chat

![alt text](preview.png "First preview app")


**FUTURE TODO**
 - cronjob automatic delete chats after 3 days
  *FOR APP*
    - invio notifiche FCM [app]


**TODO**
- mettere un log sull'output del server 

QUERY DA ESEGUIR:


ALTER TABLE messages ADD COLUMN msg_type INTEGER DEFAULT 1 NOT NULL;


ALTER TABLE public.messages
ADD COLUMN quoted_message_id INT NULL,
ADD CONSTRAINT messages_quoted_message_id_fkey
  FOREIGN KEY (quoted_message_id) REFERENCES public.messages(id) ON DELETE SET NULL;




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