require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Import routes
const productRoutes = require("./routes/productRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const cors = require("cors");

app.use(
  cors({
    origin: "https://qe-180141-ass1-cloth-cruiser-cart.vercel.app", // 👈 link FE cố định
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // nếu FE có gửi cookie hoặc auth token
  })
);
app.use(express.json());

// Routes
app.use("/api/products", productRoutes);

// Basic route for testing
app.get("/", (req, res) => {
  res.json({ message: "Cloth Cruiser Cart API Server is running!" });
});

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Connect to MongoDB and start server
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb+srv://hophihung:Hophihunga@cluster0.vwaeu3b.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    );
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Handle MongoDB connection events
mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection error:", error);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

connectDB();
