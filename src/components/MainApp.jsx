import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import Navbar from "./Navbar";
const API_URL = process.env.REACT_APP_API_URL;

export default function MainApp({ user, onLogout }) {
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

  // ✅ Fetch past summaries for the logged-in user
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await axios.get(`${API_URL}/summaries`, {
        withCredentials: true,
      });
      setHistory(response.data);
    } catch (err) {
      setError("Failed to load history.");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // ✅ Delete a saved summary
  const handleDeleteSummary = async (id) => {
    try {
      await axios.delete(`${API_URL}/summaries/${id}`, {
        withCredentials: true,
      });
      setHistory(history.filter((entry) => entry._id !== id));
    } catch (err) {
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
  
      console.log("Generated Questions:", response.data.questions); // ✅ Debugging log
  
      if (!response.data.questions || response.data.questions.length === 0) {
        throw new Error("No questions returned from server");
      }
  
      setQuestions(response.data.questions);
  
      // ✅ Update history to reflect the new questions
      setHistory(history.map(entry => 
        entry._id === history[0]?._id ? { ...entry, questions: response.data.questions } : entry
      ));
  
    } catch (err) {
      setError("Failed to generate questions.");
      console.error("Question Generation Error:", err);
    } finally {
      setLoadingQuestions(false);
    }
  };
  

  const generateSummaryName = (summaryText, index) => {
    if (!summaryText) return `Summary #${index + 1}`;
    const words = summaryText.split(" ").filter(word => word.length > 3); // Ignore short words
    const name = words.slice(0, 3).join(" "); // Get first 2-3 words
    return name || `Summary #${index + 1}`;
  };

  return (
    <div
      className={`${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"
      } min-h-screen flex flex-col items-center`}
    >
      <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} onLogout={onLogout} user={user}
      showHistory={showHistory} setShowHistory={setShowHistory} 
      />

      <div className="flex flex-col items-center justify-center w-full pt-20 p-20">
        <h1 className="text-4xl font-bold p-10">AI Summarizer</h1>

        {/* ✅ File Upload */}
        <motion.div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="mb-4 p-2 border border-gray-300 dark:border-gray-600 rounded-md w-full"
          />

          {/* ✅ Text Area */}
          <textarea
            className="w-full h-40 p-4 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
            placeholder="Paste your text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          {/* ✅ Summarize Button */}
          <button
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg mt-4"
            onClick={handleSummarize}
            disabled={loadingSummary}
          >
            {loadingSummary ? "Summarizing..." : "Summarize"}
          </button>
        </motion.div>

        {/* ✅ Summary Output */}
        {summary && (
          <motion.div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-6">
            <h2 className="text-xl font-semibold mb-2">Summary:</h2>
            <p>{summary}</p>

            {/* ✅ Generate Questions Button */}
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

      {/* ✅ Collapsible Right Sidebar */}
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
