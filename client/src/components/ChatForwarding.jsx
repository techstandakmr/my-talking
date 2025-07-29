import  { useContext, useState } from 'react'
import { UserContext } from '@context/UserContext';
import _ from 'lodash';
import { ProfileTab } from "./index.js";
import { BsSend, BsArrowLeft } from 'react-icons/bs';
import { BiSolidSelectMultiple } from 'react-icons/bi';
import { FaCheck } from "react-icons/fa6";
function ChatForwarding() {
    const {
        currentUserID,
        setAllChatsData,
        getSingleUserData,
        getSingleGroupData,
        getSingleBroadcastData,
        generateUniqueID,
        activeDarkMode,
        safeParseJSON,
        setShowChatForwardingPanel,
        forwardingChats,
        setForwardingChats,
        addOrUpdateRecentTab,
        sendWebSocketMessage
    } = useContext(UserContext);
    let currentUserData = getSingleUserData(currentUserID);
    // Get connections that are accepted but do not exist in recentChatsTabs
    // let nonRecentConnections = ;
    /**
 * Retrieves chat tabs for message forwarding.  
 * Includes recent chats (excluding self) and accepted connections not in recent chats.
 */
    function getForwardingTabs() {
        // Get accepted connections not in recent chats
        let nonRecentConnections = currentUserData?.connections?.filter((connectionInfo) => {
            let targetUserID = connectionInfo?.initiaterUserID == currentUserID ? connectionInfo?.targetUserID : connectionInfo?.initiaterUserID;
            return !currentUserData?.recentChatsTabs?.some((tab) => tab?.tabID === targetUserID) // Ensure the targetUserID is not in recentChatsTabs
        })?.map((connectionInfo) => {
            let targetUserID = connectionInfo?.initiaterUserID == currentUserID ? connectionInfo?.targetUserID : connectionInfo?.initiaterUserID;
            return {
                tabID: targetUserID,
                tabType: "user",
                recentTime: "", // Use the sentTime of the chatData
                clearingTime: "", // make clearingTime empty, as it is sending moment 
                isArchived: false,
                isPinned: false,
                disappearingTime: "Off"
            }
        }) || [];

        // Get recent chats, excluding the current user
        let recentChats = currentUserData?.recentChatsTabs?.filter((chatTab) =>
            chatTab?.tabID !== currentUserID && //exlcude the self
            chatTab?.tabType != "aiAssistant" &&        //exclude ai assistant tab
            (["group", "broadcast"]?.includes(chatTab?.tabType) ?
                (
                    (getSingleGroupData(chatTab?.tabID)?.admins?.includes(currentUserID) || (getSingleGroupData(chatTab?.tabID)?.members?.includes(currentUserID) && getSingleGroupData(chatTab?.tabID)?.messagePermission == "everyone"))
                    //for group
                    ||
                    getSingleBroadcastData(chatTab?.tabID)?.createdBy == currentUserID //for broadcast
                )
                : true
            ) //show the group recent tab only when the current user os an active member of group
        )?.reverse() // Reverse the order to show the latest chats first
            // sort((a, b) =>
            //     new Date(b?.recentTime) - new Date(a?.recentTime)
            // ) 
            || [];
        return { recentChats: recentChats, others: nonRecentConnections }; // Return combined list
    };
    const [searchTerm, setSearchTerm] = useState('');
    const [searchedTabs, setSearchedTabs] = useState([]);
    /**
     * Function to extract text values from JSON data (e.g., chat messages or names).
     * It ensures that the text is parsed safely and joined into a readable string.
     */
    const getExtractedTextValue = (textData) => {
        return safeParseJSON(textData) // Parse JSON string safely
            ?.map((g) => g?.value) // Extract 'value' property from each object
            ?.join(' ') || ''; // Join multiple values into a single string
    };
    // Handles user input for search functionality
    const handleSearch = (e) => {
        const term = e.target.value?.trim().toLowerCase(); // Trim whitespace & convert to lowercase
        setSearchTerm(e.target.value); // Update state with user input

        // If search term is empty, reset search results
        if (term === '') {
            setSearchedTabs([]);
            return;
        };
        const normalizeSpaces = (str) => str.replace(/\s+/g, ' ').trim();
        let dataForSearching = [
            ...getForwardingTabs()?.recentChats, ...getForwardingTabs()?.others
        ];
        // Filter tabs that match the search term
        let searchedTabs = dataForSearching?.filter((tabInfo) => {
            // Extract tab name based on type (Group, Broadcast, or User)
            let tabName = tabInfo?.tabType == "group"
                ? getSingleGroupData(tabInfo?.tabID)?.profileInfo?.name
                : tabInfo?.tabType == "broadcast"
                    ? getSingleBroadcastData(tabInfo?.tabID)?.profileInfo?.name
                    : getSingleUserData(tabInfo?.tabID)?.profileInfo?.name;

            let tabNameValues = normalizeSpaces(getExtractedTextValue(tabName))?.toLowerCase();
            // Check if tab name includes search term
            return tabNameValues.includes(term);
        });
        setSearchedTabs(searchedTabs);
    };
    // searching handling - end
    // tab selection - start
    const [selectedTabs, setSelectedTabs] = useState([]);
    function handleSelectedTabs(tabInfo) {
        setSelectedTabs((selectedTabs) => {
            let tabExist = selectedTabs?.some(selectedTab =>
                selectedTab?.tabID == tabInfo?.tabID
            );
            if (tabExist) {
                return selectedTabs?.filter((selectedTab) => selectedTab?.tabID != tabInfo?.tabID);
            } else {
                return [
                    ...selectedTabs,
                    tabInfo
                ];
            };
        });
    };
    
    // tab selection - end
    function sendChats() {
        let chatsToForward = forwardingChats?.flatMap((chat) =>
            selectedTabs?.map((selectedTab) => {
                // Determine recipients based on tab type (User, Group, or Broadcast)

                // check the condition when only admin is in the group
                let isOnlyAdminInGroup = selectedTab?.tabType === "group" ? getSingleGroupData(selectedTab?.tabID)?.members?.every((memberID) => memberID == currentUserID) : false;
                // If forwarding to a group, get all members
                let groupMembers = selectedTab?.tabType === "group"
                    ? getSingleGroupData(selectedTab?.tabID)?.members?.filter(memberID => !isOnlyAdminInGroup ? memberID !== currentUserID : true) // exclude self when there are other members, else include self
                        ?.map(memberID => ({
                            status: 'sending',
                            deliveredTime: null,
                            seenTime: null,
                            receiverID: memberID,
                        }))
                    : [];
                // check the condition when only creator is in the broadcast
                let isOnlyCreatorInBroadcast = selectedTab?.tabType === "broadcast" ? getSingleBroadcastData(selectedTab?.tabID)?.members?.every((memberID) => memberID == currentUserID) : false;
                // If forwarding to a broadcast, get all recipients
                let broadcastMembers = selectedTab?.tabType === "group"
                    ? getSingleBroadcastData(selectedTab?.tabID)?.members?.filter(memberID => !isOnlyCreatorInBroadcast ? memberID !== currentUserID : true) // exclude self when there are other members, else include self
                        ?.map(memberID => ({
                            status: 'sending',
                            deliveredTime: null,
                            seenTime: null,
                            receiverID: memberID,
                        }))
                    : [];
                // Assigning receiversInfo based on tab type
                let receiversInfo = selectedTab?.tabType === "user"
                    ? [{ status: 'sending', deliveredTime: null, seenTime: null, receiverID: selectedTab?.tabID }]
                    : selectedTab?.tabType === "group"
                        ? groupMembers
                        : broadcastMembers;
                let sentTime = new Date().toISOString();
                // else add new tab
                addOrUpdateRecentTab(
                    {
                        ...selectedTab,
                        recentTime: sentTime, // Use the sentTime of the sender
                        draft: null
                    },
                    {
                        recentTime: sentTime, // Use the sentTime of the sender
                        clearingTime: "", // Keep clearingTime empty, as the message is being sent now
                        draft: null
                    }
                );
                // Creating the new forwarded chat object
                return {
                    customID: generateUniqueID("CHAT"), // Unique ID for the forwarded chat , "CHAT" is 
                    senderID: currentUserID, // Sender remains the user who forwards
                    isGroupType: selectedTab?.tabType === "group", // Boolean flag for group messages
                    toGroupID: selectedTab?.tabType === "group" ? selectedTab?.tabID : null, // Group ID if applicable
                    isBroadcastType: selectedTab?.tabType === "broadcast", // Boolean flag for broadcasts
                    toBroadcastID: selectedTab?.tabType === "broadcast" ? selectedTab?.tabID : null, // Broadcast ID if applicable
                    chatType: chat?.chatType, // Retaining original chat type (text, image, etc.)
                    text: chat?.text, // Retaining original text
                    file: chat?.chatType == "file" ? chat?.file : null,
                    sentTime, // Timestamp for the forwarded message
                    receiversInfo, // List of recipients and their statuses
                    deletedByUsers: [], // No removals yet
                    repliedByUsers: [], // No replies yet
                    repliedChat: [], // No replied messages
                    starredByUsers: [], // No starred users initially
                    keptByUsers: [], // No kept messages initially
                    isForwarded: true, // Marking message as forwarded
                    disappearingTime: selectedTab?.disappearingTime,
                    tabInfo: selectedTab,
                    repliedToInfo: null,
                    ...(chat?.chatType == "group-invitaion" && { invitedUsers: receiversInfo?.map((receiverInfo) => receiverInfo?.receiverID) }), // Add the invited member IDs
                    ...(chat?.chatType == "group-invitaion" && { targetGroupID: safeParseJSON(chat?.text)[0]?.targetGroupID }), // Add the target group ID
                    //pass the target group data for invited users, it will be sent to the invited users among with chats data
                };
            })
        );
        if (chatsToForward?.length == selectedTabs?.length) {
            // Sending the new chat data via WebSocket to the server
            sendWebSocketMessage(
                'new:chats', // WebSocket event name
                'newChats', // Event action
                chatsToForward // Converting chat data to JSON format
            );

            // Updating the local state to include the new chat message
            setAllChatsData((prev) => ([...prev, ...chatsToForward]));

            // Hiding the chat forwarding panel after sending the messages
            setShowChatForwardingPanel(false);

            // Clearing the list of forwarded chats after sending
            setForwardingChats([]);
        };
    };

    return (
        <>
            {/* Overlay for the entire chat forwarding panel */}
            <div className='overlay'>
                {/* Inner container for the chat forwarding panel */}
                <div style={{ backgroundColor: "rgb(245,247,251)" }} className='overlayInner flex flex-col relative h-full m-auto text-gray-900'>
                    {/* Header with close button and title */}
                    <div className={`${activeDarkMode ? "darkModeBg2" : ''} h-auto gap-x-4 h-12 w-full px-4 py-3`}>
                        <div className={`flex items-center justify-between`}>
                            {/* Left side with back button and title */}
                            <div className='flex justify-center items-center gap-x-2'>
                                {/* Back button to close the chat forwarding panel */}
                                <BsArrowLeft className='cursor-pointer w-8 h-8'
                                    onClick={() => {
                                        setShowChatForwardingPanel(false);
                                        setForwardingChats([]); // Clear forwarding chats
                                    }}
                                />
                                {/* Display the title or number of selected tabs */}
                                <p className='text-xl font-semibold'>
                                    {
                                        selectedTabs?.length == 0 ?
                                            "Forward to" :
                                            `${selectedTabs?.length} of ${getForwardingTabs()?.recentChats?.length + getForwardingTabs()?.others?.length} selected`
                                    }
                                </p>
                            </div>
                            {/* Right side with select/unselect all option */}
                            <div className='text-sm flex items-center justify-center'>
                                <div
                                    onClick={() => {
                                        // Toggle select/unselect all tabs
                                        if (selectedTabs?.length === getForwardingTabs()?.recentChats?.length + getForwardingTabs()?.others?.length) {
                                            setSelectedTabs([]); // Deselect all if all are selected
                                        } else {
                                            setSelectedTabs([...getForwardingTabs()?.recentChats, ...getForwardingTabs()?.others]); // Select all
                                        }
                                    }}
                                    className="cursor-pointer flex items-center gap-x-2 flex-col"
                                >
                                    {/* Select multiple icon */}
                                    <BiSolidSelectMultiple className="w-6 h-6" />
                                    {/* Select/unselect all text */}
                                    <p>
                                        {
                                            selectedTabs?.length === getForwardingTabs()?.length
                                                ? "Unselect"
                                                : "Select All"
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                        {/* Search box for searching through tabs */}
                        <div className="mt-1 max-w-md mx-auto">
                            <div className={`${activeDarkMode ? "darkModeBg1" : ''} relative flex items-center w-full h-10 rounded-lg bg-white overflow-hidden`}>
                                <div className={`${activeDarkMode ? "darkModeBg1" : ''} grid bg-gray-200 place-items-center h-full w-12 text-gray-300`}>
                                    {/* Search icon */}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                {/* Search input field */}
                                <div className="h-full w-full outline-none text-sm text-dark" id="search">
                                    <input
                                        type="text"
                                        className={`${activeDarkMode ? "darkModeBg1" : ''} h-full w-full outline-none text-lg bg-gray-200 text-dark`}
                                        placeholder="Search..."
                                        value={searchTerm}
                                        onChange={handleSearch} // Update search term on input change
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Main content area to display the tabs */}
                    <div className={`h-full w-full ${activeDarkMode ? "darkModeBg2" : ''} overflow-y-auto`}>
                        <div className={`${activeDarkMode ? "darkModeBg2" : ''} w-full h-full `}>
                            {/* Container for all tabs */}
                            {/* If search term is empty, display all tabs */}
                            {
                                searchTerm == "" ?
                                    Object?.keys(getForwardingTabs())?.map((key) => {
                                        return (
                                            <>
                                                {
                                                    // Display the category (e.g., recent chats, others)
                                                    getForwardingTabs()?.[key]?.length > 0 &&
                                                    <div className='w-full px-4 py-2 text-lg font-semibold capitalize'>
                                                        {key}
                                                    </div>
                                                }
                                                {
                                                    // Loop through each tab and display it
                                                    getForwardingTabs()?.[key]?.map((tabInfo, idx) => {
                                                        // Get tab data based on tab type
                                                        let tabData = tabInfo?.tabType == "group" ?
                                                            getSingleGroupData(tabInfo?.tabID)
                                                            :
                                                            tabInfo?.tabType == "broadcast" ?
                                                                getSingleBroadcastData(tabInfo?.tabID)
                                                                :
                                                                getSingleUserData(tabInfo?.tabID);
                                                        return (tabInfo?.tabID != currentUserID) && // Exclude current user from the list
                                                            <div key={idx} onClick={() => {
                                                                handleSelectedTabs(tabInfo); // Handle tab selection
                                                            }} className={`relative`}>
                                                                {/* Profile tab for each group/broadcast/user */}
                                                                <button className={`${activeDarkMode ? "darkModeBg1" : ''} profileTab border-b border-gray-200 flex items-center justify-start w-full`}>
                                                                    <ProfileTab
                                                                        tabData={tabData}

                                                                        currentUserID={currentUserID}
                                                                        isSearching={searchTerm ? true : false}
                                                                    />
                                                                </button>
                                                                {/* Checkmark for selected tabs */}
                                                                <div style={{
                                                                    display: selectedTabs?.some(selectedTab => selectedTab?.tabID == tabInfo?.tabID)
                                                                        ? 'flex'
                                                                        : 'none'
                                                                }}
                                                                    className="selecting flex items-center justify-between">
                                                                    <div className='selectingIcon'>
                                                                        <FaCheck className='w-4 h-4' />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                    })
                                                }
                                            </>
                                        )
                                    })
                                    :
                                    // If there is a search term, filter and display searched tabs
                                    searchedTabs?.map((tabInfo, idx) => {
                                        // Get tab data based on tab type
                                        let tabData = tabInfo?.tabType == "group" ?
                                            getSingleGroupData(tabInfo?.tabID)
                                            :
                                            tabInfo?.tabType == "broadcast" ?
                                                getSingleBroadcastData(tabInfo?.tabID)
                                                :
                                                getSingleUserData(tabInfo?.tabID);
                                        return (tabInfo?.tabID != currentUserID) && // Exclude current user from the list
                                            <div key={idx} onClick={() => {
                                                handleSelectedTabs(tabInfo); // Handle tab selection
                                            }} className={`relative`}>
                                                <button className={`${activeDarkMode ? "darkModeBg1" : ''} profileTab border-b border-gray-200 flex items-center justify-start w-full`}>
                                                    <ProfileTab
                                                        tabData={tabData}

                                                        currentUserID={currentUserID}
                                                        isSearching={searchTerm ? true : false}
                                                    />
                                                </button>
                                                {/* Checkmark for selected tabs */}
                                                <div style={{
                                                    display: selectedTabs?.some(selectedTab => selectedTab?.tabID == tabInfo?.tabID)
                                                        ? 'flex'
                                                        : 'none'
                                                }}
                                                    className="selecting flex items-center justify-between">
                                                    <div className='selectingIcon'>
                                                        <FaCheck className='w-4 h-4' />
                                                    </div>
                                                </div>
                                            </div>
                                    })
                            }
                            {/* Show send button when tabs are selected */}
                            {
                                selectedTabs?.length != 0 &&
                                <div className='applyBtn text-white absolute bottom-4 right-6'>
                                    <BsSend
                                        style={{ transform: "rotate(45deg)" }}
                                        className="w-7 h-7 cursor-pointer relative right-0.5"
                                        onClick={sendChats} // Trigger sending of chats
                                    />
                                </div>
                            }
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default ChatForwarding;
