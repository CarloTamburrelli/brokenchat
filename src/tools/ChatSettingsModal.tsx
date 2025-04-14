import React, { useState } from 'react';
import delete_chat from '../assets/delete.png';

interface ChatSettingsModalProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  initialTitle: string;
  initialDescription: string;
  onSave: (title: string, description: string) => void;
  onDeleteChat: () => void;
}

const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({
  isOpen,
  setIsOpen,
  initialTitle,
  initialDescription,
  onSave,
  onDeleteChat,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);

  const handleClose = () => setIsOpen(false);

  const handleSave = () => {
    onSave(title, description);
    setIsOpen(false);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20"
      onClick={handleClose}
    >
      <div
        className="bg-white p-6 rounded-lg shadow-lg relative w-96"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Edit Chat</h2>
          <button
            className="text-gray-500 hover:text-black text-2xl font-semibold"
            onClick={handleClose}
          >
            ✕
          </button>
        </div>

        {/* Form inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left">Titolo</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-left">Descrizione</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Azioni */}
        <div className="mt-6 flex justify-between items-center">
        <button
            onClick={onDeleteChat}
            className="flex items-center gap-2 text-red-600 hover:underline text-sm"
          >
            <img src={delete_chat} alt="delete icon" className="w-4 h-4" />
            Delete chat
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSettingsModal;
