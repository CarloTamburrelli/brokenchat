# Broken Chat

![alt text](preview.png "First preview app")


Geolocalized chat system that finds the closest chats in your area.

## TODO - nuovo Broken Chat

- Hai fatto il worker con python:
  - fare sistema segnalazioni (se almeno 4 persone segnalano un contenuto, allora viene rimosso e il tipo ammonito e poi si aggiunge sempre una riga al db nella tabella delle violazioni )
  - sistema ban per IP (è eccessivo e rischi di bannere gente non colpevole) e sistema ban perchè puoi contattare persone in privato anche se sei bannato!
  - ricontrolla controllo numero violazioni, sembra siano necessarie piu' di 4 violazioni prima del ban
- Criptaggio informazioni per chat private
- AGGIUNGI AVATAR! :D

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

## POST BIG UPDATE
- Aggiornare metodi e condizioni che indicano che noi siamo abilitati a rimuovere ogni contenuto che riteniamo non in linea con le leggi.

## Extra TODO
  *FOR APP*
    - invio notifiche FCM [app]
 - mettere un log sull'output del server 

