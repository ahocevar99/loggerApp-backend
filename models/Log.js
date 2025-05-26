import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  message: { type: String, required: true },
  severity_level: { type: String, required: true },
}, {
  timestamps: true
});

export default mongoose.model('Log', logSchema);
