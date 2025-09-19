import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link, useLocation} from "react-router-dom";
import AudioRecorderModal from './AudioRecorderModal';
import send from '../assets/send.png';
import warning from '../assets/warning.png';
import lucchetto from '../assets/lucchetto.png';
import { fetchWithPrefix } from '../utils/api';
import { socket } from "../utils/socket"; // Importa il socket
import useLongPress from './useLongPress';
import { getPosition } from "../utils/geolocation";
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import CameraCapture from "./CameraCapture";
import microphoneIcon from "../assets/audio.png";
import videoIcon from "../assets/video.png";
import { MessageData, PrivateUserData, UserData } from "../types";  
import { MAX_PRIVATE_ROOM_MESSAGE } from "../utils/consts";
import { ReportModal } from "./ReportModal";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";


const PrivateChatPage = () => {
  const { privateMessageId, userId } = useParams(); // chatId per conversazioni esistenti, userId per nuove
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const goback = queryParams.get('goback'); // Ottieni il parametro 'goback'
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('');
  const [quotedMessage, setQuotedMessage] = useState<MessageData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [showNewMessageBtn, setShowNewMessageBtn] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showGeoWarningModal, setShowGeoWarningModal] = useState<boolean>(false);
  const [showGeoHiddenModal, setShowGeoHiddenModal] = useState<boolean>(false);
  const [showDistanceModal, setShowDistanceModal] = useState<boolean>(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [authUser, setAuthUser] = useState<PrivateUserData | null>(null);
  const [targetUser, setTargetUser] = useState<PrivateUserData | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<number | string | null>(null);
  const [showToastMessage, setShowToastMessage] = useState<string | null>(null);
  const [isLoadingConverting ,setIsLoadingConverting] = useState(false);
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState<MessageData | UserData | null>(null);
  const [firstLoad, setFirstLoad] = useState(true);
  const token = localStorage.getItem('authToken');
  let alreadyJoined = false;
  const ffmpeg = new FFmpeg();

  const maxHeight = 150;
  let isScrolling = false;
  const emojis = [
    '🤪', '😠', '🤑', '🤩', '😎', '😆', '🤣', '🤗', '😋', '😝', 
    '😏', '😈', '👻', '💀', '🤯', '🦄', '👽', '💩', '👀', '🍑'
  ];

  useEffect(() => {
    if (privateMessageId) {
        fetchMessages(parseInt(privateMessageId,10));
    } else if (userId) {
        checkExistingConversation(parseInt(userId, 10));
    }
  },  [privateMessageId, userId]);


  useEffect(() => {

    if (!conversationId) {
        return;
    }

    if (alreadyJoined === false) {

        if (socket.connected) {
            console.log("Socket gia' connesso!")
            socket.emit('join-private-room', conversationId, authUser);
        } else {
            console.log("Socket ancora da connettere!")
            socket.connect();
            socket.on('connect', () => {
            console.log("Socket connesso, ora emetto join-room");
            socket.emit('join-private-room', conversationId, authUser);
            });
        }
    }

    //console.log("sono in ascolto di broadcast_private_messages")

    socket.off('broadcast_private_messages');

    socket.on('broadcast_private_messages', (newMessage) => {

        //console.log("recupero messaggio privato", newMessage)

        setMessages((prevMessages) => [
        ...prevMessages,
        {
            id: newMessage.id,
            nickname: newMessage.nickname,
            message: newMessage.text,
            date: newMessage.created_at,
            alert_message: false,
            user_id: newMessage.user_id,
            quoted_msg: newMessage.quoted_msg || null,
            msg_type: newMessage.msg_type,
            delete_chat: false,
        },
        ]);

        if (newMessage.is_online != null) {
          setIsOnline(newMessage.is_online)
        }
    });


  return () => {
    // Cleanup: rimuovi il listener quando il componente si smonta
    //socket.disconnect()
    socket.emit("leave-private-room", conversationId);
    socket.off('broadcast_private_messages');
    socket.off('join-room');
  };
}, [conversationId]);


useEffect(() => {

    if (!chatContainerRef.current) return;

    if (messages && messages.length == 0) return;

    if (firstLoad) {
      // Se è il primo caricamento, scrolla sempre in fondo
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setFirstLoad(false); // Dopo il primo scroll, disattiva il comportamento
    } else {

      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;

      const offset = 150

      //console.log("CALLCOLO", scrollHeight, clientHeight, scrollHeight-clientHeight, scrollTop, scrollTop+ offset);

      if ((scrollHeight - clientHeight) <=  scrollTop + offset) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else {
        setShowNewMessageBtn(true);
      }
    }

  }, [messages]);


const openImageModal = (src: string) => {
  setFullscreenImage(src);
};

const closeImageModal = () => {
  setFullscreenImage(null);
};

const longPressEvent = useLongPress(
    (event, msgId) => onLongPress(event,msgId!), // Passa msgId
)

const onLongPress = (e: any, msg_id: number | string) => {
    if (isScrolling) {
      e.preventDefault(); // Blocca il long press se c'era uno scroll
      return;
    }

    setSelectedMessageId(msg_id!)
    setQuotedMessage(null);
  };


  const checkExistingConversation = async (userId: number) => {
    try {

        const response_json = await fetchWithPrefix(`/conversations/?token=${token}&user_id=${userId}`);
        if (response_json.conversation_id) {
          const url = goback 
          ? `/private-messages/${response_json.conversation_id}?goback=${goback}` 
          : `/private-messages/${response_json.conversation_id}`;
            navigate(url);
        } else {
            setAuthUser(response_json.auth_user)
            setTargetUser(response_json.target_user)

            if (response_json.target_user.is_online) {
              setIsOnline(response_json.target_user.is_online)
            }
        }
    } catch (error) {
      console.error("Errore nel controllo conversazione:", error);
    }
  };

  const createConversation = async (): Promise<number | null> => {
    try {
      const response = await fetchWithPrefix(`/create-conversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, user_id: targetUser!.id }),
      });

      console.log("risultato di createConversation", response)
  
    return response.conversation_id; // Restituisce l'ID della conversazione appena creata

    } catch (error) {
      console.error("Errore nella richiesta API:", error);
      return null;
    }
  };

  const sendAudioMessage = (base64Audio: string) => {

    const newMessage: { 
      user_id: number | null; 
      nickname: string; 
      text: string; 
      msg_type: number;
      alert_message: boolean;
      target_id: number;
      quoted_msg?: any; // Permette quoted_msg opzionale
    } = {
      user_id: authUser!.id,
      nickname: authUser!.nickname,
      text: base64Audio,
      alert_message: false,
      msg_type: 2,
      target_id: targetUser!.id,
    };

    if (quotedMessage != null) {
      newMessage.quoted_msg = quotedMessage;
      setQuotedMessage(null);
    }


    socket.emit('private-message', conversationId, newMessage);
  };

  const sendFileMessage = (type: 3 | 4, file: string) => {
    const newMessage: {
      user_id: number | null;
      nickname: string;
      text: string;
      alert_message: boolean;
      msg_type: number;
      target_id: number;
    } = {
      user_id: authUser!.id,
      nickname: authUser!.nickname,
      text: file,
      alert_message: false,
      msg_type: type,
      target_id: targetUser!.id,
    };


    socket.emit('private-message', conversationId, newMessage);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 500);
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

        const arrayBuffer = (mp3Data instanceof Uint8Array ? mp3Data.buffer : new Uint8Array(mp3Data as any).buffer);

        const mp3Blob = new Blob([arrayBuffer], { type: 'audio/mp3' });
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

  const fetchMessages = async (conversationId: number) => {
    try {
        const response_json = await fetchWithPrefix(`/conversation/${conversationId}?token=${token}`);        
        setMessages(response_json.messages);
        setAuthUser(response_json.auth_user)
        setTargetUser(response_json.target_user)
        setConversationId(conversationId);
        if (response_json.target_user.is_online) {
          setIsOnline(response_json.target_user.is_online)
        }
    } catch (error) {
      console.error("Errore nel caricamento messaggi:", error);
    }
  };

  const handleDeselect = () => {
    setSelectedMessageId(null);
  };

  const handleCopy = (text: string) => {
    handleDeselect()
    navigator.clipboard.writeText(text)
      .then(() => {
        setShowToastMessage("Text copied successfully");
        setTimeout(() => setShowToastMessage(null), 3000);
      })
      .catch(err => {
        console.error("Errore nella copia", err);
        setShowToastMessage("Error during copy operation!");
      });
  };

  const sendMessage = async () => {
      if (message.trim()) {
  
        if (!chatContainerRef.current) return; // Verifica se il contenitore del chat esiste prima di controllare le proprie dimensionichatContainerRef.current)
        inputRef.current?.focus();
        inputRef!.current!.style.height = "auto"; // Resetta altezza per calcolare bene
        const newMessage: {
          user_id: number | null; 
          nickname: string; 
          text: string;
          quoted_msg?: any; // Permette quoted_msg opzionale
          target_id?: number;
          msg_type: number;
        } = { 
          user_id: authUser!.id, 
          nickname: authUser!.nickname, 
          text: message, 
          msg_type: 1,
        };
  
        if (quotedMessage != null) {
          newMessage.quoted_msg = quotedMessage;
        }

        newMessage.target_id = targetUser?.id;

        if (!conversationId) {
            let conversation_id = await createConversation();
            alreadyJoined = true;
            console.log("sto per fare l'accesso...", conversation_id)
            socket.emit('join-private-room', conversation_id, authUser, (response: any) => {
                // Callback che indica che l'utente è entrato nella room
                console.log('Joined private room successfully:', response);
                // Una volta che siamo nella room, inviamo il messaggio
                socket.emit('private-message', conversation_id, newMessage);
                setConversationId(conversation_id);
            });
        } else {
            socket.emit('private-message', conversationId, newMessage);
        }
        
        
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
    //setIsAtBottom(true);
    setShowNewMessageBtn(false);
  };

  const handleTouchMove = () => {
    isScrolling = true; // Se c'è un movimento, blocca il long press
  };

  const handleInputChange = (e: any) => {
    setMessage(e.target.value);

    // Adatta l'altezza in base al contenuto
    if (inputRef.current) {
      inputRef.current.style.height = "auto"; // Resetta altezza per calcolare bene
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, maxHeight) + "px";
    }
  };

  const addEmojiToMessage = (emoji: string, index: number) => {
    inputRef.current?.focus();
    setMessage((prevMessage) => prevMessage + emoji);
    setClickedIndex(index);
    setTimeout(() => {
      setClickedIndex(null);
    }, 300); // Tempo in ms che l'emoji rimane ingrandita
  };

  const handleHideDistance = async () => {
    //hide and unhide distance radar of the user

    try {
      await fetchWithPrefix(`/user/hide-location?token=${token}`, {
        method: 'PUT',
      });
  
      window.location.reload(); // oppure usa navigate(location.pathname)
    } catch (error) {
      console.error("Failed to hide distance", error);
    }
  };


  const handleRequestLocation = async () => {
    try {
      const position = await getPosition();
  
      // Optional: chiudi la modale
      setShowGeoWarningModal(false);
  
      // Esegui la chiamata al tuo backend per salvare latitudine/longitudine
      await fetchWithPrefix(`/user/update-location?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // eventuale token JWT o cookie con auth
        },
        body: JSON.stringify({
          latitude: position.latitude,
          longitude: position.longitude,
        }),
      });
  
      window.location.reload();

    } catch (error: any) {
      alert('Geolocation error or permission denied:'+error.message);
      setShowGeoWarningModal(false);
      // Qui potresti mostrare un messaggio tipo: "Location permission denied"
    }
  };

  const renderMessage = (msg: MessageData, index: number) => {


    const convertLinksToAnchors = (text: string, is_my_message: boolean) => {
      const urlRegex = /(https?:\/\/[^\s]+)/g; // Regex per trovare i link
      return text.split(urlRegex).map((part, index) => {
        if (urlRegex.test(part)) {
          return (
            <a key={index} href={part} target="_blank" rel="noopener noreferrer" className={`${is_my_message ? 'text-white' : 'text-blue-500'} underline`} >
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
      const isLastMessage = index === messages.length - 1;

      return (
        <div
          key={msg.id}
          className={`w-full relative flex ${msg.user_id === authUser!.id ? "justify-end" : "justify-start"} ${isSameUserAsPrevious ? "pt-1" : "pt-3"}
            ${selectedMessageId === msg.id ? "bg-gray-800" : ""}
          `}
        >
          {/* Div invisibile per catturare long press sull'intera riga (solo se NON mio messaggio) */}
          {msg.user_id !== authUser!.id && (
            <div
              className="absolute inset-0"
              {...longPressEvent(msg.id)}
            />
          )}
        <div 
          key={msg.id} 
          className={`px-2 flex rounded-md max-w-[75%] md:max-w-[50%] bg-grey-200 lg:max-w-[50%] 
            ${msg.user_id === authUser!.id ? "ml-auto justify-end" : "mr-auto justify-start"}
            ${isSameUserAsPrevious ? "pt-1": "pt-3"}
            ${selectedMessageId === msg.id ? "bg-gray-800 no-select pointer-events-none" : "bg-transparent"}`}
        >
      
          {selectedMessageId === msg.id && (
            <div className="absolute top-[-30px] right-2 flex items-center bg-gray-800 text-white px-2 py-1 rounded-md shadow-lg" style={{ pointerEvents: "auto" }}>
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
                Reply
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
                Copy
              </button>
      
              <div className="border-l border-white h-4 mx-1"></div> {/* Linea separatrice */}
      
              <button className="text-sm text-red-400 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setReportOpen(msg);
                }}
              
                onTouchStart={(e) => {
                  e.stopPropagation(); // Stoppa la propagazione dell'evento su touch
                  setReportOpen(msg); // Deselect il messaggio
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
      
          <div className={`flex flex-col ${msg.user_id === authUser!.id ? "items-end" : "items-start"}`}>
            
          {msg.quoted_msg && (
            <div className={`
              mb-2 p-2 rounded-md bg-gray-700 border-l-4 border-blue-400 text-sm text-gray-300 
              max-w-full
              ${msg.user_id === Number(userId) ? "ml-auto text-right border-r-4 border-l-0" : "mr-auto text-left"}
            `}>
              <strong className="text-blue-300">{msg.quoted_msg.nickname}</strong>: 
              

              {msg.quoted_msg.msg_type === 1 && (
                    <p className="text-white">
                      {msg.quoted_msg.message!.length > 150
                        ? `${msg.quoted_msg.message!.slice(0, 150)}...`
                        : msg.quoted_msg.message!}
                    </p>
                  )}

              {msg.quoted_msg.msg_type === 2 && (
                <img
                  src={microphoneIcon}
                  alt="audio"
                  className="w-8 h-8 object-contain"
                />
              )}

              {msg.quoted_msg.msg_type === 3 && (
                <img
                  src={msg.quoted_msg.message!}
                  alt="quoted image"
                  className="w-24 h-24 object-cover rounded"
                />
              )}

              {msg.quoted_msg.msg_type === 4 && (
                <img
                  src={videoIcon}
                  alt="quoted video"
                  className="w-24 h-24 object-cover rounded"
                />
              )}

            </div>
          )}

          <div 
            className={`p-2 rounded-2xl text-white shadow-md inline-block max-w-full 
              ${msg.user_id === authUser!.id ? "bg-blue-500 rounded-l-2xl rounded-r-md" : "bg-gray-700 rounded-r-2xl rounded-l-md"}
              ${isSameUserAsPrevious ? "mt-0" : ""}
              ${isSameUserAsNext ? "rounded-b-md" : "rounded-b-2xl"}
            `}
          >
      
              {msg.msg_type === 1 && (
                <span className={`relative z-15 no-select break-all whitespace-pre-wrap ${selectedMessageId === msg.id && "text-white"}`}>
                  {convertLinksToAnchors(msg.message!, msg.user_id === authUser!.id)}
                </span>
              )}

              {msg.msg_type === 2 && (
                <span className="ml-2">
                  <audio controls style={{ display: 'inline' }}>
                    <source src={`data:audio/mp3;base64,${msg.message}`} type="audio/mp3" />
                    Il tuo browser non supporta l'elemento audio.
                  </audio>
                </span>
              )}

              {msg.msg_type === 3 && (
                <div className="mt-2">
                  <img
                    src={`${msg.message}`}
                    alt="sent"
                    className="relative z-15 max-w-xs max-h-60 rounded cursor-pointer hover:opacity-90 transition"
                    onClick={() => openImageModal(msg.message!)}
                    onTouchEnd={() => {
                      if (isScrolling) {
                        return;
                      }

                      openImageModal(msg.message!) 
                    
                    }}
                  />
                </div>
              )}
              {msg.msg_type === 4 && (() => {
                const [videoUrl, thumbUrl] = msg.message!.split("####");

                return (
                  <div className="mt-2">
                    <video
                      src={videoUrl}
                      controls
                      poster={thumbUrl} 
                      className="relative z-15 max-w-xs max-h-60 rounded cursor-pointer hover:opacity-90 transition"
                    >
                      Il tuo browser non supporta l'elemento video.
                    </video>
                  </div>
                );
              })()}
              {isLastMessage && msg.date && (
                <div className={`text-xs  mt-1 ${msg.user_id === authUser!.id ? "text-right text-gray-200" : "text-left text-gray-400"}`}>
                  {new Date(msg.date).toLocaleString('en-US', {
                    month: 'long',   // "May"
                    day: 'numeric',   // "22"
                    hour: '2-digit',  // "06 PM"
                    minute: '2-digit',
                    hour12: false     // disattiva AM/PM
                  })}
                </div>
              )}

        </div>
          </div>
        </div>
        </div>
      );
      
      
    }
  };

  const goBackLink = goback ? `/chat/${goback}` : '/private-messages';

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-white shadow-md flex items-center justify-between p-4">
        {/* Parte sinistra: back link + nickname */}
        <div className="flex items-center">
          <Link to={goBackLink} className="mr-4 text-2xl">
            ←
          </Link>
          <div className="flex flex-col items-start">
          <h2 className="text-lg font-semibold">{targetUser?.nickname || "Chat"}</h2>
          {(isOnline == true) && (
            <span className="text-sm font-semibold text-blue-500">
              Online
            </span>
          )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {
          authUser?.geo_hidden === true ? (
            <>
              <img
                src={lucchetto}
                alt="Location hidden"
                className="w-5 h-5 cursor-pointer"
                onClick={() => setShowDistanceModal(true)}
              />
              <span className="text-lg text-gray-500 font-semibold">km</span>
            </>
          ) :
          authUser?.geo_accepted === false ? (
            <>
              <img
                src={warning}
                alt="Location warning"
                className="w-5 h-5 cursor-pointer"
                onClick={() => setShowGeoWarningModal(true)}
              />
              <span className="text-lg text-gray-500 font-semibold">km</span>
            </>
          ) : targetUser?.geo_hidden === true ? (
            <>
              <img
                src={lucchetto}
                alt="Location hidden"
                className="w-5 h-5 cursor-pointer"
                onClick={() => setShowGeoHiddenModal(true)}
              />
              <span className="text-lg text-gray-500 font-semibold">km</span>
            </>
          ) : targetUser?.distance != null ? (
            <button
              onClick={() => setShowDistanceModal(true)}
              className="text-lg text-gray-500 font-semibold hover:underline"
            >
              {targetUser.distance} km
            </button>
          ) : null}

          <Menu as="div" className="relative inline-block text-left">
            <MenuButton className="flex flex-col justify-center items-center w-6 h-6 space-y-0.5">
              <span className="w-1.5 h-1.5 bg-black rounded-full"></span>
              <span className="w-1.5 h-1.5 bg-black rounded-full"></span>
              <span className="w-1.5 h-1.5 bg-black rounded-full"></span>
            </MenuButton>

            <MenuItems className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg focus:outline-none z-50">
              <MenuItem>
                {({ active }) => (
                  <button
                    onClick={() => setReportOpen(targetUser)} // <-- qui apri la tua modal di report
                    className={`block w-full text-left px-4 py-2 text-sm ${
                      active ? "bg-gray-100 text-gray-900" : "text-gray-700"
                    }`}
                  >
                    Report user
                  </button>
                )}
              </MenuItem>
            </MenuItems>
          </Menu>


        </div>
      </div>

      {showGeoWarningModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowGeoWarningModal(false)}
        >
          <div
            className="bg-white p-6 rounded-lg shadow-lg relative w-11/12 max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Location permission needed</h2>
              <button
                className="text-gray-500 hover:text-black text-2xl font-semibold"
                onClick={() => setShowGeoWarningModal(false)}
              >
                ✕
              </button>
            </div>

            <p className="text-gray-700 mb-4 text-left">
              To see other users distances, you need to enable location sharing!
            </p>

            <div className="flex justify-center">
              <button
                onClick={handleRequestLocation}
                className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition"
              >
                Enable Location
              </button>
            </div>
          </div>
        </div>
      )}

      {showGeoHiddenModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowGeoHiddenModal(false)}
        >
          <div
            className="bg-white p-6 rounded-lg shadow-lg relative w-11/12 max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Location hidden</h2>
              <button
                className="text-gray-500 hover:text-black text-2xl font-semibold"
                onClick={() => setShowGeoHiddenModal(false)}
              >
                ✕
              </button>
            </div>
            <p className="text-gray-700 text-left">
              This user has chosen to hide their location. Therefore, the distance cannot be displayed.
            </p>
          </div>
        </div>
      )}

{showDistanceModal && (
  <div
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    onClick={() => setShowDistanceModal(false)}
  >
    <div
      className="bg-white p-6 rounded-lg shadow-lg relative w-11/12 max-w-md"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-800">About distance visibility</h2>
        <button
          className="text-gray-500 hover:text-black text-2xl font-semibold"
          onClick={() => setShowDistanceModal(false)}
        >
          ✕
        </button>
      </div>

      {authUser?.geo_hidden ? (
        <>
          <p className="text-gray-700 mb-4">
            You have chosen to hide your location from other users.
            <br /><br />
            If you want to make your distance visible again, you can do it below.
          </p>
          <div className="flex justify-center">
            <button
              onClick={handleHideDistance}
              className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
            >
              🔓 Show my distance
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-gray-700 mb-4">
            This user is approximately <strong>{targetUser?.distance} km</strong> away from you.
            <br /><br />
            If you prefer, you can hide your own distance from other users.
          </p>
          <div className="flex justify-center">
            <button
              onClick={handleHideDistance}
              className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
            >
              🔒 Hide my distance
            </button>
          </div>
        </>
      )}
    </div>
  </div>
)}


      {/* CHAT BODY */}
      <div className="flex-1 overflow-y-auto text-left flex flex-col bg-white"
        ref={chatContainerRef}
        onScroll={chatContainerScrollHandler}
        onTouchMove={handleTouchMove}
    >
        <div style={{ marginBottom: '4px' }}>
        <div className="bg-blue-300 text-white p-6 rounded-b-lg">
          <h2 className="text-lg font-semibold mb-2">
            Private chat with <span className="text-2xl">{targetUser?.nickname}</span>
          </h2>
          <p className="text-sm italic">Only the last {MAX_PRIVATE_ROOM_MESSAGE} messages are saved in the chat.</p>
        </div>

        {messages.map((msg, index) => (
            renderMessage(msg, index)
        ))}
        <div ref={messagesEndRef} className="order-last" />
        </div>
        {/* Bottone per i nuovi messaggi */}
        {showNewMessageBtn && (
        <button
            className="z-20 fixed bottom-32 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full shadow-md animate-bounce"
            onClick={scrollToBottom}
        >
            ⬇️ New messages
        </button>
        )}
    </div>

    {fullscreenImage && (
  <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
    <div className="absolute top-4 right-4">
      <button
        onClick={closeImageModal}
        className="text-white text-3xl font-bold hover:text-gray-300"
      >
        ✕
      </button>
    </div>
    <img
      src={fullscreenImage}
      alt="Fullscreen"
      className="max-w-full max-h-full object-contain rounded"
    />
  </div>
)}


    {showToastMessage && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-md shadow-lg animate-fadeInOut">
          {showToastMessage}
        </div>
      )}

    {showEmojis && (
        <div
          className="emoji-bar flex flex-wrap gap-2 mb-2 absolute left-0 right-0 z-20 p-2 bg-black bg-opacity-50 bottom-16 md:bottom-44"

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

    {isLoadingConverting && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="text-white text-xl font-bold flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-t-4 border-white border-solid rounded-full animate-spin"></div>
          <span>Converting audio...</span>
        </div>
      </div>
    )}

    <ReportModal
      reporterId={authUser !== null ? authUser.id : null}
      resourceId={conversationId}
      onClose={(msg) => {
        if (msg) {
          setShowToastMessage(msg);
          setTimeout(() => setShowToastMessage(null), 3000);
        }
        setReportOpen(null)
      }}
      reportItem={reportOpen}
      baseReport={"conversation"}
    />
      

        {/* Barra chat input - Sempre fissa in basso */}
      <div className="sticky bottom-0 bg-gray-800 p-2 z-10">
        {/* Input e bottone Invia */}
        <div className="relative flex flex-col gap-2">
        {/* Mostra il messaggio citato solo se esiste */}
        {(quotedMessage !== null) && (
          <div className="p-2 bg-gray-800 text-white rounded-md relative flex flex-col items-start">
          <span className="text-blue-400 font-bold">{quotedMessage.nickname}:</span>
          <span className="ml-0 text-left">

            {(quotedMessage.msg_type == 1) && (
              (quotedMessage.message!.length > 150) ? `${quotedMessage.message!.slice(0, 150)}...` : quotedMessage.message
            )} 

            {(quotedMessage.msg_type == 2) && (
              <img src={microphoneIcon} alt="Audio" className="w-5 h-5" />
            )} 

            {(quotedMessage.msg_type == 3) && (
              <img src={quotedMessage.message!} alt="Image" className="w-12 h-12" />
            )}

            {(quotedMessage.msg_type == 4) && (
              <img src={videoIcon} alt="Video" className="w-12 h-12" />
            )}

          </span>
        
          {/* Pulsante per rimuovere la citazione */}
          <button
            className="absolute top-1 right-2 text-red-400 hover:text-red-600"
            onClick={() => setQuotedMessage(null)}
          >
            ✕
          </button>
        </div>
        )}
        

    <div className="relative w-full max-w-screen-md mx-auto p-2 bg-gray-800 rounded-xl shadow-md flex items-center gap-2">
      {/* Emoji */}
      <button
        className={`text-white text-xl rounded-full hover:bg-gray-600 transition ${
          showEmojis ? 'bg-gray-700' : ''
        }`}
        onClick={() => {
          inputRef.current?.focus();
          setShowEmojis(!showEmojis);
        }}
      >
        😊
      </button>

      {/* Input */}
      <div className={`flex-1 relative flex items-center transition-all duration-300 ${
        message.trim().length > 0 ? 'gap-0' : 'gap-2'
      }`}>
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
          className={`w-full text-white placeholder-gray-400 px-4 py-2 pr-12 resize-none transition-all duration-300 bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            message.trim().length > 0 ? 'rounded-md overflow-y-auto' : 'rounded-full overflow-hidden'
          }`}
          placeholder="Type a message..."
          rows={1}
          style={{ minHeight: '40px', maxHeight: `${maxHeight}px` }}
        />

        {/* Send Button */}
        <button
          onClick={sendMessage}
          className={`absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-500 hover:bg-blue-600 p-1.5 rounded-full h-8 w-8 flex items-center justify-center transition-opacity duration-300 ${
            message.trim().length > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <img src={send} alt="Send" className="w-5 h-5 rotate-[-45deg]" />
        </button>
      </div>

      {/* Camera & Microphone (only if message is empty) */}
      {message.trim().length === 0 && (
        <div className="flex items-center gap-2">
          <AudioRecorderModal onAudioRecorded={handleAudioRecorded} />
          <CameraCapture onSendFile={sendFileMessage} resourceId={conversationId} resourceType="conversations"/>
        </div>
      )}
    </div>
</div>
     
      </div>


    </div>
  );
};

export default PrivateChatPage;
