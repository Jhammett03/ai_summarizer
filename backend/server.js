const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const OpenAI = require("openai");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mongoose = require("mongoose");
const session = require("express-session");
const User = require("./models/User");
const MongoStore = require("connect-mongo");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(bodyParser.json());

// ✅ Enable sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI, // Use your MongoDB connection string
      collectionName: "sessions", // Name of the session collection
    }),
    cookie: { secure: false, httpOnly: true }, // Set secure: true for HTTPS
  })
);


// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    ssl: true, // ✅ Ensure SSL is enabled
    tlsAllowInvalidCertificates: true, // ⚠️ Use only if needed
    serverSelectionTimeoutMS: 5000, // Timeout if connection fails
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));


// ✅ Define Mongoose Schema (Move this **above** the model declaration)
const SummarySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  filename: String,
  text: String,
  summary: String,
  questions: [{ question: String, answer: String }], // ✅ Store questions
  createdAt: { type: Date, default: Date.now },
});

const Summary = mongoose.model("Summary", SummarySchema); // ✅ Now this works

// ✅ Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure `.env` has the API key
});

app.get("/me", (req, res) => {
  if (req.session.user) {
    return res.json({ user: req.session.user });
  }
  res.status(401).json({ error: "Not authenticated" });
});


// ✅ Summarization Route
app.post("/summarize", async (req, res) => {
  const { text } = req.body;
  const userId = req.session.user?._id;
  if (!text) return res.status(400).json({ error: "No text provided" });
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: `Summarize the following text:\n${text}` }],
      temperature: 0.7,
      max_tokens: 400,
    });

    if (response.choices?.length > 0) {
      const summary = response.choices[0].message.content.trim();
      const newSummary = new Summary({ userId, text, summary });
      await newSummary.save(); // ✅ Save summary to MongoDB
      res.json({ summary, summaryId: newSummary._id });
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
  const { summaryId, summary } = req.body;
  const userId = req.session.user?._id;
  if (!summaryId || !summary) return res.status(400).json({ error: "No summary provided" });
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: `Generate 3 practice questions based on this summary:\n${summary}\nFormat:\nQ1: [question]\nA: [answer]` }],
      temperature: 0.7,
      max_tokens: 600,
    });

    const questionsText = response.choices[0].message.content;
    const questionPattern = /Q\d+:\s(.+?)\nA:\s(.+?)(?:\n|$)/g;
    let match;
    let questions = [];

    while ((match = questionPattern.exec(questionsText)) !== null) {
      questions.push({ question: match[1].trim(), answer: match[2].trim() });
    }

    if (questions.length === 0) throw new Error("No valid questions extracted");

    // ✅ Update summary with generated questions
    await Summary.findByIdAndUpdate(summaryId, { questions });

    res.json({ questions });
  } catch (error) {
    console.error("❌ Question Generation Error:", error);
    res.status(500).json({ error: "Question generation failed." });
  }
});

// ✅ PDF Upload Route
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post("/upload", upload.single("pdf"), async (req, res) => {
  const userId = req.session.user?._id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const data = await pdfParse(req.file.buffer);
    const newSummary = new Summary({ userId, filename: req.file.originalname, text: data.text });
    await newSummary.save(); // ✅ Save uploaded text to MongoDB
    res.json({ text: data.text.trim() });
  } catch (error) {
    console.error("❌ PDF Parsing Error:", error);
    res.status(500).json({ error: "Failed to extract text from PDF" });
  }
});

// ✅ Fetch User's Summaries
app.get("/summaries", async (req, res) => {
  const userId = req.session.user?._id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const summaries = await Summary.find({ userId }).sort({ createdAt: -1 });
    res.json(summaries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch summaries." });
  }
});

// ✅ Delete a Summary
app.delete("/summaries/:id", async (req, res) => {
  const userId = req.session.user?._id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { id } = req.params;
    await Summary.findOneAndDelete({ _id: id, userId });
    res.json({ success: true, message: "Summary deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete summary." });
  }
});

// ✅ User Registration Route
app.post("/register", async (req, res) => {
  console.log("🔍 Register Request Body:", req.body);

  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log("❌ Username already exists:", username);
      return res.status(400).json({ error: "Username already exists." });
    }

    console.log("✅ Creating new user...");
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username: username.trim(), password: hashedPassword });
    await newUser.save();

    console.log("✅ User Registered:", newUser);
    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    console.error("❌ Registration Error:", error);
    res.status(500).json({ error: "Registration failed." });
  }
});


// ✅ User Login Route
app.post("/login", async (req, res) => {
  console.log("🔍 Login Request Body:", req.body); // Debug request body

  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const user = await User.findOne({ username });

    if (!user) {
      console.log("❌ User Not Found in DB");
      return res.status(400).json({ error: "Invalid username or password" });
    }

    console.log("✅ User Found:", user); // Log retrieved user

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("🔑 Password Match:", isMatch);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    req.session.user = { _id: user._id, username: user.username };
    res.json({ user: req.session.user });

  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({ error: "Login failed." });
  }
});



// ✅ Logout Route
app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ message: "Logged out successfully" }));
});

// ✅ Start the Server
app.listen(PORT, () => console.log(`🔥 Server running on http://localhost:${PORT}`));
