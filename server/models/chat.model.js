import mongoose, { Types } from "mongoose"

// Define schema for Chat collection
const ChatSchema = new mongoose.Schema({
    // Custom identifier for the chat on client side before saving in DB
    customID: {
        type: String
    },
    // Reference to the user who sent the chat message
    senderID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    // Time when the chat message was sent
    sentTime: {
        type: String
    },
    // Flag to indicate if this chat is part of a aiAssistant chat
    aiAssistant: {
        type: Boolean
    },
    // Flag to indicate if this chat is part of a group chat
    isGroupType: {
        type: Boolean
    },
    // Reference to the group if chat is group type
    toGroupID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group"
    },
    // Flag to indicate if this chat is part of a broadcast message
    isBroadcastType: {
        type: Boolean
    },
    // Reference to the broadcast if chat is broadcast type
    toBroadcastID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatBroadcast"
    },
    // Type of chat message: "text", "file", "call", or "empty" (no chat)
    chatType: {
        type: String
    },
    // Text content of the chat message (if chatType is "text")
    text: {
        type: String
    },
    // File metadata if chatType is "file"
    file: {
        fileName: {
            type: String
        },
        fileType: {
            type: String
        },
        fileSize: {
            type: String
        },
        fileDuration: {
            type: String
        },
        fileWidth: {
            type: String
        },
        fileHeight: {
            type: String
        },
        fileOrgWidth: {
            type: String
        },
        fileOrgHeight: {
            type: String
        },
        fileIcon: {
            type: String
        },
        fileURL: {
            type: String
        },
        publicId: {
            type: String
        },
    },
    // Flag indicating whether the chat message has been edited
    isEdited: {
        type: Boolean
    },
    // Time after which the chat message will disappear (self-destruct)
    disappearingTime: {
        type: String
    },
    // Array storing information about each receiver's status related to this chat message
    receiversInfo: [{
        // Delivery status of the message (e.g. sent, delivered)
        status: {
            type: String
        },
        // Time when message was delivered to this receiver
        deliveredTime: {
            type: String
        },
        // Flag if delivery status is allowed to be shown
        isDeliveredStatusAllowed: {
            type: Boolean
        },
        // Time when message was seen by this receiver
        seenTime: {
            type: String
        },
        // Flag if seen status is allowed to be shown
        isSeenStatusAllowed: {
            type: Boolean
        },
        // Reference to the user who received the message
        receiverID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
    }],
    // Array of users who have starred this chat message
    starredByUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    // Array of users who have kept this chat message (saved/bookmarked)
    keptByUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    // Array of users who have deleted this chat message
    deletedByUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    // Information about a message or story this chat is replying to
    repliedToInfo: {
        // Type of replied item, either "chat" or "story"
        repliedToType: {
            type: String
        },
        // ID of the replied chat or story
        repliedToID: {
            type: String
        },
    }
}, { timestamps: true }) // Automatically add createdAt and updatedAt timestamps

// Create mongoose model for Chat
const ChatModel = mongoose.model("Chat", ChatSchema);
export default ChatModel;
