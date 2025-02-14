const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const OpenAI = require("openai");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const User = require("./models/User");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT;
const ORIGIN = process.env.ORIGIN;

//CORS Allows cross origin cookies
app.use(
  cors({
    origin: function (origin, callback) {
      if (ORIGIN) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Allows session cookies
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());


//  **Body Parser Middleware**
app.use(bodyParser.json());

// **Session Configuration (Persists User Login)**
app.set("trust proxy", 1); // Required for Render & local development

app.use(
  session({
    secret: process.env.SECRET_KEY || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
      secure: process.env.NODE_ENV === "production", // Secure only in production
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", // Allows local cross-origin requests
      httpOnly: true,
    },
  })
);




// **MongoDB Connection**
mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// **Define Summary Schema**
const SummarySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  filename: String,
  text: String,
  summary: String,
  questions: [{ question: String, answer: String }],
  createdAt: { type: Date, default: Date.now },
});
const Summary = mongoose.model("Summary", SummarySchema);

// **Initialize OpenAI API**
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// **User Registration**
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username: username.trim(), password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    res.status(500).json({ error: "Registration failed." });
  }
});

// **User Login (Ensures Session Persists)**
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    // Explicitly store user data in session
    req.session.user = { _id: user._id, username: user.username };

    // Manually save the session to ensure it persists
    req.session.save((err) => {
      if (err) {
        console.error("❌ Session Save Error:", err);
        return res.status(500).json({ error: "Session save failed" });
      }
      console.log("✅ User Logged In & Session Saved:", req.session.user);
      res.json({ user: req.session.user });
    });

  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({ error: "Login failed." });
  }
});

// Check session after login
app.get("/me", async (req, res) => {
  console.log("📌 Checking Session:", req.session);
  
  if (!req.session || !req.session.user) {
    console.log("❌ No Session Found!");
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const sessionUser = req.session.user;
    console.log("✅ Session Found:", sessionUser);
    return res.json({ user: sessionUser });
  } catch (error) {
    console.error("❌ Session Retrieval Error:", error);
    return res.status(500).json({ error: "Server error retrieving session" });
  }
});

// **User Logout**
app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ message: "Logged out successfully" }));
});

// **Summarization**
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
      await newSummary.save();
      res.json({ summary, summaryId: newSummary._id });
    } else {
      throw new Error("Empty response from OpenAI");
    }
  } catch (error) {
    console.error("❌ Summarization Error:", error);
    res.status(500).json({ error: "Summarization failed." });
  }
});

// **Fetch User's Summaries**
app.get("/summaries", async (req, res) => {
  console.log("📌 Checking Session:", req.session);
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const summaries = await Summary.find({ userId: req.session.user._id }).sort({ createdAt: -1 });
  res.json(summaries);
});

// **PDF Upload**
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post("/upload", upload.single("pdf"), async (req, res) => {
  const userId = req.session.user?._id;

  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const data = await pdfParse(req.file.buffer);
    const newSummary = new Summary({ userId, filename: req.file.originalname, text: data.text });
    await newSummary.save();
    res.json({ text: data.text.trim() });
  } catch (error) {
    console.error("❌ PDF Parsing Error:", error);
    res.status(500).json({ error: "Failed to extract text from PDF" });
  }
});

// Generate Practice Questions Route
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

    // Update summary with generated questions
    await Summary.findByIdAndUpdate(summaryId, { questions });

    res.json({ questions });
  } catch (error) {
    console.error("❌ Question Generation Error:", error);
    res.status(500).json({ error: "Question generation failed." });
  }
});

// Delete a Summary
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

// **Start Server**
app.listen(PORT, () => console.log(`🔥 Server running on http://localhost:${PORT}`));
