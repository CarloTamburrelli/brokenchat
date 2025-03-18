import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './style/App.css';
import CreateChatForm from './tools/CreateChatForm';
import ChatPage from './tools/ChatPage'; 
import Home from './base/Home';


function App() {

  /*useEffect(() => {
    if (!socket.connected) {
      console.log("🔄 Tentativo di connessione al socket...");
      socket.connect();
      socket.on('connect', () => {
        console.log("connesso!!");
      });
    }

    return () => {
      console.log("❌ Disconnessione del socket...");
      socket.disconnect();
    };
  }, []);*/

  return (
    <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create-chat" element={<CreateChatForm />} />
            <Route path="/chat/:chatId" element={<ChatPage />} />
          </Routes>
    </Router>
  );
}

export default App;
