import mongoose, { Types } from "mongoose"

const StorySchema = new mongoose.Schema({
    // Custom identifier for the story on client side before saving in DB
    customID: {
        type: String
    },
    // Reference to the user who sent the story
    senderID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    // Type of the story (e.g. text, image, video)
    storyType: {
        type: String
    },
    // Text content of the story (if any)
    text: {
        type: String
    },
    // Media file details associated with the story
    mediaFile: {
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
    // Status of the story for the sender (e.g. active, deleted)
    statusForSender: {
        type: String
    },
    // Time when the story was sent
    sentTime: {
        type: String
    },
    // Flag indicating whether the story was edited
    isEdited: {
        type: Boolean
    },
    // Information about users who received the story
    receiversInfo: [{
        // Reference to the user who received the story
        receiverID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        // Time when the story was seen by the receiver
        seenTime: {
            type: String,
            default: null
        },
        // status of the story for the receiver
        // this field is used to show the status of the story for the receiver
        status: {
            type: String,
            default: null
        },
        // Whether the seen status is allowed to be shown for this receiver
        isSeenStatusAllowed: {
            type: Boolean
        },
    }]
}, { timestamps: true })

// Create the Story model from the schema
const StoryModel = mongoose.model("Story", StorySchema);
export default StoryModel;
