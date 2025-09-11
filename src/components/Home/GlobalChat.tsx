import React from "react";

const GlobalChat: React.FC = () => {
  return (
    <div className="w-full md:w-96 bg-gray-100 border border-gray-300 rounded-lg p-4 shadow-md">
      {/* Qui andranno i messaggi della chat globale */}
      <p className="text-gray-500 text-sm">Global chat preview</p>
    </div>
  );
};

export default GlobalChat;
