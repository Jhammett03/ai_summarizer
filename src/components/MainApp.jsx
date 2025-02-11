import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import Navbar from "./Navbar";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function MainApp({ user, setUser, onLogout }) {
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [questions, setQuestions] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [file, setFile] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const toggleDarkMode = () => setDarkMode(!darkMode);
  const MAX_CHARACTERS = 12000;

  // ✅ Check session on first load (persists login)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await axios.get(`${API_URL}/me`, { withCredentials: true });
        setUser(response.data.user);
      } catch (err) {
        console.error("❌ No session found:", err.response?.data?.error || err.message);
      }
    };
    checkSession();
  }, []);

  // ✅ Fetch past summaries for the logged-in user
  const fetchHistory = async () => {
    if (!user) return;

    setLoadingHistory(true);
    try {
      const response = await axios.get(`${API_URL}/summaries`, { withCredentials: true });
      setHistory(response.data);
    } catch (err) {
      console.error("❌ History Fetch Error:", err);
      setError("Failed to load history.");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (user) fetchHistory();
  }, [user]);

  // ✅ Delete a saved summary
  const handleDeleteSummary = async (id) => {
    try {
      await axios.delete(`${API_URL}/summaries/${id}`, { withCredentials: true });
      setHistory(history.filter((entry) => entry._id !== id));
    } catch (err) {
      console.error("❌ Delete Summary Error:", err);
      setError("Failed to delete summary.");
    }
  };

  const handleLoadSummary = (entry) => {
    setSummary(entry.summary);
    setQuestions(entry.questions || []);
  };

  // ✅ Summarize text and save to MongoDB
  const handleSummarize = async () => {
    if (!text) return setError("Please enter text to summarize.");
    if (text.length > MAX_CHARACTERS)
      return setError(`Text exceeds ${MAX_CHARACTERS} characters.`);

    setLoadingSummary(true);
    setError("");

    try {
      const response = await axios.post(
        `${API_URL}/summarize`,
        { text },
        { withCredentials: true }
      );

      setSummary(response.data.summary);
      setQuestions([]);
      await fetchHistory(); // ✅ Update history after summarizing
    } catch (err) {
      console.error("❌ Summary Error:", err);
      setError("Failed to summarize. Try again.");
    } finally {
      setLoadingSummary(false);
    }
  };

  // ✅ Upload PDF
  const handleFileUpload = async (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      const formData = new FormData();
      formData.append("pdf", selectedFile);

      try {
        const response = await axios.post(`${API_URL}/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        });

        setText(response.data.text);
      } catch (error) {
        console.error("❌ PDF Upload Error:", error);
        setError("Error extracting text from PDF.");
      }
    }
  };

  // ✅ Generate Questions and save them to MongoDB
  const handleGenerateQuestions = async () => {
    if (!summary) return setError("Summarize first before generating questions.");

    setLoadingQuestions(true);
    setError("");

    try {
      const response = await axios.post(
        `${API_URL}/generate-questions`,
        { summaryId: history[0]?._id, summary },
        { withCredentials: true }
      );

      if (!response.data.questions || response.data.questions.length === 0) {
        throw new Error("No questions returned from server");
      }

      setQuestions(response.data.questions);

      // ✅ Update history to reflect the new questions
      setHistory(history.map(entry => 
        entry._id === history[0]?._id ? { ...entry, questions: response.data.questions } : entry
      ));

    } catch (err) {
      console.error("❌ Question Generation Error:", err);
      setError("Failed to generate questions.");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const generateSummaryName = (summaryText, index) => {
    if (!summaryText) return `Summary #${index + 1}`;
    const words = summaryText.split(" ").filter(word => word.length > 3);
    return words.slice(0, 3).join(" ") || `Summary #${index + 1}`;
  };

  return (
    <div className={`${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"} min-h-screen flex flex-col items-center`}>
      <Navbar 
        darkMode={darkMode} 
        toggleDarkMode={toggleDarkMode} 
        onLogout={onLogout} 
        user={user} 
        showHistory={showHistory} 
        setShowHistory={setShowHistory} 
      />

      <div className="flex flex-col items-center justify-center w-full pt-20 p-20">
        <h1 className="text-4xl font-bold p-10">AI Summarizer</h1>

        {/* ✅ File Upload */}
        <motion.div className="w-full max-w-3xl bg-gray-800 rounded-lg shadow-lg p-6 text-white">
          <input type="file" accept="application/pdf" onChange={handleFileUpload} className="mb-4 p-2 border border-gray-300 rounded-md w-full" />

          {/* ✅ Text Area */}
          <textarea className="w-full h-40 p-4 bg-gray-100 dark:bg-gray-700 border border-gray-300 rounded-md text-gray-800"
            placeholder="Paste your text here..." value={text} onChange={(e) => setText(e.target.value)}
          />

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          {/* ✅ Summarize Button */}
          <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg mt-4"
            onClick={handleSummarize} disabled={loadingSummary}
          >
            {loadingSummary ? "Summarizing..." : "Summarize"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
