import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from 'react-native';

// ─── Toggle this to test locally ─────────────────────────────────────────────
const LOCAL_MODE = false;  // set true to use local backend, false for Render
const LOCAL_IP   = "172.16.61.155"; // your PC's LAN IP (run `ipconfig` to check)
const LOCAL_PORT = 5000;
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL = LOCAL_MODE
  ? `http://${LOCAL_IP}:${LOCAL_PORT}/api`
  : "https://lenden-an-e-commerce-app.onrender.com/api";

export const SOCKET_URL = LOCAL_MODE
  ? `http://${LOCAL_IP}:${LOCAL_PORT}`
  : "https://lenden-an-e-commerce-app.onrender.com";

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
  const responseText = await response.text();

  let result;
  try {
    result = responseText ? JSON.parse(responseText) : {};
  } catch (err) {
    console.error(`[API] Invalid JSON from ${method} ${endpoint}:`, responseText.substring(0, 200));
    throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 100)}`);
  }

  if (!response.ok) {
    console.error(`[API] ${method} ${endpoint} → ${response.status}:`, result.message);
    throw new Error(result.message || `Request failed with status ${response.status}`);
  }

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
  sendOtp: (data) => apiRequest("/auth/send-otp", "POST", data),
  verifyOtpAndSignup: (data) => apiRequest("/auth/verify-otp", "POST", data),
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

export const orderAPI = {
  createOrder: (d) => apiRequest("/orders/create", "POST", d),
  getMyOrders: () => apiRequest("/orders/mine"),
  getSellingOrders: () => apiRequest("/orders/selling"),
  updateStatus: (id, status) => apiRequest(`/orders/${id}/status`, "PATCH", { status }),
};

export const paymentAPI = {
  createRazorpayOrder: (d) => apiRequest("/payments/create-order", "POST", d),
  verifyPayment: (d) => apiRequest("/payments/verify", "POST", d),
};

export const userAPI = {
  getWishlist: async () => {
    try {
      const result = await apiRequest("/user/wishlist");
      if (result.success && result.wishlist) return { success: true, data: result.wishlist };
      if (result.data)                        return { success: true, data: result.data };
      if (Array.isArray(result))              return { success: true, data: result };
      return { success: true, data: [] };
    } catch (error) {
      console.error("[API] getWishlist failed:", error.message);
      return { success: false, data: [], error: error.message };
    }
  },
  toggleWishlist: async (itemId) => {
    try {
      const result = await apiRequest("/user/wishlist/toggle", "POST", { itemId });
      if (result.success && result.wishlist) return { success: true, wishlist: result.wishlist };
      if (result.data)                       return { success: true, wishlist: result.data };
      return { success: true, wishlist: [] };
    } catch (error) {
      console.error("[API] toggleWishlist failed:", error.message);
      throw error;
    }
  },
};

export const chatAPI = {
  getOrCreate:      (d)  => apiRequest("/chat/conversation", "POST", d),
  getConversations: ()   => apiRequest("/chat/conversations"),
  getMessages:      (id) => apiRequest(`/chat/messages/${id}`),
  sendMessage:      (d)  => apiRequest("/chat/messages", "POST", d),
  getUnread:        ()   => apiRequest("/chat/unread"),
};

export function itemRoomId(itemId, emailA, emailB) {
  const sorted = [emailA, emailB].sort();
  return `item_${itemId}_${sorted[0]}_${sorted[1]}`;
}
export function requestRoomId(requestId, emailA, emailB) {
  const sorted = [emailA, emailB].sort();
  return `req_${requestId}_${sorted[0]}_${sorted[1]}`;
}