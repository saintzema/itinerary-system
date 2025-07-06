// Application Constants

export const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200",
};

export const PRIORITY_LABELS = {
  high: "High Priority",
  medium: "Medium Priority", 
  low: "Low Priority",
};

export const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'No Reminders' },
  { value: 'once_daily', label: 'Once a day' },
  { value: 'twice_daily', label: 'Twice a day' },
  { value: 'three_times_daily', label: '3 times a day' },
  { value: 'four_times_daily', label: '4 times a day' },
  { value: 'five_times_daily', label: '5 times a day' },
];

export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  USER: 'user',
};

export const NOTIFICATION_TYPES = {
  EVENT_CREATED: 'event_created',
  EVENT_UPDATED: 'event_updated',
  EVENT_DELETED: 'event_deleted',
  EVENT_REMINDER: 'event_reminder',
};

export const DATE_FORMATS = {
  DISPLAY: {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  },
  TIME: {
    hour: '2-digit',
    minute: '2-digit'
  },
};

export const MESSAGES = {
  SUCCESS: {
    EVENT_CREATED: 'Event created successfully!',
    EVENT_UPDATED: 'Event updated successfully!',
    EVENT_DELETED: 'Event deleted successfully!',
    LOGIN: 'Logged in successfully!',
    REGISTRATION: 'Registration successful! Please log in.',
  },
  ERROR: {
    GENERIC: 'Something went wrong. Please try again.',
    LOGIN_FAILED: 'Login failed. Please check your credentials.',
    REGISTRATION_FAILED: 'Registration failed. Please try again.',
    EVENT_LOAD_FAILED: 'Failed to load events.',
    EVENT_CREATE_FAILED: 'Failed to create event.',
    EVENT_UPDATE_FAILED: 'Failed to update event.',
    EVENT_DELETE_FAILED: 'Failed to delete event.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
  },
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required.',
    INVALID_EMAIL: 'Please enter a valid email address.',
    PASSWORD_TOO_SHORT: 'Password must be at least 6 characters.',
    END_TIME_INVALID: 'End time must be after start time.',
  },
};

export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme',
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/token',
    REGISTER: '/users',
    CURRENT_USER: '/users/me',
  },
  EVENTS: {
    BASE: '/events',
    BY_ID: (id) => `/events/${id}`,
  },
  NOTIFICATIONS: {
    BASE: '/notifications',
    MARK_READ: (id) => `/notifications/${id}/read`,
  },
};