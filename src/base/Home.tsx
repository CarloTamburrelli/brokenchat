import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Logo from '../assets/logo.png';
import { fetchWithPrefix } from '../utils/api';
import ChatList from '../base/ChatList';
import { useLocation } from "../base/LocationContext"; // Usa il contesto della posizione
import my_messages from '../assets/my_messages.png';
import FilterMenu from '../tools/FilterMenu';
import LocationRequestButton from "../tools/LocationRequestButton";
import LoadingSpinner from '../tools/LoadingSpinner';
import create_chat from '../assets/create_chat.png';
import { welcomeMessages } from '../utils/consts';

type Chatroom = {
  id: string;
  name: string;
  popularity: number;
  description: string;
  role_type: number;
  last_access: string;
};

type GroupedChats = Record<number, Chatroom[]>;



export default function Home() {

  const [nickname, setNickName] = useState<string>("");
  const [nearbyChats, setNearbyChats] = useState<GroupedChats>({});  // Oggetto vuoto per nearbyChats
  const [popularChats, setPopularChats] = useState<Chatroom[]>([]);  // Array vuoto per popularChats
  const [myChats, setMyChats] = useState<Chatroom[]>([]);  // Array vuoto per popularChats
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nicknameTmp, setTmpNickname] = useState<string>('');
  const [showToastMessage, setShowToastMessage] = useState<string | null>(null);
  const { lat, lon, error } = useLocation(); // Recupera latitudine e longitudine
  const prevFilter = useRef<string | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [welcomeStr, setWelcomeStr] = useState<string>('');
  const [headerHeight, setHeaderHeight] = useState(0);

  const handleChangeNickname = async () => {
    try {
        const token = localStorage.getItem('authToken');

        await fetchWithPrefix(`/update-nickname`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, nickname: nicknameTmp }),
        });

        setNickName(nicknameTmp);
        setShowNicknameModal(false);
        setShowToastMessage("Nickname changed!");
        setTimeout(() => setShowToastMessage(null), 3000);

    } catch (error: any) {
      alert(error.message);
    }
  };

  const openNicknameModal = () => {
    setTmpNickname(nickname);
    setShowNicknameModal(true);
  }

  const getUserDetailsInit = async () => {

    if (lat === null && lon === null && error === null) {
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('authToken');  // Assicura che token sia una stringa

    try {
    // Invia la richiesta con o senza latitudine/longitudine

      const base_url = `/get-user?token=${token}`
    
      const total_url = lat && lon
        ? `${base_url}&lat=${lat}&lon=${lon}`
        : `${base_url}`;

        console.log("sto per fare la richiesta getUserDetailsInit: ", lat, lon, error, total_url)

        const response = await fetchWithPrefix(total_url);

        console.log("risultato", response)

      if (response.nickname !== null) {
        setNickName(response.nickname)
      }

      if (response.nearbyChats && Object.keys(response.nearbyChats).length !== 0) {
        setSelectedFilter("Nearby")
        setNearbyChats(response.nearbyChats)
      } else if(response.popularChats && response.popularChats.length > 0) {
        setSelectedFilter("Popular")
        setPopularChats(response.popularChats)
      }

      setLoading(false);

    } catch (error: any) {
      setLoading(false);
      console.error('Errore nella richiesta:', error.response?.data?.message || error.message);
    }
  };


  const getUserDetailsForFiltering = async () => {

    if (selectedFilter === 'Nearby' && (lat === null && lon === null)){
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('authToken');  // Assicura che token sia una stringa

    try {
    // Invia la richiesta con o senza latitudine/longitudine

      const base_url = `/get-user?token=${token}&filter=${selectedFilter}`
    
      const total_url = lat && lon
        ? `${base_url}&lat=${lat}&lon=${lon}`
        : `${base_url}`;

      console.log("sto per fare la richiesta getUserDetailsForFiltering: ", lat, lon, error, selectedFilter)

      const response = await fetchWithPrefix(total_url);

      console.log("recupero...", response)


      if (response.nearbyChats && Object.keys(response.nearbyChats).length !== 0) {
        setNearbyChats(response.nearbyChats)
        setPopularChats([])
        setMyChats([])
      } else if(response.popularChats && response.popularChats.length > 0) {
        setPopularChats(response.popularChats)
        setNearbyChats({})
        setMyChats([])
      } else if (response.userChats && response.userChats.length > 0) {
        console.log("sono qui YES...", response.userChats)
        setMyChats(response.userChats)
        setNearbyChats({})
        setPopularChats([])
      }

      setLoading(false);

    } catch (error: any) {
      setLoading(false);
      console.error('Errore nella richiesta:', error.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    getUserDetailsInit();
  }, [lat, lon, error]);

  useEffect(() => {
    if (prevFilter.current === null) {
      // Se passa da null a stringa, non fare nulla
      prevFilter.current = selectedFilter;
      return;
    }

    console.log("getUserDetailsForFiltering", prevFilter.current, selectedFilter)

    getUserDetailsForFiltering();
    prevFilter.current = selectedFilter;
  }, [selectedFilter]);


  useEffect(() => {

    const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
    setWelcomeStr(welcomeMessages[randomIndex]);

    setTimeout(() => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    }, 100); // puoi aumentare tipo a 100ms se vuoi essere sicuro

    
  }, []);


  interface HeaderBrokenChatProps {
    alreadyJoined: string | null;  // Accettiamo il nickname come variabile
  }
  

  const HeaderBrokenChat: React.FC<HeaderBrokenChatProps> = ({ alreadyJoined }) => {

    return (
      <div className='w-full my-2'>
      <div className="flex justify-center items-center w-full pl-2 pr-2">
  {/* Icona Messaggi Privati */}
  {alreadyJoined && alreadyJoined !== "" && (
  <div className="md:flex flex-1 justify-start">
    <Link to="/private-messages">
      <img src={my_messages} alt="Messaggi Privati" className="w-8 h-8" />
    </Link>
  </div>
  )}

  <div className={`flex ${alreadyJoined && alreadyJoined !== "" && "justify-center"} md:flex-1`}>
    <Link to="/create-chat">
    <button className="bg-black text-white py-2 px-6 rounded-lg hover:bg-gray-800 flex items-center space-x-2">
    {/* Immagine a sinistra del bottone */}
    <img src={create_chat} alt="Create Chat" className="w-5 h-5" />
    <span className='font-mono'>Create Chat</span>
  </button>
    </Link>
  </div>

  {/* Icona Filtro */}
  <div className="md:flex flex-1 justify-end">
    <FilterMenu myFilterToShow={nickname != ""} nearFilterToShow={!!lat && !!lon} selectedFilter={selectedFilter} setSelectedFilter={setSelectedFilter} />
  </div>
</div>
<div className="flex justify-center">
  <LocationRequestButton />
</div>
</div>
    );
  };


  return (
    <div className="flex flex-col justify-center items-center max-w-3xl mx-auto">
  <img src={Logo} 
  alt="Logo" 
  className="w-40 h-[137px] sm:w-52 sm:h-[179px] md:w-48 md:h-[165px] lg:w-56 lg:h-[193px] xl:w-45 xl:h-[155px]"  />
  {loading ? ( 
    // Spinner mentre i dati vengono caricati
    <LoadingSpinner />
  ) : (
    <>
      {nickname ? (
        <span><h1 className="text-1xl font-bold my-4 text-gray-500 font-mono typing-effect inline-block">Hey, welcome back <span onClick={openNicknameModal} className='underline cursor-pointer'>{nickname}</span></h1></span>
      ) : <span>
      <h1 className="text-1xl font-bold my-4 text-gray-500 font-mono typing-effect block break-words whitespace-normal">
        {welcomeStr}
      </h1>
    </span>
    }
      <div ref={headerRef} style={{backgroundColor: '#f9f9f9'}} className="sticky top-0 z-10 shadow-md w-full">
        <HeaderBrokenChat alreadyJoined={nickname} />
      </div>
      <ChatList myChats={myChats} nearbyChats={nearbyChats} popularChats={popularChats} 
  headerHeight={headerHeight} />
    </>
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
        <h2 className="text-lg font-bold text-gray-800">Change your nickname</h2>
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

      {/* Bottone di conferma */}
      <div className="flex mt-4 justify-center">
        <button
          onClick={handleChangeNickname}
          className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
)}

{showToastMessage && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-md shadow-lg animate-fadeInOut">
          {showToastMessage}
        </div>
      )}


</div>



  );
  }