import React from 'react';

interface BannedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BannedModal: React.FC<BannedModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl p-6 shadow-lg w-11/12 max-w-md text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-4">You have been banned</h2>
        <p className="text-gray-700 mb-6">
          You have been banned from this chat by the administrator.
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default BannedModal;
