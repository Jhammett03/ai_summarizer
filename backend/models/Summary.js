const mongoose = require("mongoose");

const SummarySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ✅ Link to User
  filename: String,
  text: String,
  summary: String,
  questions: [{ question: String, answer: String }], // ✅ Store questions too
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Summary", SummarySchema);
