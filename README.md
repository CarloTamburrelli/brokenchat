# Broken Chat

![alt text](preview.png "First preview app")


Geolocalized chat system that finds the closest chats in your area.

## TODO - nuovo Broken Chat

- Sistema segnalazione, spiegare meglio il tipo di segnalazione che si vuole fare, campo di testo ecc
- Sistema automatico di scarto contenuti con Nudenet, tramite un container a parte che faccia questo controllo.
  - qui il sistema automatico controllerà in background ogni messaggio inviato dalla piattaforma e provvederà alla sua rimozione in un secondo momento qualora vedesse nudità
- Criptaggio informazioni per chat private

## Query SQL e TODO dopo il push

### 1) Task del ban

Eseguire la seguente query per aggiungere i campi relativi al ban nella tabella `users`:

```sql
ALTER TABLE users
ADD COLUMN ban_status SMALLINT DEFAULT 0,
ADD COLUMN ban_message TEXT NULL,
ADD COLUMN ban_read BOOLEAN DEFAULT false;
```

### 2) Task della Global chat

devi aggiungere nel file .env questa var:

```
GLOBAL_CHAT_ID=36  # ID della chat globale
```

-----post----
- Aggiornare metodi e condizioni che indicano che noi siamo abilitati a rimuovere ogni contenuto che riteniamo non in linea con le leggi.

### 3) Task dei Video

devi aggiungere i dati del .env di AWS al .env di produzione!
Poi devi anche fare: npm install così scarica le due librerie 'aws-sdk' e 'multer'.

## Extra TODO
  *FOR APP*
    - invio notifiche FCM [app]
 - mettere un log sull'output del server 

