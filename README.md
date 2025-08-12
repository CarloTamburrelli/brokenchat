# Broken Chat

![alt text](preview.png "First preview app")


Geolocalized chat system that finds the closest chats in your area.

## TODO - nuovo Broken Chat

- Aggiungere video e collegamento a AWS (s3) e inserimento URL
- Aggiungere ban e sistema di avviso con cartellino giallo e ban per IP
- Sistema segnalazione, spiegare meglio il tipo di segnalazione che si vuole fare, campo di testo ecc
- Sistema automatico di scarto contenuti con Nudenet, tramite un container a parte che faccia questo controllo.:
  - qui il sistema automatico controllerà in background ogni messaggio inviato dalla piattaforma e provvederà alla sua rimozione in un secondo momento qualora vedesse nudità
- Criptaggio informazioni per chat private
- Aggiornare metodi e condizioni che indicano che noi siamo abilitati a rimuovere ogni contenuto che riteniamo non in linea con le leggi.
- aggiungere chat globale nella home?? oh yes!
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


## Extra TODO
  *FOR APP*
    - invio notifiche FCM [app]
 - mettere un log sull'output del server 

