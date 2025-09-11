import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from '../assets/logo.png';
import { fetchWithPrefix } from "../utils/api";
import { isValidNickname } from "../utils/validations";
import { useLocation } from "../utils/LocationContext";
import { getLocationName } from "../utils/location";


// Tipi per i dati del form
interface ChatData {
  chatName: string;
  yourNickname: string;
  //isPrivate: boolean;
  token?: string;
  description: string;
  latitude: number;
  longitude: number;
}

function CreateChatForm() {
  const [isRegistred, setIsRegistred] = useState<boolean>(false);
  const [chatName, setChatName] = useState<string>("");
  const [yourNickname, setyourNickname] = useState<string>("");
  const [isAValidUsername, setIsAValidUsername] = useState<boolean>(false);

  const [locationName, setLocationName] = useState<string | null>(null);

  const { lat, lon, error: error_location } = useLocation(); // Recupera latitudine e longitudine
  //const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const getUserDetails = async () => {
    const token = localStorage.getItem('authToken');
  
    if (token) {
      try {
        const response = await fetchWithPrefix(`/am-i-registred?token=${token}`);
        setyourNickname(response.nickname)
        setIsRegistred(true)
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


  useEffect(() => {

    if (isValidNickname(yourNickname)) {
      setIsAValidUsername(true);
    } else {
      setIsAValidUsername(false);
    }

  }, [yourNickname])


  const validateForm = () => {
    if (chatName.trim() === '') {
      setError('Chat name is required');
      return false;
    } else if (!isValidNickname(yourNickname)) {
      setError('');
      return false;
    } else if (description.trim() === '') {
      setError(' Add a short description to let others know what this chat is about.');
      return false;
    } else if (chatName.length < 5) {
      setError('Chat name must contain at least 5 characters');
      return false;
    } else if (description.length < 10) {
      setError('Chat description must contain at least 10 characters');
      return false;
    }
    setError('');
    return true;
  };

  useEffect(() => {

    if (lat && lon) {
      getLocationName(lat, lon)
        .then(name => {
          if (name) {
            setLocationName(name);
          } else if (lat && lon) {
            setLocationName(`lat: ${lat.toFixed(5)}, lon: ${lon.toFixed(5)}`);
          }
        })
        .catch(err => {
          console.error("Errore durante il recupero della località:", err);
          if (lat && lon) {
            setLocationName(`lat: ${lat.toFixed(5)}, lon: ${lon.toFixed(5)}`);
          }
        });
    }
  }, [lat, lon]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {

      let requestBody: ChatData = {
        chatName,
        yourNickname,
        //isPrivate,
        description,
        latitude: lat!, // Aggiungi la latitudine
        longitude: lon!, // Aggiungi la longitudine
      };

      const token = localStorage.getItem('authToken');

      if (token) {
        requestBody = { ...requestBody, token };
      }

      const response_json = await fetchWithPrefix("/create-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      localStorage.setItem('authToken', response_json.token);

      // Gestisci la risposta del server (messaggio di successo e id della chat)
      setSuccessMessage(response_json.message);
      console.log("Chat ID:", response_json.chatId);
      navigate("/chat/" + response_json.chatId + "?enablePush=true");

      // Resetta il form (opzionale)
      setChatName("");
      //setIsPrivate(false);
    } catch (error: any) {
      // Gestisci errori nel frontend
      setError(error.message);
      console.error("Errore nella chiamata API:", error);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      <Link to="/" className="flex justify-center items-center">
        <img src={Logo} className="w-32 sm:w-40 md:w-44 lg:w-48 xl:w-[170px] h-auto"  />
      </Link>
      <form onSubmit={handleSubmit} className="mt-5 w-full p-2">
        <div className="flex flex-col items-center gap-4 justify-center px-3 font-mono">
        {isRegistred ? <span>Current Nickname: <span className="font-bold">{yourNickname}</span></span> : <input
            type="text"
            placeholder="Your Nickname"
            value={yourNickname}
            maxLength={17}
            onChange={(e) => setyourNickname(e.target.value)}
            className="p-2 border rounded w-full md:w-[400px]"
          />}
          {!isRegistred && ((isAValidUsername) ? (<span className="text-green-500 font-mono">The Nickname is valid 😎</span>) : (yourNickname && yourNickname.length > 0) && (<span className="text-red-500 font-mono">Nickname not valid 😞<br />Minimum <b>3</b> characters and do not use special symbols, only numbers and _ is allowed</span>))}
          <input
            maxLength={60}
            type="text"
            placeholder="Chat Name"
            value={chatName}
            onChange={(e) => setChatName(e.target.value)}
            className="p-2 border rounded w-full md:w-[400px]"
          />

          <textarea
            maxLength={255}
            placeholder="Chat Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="p-2 border rounded-au w-full md:w-[400px] h-32"
          />

          <div className="md:w-[400px] text-sm text-gray-500 text-center mt-2 font-mono">
            This chat will be visible starting from: <br/> <strong>
            {(locationName != null) ? (`${locationName} 📍`) : 
            
            (error_location == null) ? (<div className="flex justify-center items-center h-full w-full">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-500" />
          </div>) : ("Geolocation permissions not accepted")}
            </strong>
          </div>

          <br /><br />



          <span className="md:w-[400px] text-gray-500 font-mono text-sm text-center mb-4">
            By creating a chat, you confirm that you will respect others, avoid offensive language, and help keep Broken Chat a friendly and safe place for everyone ✨<br />
            By proceeding, you also agree to our{' '}
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-700"
            >
              Privacy & Cookie Policy
            </a> and <a
              href="/terms-of-use"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-700"
            >
              Terms of use
            </a>.
          </span>


        </div>
        

        {error && <p className="text-red-500 my-4">{error}</p>}
        <div className="w-full flex justify-center mb-5">
          <button
            type="submit"
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-indigo-500 hover:to-blue-500 transition-all duration-300 text-white font-semibold py-2 px-6 rounded-xl shadow-lg hover:shadow-xl active:scale-95 w-full md:w-[400px]"
          >
            🚀 Confirm
          </button>
        </div>
      </form>

      {successMessage && <p className="text-green-500 mt-2">{successMessage}</p>}
    </div>
  );
}

export default CreateChatForm;