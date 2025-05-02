import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
import { createContext, useContext } from "react";

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if token exists in localStorage
    const token = localStorage.getItem("token");
    if (token) {
      // Fetch user data
      getUserProfile(token)
        .then(userData => {
          setUser(userData);
        })
        .catch(error => {
          console.error("Error fetching user data:", error);
          localStorage.removeItem("token");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      console.log("Login attempt:", { username, password });
      
      // Using URLSearchParams instead of FormData for better compatibility
      const params = new URLSearchParams();
      params.append("username", username);
      params.append("password", password);

      console.log("Login params:", params.toString());

      const response = await axios.post(`${API}/token`, params.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      console.log("Login response:", response.data);
      
      const { access_token } = response.data;
      localStorage.setItem("token", access_token);

      // Fetch user profile with the token
      const userData = await getUserProfile(access_token);
      console.log("User profile:", userData);
      setUser(userData);
      return userData;
    } catch (error) {
      console.error("Login error:", error);
      if (error.response) {
        console.error("Error response:", error.response.data);
        console.error("Status:", error.response.status);
      }
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      console.log("Registration attempt:", userData);
      
      // Make a copy to avoid modifying the original
      const userDataToSend = { ...userData };
      
      const response = await axios.post(`${API}/users`, userDataToSend);
      console.log("Registration response:", response.data);
      
      return response.data;
    } catch (error) {
      console.error("Registration error:", error);
      if (error.response) {
        console.error("Error response:", error.response.data);
        console.error("Status:", error.response.status);
      }
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
function useAuth() {
  return useContext(AuthContext);
}

// Helper function to get user profile
async function getUserProfile(token) {
  try {
    const response = await axios.get(`${API}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
}

// Protected Route component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
}

// Components
// Play notification sound - using a simpler approach to avoid browser restrictions
function playNotificationSound() {
  try {
    // Use simple beep sound that's created programmatically
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 830; // Notification beep frequency
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Keep the volume reasonable
    gainNode.gain.value = 0.1;
    
    // Play a short beep
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      // Clean up
      setTimeout(() => {
        oscillator.disconnect();
        gainNode.disconnect();
      }, 100);
    }, 200);
  } catch (e) {
    console.warn("Unable to play notification sound:", e);
  }
}

// Notifications component
function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasPlayedSound, setHasPlayedSound] = useState(false);
  
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const newNotifications = response.data;
      
      // Check if we have new unread notifications compared to before
      const oldUnreadCount = unreadCount;
      const newUnreadCount = newNotifications.filter(n => n.status !== "read").length;
      
      // Play sound if there are new notifications and we haven't played the sound yet
      if (newUnreadCount > oldUnreadCount && newUnreadCount > 0 && !hasPlayedSound) {
        playNotificationSound();
        setHasPlayedSound(true);
        
        // Reset sound flag after 10 seconds to allow for future sounds
        setTimeout(() => {
          setHasPlayedSound(false);
        }, 10000);
        
        // Show browser notification if supported
        if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification('New Notification', {
              body: 'You have new notifications in your Itinerary Management System',
              icon: '/favicon.ico'
            });
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
          }
        }
      }
      
      setNotifications(newNotifications);
      setUnreadCount(newUnreadCount);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };
  
  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [unreadCount, hasPlayedSound]); // Dependencies added
  
  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/notifications/${id}/read`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === id 
            ? { ...notification, status: "read", read_at: new Date().toISOString() }
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prevCount => Math.max(0, prevCount - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };
  
  const navigate = useNavigate();
  
  const handleNotificationClick = async (notification) => {
    // Mark as read if not already
    if (notification.status !== "read") {
      await markAsRead(notification.id);
    }
    
    // If it's related to an event, navigate to view that event
    if (notification.reference_id && notification.type.includes("event")) {
      try {
        // Close dropdown
        setShowDropdown(false);
        
        // First fetch the event details to ensure it exists
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API}/events/${notification.reference_id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.data) {
          console.log("Found event from notification:", response.data);
          
          // Navigate to dashboard with instruction to highlight this event
          navigate('/dashboard', { 
            state: { 
              highlightEventId: notification.reference_id,
              message: `Viewing event: ${response.data.title}`,
              messageType: "info",
              forceRefresh: Date.now() // Force a refresh
            } 
          });
        }
      } catch (error) {
        console.error("Error fetching event from notification:", error);
        alert("Could not find the referenced event. It may have been deleted.");
      }
    }
  };
  
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHrs < 24) {
      return `${diffHrs} hour${diffHrs !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  return (
    <div className="relative">
      <button 
        className="relative p-1 rounded-full text-gray-300 hover:text-white focus:outline-none"
        onClick={() => setShowDropdown(!showDropdown)}
        data-testid="notification-bell"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center h-5 w-5 text-xs rounded-full bg-red-500" data-testid="notification-count">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-50" data-testid="notifications-dropdown" id="notifications-dropdown">
          <div className="px-4 py-2 text-sm font-medium text-gray-700 border-b flex justify-between items-center">
            <span>Notifications</span>
            <span className="bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 text-xs font-bold">
              {notifications.length}
            </span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No notifications yet
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`px-4 py-2 hover:bg-gray-100 cursor-pointer border-l-2 ${
                    notification.status !== "read" 
                      ? "bg-blue-50 border-blue-500" 
                      : "border-transparent"
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  data-testid={`notification-item-${notification.id}`}
                  role="button"
                  aria-label={`Notification: ${notification.title}`}
                  tabIndex="0"
                >
                  <div className="flex justify-between items-start">
                    <div className="text-sm font-medium text-gray-900 flex items-center">
                      {notification.status !== "read" && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      )}
                      {notification.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(notification.created_at)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {notification.message}
                  </div>
                  <div className="mt-2 text-xs text-blue-600 hover:underline">
                    {notification.type.includes('event') ? 'View event details' : 'View details'}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-4 py-2 text-xs text-gray-500 border-t flex justify-between">
            <span>Click a notification to view details</span>
            {notifications.length > 0 && (
              <button 
                className="text-blue-600 hover:underline focus:outline-none text-xs"
                onClick={() => {
                  // Mark all notifications as read
                  notifications.forEach(notification => {
                    if (notification.status !== "read") {
                      markAsRead(notification.id);
                    }
                  });
                }}
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold" data-testid="home-link">Itinerary Management System</Link>
        <nav>
          <ul className="flex space-x-4 items-center">
            {user ? (
              <>
                <li>
                  <Link to="/dashboard" className="hover:text-gray-300" data-testid="dashboard-link">Dashboard</Link>
                </li>
                <li>
                  <Link to="/calendar" className="hover:text-gray-300" data-testid="calendar-link">Calendar</Link>
                </li>
                <li>
                  <Link to="/create-event" className="hover:text-gray-300" data-testid="create-event-link">Create Event</Link>
                </li>
                <li>
                  <Link to="/reports" className="hover:text-gray-300" data-testid="reports-link">Reports</Link>
                </li>
                {(user.role === "admin" || user.role === "staff") && (
                  <li>
                    <Link to="/manage-users" className="hover:text-gray-300" data-testid="manage-users-link">Manage Users</Link>
                  </li>
                )}
                <li>
                  <Notifications />
                </li>
                <li>
                  <button 
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
                    data-testid="logout-button"
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/login" className="hover:text-gray-300" data-testid="login-link">Login</Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-gray-300" data-testid="register-link">Register</Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}

function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Welcome to the Itinerary Management System</h1>
          <p className="text-center text-gray-600 mb-8">Streamline scheduling and manage tasks efficiently for your institution or office.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg text-center">
              <div className="text-blue-500 text-4xl mb-4">
                <i className="fas fa-calendar"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Event Scheduling</h3>
              <p className="text-gray-600">Create and manage events with automatic conflict detection</p>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg text-center">
              <div className="text-green-500 text-4xl mb-4">
                <i className="fas fa-bell"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Notifications</h3>
              <p className="text-gray-600">Stay updated with alerts for upcoming events and changes</p>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-lg text-center">
              <div className="text-purple-500 text-4xl mb-4">
                <i className="fas fa-tasks"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Task Prioritization</h3>
              <p className="text-gray-600">Organize tasks by priority and track deadlines easily</p>
            </div>
          </div>
          
          <div className="text-center">
            <Link 
              to="/register" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg inline-block mr-4"
            >
              Get Started
            </Link>
            <Link 
              to="/login" 
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg inline-block"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username, password);
      navigate("/dashboard");
    } catch (error) {
      console.error("Login error in component:", error);
      
      if (error.response && error.response.data) {
        if (error.response.data.detail) {
          setError(error.response.data.detail);
        } else {
          setError(JSON.stringify(error.response.data));
        }
      } else {
        setError("Login failed. Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                  Register here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Register() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    full_name: "",
    role: "user"
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(formData);
      navigate("/login", { state: { message: "Registration successful. Please log in." } });
    } catch (error) {
      console.error("Registration error in component:", error);
      
      if (error.response && error.response.data) {
        if (error.response.data.detail) {
          setError(error.response.data.detail);
        } else {
          setError(JSON.stringify(error.response.data));
        }
      } else {
        setError("Registration failed. Please try again with a different username or email.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create a new account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <div className="mt-1">
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="user">User</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? "Registering..." : "Register"}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dashboard component
function Dashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [highlightedEventId, setHighlightedEventId] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const location = useLocation();
  
  console.log("Dashboard component mounted, user:", user?.username);
  
  // Check for success message and highlighted event in navigation state
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      setMessageType(location.state.messageType || "success");
      
      // Clear the message after 5 seconds
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
    
    // Check if we should highlight an event (from notification)
    if (location.state?.highlightEventId) {
      setHighlightedEventId(location.state.highlightEventId);
    }
  }, [location.state]);

  // Function to fetch events - can be called to refresh data
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      // Get today's date and 365 days from now to show more events
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 365); // Show events for the next year
      
      // Debug log - output with date in readable format
      console.log("Dashboard - Fetching events with date range:", {
        start_date: today.toLocaleString(),
        end_date: endDate.toLocaleString(),
        start_date_iso: today.toISOString(),
        end_date_iso: endDate.toISOString()
      });

      // Make the API call with extended date range
      const response = await axios.get(`${API}/events`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          start_date: today.toISOString(),
          end_date: endDate.toISOString(),
        },
      });

      console.log("Dashboard - Events fetched:", response.data);
      console.log("Dashboard - Number of events:", response.data.length);
      
      if (response.data.length === 0) {
        console.log("Dashboard - No events found, checking without date filtering");
        
        // If no events found with date filtering, try fetching all events
        const allEventsResponse = await axios.get(`${API}/events`, {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        });
        
        console.log("Dashboard - All events fetched:", allEventsResponse.data);
        setEvents(allEventsResponse.data);
      } else {
        setEvents(response.data);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      if (error.response) {
        console.error("Error response:", error.response.data);
        console.error("Status:", error.response.status);
      }
      setError("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  // Fetch events on initial load and when location changes (e.g., after event creation)
  useEffect(() => {
    fetchEvents();
  }, [location.key]); // location.key changes when navigation occurs

  const priorityColors = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-green-100 text-green-800 border-green-200",
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Handle selecting an event to show details
  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
    
    // Clear highlight after showing modal
    setHighlightedEventId(null);
  };
  
  // Check if we need to automatically show an event modal (from notification)
  useEffect(() => {
    if (highlightedEventId && events.length > 0) {
      const eventToShow = events.find(event => event.id === highlightedEventId);
      if (eventToShow) {
        handleEventClick(eventToShow);
      }
    }
  }, [highlightedEventId, events]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Welcome, {user?.full_name}</h1>
        <Link
          to="/create-event"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          data-testid="create-event-button"
        >
          Create New Event
        </Link>
      </div>
      
      {successMessage && (
        <div className={`p-4 rounded shadow-md mb-4 border-l-4 ${
          messageType === 'success' ? 'bg-green-100 border-green-500 text-green-700' :
          messageType === 'info' ? 'bg-blue-100 border-blue-500 text-blue-700' :
          messageType === 'warning' ? 'bg-yellow-100 border-yellow-500 text-yellow-700' :
          'bg-red-100 border-red-500 text-red-700'
        }`} role="alert" data-testid="message-alert">
          <div className="flex items-center">
            {messageType === 'success' && (
              <svg className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {messageType === 'info' && (
              <svg className="h-6 w-6 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {messageType === 'warning' && (
              <svg className="h-6 w-6 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Upcoming Events</h2>
          {events.length === 0 ? (
            <div className="text-center py-4 bg-gray-50 rounded">
              <p>No upcoming events found.</p>
              <Link to="/create-event" className="text-blue-600 hover:underline mt-2 inline-block">
                Create your first event
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => (
                  <div 
                  key={event.id}
                  className={`border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
                    highlightedEventId === event.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  data-testid={`event-card-${event.id}`}
                >
                  <div className={`p-4 border-l-4 ${priorityColors[event.priority]}`}>
                    <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
                    <p className="text-gray-600 text-sm mb-1">
                      {event.description && event.description.length > 100
                        ? `${event.description.substring(0, 100)}...`
                        : event.description}
                    </p>
                    <div className="text-sm text-gray-500 mt-2">
                      <p><span className="font-medium">Start:</span> {formatDate(event.start_time)}</p>
                      <p><span className="font-medium">End:</span> {formatDate(event.end_time)}</p>
                      {event.venue && <p><span className="font-medium">Venue:</span> {event.venue}</p>}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => handleEventClick(event)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"
                        data-testid={`view-details-button-${event.id}`}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50" data-testid="event-modal" id="event-modal">
          <div className="relative mx-auto p-0 border w-full max-w-md shadow-lg rounded-lg bg-white overflow-hidden">
            <div className={`${selectedEvent.priority === 'high' ? 'bg-red-500' : 
                    selectedEvent.priority === 'medium' ? 'bg-yellow-500' : 
                    'bg-green-500'} p-4 text-white`}>
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold" id="event-modal-title">{selectedEvent.title}</h3>
                <button 
                  onClick={() => setShowEventModal(false)}
                  className="text-white hover:text-gray-200 bg-gray-700 bg-opacity-30 rounded-full h-8 w-8 flex items-center justify-center transition-colors"
                  data-testid="close-modal-button"
                  id="close-modal-button"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {selectedEvent.description && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
                  <p className="text-gray-700">{selectedEvent.description}</p>
                </div>
              )}
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Time & Location</h4>
                <p className="text-sm font-medium">{formatDate(selectedEvent.start_time)}</p>
                <p className="text-sm text-gray-600">to {formatDate(selectedEvent.end_time)}</p>
                
                {selectedEvent.venue && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-gray-600">{selectedEvent.venue}</p>
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Priority</p>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedEvent.priority === 'high' ? 'bg-red-100 text-red-800' :
                      selectedEvent.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {selectedEvent.priority.charAt(0).toUpperCase() + selectedEvent.priority.slice(1)}
                    </div>
                  </div>
                  
                  {selectedEvent.recurrence !== "none" && (
                    <div>
                      <p className="text-xs text-gray-500">Recurrence</p>
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {selectedEvent.recurrence.charAt(0).toUpperCase() + selectedEvent.recurrence.slice(1)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-2 border-t border-gray-200 flex justify-between">
                <button
                    onClick={async () => {
                      if (confirm("Are you sure you want to delete this event?")) {
                        try {
                          setShowEventModal(false);
                          const token = localStorage.getItem("token");
                          await axios.delete(`${API}/events/${selectedEvent.id}`, {
                            headers: {
                              Authorization: `Bearer ${token}`,
                            },
                          });
                          
                          // Refresh events after deletion
                          fetchEvents();
                          setSuccessMessage("Event deleted successfully");
                          setMessageType("success");
                        } catch (error) {
                          console.error("Error deleting event:", error);
                          setError("Failed to delete event. Please try again.");
                        }
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
                    id="delete-event-button"
                    data-testid="delete-event-button"
                  >
                    Delete Event
                  </button>
                  
                  <button
                    onClick={() => {
                      // Navigate to edit form
                      setShowEventModal(false);
                      navigate('/create-event', {
                        state: {
                          editMode: true,
                          event: selectedEvent,
                          message: "You can edit this event and submit to update it",
                          messageType: "info"
                        }
                      });
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
                    id="edit-event-button"
                    data-testid="edit-event-button"
                  >
                    Edit Event
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Create Event Component
function CreateEvent() {
  // Initialize with default values including current date and time
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const location = useLocation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  
  // Format dates for input
  const formatDateTimeForInput = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  // Default form values
  const defaultFormData = {
    title: "",
    description: "",
    start_time: formatDateTimeForInput(now),
    end_time: formatDateTimeForInput(oneHourLater),
    venue: "",
    priority: "medium",
    recurrence: "none",
    recurrence_end_date: "",
    participants: []
  };
  
  const [formData, setFormData] = useState(defaultFormData);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const navigate = useNavigate();
  
  // Check if we're in edit mode (passed from event details)
  useEffect(() => {
    if (location.state?.editMode && location.state?.event) {
      const eventToEdit = location.state.event;
      setIsEditMode(true);
      setEditId(eventToEdit.id);
      setMessage(location.state.message || "Editing event");
      setMessageType(location.state.messageType || "info");
      
      // Fill the form with event data
      setFormData({
        title: eventToEdit.title || "",
        description: eventToEdit.description || "",
        start_time: formatDateTimeForInput(new Date(eventToEdit.start_time)),
        end_time: formatDateTimeForInput(new Date(eventToEdit.end_time)),
        venue: eventToEdit.venue || "",
        priority: eventToEdit.priority || "medium",
        recurrence: eventToEdit.recurrence || "none",
        recurrence_end_date: eventToEdit.recurrence_end_date 
          ? formatDateTimeForInput(new Date(eventToEdit.recurrence_end_date)).split('T')[0]
          : "",
        participants: eventToEdit.participants || []
      });
    }
  }, [location.state]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate dates
    const start = new Date(formData.start_time);
    const end = new Date(formData.end_time);
    
    if (start >= end) {
      setError("End time must be after start time");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      
      // Create a copy of the form data to prevent modifying state directly
      const eventData = { ...formData };
      
      // If recurrence is 'none', set recurrence_end_date to null explicitly
      if (eventData.recurrence === "none") {
        eventData.recurrence_end_date = null;
      }
      
      // If recurrence_end_date is empty string, set it to null
      if (eventData.recurrence_end_date === "") {
        eventData.recurrence_end_date = null;
      }
      
      console.log("Submitting event data:", eventData);
      
      let response;
      let successMessage;
      
      if (isEditMode && editId) {
        // Update existing event
        response = await axios.put(`${API}/events/${editId}`, eventData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        successMessage = "Event updated successfully!";
        console.log("Event updated successfully:", response.data);
      } else {
        // Create new event
        response = await axios.post(`${API}/events`, eventData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        successMessage = "Event created successfully!";
        console.log("Event created successfully:", response.data);
      }
      
      // Add a success message to navigate with state and force a reload
      const uniqueKey = new Date().getTime(); // Create a unique key for forcing reload
      navigate("/dashboard", { 
        state: { 
          message: successMessage, 
          messageType: "success",
          eventId: response.data.id,
          reloadKey: uniqueKey
        } 
      });
    } catch (error) {
      console.error("Event operation error:", error);
      
      if (error.response && error.response.data) {
        // Handle error detail which might be an object or string
        const detail = error.response.data.detail;
        if (typeof detail === 'object') {
          // If detail is an object, convert it to a string
          setError(JSON.stringify(detail));
        } else {
          setError(detail || `Failed to ${isEditMode ? 'update' : 'create'} event`);
        }
      } else {
        setError(`Failed to ${isEditMode ? 'update' : 'create'} event. Please try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        {isEditMode ? "Edit Event" : "Create New Event"}
      </h1>

      {message && (
        <div className={`px-4 py-3 rounded mb-4 ${
          messageType === 'success' ? 'bg-green-100 border border-green-400 text-green-700' :
          messageType === 'info' ? 'bg-blue-100 border border-blue-400 text-blue-700' :
          messageType === 'warning' ? 'bg-yellow-100 border border-yellow-400 text-yellow-700' :
          'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow" data-testid="create-event-form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Event Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows="3"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            ></textarea>
          </div>

          <div>
            <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
              Start Time *
            </label>
            <input
              type="datetime-local"
              id="start_time"
              name="start_time"
              required
              value={formData.start_time}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">
              End Time *
            </label>
            <input
              type="datetime-local"
              id="end_time"
              name="end_time"
              required
              value={formData.end_time}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-1">
              Venue
            </label>
            <input
              type="text"
              id="venue"
              name="venue"
              value={formData.venue}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label htmlFor="recurrence" className="block text-sm font-medium text-gray-700 mb-1">
              Recurrence
            </label>
            <select
              id="recurrence"
              name="recurrence"
              value={formData.recurrence}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="none">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {formData.recurrence !== "none" && (
            <div>
              <label htmlFor="recurrence_end_date" className="block text-sm font-medium text-gray-700 mb-1">
                Recurrence End Date
              </label>
              <input
                type="date"
                id="recurrence_end_date"
                name="recurrence_end_date"
                value={formData.recurrence_end_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            data-testid="submit-event-button"
          >
            {loading 
              ? (isEditMode ? "Updating..." : "Creating...") 
              : (isEditMode ? "Update Event" : "Create Event")}
          </button>
        </div>
      </form>
    </div>
  );
}

// Calendar component
function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("month"); // "day", "week", "month"
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const location = useLocation();

  // Format date for display
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  // Format time for display
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  // Get days in month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get day of week for first day of month
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  // Function to navigate to previous month
  const prevMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  // Function to navigate to next month
  const nextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  // Function to navigate to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Function to fetch events for the current month
  const fetchCalendarEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Calculate start and end dates for the month view
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      // Set the time to the end of the day for endDate to include all events on the last day
      endDate.setHours(23, 59, 59, 999);

      // Debug logging with better formatting
      console.log("Calendar - Fetching events for date range:", {
        start_date: startDate.toLocaleString(),
        end_date: endDate.toLocaleString(),
        start_date_iso: startDate.toISOString(),
        end_date_iso: endDate.toISOString()
      });

      const response = await axios.get(`${API}/events`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        },
      });

      console.log("Calendar - Events fetched:", response.data);
      console.log("Calendar - Number of events:", response.data.length);
      
      if (response.data.length === 0) {
        console.log("Calendar - No events found in date range, trying without date filtering");
        
        // If no events found with date filtering, try without filters
        const allEventsResponse = await axios.get(`${API}/events`, {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        });
        
        console.log("Calendar - All events:", allEventsResponse.data);
        setEvents(allEventsResponse.data);
      } else {
        setEvents(response.data);
      }
      
      setError("");
    } catch (err) {
      console.error("Error fetching events for calendar:", err);
      if (err.response) {
        console.error("Error response:", err.response.data);
        console.error("Status:", err.response.status);
      }
      setError("Failed to load events. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Load events for the current month view and when location changes
  useEffect(() => {
    fetchCalendarEvents();
  }, [currentDate, location.key]);

  // Get calendar data for the current month
  const getCalendarData = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    
    const calendarDays = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push({ day: null, date: null });
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      calendarDays.push({ day, date });
    }
    
    return calendarDays;
  };

  // Get events for a specific day
  const getEventsForDay = (date) => {
    if (!date) return [];
    
    // For debugging
    console.log("Events:", events);
    console.log("Checking date:", date);
    
    const filteredEvents = events.filter(event => {
      const eventStart = new Date(event.start_time);
      
      // Log event dates for debugging
      console.log(`Event: ${event.title}, Start: ${eventStart}`);
      
      // Create date objects with just the date portion (no time)
      const eventDate = new Date(
        eventStart.getFullYear(),
        eventStart.getMonth(),
        eventStart.getDate()
      );
      
      const calendarDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
      
      // Check if dates match
      const match = eventDate.getTime() === calendarDate.getTime();
      console.log(`Matching ${eventDate.toDateString()} with ${calendarDate.toDateString()}: ${match}`);
      
      return match;
    });
    
    console.log(`Found ${filteredEvents.length} events for ${date.toDateString()}`);
    return filteredEvents;
  };

  // Handle event click
  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  // Event Modal
  const EventModal = ({ event, onClose }) => {
    if (!event) return null;
    
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    
    const priorityColors = {
      high: {
        bg: "bg-red-50",
        border: "border-red-300",
        text: "text-red-800",
        darkBg: "bg-red-500",
        icon: "bg-red-100 text-red-600"
      },
      medium: {
        bg: "bg-yellow-50",
        border: "border-yellow-300",
        text: "text-yellow-800",
        darkBg: "bg-yellow-500",
        icon: "bg-yellow-100 text-yellow-600"
      },
      low: {
        bg: "bg-green-50",
        border: "border-green-300",
        text: "text-green-800",
        darkBg: "bg-green-500",
        icon: "bg-green-100 text-green-600"
      }
    };
    
    const colors = priorityColors[event.priority];
    
    // Calculate duration in minutes
    const durationMs = endTime - startTime;
    const durationMins = Math.floor(durationMs / 60000);
    const hours = Math.floor(durationMins / 60);
    const minutes = durationMins % 60;
    const durationText = `${hours > 0 ? `${hours} hour${hours !== 1 ? 's' : ''}` : ''}${hours > 0 && minutes > 0 ? ', ' : ''}${minutes > 0 ? `${minutes} minute${minutes !== 1 ? 's' : ''}` : ''}`;
    
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50" data-testid="event-modal">
        <div className="relative mx-auto p-0 border w-full max-w-md shadow-lg rounded-lg bg-white overflow-hidden">
          <div className={`${colors.darkBg} p-4 text-white`}>
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-bold">{event.title}</h3>
              <button 
                onClick={onClose}
                className="text-white hover:text-gray-200 bg-gray-700 bg-opacity-30 rounded-full h-8 w-8 flex items-center justify-center transition-colors"
                data-testid="close-modal-button"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div className={`p-4 ${colors.bg}`}>
            {event.description && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
                <p className="text-gray-700">{event.description}</p>
              </div>
            )}
            
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Time & Location</h4>
              <div className="grid grid-cols-6 gap-2">
                <div className="col-span-1">
                  <div className={`${colors.icon} h-10 w-10 rounded-full flex items-center justify-center`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="col-span-5">
                  <p className="text-sm font-medium">{formatDate(startTime)}</p>
                  <p className="text-sm text-gray-600">{formatTime(startTime)} - {formatTime(endTime)} ({durationText})</p>
                </div>
              </div>
              
              {event.venue && (
                <div className="grid grid-cols-6 gap-2 mt-3">
                  <div className="col-span-1">
                    <div className={`${colors.icon} h-10 w-10 rounded-full flex items-center justify-center`}>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="col-span-5">
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-gray-600">{event.venue}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Priority</p>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    event.priority === 'high' ? 'bg-red-100 text-red-800' :
                    event.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {event.priority.charAt(0).toUpperCase() + event.priority.slice(1)}
                  </div>
                </div>
                
                {event.recurrence !== "none" && (
                  <div>
                    <p className="text-xs text-gray-500">Recurrence</p>
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {event.recurrence.charAt(0).toUpperCase() + event.recurrence.slice(1)}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-2 border-t border-gray-200 flex justify-end">
              <Link 
                to={`/events/${event.id}`}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
                data-testid="view-event-details-button"
              >
                View Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render calendar view
  return (
    <div className="container mx-auto px-4 py-8" data-testid="calendar-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex space-x-2">
          <Link
            to="/create-event"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            data-testid="calendar-create-event-button"
          >
            Create Event
          </Link>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex space-x-2">
            <button 
              onClick={prevMonth}
              className="px-3 py-1 border rounded hover:bg-gray-100"
              data-testid="prev-month-button"
            >
              &#8592; Prev
            </button>
            <button 
              onClick={goToToday}
              className="px-3 py-1 border rounded hover:bg-gray-100"
              data-testid="today-button"
            >
              Today
            </button>
            <button 
              onClick={nextMonth}
              className="px-3 py-1 border rounded hover:bg-gray-100"
              data-testid="next-month-button"
            >
              Next &#8594;
            </button>
          </div>
          <h2 className="text-xl font-semibold">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex space-x-2">
            <button 
              onClick={() => setMode("day")}
              className={`px-3 py-1 border rounded ${mode === "day" ? "bg-blue-100 border-blue-300" : "hover:bg-gray-100"}`}
            >
              Day
            </button>
            <button 
              onClick={() => setMode("week")}
              className={`px-3 py-1 border rounded ${mode === "week" ? "bg-blue-100 border-blue-300" : "hover:bg-gray-100"}`}
            >
              Week
            </button>
            <button 
              onClick={() => setMode("month")}
              className={`px-3 py-1 border rounded ${mode === "month" ? "bg-blue-100 border-blue-300" : "hover:bg-gray-100"}`}
            >
              Month
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <p>Loading calendar...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-100 text-red-800 text-center">
            {error}
          </div>
        ) : (
          <div className="p-4">
            {/* Month View */}
            {mode === "month" && (
              <>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                    <div key={i} className="text-center font-semibold py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {getCalendarData().map((day, index) => {
                    const dayEvents = getEventsForDay(day.date);
                    const isToday = day.date && 
                      day.date.getDate() === new Date().getDate() && 
                      day.date.getMonth() === new Date().getMonth() &&
                      day.date.getFullYear() === new Date().getFullYear();
                    
                    return (
                      <div 
                        key={index} 
                        className={`border rounded min-h-32 ${
                          !day.day ? 'bg-gray-100' : 
                          isToday ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                      >
                        {day.day && (
                          <>
                            <div className="p-1 text-right">
                              <span className={`inline-block rounded-full w-6 h-6 text-center ${
                                isToday ? 'bg-blue-500 text-white' : ''
                              }`}>
                                {day.day}
                              </span>
                            </div>
                            <div className="px-1 pb-1 overflow-y-auto max-h-24">
                              {dayEvents.map(event => (
                                <div 
                                  key={event.id}
                                  onClick={() => handleEventClick(event)}
                                  className={`text-xs p-1 mb-1 rounded cursor-pointer truncate hover:shadow-md transition-all duration-200 hover:scale-105 ${
                                    event.priority === 'high' ? 'bg-red-100 text-red-800 border border-red-300' :
                                    event.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                                    'bg-green-100 text-green-800 border border-green-300'
                                  }`}
                                  data-testid={`calendar-event-${event.id}`}
                                >
                                  <div className="flex items-center">
                                    <span className="inline-block w-2 h-2 rounded-full mr-1 
                                      ${event.priority === 'high' ? 'bg-red-500' : 
                                        event.priority === 'medium' ? 'bg-yellow-500' : 
                                        'bg-green-500'}"
                                    ></span>
                                    <span>{formatTime(event.start_time)} {event.title}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Week and Day view placeholders */}
            {mode === "week" && (
              <div className="text-center py-12 text-gray-500">
                Week view is coming soon
              </div>
            )}
            
            {mode === "day" && (
              <div className="text-center py-12 text-gray-500">
                Day view is coming soon
              </div>
            )}
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      {showEventModal && (
        <EventModal 
          event={selectedEvent} 
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
}

// ManageUsers component
function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const { user: currentUser } = useAuth();

  // New user state
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
    role: "user"
  });

  // Get all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // This endpoint will need to be added to the backend
      const response = await axios.get(`${API}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUsers(response.data);
      setError("");
    } catch (err) {
      console.error("Error fetching users:", err);
      if (err.response && err.response.status === 403) {
        setError("You don't have permission to view users");
      } else {
        setError("Failed to load users. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle form input change for new user
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser({
      ...newUser,
      [name]: value
    });
  };

  // Handle form submission for new user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API}/users`, newUser, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Add the new user to the list
      setUsers([...users, response.data]);
      
      // Reset form and close modal
      setNewUser({
        username: "",
        email: "",
        password: "",
        full_name: "",
        role: "user"
      });
      setShowAddUserModal(false);
      
    } catch (err) {
      console.error("Error creating user:", err);
      if (err.response && err.response.data) {
        alert(err.response.data.detail || "Failed to create user");
      } else {
        alert("Failed to create user. Please try again.");
      }
    }
  };

  // Handle user edit (placeholder)
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowEditUserModal(true);
  };

  // Handle role change
  const handleRoleChange = async (userId, newRole) => {
    try {
      const token = localStorage.getItem("token");
      
      // This endpoint will need to be implemented in the backend
      await axios.put(`${API}/users/${userId}`, 
        { role: newRole },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      // Update the user in the list
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
    } catch (err) {
      console.error("Error updating user role:", err);
      alert("Failed to update user role. Please try again.");
    }
  };

  // The actual component render
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Users</h1>
        {currentUser && currentUser.role === "admin" && (
          <button
            onClick={() => setShowAddUserModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Add User
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-4">Loading users...</div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.full_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {currentUser && currentUser.role === "admin" ? (
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="text-sm text-gray-500 border rounded p-1"
                        disabled={user.id === currentUser.id} // Don't allow changing own role
                      >
                        <option value="user">User</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <div className="text-sm text-gray-500 capitalize">{user.role}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {currentUser && currentUser.role === "admin" && (
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add New User</h3>
              <button 
                onClick={() => setShowAddUserModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateUser}>
              <div className="mb-4">
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={newUser.full_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={newUser.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={newUser.username}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={newUser.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={newUser.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="user">User</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal - Placeholder */}
      {showEditUserModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit User: {selectedUser.username}</h3>
              <button 
                onClick={() => {
                  setShowEditUserModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="text-center py-4">
              <p>User editing functionality coming soon.</p>
              <button
                onClick={() => {
                  setShowEditUserModal(false);
                  setSelectedUser(null);
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main App component
// Reports component
function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const [reportType, setReportType] = useState("upcoming");
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split("T")[0],
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  });
  const location = useLocation();

  // Use useCallback to memoize the fetchEventData function
  const fetchEventData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      let queryParams = {};
      if (reportType === "custom") {
        // Format dates for API
        queryParams = {
          start_date: new Date(dateRange.start + "T00:00:00").toISOString(),
          end_date: new Date(dateRange.end + "T23:59:59").toISOString()
        };
      } else if (reportType === "upcoming") {
        // Get upcoming events for next 30 days
        const today = new Date();
        const endDate = new Date();
        endDate.setDate(today.getDate() + 30);
        queryParams = {
          start_date: today.toISOString(),
          end_date: endDate.toISOString()
        };
      } else if (reportType === "past") {
        // Get past events from last 30 days
        const today = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - 30);
        queryParams = {
          start_date: startDate.toISOString(),
          end_date: today.toISOString()
        };
      }

      const response = await axios.get(`${API}/events`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: queryParams
      });

      setEvents(response.data);
      setError("");
    } catch (err) {
      console.error("Error fetching report data:", err);
      setError("Failed to load report data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [reportType, dateRange]);

  useEffect(() => {
    fetchEventData();
  }, [reportType, fetchEventData, location.key]);

  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange({
      ...dateRange,
      [name]: value
    });
  };

  const handleCustomDateSubmit = (e) => {
    e.preventDefault();
    fetchEventData();
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Group events by priority
  const eventsByPriority = {
    high: events.filter(event => event.priority === "high"),
    medium: events.filter(event => event.priority === "medium"),
    low: events.filter(event => event.priority === "low")
  };

  // Count events by recurrence type
  const recurrenceStats = events.reduce((stats, event) => {
    stats[event.recurrence] = (stats[event.recurrence] || 0) + 1;
    return stats;
  }, {});

  // Prepare data for export
  const prepareExportData = () => {
    return events.map(event => ({
      title: event.title,
      description: event.description || "",
      start_time: formatDate(event.start_time),
      end_time: formatDate(event.end_time),
      venue: event.venue || "",
      priority: event.priority,
      recurrence: event.recurrence
    }));
  };

  // Export to CSV
  const exportToCSV = () => {
    const data = prepareExportData();
    if (data.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map(row => 
        headers.map(header => 
          JSON.stringify(row[header] || "")
        ).join(",")
      )
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `event_report_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto px-4 py-8" data-testid="reports-page">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
          <div className="flex space-x-4 mb-4 md:mb-0">
            <button
              onClick={() => setReportType("upcoming")}
              className={`px-4 py-2 rounded ${
                reportType === "upcoming" ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}
            >
              Upcoming Events
            </button>
            <button
              onClick={() => setReportType("past")}
              className={`px-4 py-2 rounded ${
                reportType === "past" ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}
            >
              Past Events
            </button>
            <button
              onClick={() => setReportType("custom")}
              className={`px-4 py-2 rounded ${
                reportType === "custom" ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}
            >
              Custom Date Range
            </button>
          </div>
          <button
            onClick={exportToCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Export to CSV
          </button>
        </div>

        {reportType === "custom" && (
          <form onSubmit={handleCustomDateSubmit} className="mb-6 flex flex-wrap gap-4 items-end">
            <div>
              <label htmlFor="start" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                id="start"
                name="start"
                value={dateRange.start}
                onChange={handleDateRangeChange}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="end" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="end"
                name="end"
                value={dateRange.end}
                onChange={handleDateRangeChange}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Apply
            </button>
          </form>
        )}

        {loading ? (
          <div className="text-center py-8">Loading report data...</div>
        ) : error ? (
          <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              {reportType === "upcoming" ? "Upcoming Events" : 
               reportType === "past" ? "Past Events" : "Custom Date Range Events"}
            </h2>

            {events.length === 0 ? (
              <p className="text-center py-4 bg-gray-50 rounded">No events found for this period</p>
            ) : (
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-3">Events by Priority</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h4 className="font-semibold text-red-800 mb-2">High Priority</h4>
                    <p className="text-2xl font-bold">{eventsByPriority.high.length}</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h4 className="font-semibold text-yellow-800 mb-2">Medium Priority</h4>
                    <p className="text-2xl font-bold">{eventsByPriority.medium.length}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">Low Priority</h4>
                    <p className="text-2xl font-bold">{eventsByPriority.low.length}</p>
                  </div>
                </div>

                <h3 className="text-lg font-medium mb-3">Event List</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Start Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          End Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Venue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Recurrence
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {events.map((event) => (
                        <tr key={event.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{event.title}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{formatDate(event.start_time)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{formatDate(event.end_time)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{event.venue || "-"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${event.priority === "high" ? "bg-red-100 text-red-800" : 
                                event.priority === "medium" ? "bg-yellow-100 text-yellow-800" : 
                                "bg-green-100 text-green-800"}`}>
                              {event.priority.charAt(0).toUpperCase() + event.priority.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 capitalize">{event.recurrence}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <AuthProvider>
        <Router>
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/calendar" 
                element={
                  <ProtectedRoute>
                    <Calendar />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/create-event" 
                element={
                  <ProtectedRoute>
                    <CreateEvent />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/manage-users" 
                element={
                  <ProtectedRoute>
                    <ManageUsers />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/reports" 
                element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>
        </Router>
      </AuthProvider>
    </div>
  );
}

export default App;
