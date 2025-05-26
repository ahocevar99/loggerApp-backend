import mongoose from "mongoose";
 
const ProjectSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: true,
  },
  projectOrigins: {
    type: Array,
  },
  ownerId: {
    type: String,
    required: true,
  },
  ownerUsername: {
    type: String,
    required: true,
  },
  ownerEmail: {
    type: String,
    required: true,
  },
  apiKey: {
    type: String,
  }
}, { timestamps: true });
 
const Project = mongoose.model("Project", ProjectSchema);
export default Project;