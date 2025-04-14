import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from '../assets/logo.png';
import { fetchWithPrefix } from "../utils/api";
import { getPosition } from "../utils/geolocation";


// Tipi per i dati del form
interface ChatData {
  chatName: string;
  yourName: string;
  //isPrivate: boolean;
  token?: string;
  description: string;
  latitude: number;
  longitude: number;
}

function CreateChatForm() {
  const [isRegistred, setIsRegistred] = useState<boolean>(false);
  const [chatName, setChatName] = useState<string>("");
  const [yourName, setYourName] = useState<string>("");
  //const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const getUserDetails = async () => {
    const token = localStorage.getItem('authToken');
  
    if (token) {
      try {
        const response = await fetchWithPrefix(`/get-user?token=${token}`);
        setYourName(response.nickname)
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


  const validateForm = () => {
    if (chatName.trim() === '') {
      setError('Il nome della chat è obbligatorio');
      return false;
    } else if (yourName.trim() === '') {
      setError('Inserisci il tuo nome che utilizzerai nella chat!');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {

      const position = await getPosition();

      let requestBody: ChatData = {
        chatName,
        yourName,
        //isPrivate,
        description,
        latitude: position.latitude, // Aggiungi la latitudine
        longitude: position.longitude, // Aggiungi la longitudine
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
      navigate("/chat/"+response_json.chatId);

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
    <div className="flex flex-col h-screen max-w-3xl mx-auto bg-white">
      <Link to="/" className="flex justify-center items-center">
        <img src={Logo} />
      </Link>
      <form onSubmit={handleSubmit} className="mt-5 w-full p-2">
        <div className="flex flex-col items-center gap-4 justify-center">
        {isRegistred ? <span>Nickname attuale: <span className="font-bold">{yourName}</span></span> : <input
            type="text"
            placeholder="Your Name"
            value={yourName}
            onChange={(e) => setYourName(e.target.value)}
            className="p-2 border rounded w-full md:w-[400px]"
          />}
          
          <input
            maxLength={60}
            type="text"
            placeholder="Chat Name"
            value={chatName}
            onChange={(e) => setChatName(e.target.value)}
            className="p-2 border rounded w-full md:w-[400px]"
          />

          <textarea
            placeholder="Chat Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="p-2 border rounded-au w-full md:w-[400px] h-32"
          />
          {/*<label className="flex items-center gap-2">
            <span>Private:</span>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={() => setIsPrivate(!isPrivate)}
              className="accent-blue-500 w-5 h-5"
            />
          </label>*/}
        </div>

        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded mt-4"
        >
          Create Chat
        </button>
      </form>

      {error && <p className="text-red-500 mt-2">{error}</p>}
      {successMessage && <p className="text-green-500 mt-2">{successMessage}</p>}
    </div>
  );
}

export default CreateChatForm;