import { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import Navbar from "./components/Navbar";

export default function App() {
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
  const [showHistory, setShowHistory] = useState(false); // ✅ Collapsible history menu

  const toggleDarkMode = () => setDarkMode(!darkMode);
  const MAX_CHARACTERS = 12000;

  // ✅ Fetch past summaries
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await axios.get("http://localhost:5000/summaries");
      setHistory(response.data);
    } catch (err) {
      setError("Failed to load history.");
    } finally {
      setLoadingHistory(false);
    }
  };

  // ✅ Delete a saved summary
  const handleDeleteSummary = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/summaries/${id}`);
      setHistory(history.filter((entry) => entry._id !== id)); // ✅ Update history state
    } catch (err) {
      setError("Failed to delete summary.");
    }
  };

  // ✅ Summarize text
  const handleSummarize = async () => {
    if (!text) return setError("Please enter text to summarize.");
    if (text.length > MAX_CHARACTERS) return setError(`Text exceeds ${MAX_CHARACTERS} characters.`);

    setLoadingSummary(true);
    setError("");

    try {
      const response = await axios.post("http://localhost:5000/summarize", { text });
      setSummary(response.data.summary);
      setQuestions([]);
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
        const response = await axios.post("http://localhost:5000/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setText(response.data.text);
      } catch (error) {
        setError("Error extracting text from PDF.");
      }
    }
  };

  // ✅ Generate Questions
  const handleGenerateQuestions = async () => {
    if (!summary) return setError("Summarize first before generating questions.");

    setLoadingQuestions(true);
    setError("");

    try {
      const response = await axios.post("http://localhost:5000/generate-questions", { summary });
      setQuestions(response.data.questions);
    } catch (err) {
      setError("Failed to generate questions.");
    } finally {
      setLoadingQuestions(false);
    }
  };

  return (
    <div className={`${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"} min-h-screen flex flex-col items-center`}>
      
      <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

      <div className="flex flex-col items-center justify-center w-full pt-20 p-20">
        <h1 className="text-4xl font-bold p-10">AI Summarizer</h1>

        {/* ✅ File Upload */}
        <motion.div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="mb-4 p-2 border border-gray-300 dark:border-gray-600 rounded-md w-full text-white"
          />

          {/* ✅ Text Area */}
          <textarea
            className="w-full h-40 p-4 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-400 outline-none text-black dark:text-white 
            scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent resize-none"
            placeholder="Paste your text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          {/* ✅ Summarize Button */}
          <button
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg mt-4 transition duration-300"
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
            <p className="text-gray-900 dark:text-white">{summary}</p>

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

        {/* ✅ Practice Questions */}
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

        {/* ✅ Collapsible History Button */}
        <button
          className="mt-8 px-6 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition duration-300"
          onClick={() => {
            if (!showHistory) fetchHistory();
            setShowHistory(!showHistory);
          }}
        >
          {showHistory ? "Hide History" : "View History"}
        </button>

        {/* ✅ History Section (Collapsible) */}
        {showHistory && history.length > 0 && (
          <motion.div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-6">
            <h2 className="text-xl font-semibold mb-2">Past Summaries:</h2>
            {history.map((entry, index) => (
              <details key={index} className="mb-3 border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                <summary className="cursor-pointer font-medium">
                  {entry.filename ? `📄 ${entry.filename}` : `Summary #${index + 1}`}
                </summary>
                <p className="mt-2 text-gray-700 dark:text-gray-300">{entry.summary}</p>
                <button
                  className="mt-2 px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  onClick={() => handleDeleteSummary(entry._id)}
                >
                  Delete
                </button>
              </details>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
