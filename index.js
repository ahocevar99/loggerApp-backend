import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import router from "./routes.js";
import Project from "./models/Project.js"; 

const app = express();
const PORT = process.env.PORT || 3000;


const dynamicCors = async (req, callback) => {
  const origin = req.header("Origin");

  if (!origin) return callback(null, { origin: false });

  try {
    const project = await Project.findOne({ projectOrigins: origin });

    if (project) {
      callback(null, { origin: true }); 
    } else {
      callback(null, { origin: false }); 
    }
  } catch (error) {
    console.error("CORS error:", error);
    callback(error, { origin: false });
  }
};

app.use(cors(dynamicCors));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/", router);

app.use((err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    return res.status(401).json({ message: "Invalid or missing token" });
  }
  next(err);
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
});
