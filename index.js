import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import router from "./routes.js";
import Project from "./models/Project.js"; // potrebujemo za dinamične origine

const app = express();
const PORT = 3000;

// ----------------------
// Dynamic CORS middleware
// ----------------------
const dynamicCors = async (req, callback) => {
  const origin = req.header("Origin");

  if (!origin) return callback(null, { origin: false });

  try {
    const project = await Project.findOne({ projectOrigins: origin });

    if (project) {
      callback(null, { origin: true }); // Dovoli ta origin
    } else {
      callback(null, { origin: false }); // Blokiraj, origin ni znan
    }
  } catch (error) {
    console.error("CORS error:", error);
    callback(error, { origin: false });
  }
};

// Uporabi CORS z dinamičnim preverjanjem
app.use(cors(dynamicCors));

// ----------------------
// Middleware
// ----------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------
// Routes
// ----------------------
app.use("/", router);

// ----------------------
// Error handler
// ----------------------
app.use((err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    return res.status(401).json({ message: "Invalid or missing token" });
  }
  next(err);
});

// ----------------------
// Start Server
// ----------------------
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
});
