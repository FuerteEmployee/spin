import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    mobile: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    // MongoDB removes the document automatically once this time passes
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

export default mongoose.model('Otp', otpSchema);
