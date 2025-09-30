import React, {useEffect, useState} from "react";
import { Link } from "react-router-dom";
import LocationRequestButton from "../LocationRequestButton";
import my_messages from "../../assets/my_messages.png";
import key from "../../assets/key.png";
import defaultAvatarIcon from "../../assets/default_avatar.png";
import FilterMenu from "../FilterMenu";

interface HeaderBrokenChatProps {
  headerRef: React.RefObject<HTMLDivElement | null>;
  alreadyJoined: string | null;
  nickname: string | null;
  welcomeStr: string;
  unreadPrivateMessagesCount: number;
  openNicknameModal: () => void;
  openAvatarModal: () => void;
  lat?: number | null;
  lon?: number | null;
  selectedFilter: string | null;
  setSelectedFilter: (filter: string) => void;
  currentAvatarUrl: string | null;
}

const HeaderBrokenChat: React.FC<HeaderBrokenChatProps> = ({
  headerRef,
  alreadyJoined,
  nickname,
  welcomeStr,
  unreadPrivateMessagesCount,
  openNicknameModal,
  openAvatarModal,
  lat,
  lon,
  selectedFilter,
  setSelectedFilter,
  currentAvatarUrl,
}) => {

  const [animate, setAnimate] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimate(false); // rimuove la classe e il cursore
    }, 8000); // durata totale typing + deleting
    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={headerRef} style={{backgroundColor: '#f9f9f9'}} className="sticky top-0 z-10 shadow-md w-full">
    <div className="w-full my-2">
      <div className="flex justify-center items-center w-full pl-2 pr-2">

        {/* Icona Messaggi Privati o Recovery Code */}
        {alreadyJoined && alreadyJoined !== "" ? (
          <div className="md:flex flex-1 justify-start">
            <Link to="/private-messages" className="pointer-events-auto">
              <div className="relative w-8 h-8">
                <img src={my_messages} alt="Messaggi Privati" className="w-8 h-8" />
                {unreadPrivateMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-3 w-5 h-5 bg-blue-500 text-white text-[11px] rounded-full flex items-center justify-center">
                    {unreadPrivateMessagesCount}
                  </span>
                )}
              </div>
            </Link>
          </div>
        ) : (
          <div className="md:flex flex-1 justify-start">
            <Link to="/recovery-profile" className="flex-1 md:flex-none md:w-auto flex cursor-pointer">
              <img src={key} alt="Recovery Code" className="w-6 h-6" />
              <span className="ml-2 text-black hidden md:flex flex-1 font-mono">
                Profile recovery
              </span>
            </Link>
          </div>
        )}

        {/* Messaggio di benvenuto / nickname */}
        <div className="flex justify-center md:flex-1">
          {nickname ? (
            <div className="flex items-center justify-center gap-2">
              {animate && (<h1 className="text-1xl font-bold text-gray-500 font-mono typing-effect">
                Welcome back!
              </h1>)}
              <span
                onClick={openNicknameModal}
                className="underline cursor-pointer text-1xl text-gray-500 font-mono"
              >
                {nickname} 
              </span>
              <img
                onClick={openAvatarModal}
                src={currentAvatarUrl || defaultAvatarIcon}
                alt="Avatar"
                className="w-8 h-8 rounded-full cursor-pointer object-cover"
              />
            </div>
          ) : (
            <h1 className={`text-1xl font-bold text-gray-500 font-mono block break-words whitespace-normal typing-effect-guest`}>
              {welcomeStr}
            </h1>
          )}
        </div>

        {/* Icona Filtro */}
        <div className="md:flex flex-1 justify-end">
          <FilterMenu
            myFilterToShow={nickname != ""}
            nearFilterToShow={!!lat && !!lon}
            selectedFilter={selectedFilter}
            setSelectedFilter={setSelectedFilter}
          />
        </div>
      </div>

      {/* Pulsante richiesta posizione */}
      <div className="flex justify-center">
        <LocationRequestButton />
      </div>
    </div>
    </div>
  );
};

export default HeaderBrokenChat;
