import React from "react";
import { Link } from 'react-router-dom';
import users from '../assets/users.png';

interface Chat {
  id: string;
  name: string;
  popularity: number;
  description: string;
}

interface GroupedChats {
  [key: number]: Chat[];
}

const ChatList: React.FC<{ initialChats: GroupedChats }> = ({ initialChats }) => {
  return (
    <div className="w-full shadow-md">
      <div className="w-full max-h-[50vh] overflow-y-auto">
        {Object.entries(initialChats).map(([groupId, chatList]) => (
          <div key={groupId} className="w-full flex relative border-b-2 border-gray-400">
            {/* Div sinistro con la lista delle chat */}
            <div className="flex-1 flex flex-col space-y-4">
                {chatList.map((chat: any) => (
                    <Link to = {`/chat/${chat.id}`}>
                        <div key={chat.id} className="py-3 px-3 ">
                        {/* Contenitore del nome e popolarità */}
                        <div className="flex justify-between items-center">
                            <div className="text-lg font-semibold">{chat.name}</div>
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
};

export default ChatList;
