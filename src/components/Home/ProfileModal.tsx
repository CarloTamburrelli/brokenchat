import React from "react";
import { Link } from "react-router-dom";
import chat_now from "../../assets/chat_now.png";

interface ProfileModalProps {
  profile: {
    id: number;
    nickname: string;
    subscription?: string | null;
  };
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ profile, onClose }) => {
  if (!profile) return null;

  return (
    <div
      className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-30"
      onClick={onClose} // Chiude la modal cliccando all’esterno
    >
      <div
        className="bg-white p-5 rounded-lg shadow-lg w-96 relative text-left"
        onClick={(e) => e.stopPropagation()} // Impedisce la chiusura cliccando dentro
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">{profile.nickname}'s profile</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black text-2xl font-semibold"
          >
            ✕
          </button>
        </div>

        {/* Dettagli profilo */}
        <div className="text-sm text-gray-800 space-y-2">
          <div>
            <span className="font-semibold">Registered on:</span>{" "}
            {profile.subscription || "Data non disponibile"}
          </div>
        </div>

        {/* Pulsante private message */}
        <div className="mt-4 flex items-center justify-center space-x-4">
          <button className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center space-x-2">
            <Link to={`/private-messages/new/${profile.id}`} className="flex items-center space-x-2">
              <img src={chat_now} alt="Chat Icon" className="w-5 h-5" />
              <span>Private message</span>
            </Link>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
