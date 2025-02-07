const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const OpenAI = require("openai");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mongoose = require("mongoose");
require("dotenv").config();

// ✅ Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(cors({ origin: "*", credentials: true }));
app.use(bodyParser.json());

// ✅ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ Define Mongoose Schema
const SummarySchema = new mongoose.Schema({
  filename: String,
  text: String,
  summary: String,
  createdAt: { type: Date, default: Date.now },
});

const Summary = mongoose.model("Summary", SummarySchema);

// ✅ Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Make sure your `.env` file has the API key
});

// ✅ Summarization Route
app.post("/summarize", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided" });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: `Summarize the following text:\n${text}` }],
      temperature: 0.7,
      max_tokens: 400,
    });

    if (response.choices?.length > 0) {
      const summary = response.choices[0].message.content.trim();
      const newSummary = new Summary({ text, summary });
      await newSummary.save(); // ✅ Save summary to MongoDB
      res.json({ summary });
    } else {
      throw new Error("Empty response from OpenAI");
    }
  } catch (error) {
    console.error("❌ Summarization Error:", error);
    res.status(500).json({ error: "Summarization failed." });
  }
});

// ✅ Generate Practice Questions Route
app.post("/generate-questions", async (req, res) => {
  const { summary } = req.body;

  if (!summary) return res.status(400).json({ error: "No summary provided" });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: `Generate 3 practice questions based on this summary:\n${summary}\nFormat:\nQ1: [question]\nA: [answer]` }],
      temperature: 0.7,
      max_tokens: 600,
    });

    const questionsText = response.choices[0].message.content;
    console.log("🔍 Raw OpenAI Response:", questionsText);

    // ✅ Extracting Questions Properly
    const questionPattern = /Q\d+:\s(.+?)\nA:\s(.+?)(?:\n|$)/g;
    let match;
    let questions = [];

    while ((match = questionPattern.exec(questionsText)) !== null) {
      questions.push({
        question: match[1].trim(),
        answer: match[2].trim(),
      });
    }

    if (questions.length === 0) {
      throw new Error("No valid questions extracted");
    }

    console.log("✅ Processed Questions:", questions);
    res.json({ questions });
  } catch (error) {
    console.error("❌ Question Generation Error:", error);
    res.status(500).json({ error: "Question generation failed.", details: error.message });
  }
});

// ✅ PDF Upload Route
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post("/upload", upload.single("pdf"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const data = await pdfParse(req.file.buffer);
    const newSummary = new Summary({ filename: req.file.originalname, text: data.text });
    await newSummary.save(); // ✅ Save uploaded text to MongoDB
    res.json({ text: data.text.trim() });
  } catch (error) {
    console.error("❌ PDF Parsing Error:", error);
    res.status(500).json({ error: "Failed to extract text from PDF" });
  }
});

// ✅ Fetch All Summaries
app.get("/summaries", async (req, res) => {
  try {
    const summaries = await Summary.find().sort({ createdAt: -1 }); // ✅ Sort newest first
    res.json(summaries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch summaries." });
  }
});

// ✅ Delete a Summary
app.delete("/summaries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Summary.findByIdAndDelete(id);
    res.json({ success: true, message: "Summary deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete summary." });
  }
});

// ✅ Start the Server
app.listen(PORT, () => console.log(`🔥 Server running on http://localhost:${PORT}`));
