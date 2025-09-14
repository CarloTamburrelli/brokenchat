// OnlineUsersModal.jsx
import React, { useEffect, useState } from 'react';
import { fetchWithPrefix } from '../utils/api';
import { UserData } from '../types';

interface OnlineUsersModalProps {
    onClose: () => void;
    userIds: number[];
    onUserClicked: (user: UserData) => void;
}
  
  
const OnlineUsersModal: React.FC<OnlineUsersModalProps> = ({userIds, onClose, onUserClicked }) => {

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsernames = async () => {
      try {
        const result_json = await fetchWithPrefix('/users/get-by-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds }),
        });
        setUsers(result_json.users);
      } catch (err) {
        console.error('Errore durante il fetch degli utenti online:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userIds.length > 0) {
      fetchUsernames();
    } else {
      setUsers([]);
      setLoading(false);
    }
  }, [userIds]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-lg shadow-lg relative w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800 font-mono">Online users</h2>
          <button
            className="text-gray-500 hover:text-black text-2xl font-semibold"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto">
          {loading ? (
            <p className="text-center text-gray-500">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-center text-gray-500">No user connected</p>
          ) : (
            <ul>
              {users.map((user, index) => {

                return (
                  <li
                    key={index}
                    className="flex items-center justify-between p-2 hover:bg-gray-200 rounded cursor-pointer font-semibold text-blue-400"
                    onClick={() => { onUserClicked(user); }}
                  >
                    <span className="font-mono">
                      {user.nickname}
                    </span>
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

export default OnlineUsersModal;
