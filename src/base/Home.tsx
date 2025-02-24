import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Logo from '../assets/logo.png';
import { fetchWithPrefix } from '../utils/api';

interface Chat {
  chatId: number;
  chatName: string;
  role: number;
  isPrivate: boolean;
  chatLink: string;
}


export default function Home() {

  const [userData, setUserData] = useState<Chat[]>([]);
  const [userName, setNickName] = useState<string>("");

  const getUserDetails = async () => {
    const token = localStorage.getItem('authToken');
  
    if (token) {
      try {
        const response = await fetchWithPrefix(`/get-user?token=${token}`);
        console.log('Utente trovato:', response.data);
        setNickName(response.nickname)
        setUserData(response.userData);
        // Qui puoi usare i dati dell'utente nel tuo componente React
      } catch (error: any) {
        console.error('Errore nella richiesta:', error.response?.data?.message || error.message);
      }
    } else {
      console.log('Token non trovato');
    }
  };

  useEffect(() => {
    getUserDetails();
  }, []);

  const renderChatCard = (chat: Chat) => (
    <div 
      key={chat.chatId} 
      className={`p-4 rounded-lg shadow-md w-44  cursor-pointer transition hover:scale-105`}
    >
      <h3 className="font-bold truncate">{chat.chatName}</h3>
      <p className="text-sm opacity-80">{chat.isPrivate ? "Privata" : "Pubblica"}</p>
    </div>
  );


  return (
    <div className="flex flex-col justify-center items-center mt-5">
      <img src={Logo} />
      {userName ? (
        <h1 className="text-2xl font-bold my-4 text-gray-500">Hey bentornato, {userName}!</h1>
      ) : null}
  
      {/* Visualizza le chat dell'utente, se ci sono */}
      {userData && userData.length > 0 ? (
        <div className="my-4">
          <h2 className="text-2xl font-semibold">Le tue chat:</h2>
          <ul>
            {userData.map((chat) => (
              <li key={chat.chatId} className="text-xl">
                <a href={chat.chatLink} className="text-blue-500 hover:underline">
                  {chat.chatName} - 
                  <span 
    className={chat.role === 1 ? "text-red-500 font-bold ml-2 mr-2" : chat.role === 2 ? "text-green-500 font-bold ml-2 mr-2" : ""}
  >
    {chat.role === 1 ? "Admin" : chat.role === 2 ? "Moderatore" : ""}
  </span>   
                   {chat.isPrivate ? " (Privata)" : " (Pubblica)"}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}


      <section>
        <h2 className="text-lg font-bold  mb-2">📌 Le tue chat</h2>
        <div className="grid grid-cols-2 gap-4">
          {userData.map(chat => renderChatCard(chat,))}
        </div>
      </section>

      {/* Sezione Chat vicine */}
      <section>
        <h2 className="text-lg font-bold  mb-2">🏡 Chat vicine</h2>
        <div className="grid grid-cols-2 gap-4">
        {userData.map(chat => renderChatCard(chat,))}
        </div>
      </section>

      {/* Sezione Chat generali */}
      <section>
        <h2 className="text-lg font-bold  mb-2">🌍 Chat generali</h2>
        <div className="grid grid-cols-2 gap-4">
        {userData.map(chat => renderChatCard(chat,))}
        </div>
      </section>

  
      <h1 className="text-4xl font-bold my-4">Start now your broken chat!</h1>
      
      <Link to="/create-chat">
        <button className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-extrabold rounded-lg text-2xl px-5 py-3.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">
          Create a chat
        </button>
      </Link>
    </div>
  );
  }