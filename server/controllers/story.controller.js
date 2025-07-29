import StoryModel from "../models/story.model.js";

// Fetch Stories relevant to the current user
export const fetchStoriesData = async (req, resp) => {
    // Get current user ID from additional request data
    const currentUserID = req.additionallUeserData._id;

    try {
        // Find stories where the user is either the sender or a receiver (not blocked)
        const fetchedStories = await StoryModel.find({
            $or: [
                { senderID: currentUserID }, // User is the sender
                {
                    receiversInfo: {
                        $elemMatch: {
                            receiverID: currentUserID, // User is in receiversInfo array
                        }
                    }
                }
            ]
        }).select('-createdAt -updatedAt'); // Exclude timestamps from the results

        // Transform stories to adjust receiversInfo depending on whether user is sender or receiver
        const transformedStories = fetchedStories.map((story) => {
            const isSender = story.senderID.toString() === currentUserID.toString();

            // If sender, include all receiversInfo, else include only current user's info
            const filteredReceiversInfo = isSender
                ? story.receiversInfo
                : story.receiversInfo.filter(info =>
                    info.receiverID.toString() === currentUserID.toString()
                );

            // Return story object with filtered receiversInfo
            return {
                ...story.toObject(),
                receiversInfo: filteredReceiversInfo
            };
        });

        // Send the transformed stories data as JSON response
        resp.status(200).json({ stories: transformedStories });
    } catch (error) {
        // Log error for debugging
        console.error("Error fetching stories:", error);
        // Send error response to client
        resp.status(500).json({ error: "Failed to fetch stories. Please try again later." });
    }
};
