import mongoose, { Types } from "mongoose"

// Define schema for ChatBroadcast collection
const ChatBroadcastSchema = new mongoose.Schema({
    // Profile information for the broadcast
    profileInfo: {
        // Name of the broadcast
        name: {
            type: String
        },
        // URL or path to the profile picture for the broadcast
        profilePic: {
            type: String
        },
        // Public ID for the profile picture (e.g. cloud storage ID)
        publicId: {
            type: String
        }, //for profile pic

        // Background color shown when no profile picture is set,
        // usually based on the first letter of the broadcast name
        bgColor: {
            type: String
        }, // Background color when no profile pic, based on the first letter of the broadcast name
        
        // Description or additional info about the broadcast
        description: {
            type: String
        },
    },
    // Reference to the user who created the broadcast
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    // List of members (users) included in the broadcast
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
}, { timestamps: true }) // Automatically add createdAt and updatedAt timestamps

// Create mongoose model for ChatBroadcast
const ChatBroadcastModel = mongoose.model("ChatBroadcast", ChatBroadcastSchema);
export default ChatBroadcastModel;
