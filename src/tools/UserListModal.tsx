import React, { useState } from 'react';

  
interface UserListModalProps {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    users: string[];
    onUserClicked: (userId: number) => void;  // Definisci correttamente il tipo della funzione
  }
  
  

  const UserListModal: React.FC<UserListModalProps> = ({ isOpen, setIsOpen, users, onUserClicked }) => {
    if (!isOpen) return null;
  

  const handleClose = () => setIsOpen(false);

  const getUserId = (user: string) => {
    const parts = user.split('####');
    return parts.length > 1 ? parseInt(parts[1], 10) : 0;  // Restituisce l'ID dopo '####'
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20"
      onClick={handleClose} // Chiude la modal cliccando fuori
    >
      <div
        className="bg-white p-6 rounded-lg shadow-lg relative w-96"
        onClick={(e) => e.stopPropagation()} // Impedisce la chiusura cliccando dentro la modal
      >
        {/* Header con titolo e pulsante di chiusura */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Utenti Collegati</h2>
          <button
            className="text-gray-500 hover:text-black text-2xl font-semibold"
            onClick={handleClose}
          >
            ✕
          </button>
        </div>

        {/* Lista degli utenti con scrollbar se la lista è lunga */}
        <div className="max-h-60 overflow-y-auto">
          {users.length === 0 ? (
            <p className="text-center text-gray-500">Nessun utente online</p>
          ) : (
            <ul>
              {users.map((user, index) => (
                <li
                key={index}
                className="flex items-center justify-between p-2 hover:bg-gray-200 rounded cursor-pointer font-semibold text-blue-400"
                onClick={() => {
                  const userId = getUserId(user); // Ottieni l'ID dell'utente
                  onUserClicked(userId); // Passa l'ID alla funzione onUserClicked
                }}
              >
                <span>{user.split('####')[0]}</span> {/* Mostra solo la parte del nome */}
              </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer della modal (eventuale bottone o messaggio) */}
      </div>
    </div>
  );
};

export default UserListModal;
