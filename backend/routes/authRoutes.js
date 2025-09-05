const express = require("express");
const authRouter = express.Router();

const { protect } = require("../middleware/authMiddleware.js");
const { registerUser, loginUser, getUserInfo } = require("../controllers/authController.js");
const upload = require("../middleware/uploadMiddleware.js");

// --- Auth Routes ---
authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
authRouter.get("/me", protect, getUserInfo);

// --- Upload Profile Image ---
authRouter.post("/upload-image", protect, upload.single("image"), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    res.status(200).json({ imageUrl: req.file.path });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ error: "Image upload failed" });
  }
});

module.exports = authRouter;
