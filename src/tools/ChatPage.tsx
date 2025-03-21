import { Link, useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Header from '../base/header';
import Logo from '../assets/logo.png';
import { fetchWithPrefix } from '../utils/api';
import { formatDate } from '../utils/formatDate';
import chat_now from '../assets/chat_now.png';
import send from '../assets/send.png';
import { socket } from "../utils/socket"; // Importa il socket
import UserListModal from './UserListModal';
import AudioRecorderModal from './AudioRecorderModal';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';


type MessageData = {
  id:  number | string;
  nickname: string | null;
  message: string | null;
  alert_message: boolean;
  user_id: number | null;
  audio?: string | null;
};


interface ChatData {
  name: string;
  isPrivate: boolean;
  description: string;
  created_at: string;
}

interface ProfileUser { 
  id: number | null;
  nickname: string | null;
  subscription: string;
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
  const [userId, setUserId] = useState<number | null>(null);
  const [admin, setAdmin] = useState<ProfileUser | null>(null);
  const [profileToShow, setProfileToShow] = useState<ProfileUser | null>(null);
  const [nicknameTmp, setTmpNickname] = useState<string>('');
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [showInfoChatModal, setShowInfoChatModal] = useState(false);
  const [showUserListModal, setShowUserListModal] = useState(false);
  const [usersList, setUsersList] = useState<string[]>([]);
  const [isLoadingConverting, setIsLoadingConverting] = useState(false);
  const ffmpeg = new FFmpeg();
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
        console.log("PRIMA......")
        const response_json = await fetchWithPrefix(`/chat/${chatId}?token=${token ? token : ''}`);
        //se passo questo senza errori significa che sono abilitato a visualizzare questa chat
        setChatData({
          name: response_json.chat.name,
          isPrivate: response_json.chat.is_private,
          description: response_json.chat.description,
          created_at: formatDate(response_json.chat.created_at)
        });

        console.log("YOO",response_json)

        if (response_json.chat.user_id === null) {
          //devi far apparire la modal che ti chiede che nome vuoi inserire
          setShowModal(true);
          return;
        }

        setNickname(response_json.chat.nickname);
        //setDescription(response_json.chat.description)
        setUserId(response_json.chat.user_id);

        setAdmin({
          id: response_json.chat.user_admin_id,
          nickname: response_json.chat.nickname_admin,
          subscription: formatDate(response_json.chat.user_admin_subscription),
        })
        
        setMessages(response_json.messages);

        if (socket.connected) {
          console.log("Socket gia' connesso!")
          socket.emit('join-room', chatId, response_json.chat.nickname, response_json.chat.user_id);
        } else {
          console.log("Socket ancora da connettere!")
          socket.connect();
          socket.on('connect', () => {
            console.log("Socket connesso, ora emetto join-room");
            socket.emit('join-room', chatId, response_json.chat.nickname, response_json.chat.user_id);
          });
        }

        socket.off('broadcast_messages');

        socket.on('broadcast_messages', (newMessage) => {

          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: newMessage.id,
              nickname: newMessage.nickname,
              message: newMessage.text,
              alert_message: false,
              user_id: newMessage.user_id,
              audio: newMessage.audio || null, // Salviamo l'audio se presente
            },
          ]);
        });

        socket.off('alert_message');

        socket.on('alert_message', (data: any) => {
          const { message, users } = data;
          console.log("utenti collegat", users)
          if (users != null) {
            setUsersList(users)
          }
          setMessages(
            (prevMessages) => [...prevMessages,
              { 
                id: generateUniqueId(),
                nickname: null, 
                message: message,
                alert_message: true,
                user_id: null,
                audio: null
              }
            ]
          )
        });

        socket.on("disconnect", (reason) => {
          console.log("Socket disconnesso:", reason);
          if (reason === "io server disconnect") {
            socket.connect(); // Riconnetti solo se il server ha disconnesso
          }
        });

        window.addEventListener('beforeunload', () => {
            socket.emit('leave-room', chatId );
        });

        window.addEventListener('pagehide', () => {
          socket.emit('leave-room', chatId );
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
      //socket.disconnect()
      socket.emit("leave-room", chatId);
      socket.off('broadcast_messages');
      socket.off('join-room');
      socket.off('alert_message');
    };
  }, [chatId]);


  useEffect(() => {

    if (!chatContainerRef.current) return;

    if (firstLoad) {
      // Se è il primo caricamento, scrolla sempre in fondo
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setFirstLoad(false); // Dopo il primo scroll, disattiva il comportamento
    } else {

      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;

      const offset = 120


      console.log("CALLCOLO", scrollHeight, clientHeight, scrollHeight-clientHeight, scrollTop, scrollTop+ offset);


      if ((scrollHeight - clientHeight) <=  scrollTop + offset) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else {
        setShowNewMessageBtn(true);
      }
    }

  }, [messages]);

  
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
      const newMessage = { user_id: userId, nickname: nickname, text: message, id: generateUniqueId() }; // Simuliamo il proprio nickname
      socket.emit('message', chatId, newMessage, userId); // ✅ Invia il messaggio al server
      setMessage(''); // Pulisci l'input
      setShowEmojis(false);
      // Mantieni il focus sulla textarea
      setTimeout(() => {
        inputRef.current?.focus();
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 500); // Timeout breve per aspettare l'aggiornamento dello stato

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

    const offset = 120

    //console.log("CALLCOLO", scrollHeight-clientHeight, scrollTop+ offset);

    if ((scrollHeight - clientHeight) <=  scrollTop + offset) {
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

  const onUserClicked = async (userId: number) => {
    setShowUserListModal(false)

    try {
      const response_json = await fetchWithPrefix(`/user/${userId}`);
      console.log("UTENTE RECUPERATO", response_json); // Qui trovi i dati dell'utente
      setProfileToShow({
        id: userId,
        nickname: response_json.user.nickname,
        subscription: formatDate(response_json.user.subscription),
      })
    } catch (error: any) {
      alert('Errore nel recupero dei dati dell\'utente:'+error.message);
    }
    
  }

  const sendAudioMessage = (base64Audio: string) => {
    const newMessage = {
      id: generateUniqueId(),
      user_id: userId,
      nickname: nickname,
      text: '', // Nessun testo perché è un messaggio audio
      audio: base64Audio, // L'audio codificato in Base64
      alert_message: false,
    };
  
    socket.emit('message', chatId, newMessage, userId);
  };

  const handleAudioRecorded = async (audioBlob: Blob) => {
    try {
      setIsLoadingConverting(true);
      await ffmpeg.load();  // Carica FFmpeg

      //const audioFile = new File([audioBlob], 'audio.mp4', { type: 'audio/mp4' });
      const audioFilePath = '/audio.mp4';

      await ffmpeg.writeFile(audioFilePath, await fetchFile(audioBlob));
      
      // Esegui la conversione a MP3
      await ffmpeg.exec(['-i', audioFilePath, 'output.mp3']);

      const mp3Data = await ffmpeg.readFile('output.mp3')

      // Converti in Base64
      const mp3Blob = new Blob([mp3Data], { type: 'audio/mp3' });
      const base64Audio = await blobToBase64(mp3Blob);
      setIsLoadingConverting(false);  // Rimuovi il loading indicator
      sendAudioMessage(base64Audio);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 500);

    } catch(error: any) {
      console.log("errore: ", error);
    }



  };

  const blobToBase64 = (blob: Blob) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };


  const renderMessage = (msg: MessageData) => {


    const convertLinksToAnchors = (text: string) => {
      const urlRegex = /(https?:\/\/[^\s]+)/g; // Regex per trovare i link
      return text.split(urlRegex).map((part, index) => {
        if (urlRegex.test(part)) {
          return (
            <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              {part}
            </a>
          );
        }
        return part; // Restituisce il testo normale
      });
    };



    if (msg.alert_message) {
      return (
        <div key={msg.id} className="p-2 font-bold">
          <span>{msg.message}</span>
        </div>
      );
    } else {
      return (
        <div key={msg.id} className="p-2 ">
          <>
            <strong 
              onClick={() => msg.user_id ? onUserClicked(msg.user_id) : null} 
              className="text-blue-400 cursor-pointer"
            >
              {msg.nickname}:
            </strong>
  
            {/* Condizione per verificare se c'è un audio */}
            {(msg.audio === null || msg.audio === undefined) ? (
              <span className="p-1">
                {msg.message !== '' ? convertLinksToAnchors(msg.message!) : <i>Messaggio multimediale inviato</i>}
              </span>
            ) : (
              // Se c'è un audio, usa flex per mantenere gli elementi orizzontali>
              <span className='ml-2'>
                <audio controls style={{display: 'inline'}}>
                  <source src={`data:audio/mp3;base64,${msg.audio}`} type="audio/mp3" />
                  Il tuo browser non supporta l'elemento audio.
                </audio>
                </span>
            )}
          </>
        </div>
      );
    }
  };
  
  
  return (
    <div className="flex flex-col h-screen w-full">
      {/* Header */}
      <div className="sticky top-0 bg-white text-center font-bold z-5">
        <Header usersList={usersList} showUserListModal={() => setShowUserListModal(true)} onOpenInfo={() => setShowInfoChatModal(true)} chatName={chatData!.name} onOpenNicknameModal={openNicknameModal} />
      </div>

      {showInfoChatModal && (
        <div  
        className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50"
        onClick={() => setShowInfoChatModal(false)}
      >
        <div
          className="bg-white p-5 rounded-lg shadow-lg w-96 relative text-left"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header con titolo e pulsante di chiusura */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">{chatData!.name}</h2>
            <button 
              onClick={() => setShowInfoChatModal(false)} 
              className="text-gray-500 hover:text-black text-2xl font-semibold"
            >
              ✕
            </button>
          </div>
      
          {/* Descrizione */}
          <p className="text-sm text-gray-600 leading-relaxed mb-3">{chatData!.description}</p>
          
          {/* Separatore */}
          <hr className="my-3 border-gray-300" />
      
          {/* Info Admin & Data Creazione */}
          <div className="text-sm text-gray-800 space-y-1">
            <div><span className="font-semibold">Admin:</span> <span className='underline cursor-pointer'
    onClick={() => setProfileToShow(admin)} // Funzione da eseguire al click
  >{admin?.nickname}
  </span></div>
            <div><span className="font-semibold">Creata il:</span> {chatData!.created_at}</div>
          </div>
        </div>
      </div>
      
      )}

{profileToShow && (
        <div
        className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50"
        onClick={() => setProfileToShow(null)} // Chiude la modal cliccando all’esterno
      >
        <div
          className="bg-white p-5 rounded-lg shadow-lg w-96 relative text-left"
          onClick={(e) => e.stopPropagation()} // Impedisce la chiusura se clicchi dentro la modal
        >
          {/* Header con titolo e pulsante di chiusura */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Profilo di {profileToShow?.nickname}</h2>
            <button
              onClick={() => setProfileToShow(null)}
              className="text-gray-500 hover:text-black text-2xl font-semibold"
            >
              ✕
            </button>
          </div>
      
          {/* Dettagli Profilo */}
          <div className="text-sm text-gray-800 space-y-2">
            <div><span className="font-semibold">Registrato il:</span> {profileToShow?.subscription || "Data non disponibile"}</div>
          </div>
      
          {/* Bottone per scrivere in privato */}
          <div className="mt-4 flex items-center justify-center">
            <button className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center space-x-2">
              <img src={chat_now} alt="Chat Icon" className="w-5 h-5" />
              <span>Scrivi in privato</span>
            </button>
          </div>
        </div>
      </div>
      )}

{isLoadingConverting && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div className="text-white text-xl font-bold flex items-center space-x-3">
      <div className="w-8 h-8 border-4 border-t-4 border-white border-solid rounded-full animate-spin"></div>
      <span>Converting audio...</span>
    </div>
  </div>
)}



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

<UserListModal
    onUserClicked={onUserClicked}
        isOpen={showUserListModal}
        setIsOpen={setShowUserListModal}
        users={usersList}
      />


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
  <div className="flex-1 overflow-y-auto text-left pl-2 pr-2 flex flex-col"
    ref={chatContainerRef}
    onScroll={chatContainerScrollHandler}
  >
    <div style={{ marginTop: '500px' }}>
      {messages.map((msg) => (
        renderMessage(msg)
      ))}
    <div ref={messagesEndRef} className="order-last" />
    </div>
    {/* Bottone per i nuovi messaggi */}
    {showNewMessageBtn && (
      <button
        className="fixed bottom-32 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full shadow-md animate-bounce"
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
      <div className="sticky bottom-0 bg-gray-800 p-2 z-10">
        {/* Input e bottone Invia */}
        <div className="relative flex items-center gap-2 mb-2">
          {/* Modal delle emoticons */}

        <button
              className={`text-white cursor-pointer rounded ${showEmojis ? 'bg-white bg-opacity-50' : ''}`}
              onClick={() => {
                inputRef.current?.focus();
                setShowEmojis(!showEmojis)
              }}
            >
              😊
            </button>
            <AudioRecorderModal onAudioRecorded={handleAudioRecorded} />
            <textarea
          ref={inputRef}
          value={message}
          onChange={handleInputChange}
          onFocus={() => setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 500)}
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
         
         <button onClick={sendMessage} className="bg-blue-500 p-2 rounded">
            <img src={send} alt="Invia" className="w-6 h-6" />
          </button>           
        </div>        
      </div>
    </div>
  );
  
  
    
}

export default ChatPage;

