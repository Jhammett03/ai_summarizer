const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const OpenAI = require("openai");
require("dotenv").config();

// ✅ Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(cors());
app.use(bodyParser.json());

// ✅ Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Make sure you set this in `.env`
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

    res.json({ summary: response.choices[0].message.content });
  } catch (error) {
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
      messages: [{ role: "user", content: `Generate 3 practice questions based on this summary:\n${summary}\nFormat:\nQ: [question]\nA: [answer]` }],
      temperature: 0.7,
      max_tokens: 600,
    });

    const questionsText = response.choices[0].message.content;
    console.log("Raw OpenAI Response:", questionsText); // ✅ Debugging line

    const questions = questionsText
      .split("\n")
      .filter((line) => line.startsWith("Q:") || line.startsWith("A:"))
      .reduce((acc, line, index, arr) => {
        if (line.startsWith("Q:")) {
          acc.push({ 
            question: line.slice(2).trim(), 
            answer: arr[index + 1]?.startsWith("A:") ? arr[index + 1].slice(2).trim() : "Answer not found" 
          });
        }
        return acc;
      }, []);

    res.json({ questions });
  } catch (error) {
    res.status(500).json({ error: "Question generation failed." });
  }
});

// ✅ Start the Server
app.listen(PORT, () => console.log(`🔥 Server running on http://localhost:${PORT}`));
