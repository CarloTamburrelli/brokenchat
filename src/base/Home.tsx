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
        setShowToastMessage("Nome cambiato!");
        setTimeout(() => setShowToastMessage(null), 2000);

    } catch (error) {
      console.log(error);
      alert("Impossibile cambiare nickname");
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

        console.log("sto per fare la richiesta getUserDetailsInit: ", lat, lon, error)

        const response = await fetchWithPrefix(total_url);

      if (response.nickname !== null) {
        setNickName(response.nickname)
      }

      if (response.nearbyChats && Object.keys(response.nearbyChats).length !== 0) {
        setSelectedFilter("Vicine")
        setNearbyChats(response.nearbyChats)
      } else if(response.popularChats && response.popularChats.length > 0) {
        setSelectedFilter("Popolari")
        setPopularChats(response.popularChats)
      }

      setLoading(false);

    } catch (error: any) {
      setLoading(false);
      console.error('Errore nella richiesta:', error.response?.data?.message || error.message);
    }
  };


  const getUserDetailsForFiltering = async () => {

    if (selectedFilter === 'Vicine' && (lat === null && lon === null)){
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

  const HeaderBrokenChat: React.FC = () => {
    return (
      <div className='w-full mb-3'>
      <div className="flex justify-center items-center mb-2 w-full pl-5 pr-5">
  {/* Icona Messaggi Privati */}
  <div className="md:flex flex-1 justify-start">
    <Link to="/private-messages">
      <img src={my_messages} alt="Messaggi Privati" className="w-8 h-8" />
    </Link>
  </div>

  {/* Bottone Crea Chat */}
  <div className="flex justify-center md:flex-1">
    <Link to="/create-chat">
      <button className="bg-black text-white py-2 px-6 rounded-lg hover:bg-gray-800">
        Crea chat
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
    <div className="flex flex-col justify-center items-center max-w-3xl mx-auto bg-white">
  <img src={Logo} 
  alt="Logo" 
  className="w-40 h-32 sm:w-52 sm:h-40 md:w-48 md:h-36 lg:w-56 lg:h-55 xl:w-45 xl:h-55"  />
  {loading ? ( 
    // Spinner mentre i dati vengono caricati
    <LoadingSpinner />
  ) : (
    <>
      {nickname ? (
        <h1 className="text-1xl font-bold my-4 text-gray-500">Hey bentornato, <span onClick={openNicknameModal} className='underline cursor-pointer'>{nickname}</span>!</h1>
      ) : null}
      <HeaderBrokenChat />
      <ChatList myChats={myChats} nearbyChats={nearbyChats} popularChats={popularChats} />
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

{showToastMessage && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-md shadow-lg animate-fadeInOut">
          {showToastMessage}
        </div>
      )}


</div>



  );
  }