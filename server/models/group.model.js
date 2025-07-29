import mongoose, { Types } from "mongoose"

// Define schema for Group collection
const GroupSchema = new mongoose.Schema({
    // Profile information for the group
    profileInfo: {
        // Group name
        name: {
            type: String
        },
        // URL or path to the group's profile picture
        profilePic: {
            type: String
        },
        // Public ID for the profile picture (e.g., cloud storage ID)
        publicId: {
            type: String
        }, //for profile pic

        // Background color used when no profile picture is set,
        // usually based on the first letter of the group name
        bgColor: {
            type: String
        }, // Background color when no profile pic, based on the first letter of the group name

        // Description or additional details about the group
        description: {
            type: String
        },
    },
    // Permission level for sending messages in the group (e.g., "all", "admins only")
    messagePermission: {
        type: String
    },
    // Reference to the user who created the group
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    // List of current members (users) in the group
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    // List of users who have been invited to join the group but haven't accepted yet
    invitedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    // List of group admins with elevated permissions
    admins: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    // Record of past members who left or were removed from the group
    pastMembers: [{
        // ID of the user who left
        memberID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        // Timestamp when the user exited the group
        exitedAt: { type: Date }
    }]
}, { timestamps: true }) // Automatically add createdAt and updatedAt timestamps

// Create mongoose model for Group
const GroupModel = mongoose.model("Group", GroupSchema);
export default GroupModel;
