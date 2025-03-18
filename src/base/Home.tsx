import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Logo from '../assets/logo.png';
import { fetchWithPrefix } from '../utils/api';
import ChatList from '../base/ChatList';
import { getPosition } from '../utils/geolocation';

interface InfoChat {
  chatId: number;
  chatName: string;
  role: number;
  isPrivate: boolean;
  chatLink: string;
}

type Chatroom = {
  id: string;
  name: string;
  popularity: number;
  description: string;
};

type GroupedChats = Record<number, Chatroom[]>;



export default function Home() {

  const [chat, setUserData] = useState<InfoChat[]>([]);
  const [userName, setNickName] = useState<string>("");
  const [groupedChats, setGroupedChats] = useState<GroupedChats>({});
  const [loading, setLoading] = useState<boolean>(true);


  const getUserDetails = async () => {
    setLoading(true);
    const token = localStorage.getItem('authToken');  // Assicura che token sia una stringa

    let latitude: number | null = null;
    let longitude: number | null = null;

    try {
      // Tenta di ottenere la posizione
      const position = await getPosition();
      latitude = position.latitude;
      longitude = position.longitude;
    } catch (error: any) {
        if (error.code === error.PERMISSION_DENIED) {
          console.error("L'utente ha negato l'accesso alla posizione.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          console.error("La posizione non è disponibile.");
        } else if (error.code === error.TIMEOUT) {
          console.error("Timeout nella richiesta della posizione.");
        } else {
          console.error("Errore sconosciuto:", error);
        }
      }

  try {
    // Invia la richiesta con o senza latitudine/longitudine
    const url = latitude && longitude
      ? `/get-user?token=${token}&lat=${latitude}&lon=${longitude}`
      : `/get-user?token=${token}`;

      const response = await fetchWithPrefix(url);

      if (response.nickname !== null) {
        setNickName(response.nickname)
      }
      //setUserData(response.userChats);
      if (response.nearbyChats !== null) {
        setGroupedChats(response.nearbyChats)
      }

      setLoading(false);

    } catch (error: any) {
      setLoading(false);
      console.error('Errore nella richiesta:', error.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    getUserDetails();
  }, []);

  const CreateChatButton: React.FC = () => {
    return (
      <div className="justify-center items-center mb-2">
        <Link to="/create-chat">
          <button className="bg-black text-white py-2 px-6 rounded-lg hover:bg-gray-800">
            Crea chat
          </button>
        </Link>
      </div>
    );
  };


  return (
    <div className="flex flex-col justify-center items-center mt-5">
      <img src={Logo} />
      {loading ? ( 
      // Spinner mentre i dati vengono caricati
      <div className="flex justify-center items-center mt-5">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-black"></div>
      </div>
    ) : (<>
      {userName ? (
        <h1 className="text-1xl font-bold my-4 text-gray-500">Hey bentornato, {userName}!</h1>
      ) : null}
      <CreateChatButton />
      <ChatList initialChats={groupedChats} />
      </>)}
    </div>
  );
  }