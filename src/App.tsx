import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './style/App.css';
import CreateChatForm from './tools/CreateChatForm';
import ChatPage from './tools/ChatPage'; 
import PrivateChatPage from './tools/PrivateChatPage'; 
import Home from './base/Home';
import PrivateMessages from './tools/PrivateMessages';


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
            <Route path="/private-messages" element={<PrivateMessages />} />
            <Route path="/private-messages/new/:userId" element={<PrivateChatPage />} />
            <Route path="/private-messages/:privateMessageId" element={<PrivateChatPage />} />
          </Routes>
    </Router>
  );
}

export default App;
