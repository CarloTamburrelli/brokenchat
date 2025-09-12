import { useState, useEffect, useRef } from 'react';
import { formatDate } from '../../utils/formatDate';
import { fetchWithPrefix } from '../../utils/api';
import ChatList from '../ChatList';
import { useLocation } from "../../utils/LocationContext"; // Usa il contesto della posizione
import LoadingSpinner from '../LoadingSpinner';
import { welcomeMessages } from '../../utils/consts';
import { socket } from "../../utils/socket"; // Importa il socket
import usePushNotifications from '../../utils/usePushNotifications';
import OnlineUsersModal from '../OnlineUsersModal';
import BanAlert from '../BanAlert';
import MenuButton from './MenuButton';
import OnlineUsersIndicator from './OnlineUsersIndicator';
import LogoBlock from './LogoBlock';
import HeaderBrokenChat from './HeaderBrokenChat';
import ProfileModal from './ProfileModal';
import NicknameModal from './NicknameModal';
import GlobalChat from './GlobalChat';

type Chatroom = {
  id: string;
  name: string;
  popularity: number;
  description: string;
  role_type: number;
  last_access: string;
};

interface User {
  id: number;
  nickname: string;
  subscription?: string;
}

type GroupedChats = Record<number, Chatroom[]>;


export default function Home() {

  const [nickname, setNickName] = useState<string>("");
  const [userId, setUserId] = useState<number | null>(null);
  const [nearbyChats, setNearbyChats] = useState<GroupedChats>({});  // Oggetto vuoto per nearbyChats
  const [popularChats, setPopularChats] = useState<Chatroom[]>([]);  // Array vuoto per popularChats
  const [myChats, setMyChats] = useState<Chatroom[]>([]);  // Array vuoto per popularChats
  const [loading, setLoading] = useState<boolean>(true);
  const [banStatus, setBanStatus] = useState<number>(0);
  const [banMessage, setBanMessage] = useState<string>('');
  const [banRead, setBanRead] = useState<boolean>(true);
  const [ipAddress, setIpAddress] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nicknameTmp, setTmpNickname] = useState<string>('');
  const [showToastMessage, setShowToastMessage] = useState<string | null>(null);
  const { lat, lon, mode, error } = useLocation(); // Recupera latitudine e longitudine
  const prevFilter = useRef<string | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [welcomeStr, setWelcomeStr] = useState<string>('');
  const [headerHeight, setHeaderHeight] = useState(0);
  const [unreadPrivateMessagesCount, setUnreadPrivateMessagesCount] = useState<number>(0);
  const [showRecoveryCodeModal, setShowRecoveryCodeModal] = useState<boolean>(false);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [totalUsersIdOnline, setTotalUsersIdOnline] = useState<number[]>([]); 
  const [showModalUsersOnline, setShowModalUsersOnline] = useState(false);
  const [profileToShow, setProfileToShow] = useState<User | null>(null);

  const [animate, setAnimate] = useState<boolean>(false);

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  usePushNotifications(userId!, true) //web notification


  const handleRemoveAccount = async () => {
    const confirmed = window.confirm("Are you sure you want to delete your account?\nThis action is irreversible.\n\nAll information associated with your profile will be permanently removed 30 days after the deletion request.");
    if (!confirmed) return;

    if (!userId) return;
  
    try {

      const token = localStorage.getItem('authToken');
      if (!token) return;

      await fetchWithPrefix(`/delete-account`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, user_id: userId }),
      });

      localStorage.clear();

      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("Something went wrong. Please try again.");
    }
  };

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

  const onUserClicked = async (user: User) => {
      setShowModalUsersOnline(false)
  
      if (!user) {
        return;
      }
  
      setProfileToShow({
        id: user.id,
        nickname: user.nickname,
        subscription: formatDate(user.subscription!),
      })
      
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
    
      const total_url = lat && lon && mode
        ? `${base_url}&lat=${lat}&lon=${lon}&mode=${mode}`
        : `${base_url}`;

        //console.log("sto per fare la richiesta getUserDetailsInit: ", lat, lon, error, total_url)

        const response = await fetchWithPrefix(total_url);

        //console.log("risultato", response)

      if (response.ban_status) {
        setBanStatus(response.ban_status)
      }

      if (response.nickname !== null) {
        setNickName(response.nickname)
        if (response.recovery_code_is_null == 1) {
          setShowRecoveryCodeModal(true)
        }
        if (response.feedback_is_null == 1) {
          setShowFeedback(true)
        }
        if (response.totalUsersOnline && response.totalUsersOnline.length > 0) {
          console.log("Total users online: ", response.totalUsersOnline)
          setTotalUsersIdOnline(response.totalUsersOnline); 
        }
      } else {
        //è un utente non registrato - imposto latitude e longitude before db
        if (lat && lon) {
          localStorage.setItem("latitude", lat.toString()); // Verranno recuperati nel momento della registrazione
          localStorage.setItem("longitude", lon.toString()); 
        }
      }

      if (response.userId !== null) {
        setUserId(response.userId)
      }

      if ('unread_private_messages_count' in response) {
        setUnreadPrivateMessagesCount(response.unread_private_messages_count)
      }

      if (response.nearbyChats && Object.keys(response.nearbyChats).length !== 0) {
        setSelectedFilter("Nearby")
        setNearbyChats(response.nearbyChats)
      } else if(response.popularChats && response.popularChats.length > 0) {
        setSelectedFilter("Popular")
        setPopularChats(response.popularChats)
      }

      if (response.ban_status > 0 && response.ban_read == false) {
        setBanMessage(response.ban_message)
        setBanRead(response.ban_read)
        setBanStatus(response.ban_status)
        setIpAddress(response.ip_address)
      }

      socket.off('new_private_messages');

      socket.on('new_private_messages', ({ unread_private_messages_count }) => {
        if (unread_private_messages_count && unread_private_messages_count > 0) {
          setUnreadPrivateMessagesCount(unread_private_messages_count);
        }
      });

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

      //console.log("sto per fare la richiesta getUserDetailsForFiltering: ", lat, lon, error, selectedFilter)

      const response = await fetchWithPrefix(total_url);

      //console.log("recupero...", response)


      if (response.nearbyChats && Object.keys(response.nearbyChats).length !== 0) {
        setNearbyChats(response.nearbyChats)
        setPopularChats([])
        setMyChats([])
      } else if(response.popularChats && response.popularChats.length > 0) {
        setPopularChats(response.popularChats)
        setNearbyChats({})
        setMyChats([])
      } else if (response.userChats && response.userChats.length > 0) {
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

    //console.log("getUserDetailsForFiltering", prevFilter.current, selectedFilter)

    getUserDetailsForFiltering();
    prevFilter.current = selectedFilter;
  }, [selectedFilter]);


  useEffect(() => {
    setAnimate(true);

    const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
    setWelcomeStr(welcomeMessages[randomIndex]);

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !(menuRef.current as any).contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);

    
    
  }, []);


  useEffect(() => {

    if (!loading) {
      setTimeout(() => {
        if (headerRef.current) {
          setHeaderHeight(headerRef.current.offsetHeight);
        }
      }, 300);
    }

  }, [loading])

  useEffect(() => {

    if (unreadPrivateMessagesCount > 0) {
      document.title = "("+unreadPrivateMessagesCount+") Broken Chat – Chat with everyone, everywhere";
    } else {
      document.title = "Broken Chat – Chat with everyone, everywhere";
    }

  }, [unreadPrivateMessagesCount])

  useEffect(() => {

    if (!userId) {
      return;
    }

    if (socket.connected) {
      //console.log("Socket gia' connesso!")
      socket.emit('join-home', userId);
    } else {
      //console.log("Socket ancora da connettere!")
      socket.connect();
      socket.on('connect', () => {
        //console.log("Socket connesso, ora emetto join-room");
        socket.emit('join-home', userId);
      });
    }

  }, [userId]);


  if (banStatus == 2) {
  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <strong className="font-bold">Access denied! </strong>
      <span className="block sm:inline">You have been permanently banned.</span>
    </div>
  );
}

  return (
    <div className="relative flex flex-col max-w-3xl mx-auto w-full">
  {/* HEADER: Logo + GlobalChat + Menu */}
  <div className="flex flex-col md:flex-row items-center md:items-start justify-between w-full md:space-x-4">
    
    {/* Logo a sinistra */}
    <div className="flex justify-center  md:self-center  md:justify-start">
      <LogoBlock />
    </div>

    {/* Global Chat al centro su desktop */}
    <div className="hidden md:flex flex-1 pr-8 pt-3">
      <GlobalChat />
    </div>

    {/* MenuButton a destra */}
    <div className="flex justify-center md:justify-end">
      <MenuButton
        menuRef={menuRef}
        showRecoveryCodeModal={showRecoveryCodeModal}
        setShowRecoveryCodeModal={setShowRecoveryCodeModal}
        showFeedback={showFeedback}
        setShowFeedback={setShowFeedback}
        setShowToastMessage={setShowToastMessage}
        userId={userId}
        handleRemoveAccount={handleRemoveAccount}
      />
    </div>
  </div>

  {/* CHAT */}
  <div className="justify-center mt-4 md:mt-0 md:ml-4 block md:hidden">
    <GlobalChat />
  </div>

    {/* Contenuto principale */}
    {loading ? (
      <LoadingSpinner />
    ) : (
      <>
        <BanAlert
          nickname={nickname}
          banMessage={banMessage}
          banRead={banRead}
          banStatus={banStatus}
          ipAddress={ipAddress}
          onClose={() => setBanRead(true)}
        />
      
        <HeaderBrokenChat
          headerRef={headerRef}
          alreadyJoined={nickname}
          nickname={nickname}
          welcomeStr={welcomeStr}
          animate={animate}
          unreadPrivateMessagesCount={unreadPrivateMessagesCount}
          openNicknameModal={openNicknameModal}
          lat={lat}
          lon={lon}
          selectedFilter={selectedFilter}
          setSelectedFilter={setSelectedFilter}
        />

        <ChatList 
          myChats={myChats} 
          nearbyChats={nearbyChats} 
          popularChats={popularChats} 
          headerHeight={headerHeight} 
        />
      </>
    )}

    {/* modals */}

    {showNicknameModal && (
      <NicknameModal
        nicknameTmp={nicknameTmp}
        setTmpNickname={setTmpNickname}
        onClose={() => setShowNicknameModal(false)}
        onConfirm={handleChangeNickname}
      />
    )}

    {showToastMessage && (
      <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-md shadow-lg animate-fadeInOut">
        {showToastMessage}
      </div>
    )}

  </div>
  );
  }