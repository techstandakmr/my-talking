import mongoose from "mongoose";
import { type } from "os";

const UserSchema = new mongoose.Schema({
    // User's profile information
    profileInfo: {
        name: { type: String }, // User's display name
        profilePic: { type: String }, // URL or path to profile picture
        publicId: {
            type: String
        }, // Public ID for profile pic in cloud storage or CDN

        bgColor: { type: String }, // Background color if no profile pic, usually based on first letter
        about: { type: String, required: true }, // User's about/bio section
        activeStatus: {
            type: String // online or offline (last seen status)
        },
    },
    // Unique username for login and display
    username: {
        type: String,
        unique: true, // Ensures no duplicate usernames
        required: true, // Username must be provided
        trim: true // Removes leading/trailing whitespace
    },
    // Password for authentication
    password: {
        type: String,
        required: true // Password required
    },
    // User's email address
    email: {
        type: String,
        unique: true, // Must be unique
        required: true // Required field
    },
    // List of connection/friend relationships
    connections: [{
        connectionID: {
            type: String // ID for the connection relationship
        },
        initiaterUserID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User" // User who initiated the connection
        },
        targetUserID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User" // User who received the connection request
        },
        status: {
            type: String // Status of connection: pending or accepted
        },
        acceptingSeenByInitiator: {
            type: Boolean // True if the initiator has seen the accepted
        },
    }],
    // Visibility settings for different profile fields and features
    visibility: {
        // Profile picture visibility options
        profilePicVisibility: {
            type: String,
            enum: ["public", "connections", "private", "included", "excluded"]
        },
        // Users included/excluded from viewing profile pic
        profilePicActionedTo: [{
            targetUserID: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            isIncluded: { type: Boolean, default: false }, // Included users override default visibility
            isExcluded: { type: Boolean, default: false }  // Excluded users are denied access regardless
        }],

        // About section visibility settings
        aboutVisibility: {
            type: String,
            enum: ["public", "connections", "private", "included", "excluded"],
            default: "private"
        },
        // Users included/excluded from seeing about section
        aboutActionedTo: [{
            targetUserID: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            isIncluded: { type: Boolean, default: false },
            isExcluded: { type: Boolean, default: false }
        }],

        // Active status (online/offline) visibility settings
        activeStatusVisibility: {
            type: String,
            enum: ["public", "connections", "private", "included", "excluded"],
            default: "private"
        },
        // Users included/excluded from seeing active status
        activeStatusActionedTo: [{
            targetUserID: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            isIncluded: { type: Boolean, default: false },
            isExcluded: { type: Boolean, default: false }
        }],

        // Story visibility settings
        storyVisibility: {
            type: String,
            enum: ["connections", "private", "included", "excluded"],
            default: "private"
        },
        // Users included/excluded from viewing stories
        storyActionedTo: [{
            targetUserID: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            isIncluded: { type: Boolean, default: false },
            isExcluded: { type: Boolean, default: false }
        }],

        // Chat delivery status visibility settings
        chatDeliveryStatusVisibility: {
            type: String,
            enum: ["public", "connections", "private", "included", "excluded"],
            default: "private"
        },
        // Users included/excluded from seeing chat delivery status
        chatDeliveryStatusActionedTo: [{
            targetUserID: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            isIncluded: { type: Boolean, default: false },
            isExcluded: { type: Boolean, default: false }
        }],

        // Chat seen status visibility settings
        chatSeenStatusVisibility: {
            type: String,
            enum: ["public", "connections", "private", "included", "excluded"],
            default: "private"
        },
        // Users included/excluded from seeing chat seen status
        chatSeenStatusActionedTo: [{
            targetUserID: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            isIncluded: { type: Boolean, default: false },
            isExcluded: { type: Boolean, default: false }
        }],

        // Story seen status visibility settings
        storySeenStatusVisibility: {
            type: String,
            enum: ["public", "connections", "private", "included", "excluded"],
            default: "private"
        },
        // Users included/excluded from seeing story seen status
        storySeenStatusActionedTo: [{
            targetUserID: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            isIncluded: { type: Boolean, default: false },
            isExcluded: { type: Boolean, default: false }
        }],

        // Permission settings for adding user to groups
        addingToGroupAllowence: {
            type: String,
            enum: ["public", "connections", "private", "included", "excluded"],
            default: "private"
        },
        // Users included/excluded from adding user to groups
        addingToGroupActionedTo: [{
            targetUserID: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            isIncluded: { type: Boolean, default: false },
            isExcluded: { type: Boolean, default: false }
        }]
    },
    // List of users blocked by this user
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    // Chats that user moved to recycle bin (deleted but recoverable)
    recycleBinOfChats: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat"
    }],
    // Recent chat tabs for UI with metadata
    recentChatsTabs: [{
        tabType: { type: String }, // Type of tab (e.g. individual chat, group chat)
        tabID: { type: String }, // ID of the tab (user ID or group ID)
        recentTime: { type: String }, // Latest message sent/delivered time for the tab
        clearingTime: { type: String }, // When user cleared the chat history for this tab
        isArchived: { type: Boolean }, // Whether the tab is archived
        isPinned: { type: Boolean }, // Whether the tab is pinned on top
        disappearingTime: { type: String } // Disappearing message timer for the tab
    }],
    // Groups the user has been a member of in the past
    pastGroups: [{
        groupID: { type: String }, // Group identifier
        name: { type: String }, // Group name
        profilePic: { type: String }, // Group profile picture URL
        bgColor: { type: String }, // Background color for the group if no profile pic
        description: { type: String }, // Group description
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Creator of the group
        members: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }], // Members of the group
        admins: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }], // Admins of the group
        pastMembers: [{
            memberID: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            exitedAt: { type: Date } // When the member exited the group
        }],
        exitedAt: { type: Date }, // When the user exited the group
    }],
}, { timestamps: true }); // Automatically adds createdAt and updatedAt timestamps

// Create User model from schema
const UserModel = mongoose.model("User", UserSchema);
export default UserModel;
