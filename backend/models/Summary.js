const mongoose = require("mongoose");

const summarySchema = new mongoose.Schema({
  text: String,
  summary: String,
  filename: String, // Stores PDF file name
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Summary", summarySchema);
