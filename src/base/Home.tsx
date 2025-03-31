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
  const { lat, lon, error } = useLocation(); // Recupera latitudine e longitudine
  const prevFilter = useRef<string | null>(null);

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
    <div className="flex flex-col justify-center items-center mt-5 max-w-3xl mx-auto">
  <img src={Logo} 
  alt="Logo" 
  className="w-40 h-32 sm:w-52 sm:h-40 md:w-48 md:h-36 lg:w-56 lg:h-55 xl:w-45 xl:h-55"  />
  {loading ? ( 
    // Spinner mentre i dati vengono caricati
    <LoadingSpinner />
  ) : (
    <>
      {nickname ? (
        <h1 className="text-1xl font-bold my-4 text-gray-500">Hey bentornato, {nickname}!</h1>
      ) : null}
      <HeaderBrokenChat />
      <ChatList myChats={myChats} nearbyChats={nearbyChats} popularChats={popularChats} />
    </>
  )}
</div>

  );
  }