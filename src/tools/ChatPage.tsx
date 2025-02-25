import { Link, useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Header from '../base/header';
import Logo from '../assets/logo.png';
import { fetchWithPrefix } from '../utils/api';
import io from 'socket.io-client';


const socket = io('http://192.168.1.10:5000'); 


interface MessageData {
  id: number | string;
  nickname: string | null;
  message: string;
  alert_message: boolean;
}


interface ChatData {
  name: string;
  isPrivate: boolean;
}

function BaseWaiting(content: React.ReactNode) {
  return <div className="flex flex-col justify-center items-center mt-5">
        <Link to="/">
          <img src={Logo} />
        </Link>
        <div className="mt-5">
        {content}
        </div>
  </div>
}

function ChatPage() {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewMessageBtn, setShowNewMessageBtn] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const { chatId } = useParams();
  const [message, setMessage] = useState<string>('');
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [nickname, setNickname] = useState<string>('');
  const [nicknameTmp, setTmpNickname] = useState<string>('');
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const maxHeight = 150;

  const emojis = [
    '🤪', '😠', '🤑', '🤩', '😎', '😆', '🤣', '🤗', '😋', '😝', 
    '😏', '😈', '👻', '💀', '🤯', '🦄', '👽', '💩', '👀', '🍑'
  ];

  const addEmojiToMessage = (emoji: string, index: number) => {
    inputRef.current?.focus();
    setMessage((prevMessage) => prevMessage + emoji);
    setClickedIndex(index);
    setTimeout(() => {
      setClickedIndex(null);
    }, 300); // Tempo in ms che l'emoji rimane ingrandita
  };
  

  useEffect(() => {
    if (!chatId) return;


    const fetchChatData = async (token: string | null) => {


      try {
        const response_json = await fetchWithPrefix(`/chat/${chatId}?token=${token ? token : ''}`);
        //se passo questo senza errori significa che sono abilitato a visualizzare questa chat
        setChatData({
          name: response_json.name,
          isPrivate: response_json.is_private,
        });

        setNickname(response_json.nickname);

        if (response_json.user_id === 0) {
          //devi far apparire la modal che ti chiede che nome vuoi inserire
          setShowModal(true);
          return;
        }


        socket.emit('join-room', chatId, response_json.nickname);

        socket.off('broadcast_messages');

        socket.on('broadcast_messages', (newMessage) => {

          setMessages(
            (prevMessages) => [...prevMessages,
              { 
                id: newMessage.id,
                nickname: newMessage.nickname, 
                message: newMessage.text,
                alert_message: false
              }
            ]
          )
        });

        socket.off('alert_message');

        socket.on('alert_message', (message_str: string) => {

          setMessages(
            (prevMessages) => [...prevMessages,
              { 
                id: generateUniqueId(),
                nickname: null, 
                message: message_str,
                alert_message: true
              }
            ]
          )
        });


      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    const token = localStorage.getItem('authToken');

    fetchChatData(token);

    return () => {
      // Cleanup: rimuovi il listener quando il componente si smonta
      socket.disconnect()
      socket.off('broadcast_messages');
      socket.off('alert_message');
    };
  }, [chatId]);


  useEffect(() => {
    // Se l'utente è in fondo, scrolla automaticamente ai nuovi messaggi

    if (!chatContainerRef.current) return;

    // Se è in fondo, nascondiamo il bottone
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;

    console.log(-scrollTop, scrollHeight, clientHeight);

    if (-scrollTop > 0) {
      console.log("entro?");
      setShowNewMessageBtn(true);
    } else {
      console.log("non entro");
    }


  }, [messages]);

  /*const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setMessages([...messages, newMessage]);
    setNewMessage('');
  };*/
  
  const generateUniqueId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  };

  const sendMessage = () => {
    if (message.trim()) {

      if (!chatContainerRef.current) return; // Verifica se il contenitore del chat esiste prima di controllare le proprie dimensionichatContainerRef.current)

      //const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      //console.log(scrollTop, scrollHeight, clientHeight);
      inputRef.current?.focus();
      inputRef!.current!.style.height = "auto"; // Resetta altezza per calcolare bene
      const newMessage = { nickname: nickname, text: message, id: generateUniqueId() }; // Simuliamo il proprio nickname
      socket.emit('message', chatId, newMessage); // ✅ Invia il messaggio al server
      setMessage(''); // Pulisci l'input
      setShowEmojis(false);
      // Mantieni il focus sulla textarea
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
        inputRef.current?.focus();
      }, 0); // Timeout breve per aspettare l'aggiornamento dello stato

    }
  };

  const handleInputChange = (e: any) => {
    setMessage(e.target.value);

    // Adatta l'altezza in base al contenuto
    if (inputRef.current) {
      inputRef.current.style.height = "auto"; // Resetta altezza per calcolare bene
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, maxHeight) + "px";
    }
  };

  const handleRegisterUser = async () => {
    if (!nickname.trim()) return;

    try {
      const response = await fetchWithPrefix(`/register-user?`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, nickname }),
      });

      localStorage.setItem("authToken", response.token); // Salva il nuovo token
      window.location.reload(); // Ricarica la chat con il nuovo token
    } catch (error: any) {
      setError(error.message);
    }
  };


  // Se la pagina è in caricamento
  if (loading) {
    return BaseWaiting(<div>Caricamento...</div>);
  }

  // Se c'è un errore nel recupero dei dati
  if (error && !showModal && !showNicknameModal) {
    return BaseWaiting(<div className='text-red-600 font-bold text-xl'>{error}</div>);
  }

  const chatContainerScrollHandler = () => {

    if (!chatContainerRef.current) return;

    // Se è in fondo, nascondiamo il bottone
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;

    if (-scrollTop < 10) {
      console.log(scrollTop, scrollHeight, clientHeight);
      console.log("entross?");
      setShowNewMessageBtn(false);
    }

  }


  const handleChangeNickname = async () => {
    try {
        const token = localStorage.getItem('authToken');

        await fetchWithPrefix(`/update-nickname`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, nickname: nicknameTmp }),
        });

        socket.emit('name_changed', nickname, nicknameTmp);
        setNickname(nicknameTmp);
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsAtBottom(true);
    setShowNewMessageBtn(false);
  };

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Header */}
      <div className="sticky top-0 bg-white text-center font-bold z-10">
        <Header chatName={chatData!.name} onOpenNicknameModal={openNicknameModal} />
      </div>

      {showNicknameModal && (
        <div
        className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
        onClick={() => setShowNicknameModal(false)} // Chiude la modal cliccando fuori
      >
        <div 
          className="bg-white p-5 rounded-md shadow-lg relative"
          onClick={(e) => e.stopPropagation()} // Impedisce la chiusura cliccando dentro la modal
        >
          {/* Tasto "X" per chiudere la modal */}
          <button
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            onClick={() => setShowNicknameModal(false)}
          >
            ✖
          </button>
            <h2 className="text-lg font-bold">Cambia il tuo nickname</h2>
            <input
              maxLength={17}
              type="text"
              placeholder="Nuovo nickname"
              value={nicknameTmp}
              onChange={(e) => setTmpNickname(e.target.value)}
              className="border p-2 mt-2 w-full"
            />
            {error && <div className="text-red-600 font-bold">{error}</div>}
            <div className="flex mt-4 justify-center">
              <button onClick={handleChangeNickname} className="bg-blue-500 text-white px-4 py-2 rounded">
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}

{showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-5 rounded-md shadow-lg">
            <h2 className="text-lg font-bold">Inserisci un nickname</h2>
            <span className="justify-start">Prima di entrare nella chat devi avere un nickname!</span>
            <input
              maxLength={17}
              type="text"
              placeholder='Inserisci nickname'
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="border p-2 mt-2 w-full"
            />
            {error ? (<div className='text-red-600 font-bold text-xl'>{error}</div>) : null}
            <div className="flex mt-4 justify-center">
              <button onClick={handleRegisterUser} className="bg-blue-500 text-white px-4 py-2 rounded">
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
  
      {/* Lista messaggi - Occupa tutto lo spazio disponibile */}
<div className="flex-1 overflow-y-auto text-left pl-2 pr-2 flex flex-col-reverse"
ref={chatContainerRef}
onScroll={chatContainerScrollHandler}
>
  {/* Questo div serve per far scrollare automaticamente in basso */}
  <div ref={messagesEndRef} />
  <div>
    {messages.map((msg) => (
      <div key={msg.id} className={`p-2 ${msg.alert_message ? "font-bold" : ""}`}>
        {msg.alert_message ? (
          <span>{msg.message}</span>
        ) : (
          <>
            <strong className="text-blue-400">{msg.nickname}: </strong>
            <span className="p-1">{msg.message}</span>
          </>
        )}
      </div>
    ))}
  </div>


  {/* Bottone per i nuovi messaggi */}
  {showNewMessageBtn && (
        <button
          className="absolute left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full shadow-md animate-bounce"
          onClick={scrollToBottom}
        >
          ⬇️ Nuovi messaggi
        </button>
      )}
</div>


      {/* Lista delle emoticons */}
      {showEmojis && (
        <div
          className="emoji-bar flex flex-wrap gap-2 mb-2 absolute left-0 right-0 z-10 p-2 bg-black bg-opacity-50 bottom-16 md:bottom-44"

        >
       <div className="w-full flex flex-wrap md:justify-center items-center">
          {emojis.map((emoji, index) => (
            <button
              key={index}
              className={`p-1 text-2xl transform transition-transform duration-300 ease-in-out ${clickedIndex === index ? 'scale-125' : 'scale-100'}`}
              onClick={() => addEmojiToMessage(emoji, index)}
            >
              {emoji}
            </button>
          ))}
        </div>
        </div>
      )}

  
      {/* Barra chat input - Sempre fissa in basso */}
      <div className="sticky bottom-0 bg-gray-800 p-4 z-10">
        {/* Input e bottone Invia */}
        <div className="relative flex items-center gap-2 mb-2">
          {/* Modal delle emoticons */}

        <button
              className={`text-white rounded p-2 ${showEmojis ? 'bg-white bg-opacity-50' : ''}`}
              onClick={() => {
                inputRef.current?.focus();
                setShowEmojis(!showEmojis)
              }}
            >
              😊
            </button>
            <textarea
          ref={inputRef}
          value={message}
          onChange={handleInputChange}
          onFocus={() => setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 1000)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          className="flex-1 p-2 bg-gray-700 border rounded text-white resize-none overflow-y-auto"
          placeholder="Scrivi un messaggio..."
          rows={1}
          style={{ minHeight: "40px", maxHeight: `${maxHeight}px` }}
        />
          {/*<input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            type="text"
            className="flex-1 p-2 bg-gray-700 border rounded text-white"
            placeholder="Scrivi un messaggio..."
          />*/}
          <button onClick={sendMessage} className="bg-blue-500 text-white p-2 rounded">Invia</button>            
        </div>

        {/* Bottoni azione */}
        {/*<div className="flex justify-around">
          <button className="flex items-center gap-2 text-white bg-gray-700 p-2 rounded">
            📷 
          </button>
          <button className="flex items-center gap-2 text-white bg-gray-700 p-2 rounded">
            🎥 
          </button>
          <button className="flex items-center gap-2 text-white bg-gray-700 p-2 rounded">
            📄 
          </button>
        </div>*/}

        
      </div>
    </div>
  );
  
  
    
}

export default ChatPage;

