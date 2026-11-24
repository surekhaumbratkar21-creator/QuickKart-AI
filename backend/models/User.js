
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },

    password: {
      type: String,
      required: true,
      minlength: 6
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    // OTP Authentication
    otpHash: {
      type: String,
      default: null
    },

    otpExpires: {
      type: Date,
      default: null
    },

    otpPurpose: {
      type: String,
      enum: ["login", "register", "reset", null],
      default: null
    },

    otpAttempts: {
      type: Number,
      default: 0
    },

    otpSentAt: {
      type: Date,
      default: null
    },

    pendingName: {
      type: String,
      default: null
    },

    // Password reset
    resetTokenHash: {
      type: String,
      default: null
    },

    resetTokenExpires: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
