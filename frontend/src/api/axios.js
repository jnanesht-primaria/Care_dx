// frontend/src/api/axios.js
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const axiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// --- Request Interceptor: Attach token ---
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("caredx_token");
  console.log("🔑 Token from localStorage:", token ? "✅ Present" : "❌ Missing");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn("⚠️ No token found – request may fail");
  }
  return config;
});

// --- Response Interceptor: Handle 401/422 ---
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 422) {
      console.error("🚨 Auth error – redirecting to login");
      localStorage.removeItem("caredx_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// --- Login helper ---
export async function loginRequest(email, password) {
  try {
    const res = await axiosInstance.post("/api/login", { email, password });
    return res.data; // { access_token, user }
  } catch (err) {
    const message = err.response?.data?.message || "Login failed";
    throw new Error(message);
  }
}

// --- Dashboard fetch (optional) ---
export async function fetchDashboard(role) {
  const path = role.toLowerCase();
  try {
    const res = await axiosInstance.get(`/api/${path}/dashboard`);
    return res.data;
  } catch (err) {
    const message = err.response?.data?.message || "Request failed";
    throw new Error(message);
  }
}

export default axiosInstance;