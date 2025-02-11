import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL; // ✅ Correct for Vite

if (!API_BASE_URL) {
  console.error("❌ API URL is missing! Set VITE_API_URL in environment variables.");
}

console.log("🔍 API Base URL:", API_BASE_URL); // ✅ Debugging output

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,  // ✅ This should be "https://ai-summarizer-8vz4.onrender.com"
  withCredentials: true,  // ✅ Ensures cookies/session handling
});

export default axiosInstance;
