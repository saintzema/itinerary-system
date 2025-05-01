import { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
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
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);

      const response = await axios.post(`${API}/token`, formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const { access_token } = response.data;
      localStorage.setItem("token", access_token);

      // Fetch user profile with the token
      const userData = await getUserProfile(access_token);
      setUser(userData);
      return userData;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API}/users`, userData);
      return response.data;
    } catch (error) {
      console.error("Registration error:", error);
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
        <Link to="/" className="text-xl font-bold">Itinerary Management System</Link>
        <nav>
          <ul className="flex space-x-4">
            {user ? (
              <>
                <li>
                  <Link to="/dashboard" className="hover:text-gray-300">Dashboard</Link>
                </li>
                <li>
                  <Link to="/calendar" className="hover:text-gray-300">Calendar</Link>
                </li>
                {(user.role === "admin" || user.role === "staff") && (
                  <li>
                    <Link to="/manage-users" className="hover:text-gray-300">Manage Users</Link>
                  </li>
                )}
                <li>
                  <button 
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/login" className="hover:text-gray-300">Login</Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-gray-300">Register</Link>
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
      setError("Invalid username or password");
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
      if (error.response && error.response.data) {
        setError(error.response.data.detail || "Registration failed");
      } else {
        setError("Registration failed. Please try again.");
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

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem("token");
        // Get today's date and 30 days from now for initial load
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 30);

        const response = await axios.get(`${API}/events`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            start_date: today.toISOString(),
            end_date: endDate.toISOString(),
          },
        });

        setEvents(response.data);
      } catch (error) {
        console.error("Error fetching events:", error);
        setError("Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const priorityColors = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-green-100 text-green-800 border-green-200",
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Welcome, {user?.full_name}</h1>
        <Link
          to="/create-event"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Create New Event
        </Link>
      </div>

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
                  className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
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
                      <Link
                        to={`/events/${event.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Create Event Component
function CreateEvent() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    venue: "",
    priority: "medium",
    recurrence: "none",
    recurrence_end_date: "",
    participants: []
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  // Helper function to format date-time for input
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
      await axios.post(`${API}/events`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      navigate("/dashboard");
    } catch (error) {
      if (error.response && error.response.data) {
        setError(error.response.data.detail || "Failed to create event");
      } else {
        setError("Failed to create event. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Create New Event</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
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
          >
            {loading ? "Creating..." : "Create Event"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Placeholder for Calendar component
function Calendar() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Calendar View</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-center text-gray-500">Calendar view coming soon</p>
      </div>
    </div>
  );
}

// Placeholder for ManageUsers component
function ManageUsers() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Manage Users</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-center text-gray-500">User management coming soon</p>
      </div>
    </div>
  );
}

// Main App component
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
            </Routes>
          </main>
        </Router>
      </AuthProvider>
    </div>
  );
}

export default App;
