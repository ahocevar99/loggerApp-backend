import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import router from "./routes.js";
import Project from "./models/Project.js";

const app = express();
const PORT = process.env.PORT || 3000;

let allowedOrigins = new Set([
  "https://loggerapp-frontend.onrender.com",
  "http://localhost:5173",
]);

const isValidOrigin = (url) => {
  try {
    const u = new URL(url);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
};

const loadAllowedOrigins = async () => {
  try {
    const projects = await Project.find({}, "projectOrigins");
    for (const project of projects) {
      if (Array.isArray(project.projectOrigins)) {
        project.projectOrigins.forEach(origin => {
          if (isValidOrigin(origin)) {
            allowedOrigins.add(origin);
          } else {
            console.warn("Neveljaven origin iz baze preskočen:", origin);
          }
        });
      }
    }
    console.log("✅ Allowed origins loaded:", [...allowedOrigins]);
  } catch (err) {
    console.error("❌ Failed to load allowed origins:", err);
  }
};

const startServer = async () => {
  await connectDB();
  await loadAllowedOrigins();

  const corsOptions = {
    origin: (origin, callback) => {
      if (!origin) return callback(null, false);
      if (allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        console.warn("❌ Blocked origin:", origin);
        callback(null, false);
      }
    },
    credentials: true,
  };

  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/", router);

  app.use((err, req, res, next) => {
    if (err.name === "UnauthorizedError") {
      return res.status(401).json({ message: "Invalid or missing token" });
    }
    next(err);
  });

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();
