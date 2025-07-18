import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import NotificationBell from "./components/NotificationBell";
import AdminDashboard from "./components/AdminDashboard";
import { RECURRENCE_OPTIONS } from "./utils/constants";

// Helper function to get recurrence display label
const getRecurrenceLabel = (recurrenceValue) => {
  const option = RECURRENCE_OPTIONS.find(opt => opt.value === recurrenceValue);
  return option ? option.label : recurrenceValue.charAt(0).toUpperCase() + recurrenceValue.slice(1);
};

// Dynamic backend URL detection
const getBackendURL = () => {
  // If explicitly set in environment, use it
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  // Auto-detect based on current location
  const currentUrl = window.location.origin;
  
  // For local development
  if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
    return 'http://localhost:8001';
  }
  
  // For any other environment (Vercel, Render, Emergent), use same origin
  return currentUrl;
};

const BACKEND_URL = getBackendURL();
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

// Admin Dashboard Wrapper component
function AdminDashboardWrapper() {
  const { user } = useAuth();
  return <AdminDashboard user={user} />;
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
    const audio = new Audio('/sounds/notification.wav'); // path to your sound file
    audio.volume = 0.5; // adjust volume
    audio.play();
  } catch (e) {
    console.warn("Unable to play notification sound:", e);
  }
}


//Play notification sound programmatically

// function playNotificationSound() {
//   try {
//     // Use simple beep sound that's created programmatically
//     const audioContext = new (window.AudioContext || window.webkitAudioContext)();
//     const oscillator = audioContext.createOscillator();
//     const gainNode = audioContext.createGain();
    
//     oscillator.type = 'sine';
//     oscillator.frequency.value = 830; // Notification beep frequency
//     oscillator.connect(gainNode);
//     gainNode.connect(audioContext.destination);
    
//     // Keep the volume reasonable
//     gainNode.gain.value = 0.1;
    
//     // Play a short beep
//     oscillator.start();
//     setTimeout(() => {
//       oscillator.stop();
//       // Clean up
//       setTimeout(() => {
//         oscillator.disconnect();
//         gainNode.disconnect();
//       }, 100);
//     }, 200);
//   } catch (e) {
//     console.warn("Unable to play notification sound:", e);
//   }
// }

// Event time notification checker
function useEventTimeNotifications(events) {
  const [checkedEvents, setCheckedEvents] = useState(new Set());

  useEffect(() => {
    if (!events || events.length === 0) return;

    const checkInterval = setInterval(() => {
      const now = new Date();
      
      events.forEach(event => {
        const eventStart = new Date(event.start_time);
        const timeDiff = eventStart.getTime() - now.getTime();
        
        // Check if event starts within the next 5 minutes (300000 ms)
        // and we haven't already notified for this event
        if (timeDiff > 0 && timeDiff <= 300000 && !checkedEvents.has(event.id)) {
          // Mark this event as checked
          setCheckedEvents(prev => new Set([...prev, event.id]));
          
          // Play notification sound
          playNotificationSound();
          
          // Show browser notification if supported
          if ('Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification(`Event Starting Soon: ${event.title}`, {
                body: `Your event "${event.title}" starts in ${Math.ceil(timeDiff / 60000)} minutes`,
                icon: '/favicon.ico'
              });
            } else if (Notification.permission !== 'denied') {
              Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                  new Notification(`Event Starting Soon: ${event.title}`, {
                    body: `Your event "${event.title}" starts in ${Math.ceil(timeDiff / 60000)} minutes`,
                    icon: '/favicon.ico'
                  });
                }
              });
            }
          }
          
          console.log(`Event notification: ${event.title} starts in ${Math.ceil(timeDiff / 60000)} minutes`);
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(checkInterval);
  }, [events, checkedEvents]);

  // Clean up checked events for events that have passed
  useEffect(() => {
    if (!events || events.length === 0) return;

    const now = new Date();
    const activeEventIds = events
      .filter(event => new Date(event.start_time) > now)
      .map(event => event.id);
    
    setCheckedEvents(prev => {
      const newSet = new Set();
      activeEventIds.forEach(id => {
        if (prev.has(id)) {
          newSet.add(id);
        }
      });
      return newSet;
    });
  }, [events]);
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
    
    // Handle negative values (future times or timezone issues)
    if (diffMs < 0) {
      return "just now";
    }
    
    if (diffMins < 1) {
      return "just now";
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
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
        <Link to="/" className="text-xl font-bold" data-testid="home-link">Ezeji Itinerary System</Link>
        <nav>
          <ul className="flex space-x-4 items-center">
            {user ? (
              <>
                <li>
                  <Link to="/dashboard" className="hover:text-gray-300" data-testid="dashboard-link">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/calendar" className="hover:text-gray-300" data-testid="calendar-link">
                    Calendar
                  </Link>
                </li>
                <li>
                  <Link to="/create-with-ai" className="hover:text-gray-300" data-testid="create-with-ai-link">
                    Create with AI
                  </Link>
                </li>
                {user.role === 'admin' && (
                  <li>
                    <Link to="/admin" className="hover:text-gray-300" data-testid="admin-link">
                      Admin
                    </Link>
                  </li>
                )}
                <li>
                  <NotificationBell user={user} />
                </li>
                <li>
                  <span className="text-gray-300">Hello, {user.full_name}</span>
                </li>
                <li>
                  <button
                    onClick={() => logout()}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                    data-testid="logout-button"
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/login" className="hover:text-gray-300" data-testid="login-link">
                    Login
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-gray-300" data-testid="register-link">
                    Register
                  </Link>
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
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Welcome to Ezeji Itinerary System</h1>
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
          if (typeof error.response.data.detail === 'object') {
            setError("Login failed. Please check your credentials and try again.");
          } else {
            setError(error.response.data.detail);
          }
        } else {
          setError("Login failed. Please check your credentials and try again.");
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
          if (typeof error.response.data.detail === 'object') {
            setError("Registration failed. Please try again with a different username or email.");
          } else {
            setError(error.response.data.detail);
          }
        } else {
          setError("Registration failed. Please try again with a different username or email.");
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
  const navigate = useNavigate(); // Add this line to fix the navigate error
  
  console.log("Dashboard component mounted, user:", user?.username);
  
  // Use event time notifications
  useEventTimeNotifications(events);
  
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
      <div className="container mx-auto flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Welcome, {user?.full_name}</h1>
        <Link
          to="/create-event"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          data-testid="create-event-button"
          id="create-new-event-button"
        >
          Create New Event
        </Link>
        <Link
          to="/create-with-ai"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          data-testid="create-with-ai-link"
          id="create-new-event-button"
        >
          Create With AI
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
                        {getRecurrenceLabel(selectedEvent.recurrence)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-2 border-t border-gray-200 flex justify-between flex-wrap gap-2">
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
                
                <div>
                  <button
                    onClick={() => setShowEventModal(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm font-medium py-2 px-4 rounded transition-colors mr-2"
                    id="close-event-button"
                    data-testid="close-event-button"
                  >
                    Close
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
        </div>
      )}
    </div>
  );
}

// Create With AI Component - Natural Language Event Creation
function CreateWithAI() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parsedEvent, setParsedEvent] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const navigate = useNavigate();

  const handleParseText = async () => {
    if (!text.trim()) {
      setError("Please enter some text to parse");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API}/parse-event`,
        { text: text.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Parsed event response:", response.data);
      setParsedEvent(response.data);
      setShowPreview(true);
    } catch (error) {
      console.error("Error parsing event text:", error);
      if (error.response && error.response.data) {
        setError(error.response.data.detail || "Failed to parse event text");
      } else {
        setError("Failed to parse event text. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = () => {
    if (!parsedEvent) return;

    // Navigate to create event page with parsed data
    navigate("/create-event", {
      state: {
        aiParsed: true,
        eventData: {
          title: parsedEvent.title || "",
          description: parsedEvent.description || "",
          start_time: parsedEvent.start_time 
            ? new Date(parsedEvent.start_time).toISOString().slice(0, 16)
            : "",
          end_time: parsedEvent.end_time 
            ? new Date(parsedEvent.end_time).toISOString().slice(0, 16)
            : "",
          venue: parsedEvent.venue || "",
          priority: parsedEvent.priority || "medium"
        },
        message: `AI parsed your text with ${Math.round(parsedEvent.confidence * 100)}% confidence. Please review and adjust as needed.`,
        messageType: "info"
      }
    });
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return "Not specified";
    const date = new Date(dateTimeString);
    return date.toLocaleString();
  };

  const exampleTexts = [
    "Schedule meeting with Sarah on Friday at 10AM for 2 hours in conference room A",
    "Lunch with John tomorrow at 1PM at the downtown restaurant",
    "Team standup daily at 9:30 AM starting next Monday",
    "Client presentation next Thursday 2-4 PM in the main conference room",
    "Birthday party for Emma on Saturday at 7PM at her house"
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Create Event with AI</h1>
        <p className="text-gray-600 text-center mb-8">
          Describe your event in plain English and let AI help you create it!
        </p>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Describe Your Event</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="event-text" className="block text-sm font-medium text-gray-700 mb-2">
              Event Description
            </label>
            <textarea
              id="event-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g., Schedule meeting with John tomorrow at 2PM in conference room B"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows="4"
              data-testid="ai-text-input"
            />
            <p className="text-sm text-gray-500 mt-1">
              Be as specific as possible about the time, date, location, and duration
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleParseText}
              disabled={loading || !text.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded transition-colors"
              data-testid="parse-event-button"
            >
              {loading ? "Parsing..." : "Parse with AI"}
            </button>
            
            <button
              onClick={() => {
                setText("");
                setParsedEvent(null);
                setShowPreview(false);
                setError("");
              }}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Preview Section - AI Parsed Event Results */}
        {showPreview && parsedEvent && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">AI Parsed Event</h2>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">Confidence:</span>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  parsedEvent.confidence > 0.7 ? 'bg-green-100 text-green-800' :
                  parsedEvent.confidence > 0.4 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {Math.round(parsedEvent.confidence * 100)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Event Details</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Title:</span>
                    <p className="text-gray-800">{parsedEvent.title || "Not specified"}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-500">Description:</span>
                    <p className="text-gray-800">{parsedEvent.description || "Not specified"}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-500">Venue:</span>
                    <p className="text-gray-800">{parsedEvent.venue || "Not specified"}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-500">Priority:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      parsedEvent.priority === 'high' ? 'bg-red-100 text-red-800' :
                      parsedEvent.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {parsedEvent.priority}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Time & Date</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Start Time:</span>
                    <p className="text-gray-800">{formatDateTime(parsedEvent.start_time)}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-500">End Time:</span>
                    <p className="text-gray-800">{formatDateTime(parsedEvent.end_time)}</p>
                  </div>
                  
                  {parsedEvent.start_time && parsedEvent.end_time && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Duration:</span>
                      <p className="text-gray-800">
                        {Math.round((new Date(parsedEvent.end_time) - new Date(parsedEvent.start_time)) / (1000 * 60))} minutes
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowPreview(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded transition-colors"
                >
                  Back to Edit
                </button>
                
                <button
                  onClick={handleCreateEvent}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded transition-colors"
                  data-testid="create-parsed-event-button"
                >
                  Create This Event
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Example Section */}
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">Example Phrases</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {exampleTexts.map((example, index) => (
              <button
                key={index}
                onClick={() => setText(example)}
                className="text-left p-3 bg-white rounded border hover:bg-blue-100 transition-colors text-sm"
                data-testid={`example-${index}`}
              >
                "{example}"
              </button>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Tips for Better Results</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Include specific dates and times (e.g., "Monday at 3 PM" or "tomorrow at 10:30 AM")</li>
            <li>Mention duration if different from 1 hour (e.g., "for 2 hours" or "30 minute meeting")</li>
            <li>Include location details (e.g., "in conference room A" or "at the coffee shop")</li>
            <li>Use keywords like "urgent", "important", "casual" to set priority</li>
            <li>Be specific about who is involved (e.g., "meeting with John and Sarah")</li>
          </ul>
        </div>
      </div>
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
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
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
    } else if (location.state?.aiParsed && location.state?.eventData) {
      // Handle AI-parsed data
      const aiData = location.state.eventData;
      setMessage(location.state.message || "AI parsed your event");
      setMessageType(location.state.messageType || "info");
      
      setFormData({
        title: aiData.title || "",
        description: aiData.description || "",
        start_time: aiData.start_time || formatDateTimeForInput(now),
        end_time: aiData.end_time || formatDateTimeForInput(oneHourLater),
        venue: aiData.venue || "",
        priority: aiData.priority || "medium",
        recurrence: "none",
        recurrence_end_date: "",
        participants: []
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

  // Function to check for conflicts
  const checkConflicts = async (startTime, endTime) => {
    try {
      setCheckingConflicts(true);
      const token = localStorage.getItem("token");
      
      const response = await axios.post(
        `${API}/check-conflicts`,
        {
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          event_id: isEditMode ? editId : null
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error checking conflicts:", error);
      return { has_conflict: false, conflicts: [], suggested_slots: [] };
    } finally {
      setCheckingConflicts(false);
    }
  };

  // Function to handle using a suggested time slot
  const useSuggestedSlot = (slot) => {
    setFormData({
      ...formData,
      start_time: formatDateTimeForInput(new Date(slot.start_time)),
      end_time: formatDateTimeForInput(new Date(slot.end_time))
    });
    setShowConflictModal(false);
    setConflictData(null);
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
      // First check for conflicts
      const conflictCheck = await checkConflicts(formData.start_time, formData.end_time);
      
      if (conflictCheck.has_conflict && !isEditMode) {
        // Show conflict modal for new events
        setConflictData(conflictCheck);
        setShowConflictModal(true);
        setLoading(false);
        return;
      }

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
      
      if (error.response && error.response.status === 409) {
        // Handle conflict response from backend
        const conflictDetails = error.response.data.detail;
        setConflictData({
          has_conflict: true,
          conflicts: conflictDetails.conflicts || [],
          suggested_slots: conflictDetails.suggested_slots || []
        });
        setShowConflictModal(true);
      } else if (error.response && error.response.data) {
        // Handle other errors
        const detail = error.response.data.detail;
        if (typeof detail === 'object') {
          setError(`Failed to ${isEditMode ? 'update' : 'create'} event. Please check your input and try again.`);
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
              {RECURRENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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

      {/* Conflict Detection Modal */}
      {showConflictModal && conflictData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50" data-testid="conflict-modal">
          <div className="relative mx-auto p-0 border w-full max-w-2xl shadow-lg rounded-lg bg-white overflow-hidden">
            <div className="bg-red-500 p-4 text-white">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold">⚠️ Scheduling Conflict Detected</h3>
                <button 
                  onClick={() => setShowConflictModal(false)}
                  className="text-white hover:text-gray-200 bg-gray-700 bg-opacity-30 rounded-full h-8 w-8 flex items-center justify-center transition-colors"
                  data-testid="close-conflict-modal"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Your event conflicts with {conflictData.conflicts.length} existing event(s). 
                Please choose a different time or select one of the suggested alternatives below.
              </p>

              {/* Conflicting Events */}
              {conflictData.conflicts && conflictData.conflicts.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-3 text-red-700">Conflicting Events:</h4>
                  <div className="space-y-2">
                    {conflictData.conflicts.map((conflict, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 rounded p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium text-red-800">{conflict.title}</h5>
                            <p className="text-sm text-red-600">
                              {new Date(conflict.start_time).toLocaleString()} - {new Date(conflict.end_time).toLocaleString()}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            conflict.priority === 'high' ? 'bg-red-100 text-red-800' :
                            conflict.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {conflict.priority} priority
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Time Slots */}
              {conflictData.suggested_slots && conflictData.suggested_slots.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-3 text-green-700">Suggested Alternative Times:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {conflictData.suggested_slots.map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => useSuggestedSlot(slot)}
                        className="text-left p-4 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors"
                        data-testid={`suggested-slot-${index}`}
                      >
                        <div className="font-medium text-green-800">{slot.date}</div>
                        <div className="text-sm text-green-600">{slot.time_range}</div>
                        <div className="text-xs text-green-500 mt-1">Click to use this time</div>
                      </button>
                    ))}
                  </div>
                  
                  {conflictData.suggested_slots.length === 0 && (
                    <p className="text-gray-500 italic">No alternative time slots found within the next 2 weeks.</p>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  onClick={() => setShowConflictModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded transition-colors"
                >
                  Back to Edit
                </button>
                
                <button
                  onClick={() => {
                    setShowConflictModal(false);
                    setConflictData(null);
                    // Force create anyway (you could add a confirmation here)
                    const forceCreate = async () => {
                      try {
                        setLoading(true);
                        const token = localStorage.getItem("token");
                        const eventData = { ...formData };
                        
                        if (eventData.recurrence === "none") {
                          eventData.recurrence_end_date = null;
                        }
                        if (eventData.recurrence_end_date === "") {
                          eventData.recurrence_end_date = null;
                        }

                        // Force create by calling the API directly (bypassing conflict check)
                        const response = await axios.post(`${API}/events`, eventData, {
                          headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                          },
                        });

                        navigate("/dashboard", { 
                          state: { 
                            message: "Event created successfully (conflicts ignored)", 
                            messageType: "warning",
                            eventId: response.data.id
                          } 
                        });
                      } catch (error) {
                        console.error("Error force creating event:", error);
                        setError("Failed to create event. Please try again.");
                      } finally {
                        setLoading(false);
                      }
                    };
                    
                    if (confirm("Are you sure you want to create this event despite the conflicts? This may cause scheduling issues.")) {
                      forceCreate();
                    }
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded transition-colors"
                  data-testid="force-create-button"
                >
                  Create Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Calendar component - Fully functional calendar view
function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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
    
    const filteredEvents = events.filter(event => {
      const eventStart = new Date(event.start_time);
      
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
      return eventDate.getTime() === calendarDate.getTime();
    });
    
    return filteredEvents;
  };

  // Handle event click
  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  // Check if a date is today
  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const calendarDays = getCalendarData();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Calendar Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
              title="Previous Month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
              title="Next Month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Calendar Controls */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-gray-600">
            {events.length} event{events.length !== 1 ? 's' : ''} this month
          </div>
          <button
            onClick={() => navigate('/create-event')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            + Add Event
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading calendar...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>
        ) : (
          <>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="p-2 text-center font-semibold text-gray-700 text-sm">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 border border-gray-200 rounded-lg overflow-hidden">
              {calendarDays.map((dayData, index) => {
                const dayEvents = getEventsForDay(dayData.date);
                const isCurrentDay = isToday(dayData.date);
                
                return (
                  <div
                    key={index}
                    className={`min-h-[120px] border-r border-b border-gray-100 p-2 ${
                      dayData.day ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'
                    } ${isCurrentDay ? 'bg-blue-50 ring-2 ring-blue-200' : ''}`}
                  >
                    {dayData.day && (
                      <>
                        <div className={`text-sm font-medium mb-1 ${
                          isCurrentDay ? 'text-blue-600 font-bold' : 'text-gray-900'
                        }`}>
                          {dayData.day}
                          {isCurrentDay && (
                            <span className="ml-1 text-xs bg-blue-600 text-white px-1 rounded">Today</span>
                          )}
                        </div>
                        
                        {/* Events for this day */}
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map(event => (
                            <div
                              key={event.id}
                              onClick={() => handleEventClick(event)}
                              className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                                event.priority === 'high' ? 'bg-red-200 text-red-800' :
                                event.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                                'bg-green-200 text-green-800'
                              }`}
                              title={`${event.title} - ${formatTime(event.start_time)}`}
                            >
                              <div className="font-medium truncate">{event.title}</div>
                              <div className="opacity-75">{formatTime(event.start_time)}</div>
                            </div>
                          ))}
                          
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-gray-500 font-medium">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Event Details Modal */}
        {showEventModal && selectedEvent && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
            <div className="relative mx-auto p-0 border w-full max-w-md shadow-lg rounded-lg bg-white overflow-hidden">
              <div className={`${selectedEvent.priority === 'high' ? 'bg-red-500' : 
                      selectedEvent.priority === 'medium' ? 'bg-yellow-500' : 
                      'bg-green-500'} p-4 text-white`}>
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold">{selectedEvent.title}</h3>
                  <button 
                    onClick={() => setShowEventModal(false)}
                    className="text-white hover:text-gray-200 bg-gray-700 bg-opacity-30 rounded-full h-8 w-8 flex items-center justify-center transition-colors"
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
                  <p className="text-sm font-medium">{formatDate(new Date(selectedEvent.start_time))}</p>
                  <p className="text-sm text-gray-600">{formatTime(selectedEvent.start_time)} - {formatTime(selectedEvent.end_time)}</p>
                  
                  {selectedEvent.venue && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-gray-600">{selectedEvent.venue}</p>
                    </div>
                  )}
                </div>
                
                <div className="pt-2 border-t border-gray-200 flex justify-end space-x-2">
                  <button
                    onClick={() => setShowEventModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowEventModal(false);
                      navigate('/create-event', {
                        state: {
                          editMode: true,
                          event: selectedEvent,
                          message: "Edit this event",
                          messageType: "info"
                        }
                      });
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    Edit Event
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Reports() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p>Reports feature coming soon!</p>
      </div>
    </div>
  );
}

function ManageUsers() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Manage Users</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p>User management coming soon!</p>
      </div>
    </div>
  );
}

// Main App component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App min-h-screen bg-gray-100">
          <Header />
          <main className="flex-1">
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
                path="/create-event"
                element={
                  <ProtectedRoute>
                    <CreateEvent />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-with-ai"
                element={
                  <ProtectedRoute>
                    <CreateWithAI />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminDashboardWrapper />
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
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Reports />
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
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
