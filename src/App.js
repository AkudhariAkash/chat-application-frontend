import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Register from './layout/Registration';
import Login from './layout/Login';
import ChatApp from './layout/chatApp';
import VerifyEmail from './components/verifyEmail'; // Rename to start with uppercase
import Settings from "./components/settings";
//import VideoCall from './components/videoCall';

// Define a Home or landing page
function Home() {
  return (
    <div className="bg-white p-64 rounded-lg shadow-inner text-center">
      <h2 className="text-2xl font-semibold text-gray-800">Welcome to the App!</h2>
      <p className="text-lg text-gray-600 mt-4">
        Please <a href="/login" className="text-blue-500 hover:underline">login</a> or{' '}
        <a href="/register" className="text-blue-500 hover:underline">register</a>.
      </p>
    </div>
  );
}

// Protect routes using token validation
const ProtectedRoute = ({ element }) => {
  const token = localStorage.getItem('token');
  return token ? element : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/Settings" element={<Settings />} />
        <Route path="/videoCall" element={<videoCall />} />
        
        {/* Add the VerifyEmail route */}
        <Route path="/verify-email/:token" element={<VerifyEmail />} /> {/* Corrected the component name */}
        
        {/* Protected route for ChatApp */}
        <Route path="/chat" element={<ProtectedRoute element={<ChatApp />} />} />
      </Routes>
    </Router>
  );
}

export default App;
