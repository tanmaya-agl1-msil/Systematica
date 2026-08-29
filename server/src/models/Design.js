import mongoose from 'mongoose';

const NodeSchema = new mongoose.Schema(
  {
    id: String,
    type: String,
    position: { x: Number, y: Number },
    data: mongoose.Schema.Types.Mixed
  },
  { _id: false }
);

const EdgeSchema = new mongoose.Schema(
  {
    id: String,
    source: String,
    target: String,
    label: String
  },
  { _id: false }
);

const DesignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 2000 },
    nodes: [NodeSchema],
    edges: [EdgeSchema],
    lastReport: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

export default mongoose.model('Design', DesignSchema);
