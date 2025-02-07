import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "./components/Navbar";

export default function App() {
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [questions, setQuestions] = useState([]); // ✅ Holds questions
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(true);

  const toggleDarkMode = () => setDarkMode(!darkMode);
  const MAX_CHARACTERS = 12000;

  const handleSummarize = async () => {
    if (!text) {
      setError("Please enter text to summarize.");
      return;
    }

    if (text.length > MAX_CHARACTERS) {
      setError(`Text is too long. Keep it under ${MAX_CHARACTERS} characters.`);
      return;
    }

    setLoadingSummary(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5000/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Summarization failed.");
      setSummary(data.summary);
      setQuestions([]); // ✅ Clear questions when new summary is generated
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!summary) {
      setError("Summarize first before generating questions.");
      return;
    }

    setLoadingQuestions(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5000/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate questions.");

      console.log("Questions received:", data.questions); // ✅ Debugging line
      setQuestions(data.questions); // ✅ Make sure this updates correctly
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingQuestions(false);
    }
  };

  return (
    <div className={`${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"} min-h-screen flex flex-col items-center`}>
      
      <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

      <div className="flex flex-col items-center justify-center w-full pt-20">
        <h1 className="text-4xl font-bold p-20">AI Summarizer</h1>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <textarea
  className="w-full h-40 p-4 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-400 outline-none text-gray-900 dark:text-white 
  scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent resize-none"
  placeholder="Paste your text here..."
  value={text}
  onChange={(e) => setText(e.target.value)}
/>




          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <button
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg mt-4 transition duration-300"
            onClick={handleSummarize}
            disabled={loadingSummary}
          >
            {loadingSummary ? "Summarizing..." : "Summarize"}
          </button>
        </motion.div>

        {summary && (
          <motion.div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-6">
            <h2 className="text-xl font-semibold mb-2">Summary:</h2>
            <p className="text-gray-900 dark:text-white">{summary}</p>
            <button
              className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              onClick={handleGenerateQuestions}
              disabled={loadingQuestions}
            >
              {loadingQuestions ? "Generating Questions..." : "Generate Questions"}
            </button>
          </motion.div>
        )}

        {/* ✅ Practice Questions Section */}
        {questions.length > 0 && (
          <motion.div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-6">
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
    </div>
  );
}
