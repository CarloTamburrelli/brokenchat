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
}

const roleLabels: { [key: number]: string } = {
  1: "Admin",
  2: "Moderatore",
  3: "Utente",
};

const ChatList: React.FC<ChatListProps> = ({ myChats, nearbyChats, popularChats }) => {
  
  if (nearbyChats && Object.keys(nearbyChats).length > 0) {
    return (
      <div className="w-full shadow-md bg-">
        <div className="w-full max-h-[60vh] overflow-y-auto">
          {Object.entries(nearbyChats).map(([groupId, chatList]) => (
            <div key={groupId} className="w-full flex relative border-b-2 border-gray-400">
              {/* Div sinistro con la lista delle chat */}
              <div className="flex-1 flex flex-col space-y-4">
                  {chatList.map((chat: any) => (
                      <Link to = {`/chat/${chat.id}`}>
                          <div key={chat.id} className="py-3 px-3 ">
                          {/* Contenitore del nome e popolarità */}
                          <div className="flex justify-between items-center w-full">
                              <div className={`text-lg font-semibold text-left ${chat.role_type ? "visited" : ""}`}>{chat.name}</div>
                              <div className="flex items-center text-sm text-gray-600">
                                <img src={users} alt="Users" className="w-4 h-4 mr-1" /> 
                                {chat.popularity}
                              </div>
                          </div>
                          {/* Descrizione sotto */}
                          <div className="mt-1 text-sm text-gray-700 text-left">
                              {chat.description}
                          </div>
                          </div>
                      </Link>
                  ))}
              </div>
              {/* Div destro con la distanza */}
              <div className="w-1/4 ml-2 relative flex items-start justify-center">
                <h2 className="text-lg font-bold sticky top-2">
                  {groupId} km
                </h2>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (popularChats && popularChats.length > 0) {
    return (
      <div className="w-full shadow-md">
        <div className="w-full max-h-[50vh] overflow-y-auto">
          {popularChats.map((chat) => (
            <div key={chat.id} className="w-full flex relative border-b-2 border-gray-300">
              {/* Contenitore della chat */}
              <div className="flex-1 flex flex-col space-y-4">
                <Link to={`/chat/${chat.id}`}>
                  <div className="py-3 px-3">
                    {/* Intestazione: Nome e popolarità */}
                    <div className="flex justify-between items-center">
                      <div className={`text-lg font-semibold text-left ${chat.role_type ? "visited" : ""}`}>{chat.name}</div>
                      <div className="flex items-center text-sm text-gray-600">
                        <img src={users} alt="Users" className="w-4 h-4 mr-1" />
                        {chat.popularity}
                      </div>
                    </div>
                    {/* Descrizione */}
                    <div className="mt-1 text-sm text-gray-700 text-left">{chat.description}</div>
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
        <div className="w-full max-h-[50vh] overflow-y-auto">
          {myChats.map((chat) => (
            <div key={chat.id} className="w-full flex relative border-b-2 border-gray-300">
              {/* Contenitore della chat */}
              <div className="flex-1 flex flex-col space-y-4">
                <Link to={`/chat/${chat.id}`}>
                  <div className="py-3 px-3">
                    {/* Intestazione: Nome e popolarità */}
                    <div className="flex justify-between items-center">
                      <div className="text-lg font-semibold text-left visited">{chat.name}</div>
                      <div className="flex items-center text-sm text-gray-600">
                        <img src={users} alt="Users" className="w-4 h-4 mr-1" />
                        {chat.popularity}
                      </div>
                    </div>
                    {chat.role_type && chat.last_access && (
                      <div className="text-sm text-gray-800 font-medium mt-1 text-left">
                        Ultimo accesso come <strong>{roleLabels[chat.role_type]}</strong> il <strong>{formatDate(chat.last_access)}</strong>
                      </div>
                    )}
                    {/* Descrizione */}
                    <div className="mt-1 text-sm text-gray-700 text-left">{chat.description}</div>
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
