import mongoose, { Types } from "mongoose"

// Define schema for Call collection
const CallSchema = new mongoose.Schema({
    // Custom identifier for the call on client side before saving in DB
    customID: {
        type: String
    },
    // Reference to the user who initiated the call (caller)
    caller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    // Reference to the user who received the call (callee)
    callee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    // Type of call, can be "video" or "voice"
    callType: {
        type: String
    },
    // Time when the call was initiated
    callingTime: {
        type: String
    },
    // Duration of the call
    callDuration: {
        type: String
    },
    // Duration for which the call rang before being answered or missed
    ringDuration: {
        type: String
    },
    // Current status of the call, possible values: calling, ringing, missed call, rejected, accepted
    status: {
        type: String
    },
    // Flag indicating whether the callee has seen the call notification
    seenByCallee: {
        type: Boolean
    },
    // Array of user references who deleted this call record
    deletedByUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
}, { timestamps: true }) // Automatically add createdAt and updatedAt timestamps

// Create mongoose model for Call
const CallModel = mongoose.model("Call", CallSchema);
export default CallModel;
