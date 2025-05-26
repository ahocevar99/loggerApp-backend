import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import router from "./routes.js";
import Project from "./models/Project.js";

const app = express();
const PORT = process.env.PORT || 3000;


let allowedOrigins = [];

const loadAllowedOrigins = async () => {
  try {
    const projects = await Project.find({}, "projectOrigins");
    allowedOrigins = projects.flatMap(p => p.projectOrigins);
    console.log("✅ Allowed origins loaded:", allowedOrigins);
  } catch (err) {
    console.error("Failed to load allowed origins:", err);
  }
};


const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, false);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
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


connectDB().then(async () => {
  await loadAllowedOrigins(); 
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
