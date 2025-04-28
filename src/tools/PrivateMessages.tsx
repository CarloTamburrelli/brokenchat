import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Logo from '../assets/logo_without_text.png';
import { fetchWithPrefix } from '../utils/api';
import { formatDate } from "../utils/formatDate";
import LoadingSpinner from "./LoadingSpinner";
import { socket } from "../utils/socket"; // Importa il socket

// Definizione del tipo per la conversazione
interface UserConversation {
  id: number;
  user_id: number;
  nickname: string;
  last_message?: string;
  data?: string;
  is_read: boolean;
  last_message_time: string;
  distance: number;
  geo_hidden: boolean;
  read: boolean;
  is_online: boolean;
}


const PrivateMessages = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<UserConversation[]>([]);
  const token = localStorage.getItem('authToken');
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<number | null>(null);

  // Funzione per ottenere la lista delle conversazioni recenti
  const getConversations = async () => {
    setLoading(true)
    try {
      const response_json = await fetchWithPrefix(`/conversations/all?token=${token}`);
      setUserId(response_json.user_id)
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
    window.scrollTo(0, 0);
    //getConversations();
  }, []);


    useEffect(() => {
  
      if (!userId) {
        return;
      }
  
      if (socket.connected) {
        console.log("Socket gia' connesso!")
        socket.emit('join-private-messages', userId);
      } else {
        console.log("Socket ancora da connettere!")
        socket.connect();
        socket.on('connect', () => {
          console.log("Socket connesso, ora emetto join-room");
          socket.emit('join-private-messages', userId);
        });
      }
  
    }, [userId]);


  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto bg-white">
  {/* Header */}
  <div className="sticky top-0 z-50 bg-white shadow-md flex items-center p-4">
    <Link to="/" className="pointer-events-auto mr-4 text-2xl">
      <img alt="BrokenChat" src={Logo} className="h-8 block" />
    </Link>
    <h2 className="text-lg font-semibold">Private Messages</h2>
  </div>


  {/* Barra di ricerca */}
  <div className="mb-4 mt-4 mx-5 flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 bg-white">
    <input
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Search user 🔍"
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
      <div className="shadow-lg rounded-lg p-4" key={conversation.id}>
        <Link to={`/private-messages/${conversation.last_message ? conversation.id : `new/${conversation.user_id}`}`}>
        <div className="flex justify-between items-start w-full">
          <div className="text-left max-w-[100%]">
            <strong className="text-lg block mb-1">
              {conversation.nickname}
              {(conversation.read == false) && (
                <span className="ml-2 text-xs text-white bg-blue-500 px-2 py-1 rounded-full">
                  New
                </span>
              )}
            </strong>

            {(conversation.is_online == true) && (<div className="text-xs font-semibold inline-block text-blue-500 mb-2">
              Online
            </div>)}
            
            {conversation.last_message && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
              <p className="break-all whitespace-pre-wrap">
              {conversation.last_message.length > 100
                    ? `${conversation.last_message.slice(0, 100)}...`
                    : conversation.last_message}
              </p>
              <span className="text-gray-400 text-xs italic whitespace-nowrap flex items-center">
                <span className="mx-1">·</span>
                {formatDate(conversation.last_message_time)}
              </span>
            </div>
            )}
          </div>

          {(conversation.distance!= null) && (<div className="text-right text-gray-500 flex flex-col items-end min-w-[50px]">
            <span className="text-xl1 font-semibold">{`${conversation.distance} km `}</span>
          </div>)}
      </div>

        </Link>
      </div>
    ))
  ) : searchQuery.trim() !== "" ? (
    <p className="text-gray-500 text-center mt-4 font-mono">
      No user found with the keyword "<span className="font-semibold">{searchQuery}</span>"
    </p>
  ) : <p className="text-gray-500 text-center mt-4 font-mono">
    No conversations started at the moment.
</p>)}
  </div>
</div>

  );
};

export default PrivateMessages;
