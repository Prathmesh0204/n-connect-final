const API_CONFIG = {
  BASE_URL: 'http://127.0.0.1:8000/api',

  getHeaders: (token = null) => {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      // ✅ CRITICAL: The header format must be "Token [space] [key]"
      headers['Authorization'] = `Token ${token}`;
    }

    return headers;
  },

  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login/',
      REGISTER: '/auth/registration/',
      LOGOUT: '/auth/logout/',
      USER: '/auth/user/', // This is for dj_rest_auth user details, can be left as is.
      // ✅ FIX: Changed this to point to your custom UserStatusView endpoint
      USER_STATUS: '/user-status/'
    },
    ADMIN: {
      DASHBOARD: '/admin/dashboard/',
      USERS: '/users/',
      FLATS: '/flats/',
      BILLS: '/bills/',
      COMPLAINTS: '/complaints/',
      VEHICLES: '/vehicles/',
      CAMERA_REQUESTS: '/camera-requests/',
      NOTIFICATIONS: '/notifications/'
    }
  }
};

export default API_CONFIG;
