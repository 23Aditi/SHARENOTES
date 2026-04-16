import User from "../models/User.js";
import { hashPassword, comparePassword } from "../utils/passwordUtils.js";
import { generateToken, verifyToken } from "../utils/generateToken.js";
import { isValidEmail, isStrongPassword } from "../utils/validators.js";

export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields required." });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ message: "Invalid email." });
        }
        if (!isStrongPassword(password)) {
            return res.status(400).json({
                message: "Password must be at least 6 characters and include uppercase, lowercase, and a number.",
            });
        }
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ message: "Email already in use." });
        }
        const hashed = await hashPassword(password);
        const user = new User({ name, email, password: hashed });
        await user.save();
        res.status(201).json({ message: "User registered successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error registering user." });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password required." });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials." });
        }
        const match = await comparePassword(password, user.password);
        if (!match) {
            return res.status(401).json({ message: "Invalid credentials." });
        }
        const accessToken = generateToken({ userId: user._id }, "15m");
        const refreshToken = generateToken({ userId: user._id }, "7d");
        user.refreshToken = refreshToken;
        await user.save();
        res.json({ accessToken, refreshToken });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error logging in." });
    }
};

export const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ message: "Refresh token required." });
        }
        let payload;
        try {
            payload = verifyToken(refreshToken);
        } catch {
            return res.status(401).json({ message: "Invalid or expired refresh token." });
        }
        const user = await User.findById(payload.userId);
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(401).json({ message: "Invalid refresh token." });
        }
        const accessToken = generateToken({ userId: user._id }, "15m");
        const newRefreshToken = generateToken({ userId: user._id }, "7d");
        user.refreshToken = newRefreshToken;
        await user.save();
        res.json({ accessToken, refreshToken: newRefreshToken });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error refreshing token." });
    }
};

export const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ message: "Refresh token required." });
        }
        const user = await User.findOne({ refreshToken });
        if (user) {
            user.refreshToken = null;
            await user.save();
        }
        res.json({ message: "Logged out successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error logging out." });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-password -refreshToken");
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching user." });
    }
};