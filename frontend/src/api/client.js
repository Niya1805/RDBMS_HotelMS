import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 12000,
});

export const extractApiError = (err) => {
  if (err?.response?.data?.error?.message) {
    return err.response.data.error.message;
  }
  if (err?.response?.data?.message) {
    return err.response.data.message;
  }
  if (err?.message === 'Network Error') {
    return 'Cannot reach the Flask backend server (http://localhost:5000/api). Ensure the backend is running.';
  }
  return err?.message || 'An unexpected error occurred.';
};

// 1. System Health
export const fetchSystemHealth = async () => {
  const res = await apiClient.get('/health');
  return res.data;
};

// 2. Locations (Location entity)
export const fetchLocations = async (params = {}) => {
  const res = await apiClient.get('/locations', { params });
  return res.data;
};

export const fetchLocationById = async (lId) => {
  const res = await apiClient.get(`/locations/${lId}`);
  return res.data;
};

export const createLocation = async (payload, adminPasscode) => {
  const res = await apiClient.post('/locations', payload, {
    headers: { 'X-Admin-Passcode': adminPasscode },
  });
  return res.data;
};

export const updateLocation = async (lId, payload, adminPasscode) => {
  const res = await apiClient.put(`/locations/${lId}`, payload, {
    headers: { 'X-Admin-Passcode': adminPasscode },
  });
  return res.data;
};

// 3. Rooms & Services (Services entity)
export const fetchServices = async (params = {}) => {
  const res = await apiClient.get('/services', { params });
  return res.data;
};

export const fetchAvailableServices = async (params = {}) => {
  const res = await apiClient.get('/services/available', { params });
  return res.data;
};

export const fetchServiceById = async (sId) => {
  const res = await apiClient.get(`/services/${sId}`);
  return res.data;
};

export const checkServiceAvailability = async (sId, params) => {
  const res = await apiClient.get(`/services/${sId}/availability`, { params });
  return res.data;
};

export const createService = async (payload, adminPasscode) => {
  const res = await apiClient.post('/services', payload, {
    headers: { 'X-Admin-Passcode': adminPasscode },
  });
  return res.data;
};

export const updateService = async (sId, payload, adminPasscode) => {
  const res = await apiClient.put(`/services/${sId}`, payload, {
    headers: { 'X-Admin-Passcode': adminPasscode },
  });
  return res.data;
};

// 4. Guests (User entity)
export const fetchUsers = async (params = {}) => {
  const res = await apiClient.get('/users', { params });
  return res.data;
};

export const fetchUserById = async (uId) => {
  const res = await apiClient.get(`/users/${uId}`);
  return res.data;
};

export const registerOrLookupUser = async (payload) => {
  const res = await apiClient.post('/users', payload);
  return res.data;
};

export const updateUser = async (uId, payload) => {
  const res = await apiClient.put(`/users/${uId}`, payload);
  return res.data;
};

// 5. Reservations & Cancellations (Bookings & Cancellation entities)
export const fetchBookings = async (params = {}) => {
  const res = await apiClient.get('/bookings', { params });
  return res.data;
};

export const fetchBookingById = async (bId) => {
  const res = await apiClient.get(`/bookings/${bId}`);
  return res.data;
};

export const createBooking = async (payload) => {
  const res = await apiClient.post('/bookings', payload);
  return res.data;
};

export const cancelBooking = async (bId, payload = {}) => {
  const res = await apiClient.post(`/bookings/${bId}/cancel`, payload);
  return res.data;
};

export const updateBookingStatus = async (bId, status, adminPasscode) => {
  const res = await apiClient.patch(
    `/bookings/${bId}/status`,
    { status },
    { headers: { 'X-Admin-Passcode': adminPasscode } }
  );
  return res.data;
};

export const fetchCancellations = async () => {
  const res = await apiClient.get('/cancellations');
  return res.data;
};

// 6. Payments & Invoices (Payment & Invoices entities)
export const fetchPayments = async (params = {}) => {
  const res = await apiClient.get('/payments', { params });
  return res.data;
};

export const createPayment = async (payload) => {
  const res = await apiClient.post('/payments', payload);
  return res.data;
};

export const fetchInvoices = async (params = {}) => {
  const res = await apiClient.get('/invoices', { params });
  return res.data;
};

export const fetchInvoiceById = async (iId) => {
  const res = await apiClient.get(`/invoices/${iId}`);
  return res.data;
};

export const generateInvoice = async (bId) => {
  const res = await apiClient.post('/invoices', { b_id: bId });
  return res.data;
};

// 7. Reviews & Notifications (Reviews & Notification entities)
export const fetchReviews = async (params = {}) => {
  const res = await apiClient.get('/reviews', { params });
  return res.data;
};

export const createReview = async (payload) => {
  const res = await apiClient.post('/reviews', payload);
  return res.data;
};

export const deleteReview = async (rId, adminPasscode) => {
  const res = await apiClient.delete(`/reviews/${rId}`, {
    headers: { 'X-Admin-Passcode': adminPasscode },
  });
  return res.data;
};

export const fetchNotifications = async (params = {}) => {
  const res = await apiClient.get('/notifications', { params });
  return res.data;
};

export const createNotification = async (payload, adminPasscode) => {
  const res = await apiClient.post('/notifications', payload, {
    headers: { 'X-Admin-Passcode': adminPasscode },
  });
  return res.data;
};

// 8. Analytical Reports
export const fetchSummaryReport = async () => {
  const res = await apiClient.get('/reports/summary');
  return res.data;
};

export const fetchRevenueReport = async () => {
  const res = await apiClient.get('/reports/revenue');
  return res.data;
};

export const fetchOccupancyReport = async (params = {}) => {
  const res = await apiClient.get('/reports/occupancy', { params });
  return res.data;
};

export default apiClient;
