import ChatModel from "../models/chat.model.js";

// Fetch all chats involving the current user
export const fetchAllChats = async (req, resp) => {
    try {
        const currentUserID = req.additionallUeserData._id;

        // Update status from "sending" to "sent" for all relevant receivers
        await ChatModel.updateMany(
            { "receiversInfo.status": "sending" }, // Match chats where any receiver is still "sending"
            {
                $set: { "receiversInfo.$[elem].status": "sent" } // Update only matching receivers
            },
            {
                arrayFilters: [
                    { "elem.status": "sending" } // Target only elements with status "sending"
                ]
            }
        );

        // Fetch chats where the user is either the sender or a receiver
        const chatsData = await ChatModel.find({
            $or: [
                { senderID: currentUserID }, // If the user is the sender of the chat
                {
                    "receiversInfo.receiverID": currentUserID, // If the user is in receivers list
                }
            ],
            deletedByUsers: { $ne: currentUserID }, // Ensure the chat is not deleted by the user
        });
        // Process chats based on whether the user is the sender or receiver
        const processedChats = chatsData.map((chat) => {
            const isSender = chat?.senderID?.toString() === currentUserID?.toString();

            if (isSender) {
                // Return full chat object for the sender
                return chat;
            }

            // For receivers, return a filtered chat only if not blocked
            return {
                _id: chat?._id, // Chat ID
                customID: chat?.customID, // Custom Chat ID
                senderID: chat?.senderID, // Sender's User ID
                sentTime: chat?.sentTime, // Time the chat was sent
                aiAssistant: chat?.aiAssistant, //aiAssistant flag
                isGroupType: chat?.isGroupType, // Group message flag
                toGroupID: chat?.toGroupID, // Group ID if group chat
                isBroadcastType: chat?.isBroadcastType, // Broadcast flag
                toBroadcastID: chat?.toBroadcastID, // Broadcast ID
                chatType: chat?.chatType, // Text, file, etc.
                text: chat?.text, // Chat text content
                file: chat?.file, // Attached file (if any)
                disappearingTime: chat?.disappearingTime, // Disappearing message duration
                isEdited: chat?.isEdited, // Edited message flag
                repliedToInfo: chat?.repliedToInfo, // Information about the message being replied to
                // Include only if current user has starred the chat
                starredByUsers: chat?.starredByUsers?.includes(currentUserID) ? chat?.starredByUsers : [],

                // Include only if current user has kept the chat
                keptByUsers: chat?.keptByUsers?.includes(currentUserID) ? chat?.keptByUsers : [],

                // Filter receiversInfo to include only data relevant to current user
                receiversInfo: chat?.receiversInfo?.filter(
                    (receiver) => receiver?.receiverID?.toString() === currentUserID?.toString()
                ),

                // Hide deletedByUsers info from receivers
                deletedByUsers: [],

                // Optional future inclusion:
                // repliedByUserID: chat?.repliedByUserID,
                // repliedChat: chat?.repliedChat
            };
        }); // Remove any nulls

        // Send the processed chat data to the frontend
        resp.status(200).json({ chats: processedChats });
    } catch (error) {
        console.error("Error fetching chat data:", error); // Log the error for debugging
        resp.status(500).json({ error: "Failed to fetch chats" }); // Return error response
    }
};

// Create new chat(s)
export const createChat = async (req, resp) => {
    try {
        let { newChats } = req.body;
        // Using for...of instead of .map() to handle async operations correctly
        for (let newChat of newChats) {
            // sanitize chat data
            const chatDataToSave = {
                customID: newChat?.customID,
                senderID: newChat?.senderID,
                chatType: newChat?.chatType, // Set chat type
                text: newChat?.text,
                disappearingTime: newChat?.disappearingTime,
                sentTime: newChat?.sentTime,
                receiversInfo: newChat?.receiversInfo,// sender and receiver is initiator as this only for this not for target user
                deletedByUsers: newChat?.deletedByUsers,
            };
            const createdChat = await ChatModel.create(chatDataToSave);
            // Return the created chat
            resp.status(201).json({ chat: createdChat });
        };
    } catch (error) {
        console.error("Error creating chat:", error);
        resp.status(500).json({ error: "Failed to create chat" });
    }
};

// Update multiple chat records based on provided filters and update operations
export const updateChatData = async (req, resp) => {
    try {
        let { chatsForUpdation } = req.body;

        // Ensure chatsForUpdation is an array
        if (!Array.isArray(chatsForUpdation)) {
            // Respond with error if format is invalid
            return resp.status(400).json({ error: "Invalid request format. Expected an array." });
        }

        // Map through each chat update and perform updateMany operation
        const updatePromises = chatsForUpdation.map(async (chatInfo) => {
            let { filterCondition, updateOperation } = chatInfo;
            return ChatModel.updateMany(filterCondition, updateOperation);
        });

        // Wait for all update promises to finish
        const results = await Promise.all(updatePromises);

        // Sum up all modified counts from the update results
        const totalModified = results.reduce((sum, result) => sum + result.modifiedCount, 0);

        // Respond with success message and total modified count
        resp.status(200).json({ message: "Chats updated successfully", totalModified });

    } catch (error) {
        // Send error response if update fails
        resp.status(500).json({ error: error.message });
    }
};
