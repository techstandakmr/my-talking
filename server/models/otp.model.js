import mongoose from "mongoose"

// Define schema for OTP (One-Time Password) collection
const otpSchema = new mongoose.Schema({
  // Email address to which the OTP is sent
  email: {
    type: String,
    required: true,
  },
  // The OTP code itself
  code: {
    type: String,
    required: true,
  },
  // Type of action the OTP is for, restricted to two possible values
  actionType: {
    type: String,
    enum: ["resetPassword", "deleteAccount","resetEmail"],
    required: true,
  },
  // Expiration time for the OTP, after which it becomes invalid
  expiresAt: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields automatically
});

// Create the OTP model based on the schema
const OTPModel = mongoose.model("OTP", otpSchema);
export default OTPModel;
