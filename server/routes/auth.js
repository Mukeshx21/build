import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";
import { authenticate, getJwtSecret } from "../middleware/auth.js";

const router = Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 1. REGISTER NEW USER (Direct registration & instant login)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, confirmPassword, role, agreeTerms } = req.body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ error: "Please enter your full name (minimum 2 characters)." });
    }

    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match. Please verify both entries." });
    }

    const cleanRole = (role || "").toLowerCase();
    if (cleanRole !== "buyer" && cleanRole !== "seller") {
      return res.status(400).json({ error: "Please select an account type: Buyer or Seller." });
    }

    if (!agreeTerms) {
      return res.status(400).json({ error: "You must accept the Terms and Conditions to proceed." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if account already exists
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
    if (existing) {
      return res.status(409).json({
        error: "An account with this email address already exists. Please sign in."
      });
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    // Insert user with full access
    const insert = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, is_verified)
      VALUES (?, ?, ?, ?, 1)
    `);
    const result = insert.run(name.trim(), normalizedEmail, passwordHash, cleanRole);

    const safeUser = {
      id: Number(result.lastInsertRowid),
      name: name.trim(),
      email: normalizedEmail,
      role: cleanRole
    };

    // Sign session token
    const token = jwt.sign(safeUser, getJwtSecret(), { expiresIn: "30d" });

    res.cookie("landai_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully! Welcome to LandAI.",
      user: safeUser,
      token
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ error: "An unexpected error occurred during registration. Please try again." });
  }
});

// 2. LOGIN USER (Direct authentication)
router.post("/login", async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !EMAIL_REGEX.test((email || "").trim())) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail);

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password. Please verify your credentials." });
    }

    // Verify hashed password
    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password. Please verify your credentials." });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const token = jwt.sign(safeUser, getJwtSecret(), { expiresIn: rememberMe ? "30d" : "1d" });

    res.cookie("landai_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge
    });

    return res.json({
      success: true,
      message: "Logged in successfully.",
      user: safeUser,
      token
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "An unexpected error occurred during login." });
  }
});

// 3. GET CURRENT USER PROFILE
router.get("/me", authenticate, (req, res) => {
  return res.json({
    user: req.user
  });
});

// 4. LOGOUT
router.post("/logout", (req, res) => {
  res.clearCookie("landai_token", {
    httpOnly: true,
    sameSite: "lax"
  });
  return res.json({
    success: true,
    message: "Logged out successfully."
  });
});

// 5. DIRECT PASSWORD RESET (No email codes needed)
router.post("/reset-password", (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);

    if (!user) {
      return res.status(404).json({ error: "No account found with this email address." });
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);

    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, user.id);

    return res.json({
      success: true,
      message: "Password reset successful! You may now sign in with your new password."
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ error: "Could not reset password. Please try again." });
  }
});

export default router;
