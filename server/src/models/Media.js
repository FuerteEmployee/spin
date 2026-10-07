import mongoose from 'mongoose';

// Uploaded images (backgrounds, logo) live in MongoDB so the server keeps no files on disk.
// A replaced image gets a new id, which lets /api/media/:id be cached forever.
const mediaSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Media', mediaSchema);
