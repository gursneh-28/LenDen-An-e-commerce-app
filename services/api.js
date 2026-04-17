import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from 'react-native';

const API_BASE_URL = Platform.OS === 'web'
  ? "http://localhost:5000/api"
  : "http://172.16.61.155:5000/api";

export async function saveToken(token) {
  await AsyncStorage.setItem("token", token);
}
export async function saveUser(user) {
  await AsyncStorage.setItem("user", JSON.stringify(user));
}
export async function getUser() {
  const u = await AsyncStorage.getItem("user");
  return u ? JSON.parse(u) : null;
}
export async function clearSession() {
  await AsyncStorage.multiRemove(["token", "user"]);
}
async function getToken() {
  return await AsyncStorage.getItem("token");
}

async function apiRequest(endpoint, method = "GET", data = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = await getToken();

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (data) options.body = JSON.stringify(data);

  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Something went wrong");
  return result;
}

async function apiUpload(endpoint, formData) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = await getToken();

  const response = await fetch(url, {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Something went wrong");
  return result;
}

export const authAPI = {
  // Step 1 — validate domain & send OTP
  sendOtp: (data) => apiRequest("/auth/send-otp", "POST", data),

  // Step 2 — verify OTP and create account
  verifyOtpAndSignup: (data) => apiRequest("/auth/verify-otp", "POST", data),

  // Login
  login: (data) => apiRequest("/auth/login", "POST", data),
};

export const itemAPI = {
  uploadItem: (formData) => apiUpload("/items/upload", formData),
  getItems: () => apiRequest("/items/all"),
  getMyItems: () => apiRequest("/items/mine"),
  updateItem: (id, data) => apiRequest(`/items/${id}`, "PUT", data),
  deleteItem: (id) => apiRequest(`/items/${id}`, "DELETE"),
};

export const requestAPI = {
  createRequest: (data) => apiRequest("/requests/create", "POST", data),
  getRequests: () => apiRequest("/requests/all"),
  getMyRequests: () => apiRequest("/requests/mine"),
  updateRequest: (id, data) => apiRequest(`/requests/${id}`, "PUT", data),
  deleteRequest: (id) => apiRequest(`/requests/${id}`, "DELETE"),
};

export const userAPI = {
  getWishlist: () => apiRequest("/user/wishlist"),
  toggleWishlist: (itemId) => apiRequest("/user/wishlist/toggle", "POST", { itemId }),
};