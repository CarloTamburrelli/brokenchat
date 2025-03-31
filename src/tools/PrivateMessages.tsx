import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from '../base/header';
import { fetchWithPrefix } from '../utils/api';
import { formatDate } from "../utils/formatDate";
import LoadingSpinner from "./LoadingSpinner";

// Definizione del tipo per la conversazione
interface UserConversation {
  id: number;
  user_id: number;
  nickname: string;
  last_message?: string;
  data?: string;
  is_read: boolean;
  last_message_time: string;
}


const PrivateMessages = () => {
  const [searchQuery, setSearchQuery] = useState("");
  // Definizione del tipo per lo stato delle conversazioni
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [conversations, setConversations] = useState<UserConversation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nicknameTmp, setTmpNickname] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');
  const token = localStorage.getItem('authToken');
  const [loading, setLoading] = useState<boolean>(true);

  // Funzione per ottenere la lista delle conversazioni recenti
  const getConversations = async () => {
    setLoading(true)
    try {
      const response_json = await fetchWithPrefix(`/conversations/all?token=${token}`);
      setConversations(response_json.conversations); // response.conversations è un array di conversazioni
      console.log(response_json.conversations)
    } catch (error) {
      console.error("Error fetching conversations", error);
    }
    setLoading(false)
  };

  // Funzione per ottenere la lista degli utenti per la ricerca
  const searchUsers = async () => {
    if (searchQuery.trim() === "") {
      getConversations(); // Se la ricerca è vuota, mostra tutte le conversazioni
      return;
    }

    try {
      setLoading(true)
      const response_json = await fetchWithPrefix(`/users/?query=${searchQuery}&token=${token}`);
      console.log("UTENTI TROVATI", response_json); // Qui trovi i dati dell'utente
      setConversations(response_json)
    } catch (error: any) {
      alert('Errore nel recupero dei dati dell\'utente:'+error.message);
    }
    setLoading(false)
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      searchUsers();
    }, 500); // 500ms di attesa prima di aggiornare il searchQuery debounced

    return () => {
      clearTimeout(handler); // Annulla la precedente timeout se l'utente continua a digitare
    };
  }, [searchQuery]);

  // Effettua il fetch delle conversazioni iniziali quando il componente è montato
  useEffect(() => {
    //getConversations();
  }, []);

  const handleChangeNickname = async () => {
    try {
        const token = localStorage.getItem('authToken');

        await fetchWithPrefix(`/update-nickname`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, nickname: nicknameTmp }),
        });
        setShowNicknameModal(false);

    } catch (error) {
      console.log(error);
      setError("Impossibile cambiare nickname");
    }
  };

  const openNicknameModal = () => {
    setTmpNickname(nickname);
    setShowNicknameModal(true);
  }

  return (
    <div className="flex flex-col h-screen w-full">
  {/* Header */}
  <div className="sticky top-0 text-center font-bold z-50 bg-white">
    <Header
      onOpenInfo={() => {}}
      headerName={"My Messages"}
      onOpenNicknameModal={openNicknameModal}
    />
  </div>

  {showNicknameModal && (
  <div
    className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20"
    onClick={() => setShowNicknameModal(false)} // Chiude la modal cliccando fuori
  >
    <div
      className="bg-white p-6 rounded-lg shadow-lg relative w-96"
      onClick={(e) => e.stopPropagation()} // Impedisce la chiusura cliccando dentro la modal
    >
      {/* Header con titolo e pulsante di chiusura */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-800">Cambia il tuo nickname</h2>
        <button
          className="text-gray-500 hover:text-black text-2xl font-semibold"
          onClick={() => setShowNicknameModal(false)}
        >
          ✕
        </button>
      </div>

      {/* Input del nickname */}
      <input
        maxLength={17}
        type="text"
        placeholder="Nuovo nickname"
        value={nicknameTmp}
        onChange={(e) => setTmpNickname(e.target.value)}
        className="border p-2 mt-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Errore se presente */}
      {error && <div className="text-red-600 font-bold mt-2">{error}</div>}

      {/* Bottone di conferma */}
      <div className="flex mt-4 justify-center">
        <button
          onClick={handleChangeNickname}
          className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
        >
          Conferma
        </button>
      </div>
    </div>
  </div>
)}

  {/* Barra di ricerca */}
  <div className="mb-4 mt-1 mx-5 flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
  <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Cerca utente..."
    className="w-full p-3 focus:outline-none rounded-lg"
  />
  {searchQuery && (
    <button
      onClick={() => setSearchQuery("")}
      className="p-2 text-gray-500 hover:text-gray-700"
    >
      ✖
    </button>
  )}
</div>


  {/* Lista delle conversazioni o degli utenti */}
  <div className="space-y-2 px-4">
    {/* Mostra le conversazioni recenti */}
    {loading ? ( 
    // Spinner mentre i dati vengono caricati
    <LoadingSpinner />
  ) : (
    conversations.length > 0 ? (
    conversations.map((conversation) => (
      <div className="bg-white shadow-lg rounded-lg p-4" key={conversation.id}>
        <Link to={`/private-messages/${conversation.last_message ? conversation.id : `new/${conversation.user_id}`}`}>
          <div className="text-left">
            <strong className="text-lg">{conversation.nickname}</strong>
            {conversation.last_message && (
              <p className="text-gray-600 text-sm flex justify-between items-center">
                <span>{conversation.last_message}</span>
                <span className="text-gray-400 italic text-xs">{formatDate(conversation.last_message_time)}</span>
              </p>
            )}
          </div>
        </Link>
      </div>
    ))
  ) : searchQuery.trim() !== "" ? (
    <p className="text-gray-500 text-center mt-4">
      Nessun utente trovato con la parola chiave "<span className="font-semibold">{searchQuery}</span>"
    </p>
  ) : <p className="text-gray-500 text-center mt-4">
  Nessuna conversazione avviata al momento.
</p>)}
  </div>
</div>

  );
};

export default PrivateMessages;
