import React from 'react';

interface BannedUsersModalProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onUserClicked: (userId: number) => void;
  bannedUsers: string[];
  onUnbanClicked: (username: string, user_id: number) => void;
}

const BannedUsersModal: React.FC<BannedUsersModalProps> = ({
  isOpen,
  setIsOpen,
  onUserClicked,
  bannedUsers,
  onUnbanClicked,
}) => {
  if (!isOpen) return null;

  const handleClose = () => setIsOpen(false);

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
          <h2 className="text-lg font-bold text-gray-800 font-mono">Banned users</h2>
          <button
            className="text-gray-500 hover:text-black text-2xl font-semibold"
            onClick={handleClose}
          >
            ✕
          </button>
        </div>

        {/* Lista utenti bannati */}
        <div className="max-h-60 overflow-y-auto">
          {bannedUsers.length === 0 ? (
            <p className="text-center text-gray-500">No banned users</p>
          ) : (
            <ul>
              {bannedUsers.map((user, index) => {
                const [username, userIdStr] = user.split('####');
                const userId = parseInt(userIdStr);

                return (
                  <li
                    key={index}
                    className="flex items-center justify-between p-2 rounded"
                  >
                    <span className="font-semibold text-gray-700 cursor-pointer" onClick={() => onUserClicked(userId) }>
                      {username}
                    </span>

                    {/* Bottone Unban */}
                    <button
                        onClick={() => onUnbanClicked(username, userId)}
                        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm"
                      >
                        Unban
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default BannedUsersModal;
