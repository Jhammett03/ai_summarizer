import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ✅ Create an Axios instance with default settings
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // ✅ Ensures cookies are sent for authentication
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;
