import { Link, useParams } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Header from './header';
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
import ChatSettingsModal from './ChatSettingsModal';
import ban_user_w from '../assets/ban_user_w.png';
import BannedModal from './BannedModal';
import BannedUsersModal from './BannedUsersModal';
import { isValidNickname } from '../utils/validations';
import LoadingSpinner from './LoadingSpinner';
import usePushNotifications from '../utils/usePushNotifications';
import CameraCapture from './CameraCapture';
import microphoneIcon from "../assets/audio.png";
import { getPosition } from '../utils/geolocation';
import { generateColorFromId } from '../utils/generateColorFromId';



type MessageData = {
  id:  number | string;
  nickname: string | null;
  message: string | null;
  alert_message: boolean;
  msg_type: number;
  date: string | null;
  user_id: number | null;
  quoted_msg: MessageData | null;
  delete_chat: boolean | null;
};


interface ChatData {
  name: string;
  isPrivate: boolean;
  description: string;
  created_at: string;
  am_i_admin: number;
}

interface ProfileUser { 
  id: number;
  nickname: string;
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
  const [, setIsAtBottom] = useState(true);
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
  const [validUsername, setValidUsername] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const [firstLoad, setFirstLoad] = useState(true);
  const [showInfoChatModal, setShowInfoChatModal] = useState(false);
  const [showUserListModal, setShowUserListModal] = useState(false);
  const [usersList, setUsersList] = useState<string[]>([]);
  const [banUsersList, setBanUsersList] = useState<string[]>([]);
  const [isLoadingConverting, setIsLoadingConverting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatLocked, setIsChatLocked] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [unreadPrivateMessagesCount, setUnreadPrivateMessagesCount] = useState<number>(0);

  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

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

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const enablePush = params.get("enablePush") === "true";

  usePushNotifications(userId!, enablePush);

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

  const openImageModal = (src: string) => {
    setFullscreenImage(src);
  };
  
  const closeImageModal = () => {
    setFullscreenImage(null);
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
          am_i_admin: response_json.chat.am_i_admin,
          created_at: formatDate(response_json.chat.created_at)
        });

        if (response_json.chat.am_i_admin == 1) {
          setBanUsersList(response_json.ban_user_list)
        }

        console.log("YOO",response_json)

        if (response_json.chat.user_id === null) {
          //devi far apparire la modal che ti chiede che nome vuoi inserire
          setShowModal(true);
          setIsChatLocked(true);
          return;
        } else {
          setIsChatLocked(false);
        }

        setUnreadPrivateMessagesCount(response_json.unread_private_messages_count)

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
              date: newMessage.created_at,
              alert_message: false,
              user_id: newMessage.user_id,
              quoted_msg: newMessage.quoted_msg || null,
              delete_chat: false,
              msg_type: newMessage.msg_type
            },
          ]);
        });


        socket.off('banned');

        socket.on('banned', ({ chat_id }) => {
          if (chatId === chat_id ) {
            socket.off('join-room');
            socket.off('broadcast_messages');
            socket.off('alert_message');
            setIsBanned(true);
            setIsChatLocked(true);
          }
        });

        socket.off('new_private_messages');

        socket.on('new_private_messages', ({ unread_private_messages_count }) => {
          if (unread_private_messages_count && unread_private_messages_count > 0) {
            setUnreadPrivateMessagesCount(unread_private_messages_count);
          }
        });

        socket.off('alert_message');

        socket.on('alert_message', (data: any) => {

          const { message, users, deleteChat, editChat} = data;
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
                  date: null,
                  user_id: null,
                  audio: null,
                  quoted_msg: null,
                  delete_chat: deleteChat,
                  msg_type: 0
                }
              ]
            )

            if (deleteChat && deleteChat == true) {
              setIsChatLocked(true)
            } else if (editChat && Object.keys(editChat).length > 0) {

              setChatData((prev: any) => ({
                ...prev,
                ...editChat,
              }));

            }

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
      socket.off('banned');
      socket.off('new_private_messages');
      socket.off('broadcast_messages');
      socket.off('join-room');
      socket.off('alert_message');
    };
  }, [chatId]);
  
  useEffect(() => {
    if (isValidNickname(nickname)) {
      setError(null);
      setValidUsername(true)
    } else {
      setValidUsername(false)
    }

  }, [nickname]);

  useEffect(() => {

    if (unreadPrivateMessagesCount > 0) {
      document.title = `(${unreadPrivateMessagesCount}) ${chatData?.name || ''} - Broken Chat`;
    } else {
      document.title = `${chatData?.name || ''} - Broken Chat`;
    }

  }, [unreadPrivateMessagesCount, chatData])

  useEffect(() => {

    if (!chatContainerRef.current) return;

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

  const sendMessage = () => {
    if (message.trim()) {

      if (!chatContainerRef.current) return; // Verifica se il contenitore del chat esiste prima di controllare le proprie dimensionichatContainerRef.current)
      inputRef.current?.focus();
      inputRef!.current!.style.height = "auto"; // Resetta altezza per calcolare bene
      const newMessage: { 
        user_id: number | null; 
        nickname: string; 
        text: string; 
        quoted_msg?: any; // Permette quoted_msg opzionale
        msg_type: number;
      } = { 
        user_id: userId, 
        nickname: nickname, 
        text: message,
        msg_type: 1,
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

    if (!isValidNickname(nickname)) {
      setError("The nickname is not valid, minimum 3 characters and do not use special symbols, only _ and numbers are allowed");
      setValidUsername(false)
      return;
    }

    try {
      setLoading(true);
      let latitude = localStorage.getItem('latitude');
      let longitude = localStorage.getItem('longitude');

      if (latitude == null || longitude == null) {
        //se l'utente ha fatto accesso direttamente a una stanza senza passare per la home
        const position = await getPosition();
        localStorage.setItem("latitude", position.latitude.toString()); // Verranno recuperati nel momento della registrazione
        localStorage.setItem("longitude", position.longitude.toString()); 
        latitude = position.latitude.toString();
        longitude = position.longitude.toString();
      }
      
      const response = await fetchWithPrefix(`/register-user?`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, nickname, latitude, longitude }),
      });

      localStorage.setItem("authToken", response.token); // Salva il nuovo token
      window.location.href = `${window.location.pathname}?enablePush=true`;

    } catch (error: any) {
      setError(error.message);
      setLoading(false);
      setValidUsername(false)
    }
  };


  // Se la pagina è in caricamento
  if (loading) {
    return BaseWaiting(<LoadingSpinner />);
  }

  // Se c'è un errore nel recupero dei dati
  if (error && !showModal) {
    return BaseWaiting(<div><div className='text-red-600 font-bold text-xl'>{error}</div><div className="mt-4 text-center pt-10">
      <Link
        to="/"
        className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
      >
        ← Back to homepage
      </Link>
    </div></div>);
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

  const onUserClicked = async (userIdToShow: number) => {
    setShowUserListModal(false)

    if (userIdToShow == userId) {
      return;
    }

    try {
      const response_json = await fetchWithPrefix(`/users/${userIdToShow}`);
      //console.log("UTENTE RECUPERATO", response_json); // Qui trovi i dati dell'utente
      setProfileToShow({
        id: userIdToShow,
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
      alert_message: boolean;
      msg_type: number;
      quoted_msg?: any; // Permette quoted_msg opzionale
    } = {
      user_id: userId,
      nickname: nickname,
      text: base64Audio,
      alert_message: false,
      msg_type: 2,
    };

    if (quotedMessage != null) {
      newMessage.quoted_msg = quotedMessage;
      setQuotedMessage(null);
    }
  
    socket.emit('message', chatId, newMessage, userId);
  };

  const sendPhotoMessage = (base64Image: string) => {
    const newMessage: {
      user_id: number | null;
      nickname: string;
      text: string;
      alert_message: boolean;
      msg_type: number;
    } = {
      user_id: userId,
      nickname: nickname,
      text: base64Image,
      alert_message: false,
      msg_type: 3, // tipo immagine
    };

    socket.emit('message', chatId, newMessage, userId);
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

  const handleSaveSettings = async (newTitle: string, newDescription: string) => {
    try {

      const token = localStorage.getItem('authToken');

      if (token == null) {
        return;
      }

      await fetchWithPrefix(`/chat/${chatId}?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, description: newDescription }),
      });

      socket.emit('update_chat_data', newTitle, newDescription);

      setShowToastMessage("Chat data changed successfully!");
      setTimeout(() => setShowToastMessage(null), 3000);


    } catch (error) {
      console.error("Errore nel salvataggio", error);
      alert("Errore nel salvataggio della chat.");
    }
  };

  const handleDeleteChat = async () => {
    const confirm = window.confirm("Are you sure you want to delete this chat? It won't be possible to recover it");
    if (!confirm) return;

    const token = localStorage.getItem('authToken');

    if (token == null) {
      return;
    }

    try {
      socket.emit('delete_chat_process', chatId, token);
      setIsSettingsOpen(false)

      setChatData({...chatData!, am_i_admin: 0})
    } catch (error) {
      console.error("Errore nella cancellazione", error);
      alert("Errore nella cancellazione della chat.");
    }
  };

  const handleBanUser = async () => {
    if (!profileToShow) return;
  
    const confirmBan = window.confirm(`Are you sure you want to ban ${profileToShow.nickname}?`);
    if (!confirmBan) return;
  
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
  
      await fetchWithPrefix(`/ban/${chatId}/${profileToShow.id}?token=${token}`, {
        method: 'PUT',
      });
      setBanUsersList(prev => [...prev, `${profileToShow.nickname}####${profileToShow.id}`]);
      setProfileToShow(null);
      setShowToastMessage(`${profileToShow.nickname} has been banned.`);
      setTimeout(() => setShowToastMessage(null), 3000);
    } catch (error) {
      console.error("Error banning user:", error);
      alert("Failed to ban user.");
    }
  };

  const handleUnbanUser = async (nickname: string, userId: number) => {
    const confirmUnban = window.confirm(`Are you sure you want to unban ${nickname}?`);
    if (!confirmUnban) return;
  
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
  
      await fetchWithPrefix(`/unban/${chatId}/${userId}?token=${token}`, {
        method: 'PUT',
      });
  
      setBanUsersList((prev) => prev.filter(user => !user.endsWith(`####${userId}`)));
      setShowToastMessage(`${nickname} has been unbanned.`);
      setTimeout(() => setShowToastMessage(null), 3000);
      setIsBanModalOpen(false)
    } catch (error) {
      console.error("Error unbanning user:", error);
      alert("Failed to unban user.");
    }
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
        setTimeout(() => setShowToastMessage(null), 3000);

    } catch (error) {
        console.error("Error reporting user:", error);
        setShowToastMessage("An error occurred while reporting the user");
        setTimeout(() => setShowToastMessage(null), 3000);
    }
    handleDeselect()
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
        <div
          key={msg.id}
          className={`p-2 font-bold no-select ${msg.delete_chat ? 'text-red-600' : ''}`}
        >
          <span>{msg.message}</span>
        </div>
      );
    } else {

      const isSameUserAsPrevious = index > 0 && messages[index - 1].user_id === msg.user_id;
      const isSameUserAsNext = index < messages.length - 1 && messages[index + 1].user_id === msg.user_id;
      const isLastMessage = index === messages.length - 1;
      const userColor = generateColorFromId(msg.user_id!) // format: #fffff

      return (
        <div
          key={msg.id}
          className={`select-none w-full relative flex ${msg.user_id === userId ? "justify-end" : "justify-start"} ${isSameUserAsPrevious ? "pt-1" : "pt-3"}
            ${selectedMessageId === msg.id ? "bg-gray-800" : ""}
          `}
        >
          {/* Div invisibile per catturare long press sull'intera riga (solo se NON mio messaggio) */}
          {msg.user_id !== userId && (
            <div
            className="absolute inset-0"
          >
            <div className="w-full h-full" {...longPressEvent(msg.id)} />
          </div>
          )}
        <div 
          key={msg.id} 
          className={`px-2 flex rounded-md max-w-[75%] md:max-w-[50%] bg-grey-200 lg:max-w-[50%] 
            ${msg.user_id === userId ? "ml-auto justify-end" : "mr-auto justify-start"}
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
          <div className={`z-10 text-sm ${msg.user_id === userId ? "text-right" : "text-left"}`}>
            <strong
              onClick={() => msg.user_id ? onUserClicked(msg.user_id) : null}
              onTouchEnd={() => msg.user_id ? onUserClicked(msg.user_id): null}
              className={"cursor-pointer font-semibold font-mono z-10 no-select"}
              style={{ pointerEvents: "auto",
                color: usersList.some(user => user.split("####")[1] === String(msg.user_id))
      ? '#60a5fa'
      : userColor,
               }}
            >
              {msg.user_id === userId ? "You" : msg.nickname} {(msg.user_id == admin!.id) && "👑"}
            </strong>
          </div>)}
            
          {msg.quoted_msg && (
            <div className={`
              mb-2 p-2 rounded-md bg-gray-700 border-l-4 border-blue-400 text-sm text-gray-300 
              max-w-full
              ${msg.user_id === userId ? "ml-auto text-right border-r-4 border-l-0" : "mr-auto text-left"}
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


            </div>
          )}

          <div 
            className={`p-2 rounded-2xl text-white shadow-md inline-block max-w-full 
              ${msg.user_id === userId ? "bg-blue-500 rounded-l-2xl rounded-r-md" : "bg-gray-700 rounded-r-2xl rounded-l-md"}
              ${isSameUserAsPrevious ? "mt-0" : ""}
              ${isSameUserAsNext ? "rounded-b-md" : "rounded-b-2xl"}
            `}
          >

              {msg.msg_type === 1 && (
                <span className={`relative z-15 no-select break-all whitespace-pre-wrap ${selectedMessageId === msg.id && "text-white"}`}>
                  {convertLinksToAnchors(msg.message!, msg.user_id === userId)}
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
              {isLastMessage && msg.date && (
                <div className={`text-xs  mt-1 ${msg.user_id === userId ? "text-right text-gray-200" : "text-left text-gray-400"}`}>
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

  
  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      {/* Header */}
      {(isChatLocked == false) && (<div className="sticky top-0 text-center font-bold z-50 bg-white shadow-md">
        <Header numPvtMsgToRead={unreadPrivateMessagesCount} AmIAdmin={chatData!.am_i_admin} usersList={usersList} showUserListModal={() => setShowUserListModal(true)} onOpenInfo={() => setShowInfoChatModal(true)} headerName={chatData!.name} editChat={ () => setIsSettingsOpen(true)} banUser={() => setIsBanModalOpen(true)} />
      </div>) }

      {showInfoChatModal && (
        <div  
        className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-30"
        onClick={() => setShowInfoChatModal(false)}
      >
        <div
          className="bg-white p-5 rounded-lg shadow-lg w-96 relative text-left"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header con titolo e pulsante di chiusura */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 font-mono">{chatData!.name}</h2>
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
    onClick={() => {(admin!.id !== userId) && setProfileToShow(admin)}} // Funzione da eseguire al click
  >{admin?.nickname}
  </span></div>
            <div><span className="font-semibold">Created on:</span> {chatData!.created_at}</div>
          </div>
        </div>
      </div>
      
      )}

{profileToShow && (
        <div
        className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-30"
        onClick={() => setProfileToShow(null)} // Chiude la modal cliccando all’esterno
      >
        <div
          className="bg-white p-5 rounded-lg shadow-lg w-96 relative text-left"
          onClick={(e) => e.stopPropagation()} // Impedisce la chiusura se clicchi dentro la modal
        >
          {/* Header con titolo e pulsante di chiusura */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">{profileToShow?.nickname}'s profile</h2>
            <button
              onClick={() => setProfileToShow(null)}
              className="text-gray-500 hover:text-black text-2xl font-semibold"
            >
              ✕
            </button>
          </div>
      
          {/* Dettagli Profilo */}
          <div className="text-sm text-gray-800 space-y-2">
            <div><span className="font-semibold">Registered on:</span> {profileToShow.subscription || "Data non disponibile"}</div>
          </div>

          <div className="mt-4 flex items-center justify-center space-x-4">
      
          {(chatData!.am_i_admin == 1) && (
            <>
            {banUsersList.includes(`${profileToShow.nickname}####${profileToShow.id}`) ? (
              <div className="py-2 text-red-600 flex items-center justify-center">
                <span>Already banned</span>
              </div>
            ) : (
              <button
                onClick={() => handleBanUser()}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center space-x-2"
              >
                <img src={ban_user_w} alt="Ban Icon" className="w-5 h-5" />
                <span>Ban</span>
              </button>
            )}
          </>
          )}
            <button className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center space-x-2">
              <Link to={`/private-messages/new/${profileToShow.id}?goback=${chatId}`} className="flex items-center space-x-2">
                <img src={chat_now} alt="Chat Icon" className="w-5 h-5" />
                <span>Private message</span>
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
        myId={userId!}
        adminProfile={admin!}
      />

<ChatSettingsModal
    isOpen={isSettingsOpen}
    setIsOpen={setIsSettingsOpen}
    initialTitle={chatData!.name}
    initialDescription={chatData!.description}
    onSave={handleSaveSettings}
    onDeleteChat={handleDeleteChat}
  />

<BannedModal isOpen={isBanned} onClose={() => setIsBanned(false)} />

<BannedUsersModal
  isOpen={isBanModalOpen}
  setIsOpen={setIsBanModalOpen}
  bannedUsers={banUsersList} // tipo: ["Luca####23", "Giulia####17"]
  onUnbanClicked={handleUnbanUser}
  onUserClicked={onUserClicked}
/>

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


{showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 px-4">
        <div className="bg-white p-6 rounded-md shadow-lg w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl">
        <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-center">
          Choose a nickname to join the chat:
        </h2>

          <span className="block mt-2 text-center">
          {chatData?.name}
    </span>
          <input
            maxLength={17}
            type="text"
            placeholder="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="border p-3 mt-4 w-full rounded-md"
          />
      
          {error && (
            <div className="text-red-500 font-mono pt-3 text-sm">{error}</div>
          )}
      
          {validUsername && (
            <div className="text-green-500 font-mono pt-3 text-sm">The nickname is valid 😎</div>
          )}

      <p className="text-xs text-center text-gray-500 mt-4">
            By clicking <strong>JOIN</strong>, you agree to our{' '}
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-700"
            >
              Privacy & Cookie Policy
            </a> and <a
              href="/terms-of-use"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-700"
            >
              Terms of use
            </a>.
          </p>

          <div className="w-full flex justify-center mt-5">
          {!loading ? (<button
              onClick={handleRegisterUser}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-indigo-500 hover:to-blue-500 transition-all duration-300 text-white font-semibold py-2 px-6 rounded-xl shadow-lg hover:shadow-xl active:scale-95 w-full md:w-[400px]"
          >
            🚀 JOIN!
          </button>) : (<LoadingSpinner />)}
        </div>

        <div className="mt-4 text-center">
  <Link
    to="/"
    className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
  >
    ← Back to homepage
  </Link>
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
    <div style={{ marginBottom: '4px'}}>
      {(isChatLocked == false) && (<div className="bg-blue-300 text-white p-6 rounded-b-lg">
        <h2 className="text-2xl font-semibold mb-2">{chatData?.name}</h2>
        <p className="text-lg mb-4">{chatData?.description}</p>
        <p className="text-sm italic">Only the last 100 messages are saved in the chat.</p>
      </div>)}
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

  
      {/* Barra chat input - Sempre fissa in basso */}
      {(isChatLocked == false) && (<div className="sticky bottom-0 bg-gray-800 p-2 z-10">
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
      <CameraCapture onSendPhoto={sendPhotoMessage} />
    </div>
  )}
</div>


    </div>
     
      </div>)}
    </div>
  );
  
  
    
}

export default ChatPage;

