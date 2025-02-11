import axios from "axios";

const API_BASE_URL = process.env.VITE_API_URL || "http://localhost:5000";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Ensure cookies are sent if using authentication
});

export default axiosInstance;
