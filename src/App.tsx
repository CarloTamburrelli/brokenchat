import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './style/App.css';
import CreateChatForm from './components/CreateChatForm';
import ChatPage from './components/ChatPage'; 
import PrivateChatPage from './components/PrivateChatPage'; 
import Home from './components/Home/Home';
import PrivateMessages from './components/PrivateMessages';
import RecoveryProfile from './components/RecoveryProfile';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfUse from './components/TermsOfUse';


function App() {

  return (
    <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create-chat" element={<CreateChatForm />} />
            <Route path="/chat/:chatId" element={<ChatPage />} />
            <Route path="/private-messages" element={<PrivateMessages />} />
            <Route path="/private-messages/new/:userId" element={<PrivateChatPage />} />
            <Route path="/private-messages/:privateMessageId" element={<PrivateChatPage />} />
            <Route path="/recovery-profile" element={<RecoveryProfile />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-use" element={<TermsOfUse />} />
          </Routes>
    </Router>
  );
}

export default App;
