import React from "react";
import { MessageData } from "../../types";
import { generateColorFromId } from '../../utils/generateColorFromId';
import microphoneIcon from "../../assets/audio.png";
import defaultAvatarIcon from "../../assets/default_avatar.png";

interface GlobalChatProps {
  globalMessages: MessageData[],
  totalUsersGlobalChat: number,
  globalChatName: string
}

const GlobalChat: React.FC<GlobalChatProps> = ({ globalMessages, totalUsersGlobalChat, globalChatName }) => {


  const renderMessage = (msg: MessageData, index: number) => {

  
    const convertLinksToAnchors = (text: string, is_my_message: boolean) => {
      const urlRegex = /(https?:\/\/[^\s]+)/g; // Regex per trovare i link
      return text.split(urlRegex).map((part, index) => {
        if (urlRegex.test(part)) {
          return (
            <a key={index} href={part} target="_blank" rel="noopener noreferrer" className={`${is_my_message ? 'text-white' : 'text-blue-500'} underline`} >
              {part}
            </a>
          );
        }
        return part; // Restituisce il testo normale
      });
    };



    if (msg.alert_message) {
      return (
        <div
          key={msg.id}
          className={`p-2 font-bold no-select ${msg.delete_chat ? 'text-red-600' : ''}`}
        >
          <span>{msg.message}</span>
        </div>
      );
    } else {

      const isSameUserAsPrevious = index > 0 && globalMessages[index - 1].user_id === msg.user_id;
      const isSameUserAsNext = index < globalMessages.length - 1 && globalMessages[index + 1].user_id === msg.user_id;
      const userColor = generateColorFromId(msg.user_id!) // format: #fffff

      return (
        <div
          key={msg.id}
          className="select-none w-full relative flex justify-start items-start pt-1"
        >
          <div className="w-8 h-8 flex-shrink-0">
            {!isSameUserAsPrevious && (
              <img
                src={msg.avatar_url || defaultAvatarIcon}
                alt={`${msg.nickname}'s avatar`}
                className="w-6 h-6 rounded-full object-cover border border-gray-400"
              />
            )}
          </div>
        <div 
          key={msg.id} 
          className="flex flex-col max-w-[calc(100%-3rem)] bg-transparent"
        >
      
      
          <div className={`flex flex-col items-start`}>


          {!isSameUserAsPrevious && (
          <div className={`z-10 text-sm text-left`}>
            <strong
            className={`cursor-pointer font-semibold font-mono z-10 no-select text-xs`}
            style={{ pointerEvents: "auto", color: userColor }}
          >
            {msg.nickname}
          </strong>
          </div>)}
            
          {msg.quoted_msg && (
            <div className={`
              mb-2 p-2 rounded-md bg-gray-700 border-l-4 border-blue-400 text-sm text-gray-300 
              max-w-full mr-auto text-left`}>
              <strong className="text-blue-300">{msg.quoted_msg.nickname}</strong>: 
              

              {msg.quoted_msg.msg_type === 1 && (
                    <p className="text-white">
                      {msg.quoted_msg.message!.length > 150
                        ? `${msg.quoted_msg.message!.slice(0, 150)}...`
                        : msg.quoted_msg.message!}
                    </p>
                  )}

              {msg.quoted_msg.msg_type === 2 && (
                <img
                  src={microphoneIcon}
                  alt="audio"
                  className="w-8 h-8 object-contain"
                />
              )}

              {msg.quoted_msg.msg_type === 3 && (
                <img
                  src={msg.quoted_msg.message!}
                  alt="quoted image"
                  className="w-24 h-24 object-cover rounded"
                />
              )}


            </div>
          )}

          <div 
            className={`p-1 rounded-2xl text-white shadow-md inline-block bg-gray-700 rounded-r-2xl rounded-l-md text-left text-sm 
              ${isSameUserAsPrevious ? "mt-0" : ""}
              ${isSameUserAsNext ? "rounded-b-md" : "rounded-b-2xl"}
            `}
          >

              {msg.msg_type === 1 && (
                 <span className="break-words whitespace-pre-wrap text-sm">
                    {convertLinksToAnchors(msg.message!, false)}
                  </span>
              )}

              {msg.msg_type === 2 && (
                <span className="ml-1 text-sm">
                  <audio controls style={{ display: 'inline' }}>
                    <source src={`data:audio/mp3;base64,${msg.message}`} type="audio/mp3" />
                    Il tuo browser non supporta l'elemento audio.
                  </audio>
                </span>
              )}

              {msg.msg_type === 3 && (
                <div className="mt-2">
                  <img
                    src={`${msg.message}`}
                    alt="sent"
                    className="relative z-15 max-w-xs max-h-60 rounded cursor-pointer hover:opacity-90 transition"
                  />
                </div>
              )}
              {msg.msg_type === 4 && (
                <div className="relative w-12 h-12 mt-2">
                  <img 
                    src={msg.message!.split("####")[1]} 
                    alt="Video" 
                    className="w-12 h-12 rounded"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      );
      
      
    }
  };
  

  return (
    <div onClick={() =>  window.open(`/chat/36`, "_blank")} onTouchStart={(e) => window.open(`/chat/36`, "_blank")} className="w-full h-44 bg-gray-100 border border-gray-400 rounded-lg shadow-md cursor-pointer hover:border-blue-500">
      {/* Header */}
      <div className="flex justify-between items-center px-2 py-1 border-b border-gray-300 text-sm">
        <span className="font-bold font-mono">{globalChatName}</span>
        {totalUsersGlobalChat > 0 && (<span className="text-gray-600">{totalUsersGlobalChat} users connected</span>)}
      </div>

      {/* Messaggi */}
      <div className="pl-1 flex flex-col justify-end overflow-hidden" style={{ height: 'calc(100% - 2rem)'}}>
        {globalMessages.map((msg, index) => (
          renderMessage(msg, index)
        ))}
      </div>
    </div>
  );
};

export default GlobalChat;
