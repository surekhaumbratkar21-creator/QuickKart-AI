
const express = require("express");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const router = express.Router();

// Register User
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required"
      });
    }

    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "user"
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      success: false,
      message: "Registration failed"
    });
  }
});

// Login User
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({
      email: String(email).trim().toLowerCase()
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Supports old plain-text passwords and new bcrypt passwords
    const isBcryptPassword = /^\$2[aby]\$/.test(user.password);

    let isPasswordValid = false;

    if (isBcryptPassword) {
      isPasswordValid = await bcrypt.compare(
        password,
        user.password
      );
    } else {
      isPasswordValid = user.password === password;

      // Upgrade old password to bcrypt after successful login
      if (isPasswordValid) {
        user.password = await bcrypt.hash(password, 10);
        await user.save();
      }
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Login failed"
    });
  }
});

// Forgot Password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const user = await User.findOne({
      email: String(email).trim().toLowerCase()
    });

    const successMessage =
      "If an account exists with this email, a reset link will be sent.";

    if (!user) {
      return res.json({
        success: true,
        message: successMessage
      });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;

    // Link expires in 15 minutes
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

    await user.save();

    const frontendUrl =
      process.env.FRONTEND_URL || "http://localhost:5173";

    const resetUrl =
      `${frontendUrl}/reset-password?token=${resetToken}`;

    // Send email when email credentials are configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST || "smtp.gmail.com",
          port: Number(process.env.EMAIL_PORT || 587),
          secure: process.env.EMAIL_SECURE === "true",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        await transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: user.email,
          subject: "QuickKart AI - Password Reset",
          text: `Hello ${user.name},

You requested a password reset.

Open this link to reset your password:
${resetUrl}

This link expires in 15 minutes.

If you did not request this, ignore this email.`,
          html: `
            <h2>QuickKart AI</h2>
            <p>Hello ${user.name},</p>
            <p>You requested a password reset.</p>
            <p>
              <a href="${resetUrl}">Reset Your Password</a>
            </p>
            <p>This link expires in 15 minutes.</p>
            <p>If you did not request this, ignore this email.</p>
          `
        });
      } catch (mailError) {
        console.error("Email sending error:", mailError);

        if (process.env.NODE_ENV === "production") {
          return res.json({
            success: true,
            message: successMessage
          });
        }

        // Local development fallback
        return res.json({
          success: true,
          message: "Email could not be sent. Use the local reset link.",
          resetLink: resetUrl
        });
      }

      return res.json({
        success: true,
        message: successMessage
      });
    }

    // Local development only: no email setup required
    if (process.env.NODE_ENV !== "production") {
      return res.json({
        success: true,
        message: "Reset link generated successfully.",
        resetLink: resetUrl
      });
    }

    res.json({
      success: true,
      message: successMessage
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to process password reset"
    });
  }
});

// Reset Password
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Reset link is invalid or expired"
      });
    }

    user.password = await bcrypt.hash(password, 10);

    // Clear reset token after successful password change
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    res.json({
      success: true,
      message: "Password reset successful. Please login again."
    });
  } catch (error) {
    console.error("Reset password error:", error);

    res.status(500).json({
      success: false,
      message: "Password reset failed"
    });
  }
});

module.exports = router;
