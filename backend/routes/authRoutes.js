
const express = require("express");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const generateOTP = () =>
  crypto.randomInt(100000, 1000000).toString();

const hashValue = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const publicUser = (user) => ({
  id: user._id.toString(),
  _id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role
});

const sendOTPEmail = async (email, otp, purpose) => {
  const subject =
    purpose === "register"
      ? "QuickKart AI - Registration OTP"
      : purpose === "login"
      ? "QuickKart AI - Login OTP"
      : "QuickKart AI - Password Reset OTP";

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    text: `Your QuickKart AI OTP is ${otp}. It is valid for 10 minutes. Do not share this OTP with anyone.`
  });
};

const saveOTP = async (user, purpose) => {
  const otp = generateOTP();

  user.otpHash = hashValue(otp);
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  user.otpPurpose = purpose;
  user.otpAttempts = 0;
  user.otpSentAt = new Date();

  await user.save();
  await sendOTPEmail(user.email, otp, purpose);
};

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });

    if (user && user.isVerified) {
      return res.status(409).json({
        message: "Account already exists. Please login or use Forgot Password."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (!user) {
      user = new User({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "user",
        isVerified: false
      });
    } else {
      user.name = name.trim();
      user.password = hashedPassword;
    }

    await saveOTP(user, "register");

    return res.status(200).json({
      success: true,
      requiresOtp: true,
      message: "Registration OTP sent to your email."
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      message: "Registration failed. Please check your email settings."
    });
  }
});

// LOGIN - PASSWORD CHECK + OTP
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        message: "Account not found. Please register first."
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please complete email verification first."
      });
    }

    if (!user.password) {
      return res.status(400).json({
        message: "Please use Forgot Password to set your password."
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    await saveOTP(user, "login");

    return res.status(200).json({
      success: true,
      requiresOtp: true,
      message: "Login OTP sent to your email."
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed. Please try again."
    });
  }
});

// FORGOT PASSWORD - SEND OTP
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({
      email: normalizedEmail,
      isVerified: true
    });

    if (!user) {
      return res.status(404).json({
        message: "Verified account not found."
      });
    }

    await saveOTP(user, "reset");

    return res.status(200).json({
      success: true,
      requiresOtp: true,
      message: "Password reset OTP sent to your email."
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      message: "Could not send password reset OTP."
    });
  }
});

// VERIFY OTP - REGISTER / LOGIN / RESET
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail
    });

    if (!user || !user.otpHash || !user.otpPurpose) {
      return res.status(400).json({
        message: "No active OTP found. Please request a new OTP."
      });
    }

    if (user.otpExpires < new Date()) {
      return res.status(400).json({
        message: "OTP has expired. Please request a new OTP."
      });
    }

    if (user.otpAttempts >= 5) {
      return res.status(429).json({
        message: "Too many incorrect attempts. Please request a new OTP."
      });
    }

    if (hashValue(String(otp).trim()) !== user.otpHash) {
      user.otpAttempts += 1;
      await user.save();

      return res.status(400).json({
        message: "Invalid OTP."
      });
    }

    const purpose = user.otpPurpose;

    user.otpHash = null;
    user.otpExpires = null;
    user.otpPurpose = null;
    user.otpAttempts = 0;
    user.otpSentAt = null;

    // Registration verification
    if (purpose === "register") {
      user.isVerified = true;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Registration successful. Your email is verified.",
        user: publicUser(user)
      });
    }

    // Login verification
    if (purpose === "login") {
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Login successful.",
        user: publicUser(user)
      });
    }

    // Password reset OTP verification
    if (purpose === "reset") {
      const resetToken = crypto.randomBytes(32).toString("hex");

      user.resetTokenHash = hashValue(resetToken);
      user.resetTokenExpires = new Date(
        Date.now() + 10 * 60 * 1000
      );

      await user.save();

      return res.status(200).json({
        success: true,
        message: "OTP verified. You can now reset your password.",
        token: resetToken
      });
    }

    return res.status(400).json({
      message: "Invalid OTP purpose."
    });
  } catch (error) {
    console.error("OTP verification error:", error);

    return res.status(500).json({
      message: "OTP verification failed."
    });
  }
});

// RESET PASSWORD
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters."
      });
    }

    const tokenHash = hashValue(token);

    const user = await User.findOne({
      resetTokenHash: tokenHash,
      resetTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset token."
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetTokenHash = null;
    user.resetTokenExpires = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful. Please login."
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      message: "Password reset failed."
    });
  }
});

module.exports = router;
