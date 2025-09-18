import React from "react";
import { Link } from 'react-router-dom';
import users from '../assets/users.png';
import { formatDate } from "../utils/formatDate";
import add_chat from '../assets/add_chat.png';
import { Chatroom, GroupedChats } from "../types";

interface ChatListProps {
  nearbyChats?: GroupedChats;  // Lista delle chat limitrofe (opzionale)
  popularChats?: Chatroom[]; // Lista delle chat popolari (opzionale)
  myChats?: Chatroom[]; // Lista delle chat popolari (opzionale)
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
      <div className="w-full shadow-md">
        <div className="w-full">
          {Object.entries(nearbyChats).map(([groupId, chatList]) => (
            <div key={groupId} className="w-full flex relative">
              <div className="absolute top-0 left-0 w-full h-px bg-gray-400 pointer-events-none" />
              {/* Div sinistro con la lista delle chat */}
              <div className="flex-1 flex flex-col space-y-4 ">
                  {chatList.map((chat: any) => (
                      <Link to={`/chat/${chat.id}`}>
                      <div key={chat.id} className="py-3 px-3">
                        {/* Contenitore del nome e popolarità */}
                        <div className="flex justify-between items-start w-full">
                          <div className={`text-lg font-semibold text-left break-words max-w-[80%] ${chat.role_type ? "visited" : ""}`}>
                            {chat.name}
                          </div>
                          {(chat.popularity > 0) && (<div className="flex items-center text-sm text-gray-600 flex-shrink-0 pl-2">
                            <img src={users} alt="Users" className="w-4 h-4 mr-1" />
                            {chat.popularity}
                          </div>)}
                        </div>
                    
                        {/* Descrizione sotto */}
                        <div className="mt-1 text-sm text-gray-700 text-left break-words">
                          {chat.description}
                        </div>
                      </div>
                    </Link>                    
                  ))}
              </div>
              {/* Div destro con la distanza */}
              <div className="w-1/4 ml-2 pt-3 sticky h-12" style={{ top: `${headerHeight}px` }}>
                <h2 className="text-lg font-bold">
                  {groupId} km
                </h2>
              </div>
            </div>
          ))}
          <Link
            to="/create-chat"
            className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-white hover:bg-blue-500 text-white text-4xl shadow-lg z-50"
            aria-label="Create new chat"
          >
            <img src={add_chat} alt="Add chat" className="w-8 h-8" />
          </Link>
        </div>
      </div>
    );
  } else if (popularChats && popularChats.length > 0) {
    return (
      <div className="w-full shadow-md">
        <div className="w-full">
          {popularChats.map((chat) => (
            <div key={chat.id} className="w-full flex relative">
              <div className="absolute top-0 left-0 w-full h-px bg-gray-400 pointer-events-none" />
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
          <Link
            to="/create-chat"
            className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-white hover:bg-blue-500 text-white text-4xl shadow-lg z-50"
            aria-label="Create new chat"
          >
            <img src={add_chat} alt="Add chat" className="w-8 h-8" />
          </Link>
        </div>
      </div>
    );
  } else if (myChats && myChats.length > 0) {
    return (
      <div className="w-full shadow-md">
        <div className="w-full">
          {myChats.map((chat) => (
            <div key={chat.id} className="w-full flex relative">
              <div className="absolute top-0 left-0 w-full h-px bg-gray-400 pointer-events-none" />
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
          <Link
            to="/create-chat"
            className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-white hover:bg-blue-500 text-white text-4xl shadow-lg z-50"
            aria-label="Create new chat"
          >
            <img src={add_chat} alt="Add chat" className="w-8 h-8" />
          </Link>
        </div>
      </div>
    );
  } else {
    console.log("NO")
  }
  
};

export default ChatList;
