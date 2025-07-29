import ChatBroadcastModel from "../models/chatBroadcastModel.model.js";

// Fetch all chat broadcasts created by the current user
export const fetchChatBroadcastsData = async (req, resp) => {
    try {
        let currentUserID = req.additionallUeserData._id;
        // Find all broadcasts where createdBy matches current user
        const broadcastData = await ChatBroadcastModel.find({
            createdBy: currentUserID
        });
        // Return the found broadcast data
        resp.status(200).json({ "broadcastData": broadcastData })
    } catch (error) {
        // Handle error and send 404 response
        resp.status(404).json(error)
    }
}

// Update one or more chat broadcasts based on filter conditions
export const updateChatBroadcast = async (req, resp) => {
    try {
        let { filterCondition, updateOperation } = req.body;
        // Perform updateMany with provided filter and update operations
        const result = await ChatBroadcastModel.updateMany(filterCondition, updateOperation);
        // Respond with the number of documents modified
        resp.status(200).json({ 'broadcastUpdated:': result.nModified })
    } catch (error) {
        // Handle error and send 404 response
        resp.status(404).json(error)
    }
};
