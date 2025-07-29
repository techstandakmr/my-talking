import CallModel from "../models/call.model.js";

// Update multiple call records based on provided filters and update operations
export const updateCallData = async (req, resp) => {
    try {
        let { callsForUpdation } = req.body;
        // Ensure callsForUpdation is an array
        if (!Array.isArray(callsForUpdation)) {
            // Respond with error if format is invalid
            return resp.status(400).json({ error: "Invalid request format. Expected an array." });
        }
        // Map through each call update and perform updateMany operation
        const updatePromises = callsForUpdation.map(async (callData) => {
            let { filterCondition, updateOperation } = callData;
            return CallModel.updateMany(filterCondition, updateOperation);
        });

        // Wait for all update promises to finish
        const results = await Promise.all(updatePromises);

        // Sum up all modified counts from the update results
        const totalModified = results.reduce((sum, result) => sum + result.modifiedCount, 0);

        // Respond with success message and total modified count
        resp.status(200).json({ message: "Calls updated successfully", totalModified });
    } catch (error) {
        // Send error response if update fails
        resp.status(404).json(error)
    }
};

// Fetch all call records involving the current user as caller or callee
export const fetchCallsData = async (req, resp) => {
    try {
        // Extract current user ID from request
        let currentUserID = req.additionallUeserData._id;
        // Query calls where current user is either caller or callee and hasn't deleted the call
        const callsData = await CallModel.find({
            $or: [
                { caller: currentUserID },
                { callee: currentUserID}
            ],
            deletedByUsers: { $ne: currentUserID } // Exclude calls deleted by current user
        });
        // Respond with fetched calls data
        resp.status(200).json({ "calls": callsData })
    } catch (error) {
        // Send error response if fetch fails
        resp.status(404).json(error)
    }
}
