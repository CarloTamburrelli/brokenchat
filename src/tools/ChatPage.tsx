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
import useLongPress from './useLongPress';
import {generateUniqueId} from '../utils/generateUniqueId';


type MessageData = {
  id:  number | string;
  nickname: string | null;
  message: string | null;
  alert_message: boolean;
  user_id: number | null;
  audio?: string | null;
  quoted_msg: MessageData | null;
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
  const [selectedMessageId, setSelectedMessageId] = useState<number | string | null>(null);
  const [quotedMessage, setQuotedMessage] = useState<MessageData | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [showToastMessage, setShowToastMessage] = useState<string | null>(null);
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
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const [firstLoad, setFirstLoad] = useState(true);
  const [showInfoChatModal, setShowInfoChatModal] = useState(false);
  const [showUserListModal, setShowUserListModal] = useState(false);
  const [usersList, setUsersList] = useState<string[]>([]);
  const [isLoadingConverting, setIsLoadingConverting] = useState(false);
  const ffmpeg = new FFmpeg();
  const maxHeight = 150;
  let isScrolling = false;

  const handleTouchMove = () => {
    isScrolling = true; // Se c'è un movimento, blocca il long press
  };

  const emojis = [
    '🤪', '😠', '🤑', '🤩', '😎', '😆', '🤣', '🤗', '😋', '😝', 
    '😏', '😈', '👻', '💀', '🤯', '🦄', '👽', '💩', '👀', '🍑'
  ];

  const onLongPress = (e: any, msg_id: number | string) => {
    if (isScrolling) {
      e.preventDefault(); // Blocca il long press se c'era uno scroll
      return;
    }

    setSelectedMessageId(msg_id!)
    setQuotedMessage(null);
  };

  const longPressEvent = useLongPress(
    (event, msgId) => onLongPress(event,msgId!), // Passa msgId
  )

  // Funzione per deselezionare il messaggio
  const handleDeselect = () => {
    setSelectedMessageId(null);
  };


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
              quoted_msg: newMessage.quoted_msg || null,
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

          if (message && message != "") {
            setMessages(
              (prevMessages) => [...prevMessages,
                { 
                  id: generateUniqueId(),
                  nickname: null, 
                  message: message,
                  alert_message: true,
                  user_id: null,
                  audio: null,
                  quoted_msg: null
                }
              ]
            )
          }
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

      const offset = 150


      console.log("CALLCOLO", scrollHeight, clientHeight, scrollHeight-clientHeight, scrollTop, scrollTop+ offset);


      if ((scrollHeight - clientHeight) <=  scrollTop + offset) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else {
        setShowNewMessageBtn(true);
      }
    }

  }, [messages]);

  const sendMessage = () => {
    if (message.trim()) {

      if (!chatContainerRef.current) return; // Verifica se il contenitore del chat esiste prima di controllare le proprie dimensionichatContainerRef.current)
      inputRef.current?.focus();
      inputRef!.current!.style.height = "auto"; // Resetta altezza per calcolare bene
      const newMessage: { 
        user_id: number | null; 
        nickname: string; 
        text: string; 
        id: string; 
        quoted_msg?: any; // Permette quoted_msg opzionale
      } = { 
        user_id: userId, 
        nickname: nickname, 
        text: message, 
        id: generateUniqueId() 
      };

      if (quotedMessage != null) {
        newMessage.quoted_msg = quotedMessage;
      }
      
      socket.emit('message', chatId, newMessage, userId); // ✅ Invia il messaggio al server
      setMessage(''); // Pulisci l'input
      setQuotedMessage(null);
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
  if (error && !showModal) {
    return BaseWaiting(<div className='text-red-600 font-bold text-xl'>{error}</div>);
  }

  const chatContainerScrollHandler = () => {

    if (!chatContainerRef.current) return;

    // Se è in fondo, nascondiamo il bottone
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;

    const offset = 150

    //console.log("CALLCOLO", scrollHeight-clientHeight, scrollTop+ offset);

    if ((scrollHeight - clientHeight) <=  scrollTop + offset) {
      setShowNewMessageBtn(false);
    }

  }


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsAtBottom(true);
    setShowNewMessageBtn(false);
  };

  const onUserClicked = async (userId: number) => {
    console.log("onUserClicked")
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

    const newMessage: { 
      user_id: number | null; 
      nickname: string; 
      text: string; 
      id: string; 
      audio: string;
      alert_message: boolean;
      quoted_msg?: any; // Permette quoted_msg opzionale
    } = {
      id: generateUniqueId(),
      user_id: userId,
      nickname: nickname,
      text: '', // Nessun testo perché è un messaggio audio
      audio: base64Audio, // L'audio codificato in Base64
      alert_message: false,
    };

    if (quotedMessage != null) {
      newMessage.quoted_msg = quotedMessage;
      setQuotedMessage(null);
    }
  
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

  const handleCopy = (text: string) => {
    handleDeselect()
    navigator.clipboard.writeText(text)
      .then(() => {
        setShowToastMessage("Text copied successfully");
        setTimeout(() => setShowToastMessage(null), 2000);
      })
      .catch(err => {
        console.error("Errore nella copia", err);
        setShowToastMessage("Error during copy operation!");
      });
  };

  const handleReport = async (msg: MessageData) => {
    if (!window.confirm("Are you sure you want to report this user?")) return;


    const token = localStorage.getItem('authToken');

    if (token == null) {
      return;
    }

    try {
        const response_json = await fetchWithPrefix(`/report`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              reporter_id: userId,
              reported_user_id: msg.user_id,
              chat_id: chatId,
              message: msg.message, 
              token,
            }),
          }
        );
        setShowToastMessage(response_json.message);
        setTimeout(() => setShowToastMessage(null), 2000);

    } catch (error) {
        console.error("Error reporting user:", error);
        setShowToastMessage("An error occurred while reporting the user");
        setTimeout(() => setShowToastMessage(null), 2000);
    }
    handleDeselect()
  };


  const renderMessage = (msg: MessageData, index: number) => {


    const convertLinksToAnchors = (text: string) => {
      const urlRegex = /(https?:\/\/[^\s]+)/g; // Regex per trovare i link
      return text.split(urlRegex).map((part, index) => {
        if (urlRegex.test(part)) {
          return (
            <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" >
              {part}
            </a>
          );
        }
        return part; // Restituisce il testo normale
      });
    };



    if (msg.alert_message) {
      return (
        <div key={msg.id} className="p-2 font-bold no-select">
          <span>{msg.message}</span>
        </div>
      );
    } else {

      const isSameUserAsPrevious = index > 0 && messages[index - 1].user_id === msg.user_id;
      const isSameUserAsNext = index < messages.length - 1 && messages[index + 1].user_id === msg.user_id;

      return (
        <div 
          key={msg.id} 
          className={`px-2 relative flex rounded-md max-w-[75%] md:max-w-[50%] bg-grey-200 lg:max-w-[50%] 
            ${msg.user_id === userId ? "ml-auto justify-end" : "mr-auto justify-start"}
            ${isSameUserAsPrevious ? "pt-1": "pt-3"}
            ${selectedMessageId === msg.id ? "bg-gray-700 no-select pointer-events-none" : "bg-transparent"}`}
          {...longPressEvent(msg.id)}
        >
      
          {selectedMessageId === msg.id && (
            <div className="absolute top-[-30px] right-2 flex items-center bg-gray-800 text-white px-2 py-1 rounded-md shadow-lg z-30" style={{ pointerEvents: "auto" }}>
              <button className="text-sm hover:text-blue-400 px-2"
               onClick={(e) => {
                e.stopPropagation();
                setSelectedMessageId(null); 
                setQuotedMessage(msg); 
              
              }}

              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              
              onTouchEnd={(e) => { 
                e.stopPropagation(); // Blocca la propagazione del touch
            
                setTimeout(() => {
                  setSelectedMessageId(null); 
                  setQuotedMessage(msg);
                  inputRef.current?.focus();
                }, 100); // Ritardo di 100ms per evitare il click accidentale
              }}>
                Rispondi
              </button>

              <div className="border-l border-white h-4 mx-1"></div> {/* Linea separatrice */}
      
              <button className="text-sm text-white px-2" 
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(msg.message!)
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }
              }
              onTouchEnd={(e) => {
                e.stopPropagation();
                handleCopy(msg.message!)
              }}
              
              >
                Copia
              </button>
      
              <div className="border-l border-white h-4 mx-1"></div> {/* Linea separatrice */}
      
              <button className="text-sm text-red-400 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReport(msg);
                }}
              
                onTouchStart={(e) => {
                  e.stopPropagation(); // Stoppa la propagazione dell'evento su touch
                  handleReport(msg); // Deselect il messaggio
                }}
              
              >
                Report
              </button>
      
              <div className="border-l border-white h-4 mx-1"></div> {/* Linea separatrice */}
      
              <button
                className="text-sm text-red-500 font-bold hover:text-red-700 px-2"
                onClick={(e) => {
                  e.stopPropagation(); // Stoppa la propagazione dell'evento
                  handleDeselect(); // Deselect il messaggio
                }}
                onTouchStart={(e) => {
                  e.stopPropagation(); // Stoppa la propagazione dell'evento su touch
                  handleDeselect(); // Deselect il messaggio
                }}
              >
                ✕
              </button>
            </div>
          )}
      
          <div className={`flex flex-col ${msg.user_id === userId ? "items-end" : "items-start"}`}>


          {!isSameUserAsPrevious && (
          <div className={`text-sm ${msg.user_id === userId ? "text-right" : "text-left"}`}>
            <strong
              onClick={() => msg.user_id ? onUserClicked(msg.user_id) : null}
              onTouchStart={() => msg.user_id ? onUserClicked(msg.user_id): null}
              className={`cursor-pointer font-semibold z-10 no-select 
                ${usersList.some(user => user.split("####")[1] === String(msg.user_id)) ? "text-blue-400" : "text-gray-400"}`}
              style={{ pointerEvents: "auto" }}
            >
              {msg.user_id === userId ? "Tu" : msg.nickname}
            </strong>
          </div>)}
            
          {msg.quoted_msg && (
            <div className={`
              mb-2 p-2 rounded-md bg-gray-700 border-l-4 border-blue-400 text-sm text-gray-300 
              max-w-full
              ${msg.user_id === userId ? "ml-auto text-right border-r-4 border-l-0" : "mr-auto text-left"}
            `}>
              <strong className="text-blue-300">{msg.quoted_msg.nickname}</strong>: {msg.quoted_msg.message}
            </div>
          )}

          <div 
            className={`p-2 rounded-2xl text-white shadow-md inline-block max-w-full 
              ${msg.user_id === userId ? "bg-blue-500 rounded-l-2xl rounded-r-md" : "bg-gray-700 rounded-r-2xl rounded-l-md"}
              ${isSameUserAsPrevious ? "mt-0" : ""}
              ${isSameUserAsNext ? "rounded-b-md" : "rounded-b-2xl"}
            `}
          >
      
            {/* Condizione per verificare se c'è un audio */}
            {(msg.audio === null || msg.audio === undefined) ? (
              <span className={`no-select ${selectedMessageId === msg.id && "text-white"}`}>
                {msg.message !== '' ? convertLinksToAnchors(msg.message!) : <i>Messaggio multimediale inviato</i>}
              </span>
            ) : (
              <span className='ml-2'>
                <audio controls style={{ display: 'inline' }}>
                  <source src={`data:audio/mp3;base64,${msg.audio}`} type="audio/mp3" />
                  Il tuo browser non supporta l'elemento audio.
                </audio>
              </span>
            )}

</div>
          </div>
        </div>
      );
      
      
    }
  };
  
  
  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 text-center font-bold z-50 bg-white shadow-md">
        <Header usersList={usersList} showUserListModal={() => setShowUserListModal(true)} onOpenInfo={() => setShowInfoChatModal(true)} headerName={chatData!.name} onOpenNicknameModal={() => {}} />
      </div>

      {showInfoChatModal && (
        <div  
        className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-20"
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
        className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-20"
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
              <Link to={`/private-messages/new/${profileToShow?.id}?goback=${chatId}`} className="flex items-center space-x-2">
                <img src={chat_now} alt="Chat Icon" className="w-5 h-5" />
                <span>Scrivi in privato</span>
              </Link>
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
  <div className="flex-1 overflow-y-auto text-left flex flex-col bg-white"
    ref={chatContainerRef}
    onScroll={chatContainerScrollHandler}
    onTouchMove={handleTouchMove}
  >
    <div style={{ marginTop: '500px', marginBottom: '4px'}}>
      {messages.map((msg, index) => (
        renderMessage(msg, index)
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

  {showToastMessage && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-md shadow-lg animate-fadeInOut">
          {showToastMessage}
        </div>
      )}


      {/* Lista delle emoticons */}
      {showEmojis && (
        <div
          className="emoji-bar flex flex-wrap gap-2 mb-2 absolute left-0 right-0 z-10 p-2 bg-black bg-opacity-50 bottom-16 md:bottom-44"

        >
       <div className="w-full flex flex-wrap md:justify-center items-center no-select">
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
        <div className="relative flex flex-col gap-2 mb-2">
        {/* Mostra il messaggio citato solo se esiste */}
        {(quotedMessage !== null) && (
          <div className="p-2 bg-gray-800 text-white rounded-md relative flex flex-col items-start">
          <span className="text-blue-400 font-bold">{quotedMessage.nickname}:</span>
          <span className="ml-0 text-left">{quotedMessage.message}</span>
        
          {/* Pulsante per rimuovere la citazione */}
          <button
            className="absolute top-1 right-2 text-red-400 hover:text-red-600"
            onClick={() => setQuotedMessage(null)}
          >
            ✕
          </button>
        </div>
        )}

  <div className="relative flex items-center gap-2">
    {/* Modal delle emoticons */}
    <button
      className={`text-white cursor-pointer rounded ${showEmojis ? 'bg-white bg-opacity-50' : ''}`}
      onClick={() => {
        inputRef.current?.focus();
        setShowEmojis(!showEmojis);
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
        handleDeselect();
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
    </div>
  );
  
  
    
}

export default ChatPage;

