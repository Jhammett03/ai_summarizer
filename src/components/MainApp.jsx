import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axiosInstance from "./api"; 
import Navbar from "./Navbar";

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

  // Check session on first load (persists login)
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("📌 Checking session...");
        const response = await axiosInstance.get("/me");
  
        if (response.data && response.data.user) {
          console.log("✅ Session Found:", response.data.user);
          setUser(response.data.user);
        } else {
          console.log("❌ No user in session response:", response.data);
        }
      } catch (err) {
        console.error("❌ No session found:", err.response?.data?.error || err.message);
      }
    };
    checkSession();
  }, []);
  

  // Fetch past summaries for the logged-in user
  const fetchHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      console.log("📌 Fetching History...");
      const response = await axiosInstance.get("/summaries");
      console.log("✅ History Response:", response.data);
      setHistory(response.data);
    } catch (err) {
      console.error("❌ History Fetch Error:", err.response?.data || err.message);
      setError("Failed to load history.");
    } finally {
      setLoadingHistory(false);
    }
  };
  

  useEffect(() => {
    if (user) fetchHistory();
  }, [user]);

  // Delete a saved summary
  const handleDeleteSummary = async (id) => {
    try {
      await axiosInstance.delete(`/summaries/${id}`);
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

  // Summarize text and save to MongoDB
  const handleSummarize = async () => {
    if (!text) return setError("Please enter text to summarize.");
    if (text.length > MAX_CHARACTERS)
      return setError(`Text exceeds ${MAX_CHARACTERS} characters.`);
  
    setLoadingSummary(true);
    setError("");
  
    try {
      console.log("📌 Sending Summarization Request...");
      const response = await axiosInstance.post("/summarize", { text });
      console.log("✅ Summarization Response:", response.data);
  
      setSummary(response.data.summary);
      setQuestions([]);
      await fetchHistory(); // Update history after summarization
    } catch (err) {
      console.error("❌ Summary Error:", err.response?.data || err.message);
      setError("Failed to summarize. Try again.");
    } finally {
      setLoadingSummary(false);
    }
  };
  

  // Upload PDF
  const handleFileUpload = async (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      const formData = new FormData();
      formData.append("pdf", selectedFile);

      try {
        const response = await axiosInstance.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setText(response.data.text);
      } catch (error) {
        console.error("❌ PDF Upload Error:", error);
        setError("Error extracting text from PDF.");
      }
    }
  };

  // Generate Questions and save them to MongoDB
  const handleGenerateQuestions = async () => {
    if (!summary) return setError("Summarize first before generating questions.");

    setLoadingQuestions(true);
    setError("");

    try {
      const response = await axiosInstance.post("/generate-questions", {
        summaryId: history[0]?._id,
        summary,
      });

      if (!response.data.questions || response.data.questions.length === 0) {
        throw new Error("No questions returned from server");
      }

      setQuestions(response.data.questions);

      // Update history to reflect the new questions
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
    <div
      className={`${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-100"
      } min-h-screen flex flex-col items-center`}
    >
      <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} onLogout={onLogout} user={user}
      showHistory={showHistory} setShowHistory={setShowHistory} 
      />

      <div className="flex flex-col items-center justify-center w-full pt-20 p-20">
        <h1 className="text-4xl font-bold p-10">AI Summarizer</h1>

        {/* File Upload */}
        <motion.div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 select-none">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="mb-4 p-2 border border-gray-300 dark:border-gray-600 rounded-md w-full text-white"
          />

          {/* Text Area */}
          <textarea
            className="w-full h-40 p-4 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
            placeholder="Paste your text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          {/* Summarize Button */}
          <button
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg mt-4"
            onClick={handleSummarize}
            disabled={loadingSummary}
          >
            {loadingSummary ? "Summarizing..." : "Summarize"}
          </button>
        </motion.div>

        {/* Summary Output */}
        {summary && (
          <motion.div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-6">
            <h2 className="text-xl font-semibold mb-2">Summary:</h2>
            <p>{summary}</p>

            {/* Generate Questions Button */}
            <button
              className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              onClick={handleGenerateQuestions}
              disabled={loadingQuestions}
            >
              {loadingQuestions ? "Generating Questions..." : "Generate Questions"}
            </button>
          </motion.div>
        )}
          {questions.length > 0 && (
            <motion.div className="w-full text-white max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-6">
              <h2 className="text-xl font-semibold mb-2">Practice Questions:</h2>
              {questions.map((q, index) => (
                <details key={index} className="mb-3 border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                  <summary className="cursor-pointer font-medium">{q.question}</summary>
                  <p className="mt-2 text-gray-700 dark:text-gray-300">{q.answer}</p>
                </details>
              ))}
            </motion.div>
          )}
      </div>

      {/* Collapsible Right Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full bg-gray-800 w-72 p-4 transition-transform duration-300 z-50 shadow-lg ${
          showHistory ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <h2 className="text-lg font-bold text-white">📜 History</h2>
        <button
          onClick={() => setShowHistory(false)}
          className="absolute top-2 right-2 text-white bg-gray-700 px-2 py-1 rounded"
        >
          ✖
        </button>
        <div className="mt-4 space-y-2">
          {history.length === 0 ? (
            <p className="text-gray-400">No history found.</p>
          ) : (
            history.map((entry, index) => (
              <div key ={entry.id || index}
              className="flex justify-between items-center bg-gray-700 hover:bg-gray-600 text-white rounded-lg p-3 cursor-pointer"
              >
              <button className="flex-grow  px-4" key={entry._id} onClick={() => handleLoadSummary(entry)}>
                {generateSummaryName(entry.summary, index)}
              </button>
              <button className="ml-2 text-red-400 hover:bg-red-400 border border-red-400 hover:border-red-600 bg-gray-800 p-2 rounded" onClick={() => handleDeleteSummary(entry._id)}>🗑
              </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}