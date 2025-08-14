import React, { useState } from 'react';
import { fetchWithPrefix } from '../utils/api';
import keyIcon from "../assets/key.png"; 

interface RecoveryCodeSetterProps {
  onSetted: () => void; // Aggiungi la prop onSetted
}

const RecoveryCodeSetter: React.FC<RecoveryCodeSetterProps> = ({ onSetted }) => {
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');

  const handleSave = async () => {
    if (code.trim().length < 6) {
      alert('The recovery code must be at least 6 characters long.');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to save this code? \nYou won’t be able to retrieve it later.'
    );

    if (!confirmed) return;

    const token = localStorage.getItem('authToken');

    try {
      await fetchWithPrefix('/set-recovery-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recoveryCode: code, token }),
      });
      setShowModal(false);
      setCode('');
      onSetted()
    } catch (err) {
      console.error('Error saving recovery code:', err);
    }
  };

  return (
    <>
      <span
        className="cursor-pointer"
        onClick={() => setShowModal(true)}
      >
        <img src={keyIcon} alt="Recovery code" className="w-6 h-6 cursor-pointer my-2" />
      </span>

      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white p-6 rounded-lg shadow-lg relative w-96"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800 font-mono">
                Set recovery code
              </h2>
              <button
                className="text-gray-500 hover:text-black text-2xl font-semibold"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-700 font-mono mb-2 text-left">
              Enter a recovery code that will allow you to access this profile from other devices. <br />
            </p>

            {/* Input */}
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. MY-RECOVERY-CODE"
              className="border p-2 mt-2 w-full rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
            />

            {/* Save button */}
            <div className="flex mt-4 justify-center">
              <button
                onClick={handleSave}
                className="bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600 font-mono"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RecoveryCodeSetter;
