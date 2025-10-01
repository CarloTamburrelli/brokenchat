# Broken Chat

![alt text](preview.png "First preview app")


Geolocalized chat system that finds the closest chats in your area.

## TODO - nuovo Broken Chat

- Criptaggio informazioni per chat private
- forse fare colore del logo come il colore che hanno i messaggi (quel blu scuro)?

--- non so se non è complicato ok --- altrimenti durante documenti avvocati
- fai delle prove, sembrerebbe che la compressione FOTO non sia così efficace...
- sistema di gif e risistemazione delle faccine
- About Our Mission

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


### 3) Task dei Video

devi aggiungere i dati del .env di AWS al .env di produzione!
Poi devi anche fare: npm install così scarica le due librerie 'aws-sdk' e 'multer'.

### 4) Task dei Report

``` SQL
ALTER TABLE reports
ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'other', -- tipo di report (spam, violento, altro…)
ADD COLUMN description TEXT NULL;                     -- testo libero opzionale inserito dall'utente
```

### 5) Task del NudeNet

rimuovi il flag -u (CMD ["python", "-u", "worker.py"])


``` SQL
CREATE TABLE violations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    violation VARCHAR(50) NOT NULL,   -- tipo: prohibited_content, spam, violent, ecc.
    details JSONB,                    -- opzionale, contiene il JSON di NudeNet
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 6) Task dell'avatar


``` SQL
ALTER TABLE users 
ADD COLUMN avatar_url TEXT DEFAULT NULL;
```

segna anche ADMIN_USER_ID nell'.env


## POST BIG UPDATE
- Aggiornare metodi e condizioni che indicano che noi siamo abilitati a rimuovere ogni contenuto che riteniamo non in linea con le leggi.

## Extra TODO
  *FOR APP*
    - invio notifiche FCM [app]
 - mettere un log sull'output del server 

