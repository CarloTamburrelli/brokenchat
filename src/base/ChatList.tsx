import React from "react";
import { Link } from 'react-router-dom';
import users from '../assets/users.png';
import { formatDate } from "../utils/formatDate";


interface Chat {
  id: string;
  name: string;
  popularity: number;
  description: string;
  role_type: number;
  last_access: string;

}

interface GroupedChats {
  [key: number]: Chat[];
}

interface ChatListProps {
  nearbyChats?: GroupedChats;  // Lista delle chat limitrofe (opzionale)
  popularChats?: Chat[]; // Lista delle chat popolari (opzionale)
  myChats?: Chat[]; // Lista delle chat popolari (opzionale)
  headerHeight: number;
}

const roleLabels: { [key: number]: string } = {
  1: "Admin",
  2: "Moderator",
  3: "User",
};

const ChatList: React.FC<ChatListProps> = ({ myChats, nearbyChats, popularChats, headerHeight }) => {

  
  if (nearbyChats && Object.keys(nearbyChats).length > 0) {
    return (
      <div className="w-full bg-[#1a1b1e] text-white px-4 py-6">
        <div className="w-full">
          {Object.entries(nearbyChats).map(([groupId, chatList]) => (
            <div key={groupId} className="w-full flex relative mb-4">
              {/* Separatore sottile fisso */}
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-gray-700 to-transparent pointer-events-none" />

              {/* Lista chat */}
              <div className="flex-1 flex flex-col space-y-4 pt-4">
                {chatList.map((chat: any) => (
                  <Link key={chat.id} to={`/chat/${chat.id}`} className="relative group">
                    <div className="bg-[#232428] border border-[#2e2f33] hover:border-blue-600 transition-all duration-200 rounded-lg px-4 py-3 shadow-sm hover:shadow-blue-500/10 hover:scale-[1.01] active:scale-[0.98] transform">
                      {/* Riga superiore */}
                      <div className="flex justify-between items-start">
                        <div className={`text-sm font-semibold break-words max-w-[80%] text-left ${chat.role_type ? "text-blue-400" : "text-white"}`}>
                          {chat.name}
                        </div>
                        {chat.popularity > 0 && (
                          <div className="flex items-center text-sm text-gray-400 flex-shrink-0 ml-2">
                            <img src={users} alt="Users" className="w-4 h-4 mr-1 opacity-80" />
                            {chat.popularity}
                          </div>
                        )}
                      </div>

                      {/* Descrizione */}
                      <div className="mt-1 text-sm text-gray-300 break-words text-left leading-snug">
                        {chat.description}
                      </div>

                      {/* Bordo laterale sfumato fisso */}
                      <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-blue-500/20 to-blue-700/10 rounded-r" />
                    </div>
                  </Link>
                ))}
              </div>

              {/* Distanza sticky migliorata e centrata */}
              <div
                className="w-1/4 ml-3 flex items-start justify-start pt-4 sticky h-full"
                style={{ top: `${headerHeight}px` }}
              >
                <div className="w-full flex justify-center items-center text-lg font-extrabold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text tracking-wide">
                  {groupId} km
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (popularChats && popularChats.length > 0) {
    return (
      <div className="w-full shadow-md">
        <div className="w-full">
          {popularChats.map((chat) => (
            <div key={chat.id} className="w-full flex relative">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent pointer-events-none" />
              
              {/* Contenitore della chat */}
              <div className="flex-1 flex flex-col space-y-4">
              <Link to={`/chat/${chat.id}`}>
                <div className="py-3 px-3">
                  {/* Intestazione: Nome e popolarità */}
                  <div className="flex justify-between items-start">
                    <div className={`text-lg font-semibold text-left break-words max-w-[80%] ${chat.role_type ? "visited" : ""}`}>
                      {chat.name}
                    </div>
                    {(chat.popularity > 0) && (<div className="flex items-center text-sm text-gray-600 flex-shrink-0 pl-2">
                      <img src={users} alt="Users" className="w-4 h-4 mr-1" />
                      {chat.popularity}
                    </div>)}
                  </div>
                  {/* Descrizione */}
                  <div className="mt-1 text-sm text-gray-700 text-left break-words">
                    {chat.description}
                  </div>
                </div>
              </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (myChats && myChats.length > 0) {
    return (
      <div className="w-full shadow-md">
        <div className="w-full">
          {myChats.map((chat) => (
            <div key={chat.id} className="w-full flex relative">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent pointer-events-none" />
              
              {/* Contenitore della chat */}
              <div className="flex-1 flex flex-col space-y-4">
                <Link to={`/chat/${chat.id}`}>
                  <div className="py-3 px-3">
                    {/* Intestazione: Nome e popolarità */}
                    <div className="flex justify-between items-start">
                      <div className="text-lg font-semibold text-left visited break-words max-w-[80%]">
                        {chat.name}
                      </div>
                      {(chat.popularity > 0) && (<div className="flex items-center text-sm text-gray-600 flex-shrink-0 pl-2">
                        <img src={users} alt="Users" className="w-4 h-4 mr-1" />
                        {chat.popularity}
                      </div>) }
                    </div>

                    {chat.role_type && chat.last_access && (
                      <div className="text-sm text-gray-800 font-medium mt-1 text-left">
                        Last login as <strong>{roleLabels[chat.role_type]}</strong> on <strong>{formatDate(chat.last_access)}</strong>
                      </div>
                    )}

                    {/* Descrizione */}
                    <div className="mt-1 text-sm text-gray-700 text-left break-words">
                      {chat.description}
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    console.log("NO")
  }
  
};

export default ChatList;
