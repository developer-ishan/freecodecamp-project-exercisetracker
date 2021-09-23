const mongoose = require('mongoose');
const exerciseSchema = new mongoose.Schema({
  user: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: "exUser"
  },
  duration: Number,
  date: Date,
  description: String,
}, {timestamps: true})

module.exports = mongoose.model("Exercise", exerciseSchema);