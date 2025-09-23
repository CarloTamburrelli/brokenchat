import React from "react";
import warning from "../assets/warning.png"
import { fetchWithPrefix } from '../utils/api';

interface BanAlertProps {
  nickname: string;
  banMessage: string;
  banRead: boolean;
  banStatus: number;
  ipAddress: string;
  onClose: () => void;
}

const BanAlert: React.FC<BanAlertProps> = ({
  nickname,
  banMessage,
  banRead,
  banStatus,
  ipAddress,
  onClose,
}) => {
    console.log("banStatus", banStatus)
    console.log("banRead", banRead)
  // Se le condizioni non sono soddisfatte → non mostrare nulla
  if (!(banStatus === 1 && banRead === false)) {
    return null;
  }

  const markBanAsRead = async () => {
    const token = localStorage.getItem('authToken');
      if (!token) return;
    try {
      const total_url = `/ban-read?token=${token}`;
      await fetchWithPrefix(total_url, { method: "POST" });
      onClose();
    } catch (err) {
      console.error("Error updating ban_read:", err);
    }
  };
  

  return (
    <div className="relative w-full font-mono mt-2 mx-2 sm:mx-0 bg-yellow-100 border border-yellow-400 text-yellow-800 font-bold py-3 px-6 rounded-lg text-sm sm:text-base lg:text-md flex items-center justify-center">
      {/* Icona + Messaggio */}
      <div className="flex items-center">
        <img
          src={warning} // cambia col tuo percorso reale
          alt="Warning"
          className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 mr-3"
        />
        <div className="flex flex-col items-start text-left">
  <span>Dear {nickname} (your IP: {ipAddress}),</span>
  <span>we have noticed that YOUR behavior does not comply with our terms of use. Please take this warning seriously to avoid a permanent ban.</span>
  {banMessage && <span className="mt-2"><u>Warning reason: {banMessage}</u></span>}
</div>

      </div>

      {/* Bottone X */}
      <button
            onClick={markBanAsRead}
            className="absolute top-1 right-2 text-yellow-900 hover:text-yellow-700 text-2xl sm:text-3xl lg:text-4xl"
            aria-label="Close"
            >
            ✕
            </button>

    </div>
  );
};

export default BanAlert;
