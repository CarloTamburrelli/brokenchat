# Broken Chat

![alt text](preview.png "First preview app")


Geolocalized chat system that finds the closest chats in your area.

## TODO - nuovo Broken Chat

- Aggiungere video e collegamento a AWS (s3) e inserimento URL  
- Sistema segnalazione, spiegare meglio il tipo di segnalazione che si vuole fare, campo di testo ecc
- Sistema automatico di scarto contenuti con Nudenet, tramite un container a parte che faccia questo controllo.:
  - qui il sistema automatico controllerà in background ogni messaggio inviato dalla piattaforma e provvederà alla sua rimozione in un secondo momento qualora vedesse nudità
- Criptaggio informazioni per chat private
- aggiungere chat globale nella home:
  ho creato la base ora bisogna mostrare la chat dove la gente si parlerà, probabilmente bisogna far entrare con la socket anche chi non sta scrivendo ed è solo in home, altrimenti non vedrebbe i messaggi in tempo reale. Inoltre probabilmente anche per chi non è iscritto bisognerà mostrare i messaggi in tempo reale e quindi dovrà ricevere le socket anch'egli. 
  Inizialmente potrei usare il .env per impostare l'id della chat globale.
- risolvere bug che ci fa cadere sempre il server :O
  tipico errore:
    Un utente si è disconnesso 79 undefined undefined
    Un utente si è disconnesso 79 undefined undefined
    Un utente si è disconnesso 79 undefined undefined
    Un utente si è disconnesso 79 undefined undefined
    rieccoci e volevo rimuovere=3170 [] -1
    rieccoci e volevo rimuovere=3170 [] 0
    rieccoci e volevo rimuovere=3170 [] -1
    rieccoci e volevo rimuovere=3170 [] -1
    /app/node_modules/redis-parser/lib/parser.js:179
        return new ReplyError(string)
              ^

    ReplyError: READONLY You can't write against a read only replica.
        at parseError (/app/node_modules/redis-parser/lib/parser.js:179:12)
        at parseType (/app/node_modules/redis-parser/lib/parser.js:302:14) {
      command: { name: 'srem', args: [ 'online', '3170' ] }
    }


----- post----
- Aggiornare metodi e condizioni che indicano che noi siamo abilitati a rimuovere ogni contenuto che riteniamo non in linea con le leggi.

## Query SQL

1) Task del ban

ALTER TABLE users
ADD COLUMN ban_status SMALLINT DEFAULT 0,  
ADD COLUMN ban_message TEXT NULL, 
ADD COLUMN ban_read BOOLEAN DEFAULT false;


## Extra TODO
  *FOR APP*
    - invio notifiche FCM [app]
 - mettere un log sull'output del server 

