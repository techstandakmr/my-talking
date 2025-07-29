import GroupModel from "../models/group.model.js";
import UserModel from "../models/user.model.js";

// Fetch groups relevant to the current user
export const fetchGroupsData = async (req, resp) => {
    try {
        // Get current user's ID from request additional data
        let currentUserID = req.additionallUeserData._id;

        // Find groups where user is currently a member or invited,
        // but exclude groups where user is a past member
        let groupsData = await GroupModel.find({
            "pastMembers.memberID": { $ne: currentUserID },
            $or: [
                { members: currentUserID },
                { invitedUsers: currentUserID }
            ]
        });

        // Fetch user's pastGroups data separately from UserModel
        const userData = await UserModel.findById(currentUserID, { pastGroups: 1 }).lean();

        // Map user's pastGroups to a consistent format for merging with active groups
        const updatedGroups = userData?.pastGroups?.map((groupData) => ({
            _id: groupData?.groupID,
            profileInfo: {
                name: groupData?.name,
                profilePic: groupData?.profilePic,
                bgColor: groupData?.bgColor,
                description: groupData?.description,
            },
            createdBy: groupData?.createdBy,
            members: groupData?.members,
            admins: groupData?.admins,
            pastMembers: groupData?.pastMembers,
            exitedAt: groupData?.exitedAt,
        }));

        // Send combined array of active groups and past groups (if any)
        resp.status(200).json({ groups: [...groupsData,...(updatedGroups || [])] });
    } catch (error) {
        // Send error response in case of failure
        resp.status(404).json(error);
    }
};
