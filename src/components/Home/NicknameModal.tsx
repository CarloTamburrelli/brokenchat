import React from "react";

interface NicknameModalProps {
  nicknameTmp: string;
  setTmpNickname: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const NicknameModal: React.FC<NicknameModalProps> = ({
  nicknameTmp,
  setTmpNickname,
  onClose,
  onConfirm,
}) => {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20"
      onClick={onClose} // Chiude la modal cliccando fuori
    >
      <div
        className="bg-white p-6 rounded-lg shadow-lg relative w-96"
        onClick={(e) => e.stopPropagation()} // Impedisce la chiusura cliccando dentro
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800 font-mono">
            Change your nickname
          </h2>
          <button
            className="text-gray-500 hover:text-black text-2xl font-semibold"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Input del nickname */}
        <input
          maxLength={17}
          type="text"
          placeholder="Nuovo nickname"
          value={nicknameTmp}
          onChange={(e) => setTmpNickname(e.target.value)}
          className="border p-2 mt-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Bottone di conferma */}
        <div className="flex mt-4 justify-center">
          <button
            onClick={onConfirm}
            className="bg-blue-500 text-white px-6 py-2 rounded-md font-mono hover:bg-blue-600"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default NicknameModal;
