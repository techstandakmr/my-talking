import React, { useContext, useEffect, useRef, useState } from 'react';
import { BiSolidGroup, BiSolidVideos, BiLinkAlt, BiDotsVerticalRounded, BiSolidCopy } from 'react-icons/bi';
import { BsArrowLeft, BsPlus, BsCheck2, BsCameraFill } from 'react-icons/bs';
import { FaCheck } from "react-icons/fa6";
import {
    HiStar, HiBookmark, HiPhoto, HiOutlinePhone,
    HiOutlineVideoCamera, HiOutlineShare,
    HiUser,
    HiMiniChevronDown,
    HiMiniBookmarkSlash,
    HiOutlineArrowRight,
    HiMiniNoSymbol,
    HiOutlineFaceSmile,
    HiMiniPhoto,
    HiOutlineInformationCircle
} from 'react-icons/hi2';
import { HiOutlineBan, HiDocument, HiOutlineDownload } from 'react-icons/hi';
import { FaClockRotateLeft } from "react-icons/fa6";
import { ToastContainer, toast } from "react-toastify";
import { AiFillDelete } from 'react-icons/ai';
import { UserContext } from '@context/UserContext';
import { IoMusicalNotes } from "react-icons/io5";
import _ from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { extractContentFromInputField } from "@utils";
import { TextWithEmojis, ProfileTab, ConfirmationDialog, ProgressBar, CameraFrame, HandleProfileImage, ChatForwarding } from "./index.js";
import { FaUserMinus, FaUserTie } from "react-icons/fa";
import EmojiPicker from 'emoji-picker-react';
import {
    faFileImage,
    faFileAudio,
    faFileVideo,
    faPen,
    faStar
} from '@fortawesome/free-solid-svg-icons';
const iconMap = {
    faFileImage: faFileImage,
    faFileAudio: faFileAudio,
    faFileVideo: faFileVideo,
};
import moment from 'moment';
import { FileChat, TextChat, ProfileInfoCard, CallDataAsChat, getChatsOfSpecificTab, formatStatusTimestamp, ChatStatusInfo } from "./ChatBox.jsx"
import { LuStarOff } from 'react-icons/lu';
function ProfileInfo() {
    const {
        // Destructure multiple values and functions from UserContext for use in this component
        currentUserID,
        allGroupsData,
        allChatsData,
        setShowProfileInfo,
        openedTabInfo,
        setOpenedTabInfo,
        getSingleUserData,
        getSingleGroupData,
        getSingleBroadcastData,
        getSingleCallData,
        deleteChats,
        keepChat,
        starChat,
        safeParseJSON,
        prepareMemberRemoval,
        prepareBroadcastMemberRemoval,
        prepareMemberAddition,
        prepareMemberPromotionAndDemotion,
        prepareBroadcastMemberAddition,
        sendWebSocketMessage,
        activeDarkMode,
        toggleUserBlocking,
        clearChatHistory,
        toggleDisappearingTimer,
        handleInputDirection,
        printTextIn_InputField,
        insertEmojiIntoInputField,
        handlePictureUpload,
        wbServer,
        showChatForwardingPanel,
        setShowChatForwardingPanel,
        setForwardingChats,
        formatTimestamp,
        showProgressBar,
        setShowProgressBar,
        prepareGroupMessagePermission,
        prepareGroupProfileInfoUpdating,
        prepareBroadcastProfileInfoUpdating,
        prepareUserProfileInfoUpdating,
        handleChangeUserPorfileInfo,
        checkLinkExpiration,
        joinGroup,
        currentCallData,
        deleteExpiredChats,
        deleteExpiredStories,
        aiAssistant,
        setShowFileChatsInCarousel,
        setOpenedFileChatData,
        resendChat,
        addOrUpdateRecentTab,
        getSingleChatData,
        getSingleStoryData,
        handleShowingSections,
        setShowStoriesSection,
        setStoryForDirectDisplay
    } = useContext(UserContext);

    // Remove duplicate chats based on "customID"
    let allUniqueChats = _.uniqBy(allChatsData, "customID");

    // Get current logged-in user's data
    let currentUserData = getSingleUserData(currentUserID);

    // Options for displaying time in 12-hour format with hours and minutes
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };

    // Filter chats related to the currently opened tab (user, group, or broadcast)
    let chatsOfOpenedTab = getChatsOfSpecificTab(allUniqueChats, openedTabInfo, currentUserID);

    // Fetch openedTabData based on the type of the opened tab
    let openedTabData = openedTabInfo?.tabType === 'group' ? getSingleGroupData(openedTabInfo?.tabID) :
        openedTabInfo?.tabType === 'broadcast' ? getSingleBroadcastData(openedTabInfo?.tabID) :
            openedTabInfo?.tabType === 'user' ? getSingleUserData(openedTabInfo?.tabID) : aiAssistant;
    let isProfileChangeAllowed = (
        openedTabInfo.tabID == currentUserID ||
        (
            openedTabInfo.tabType == 'group' ?
                (openedTabData?.admins?.includes(currentUserID) || (openedTabData?.members?.includes(currentUserID) && openedTabData?.messagePermission == "everyone")) //for group
                :
                openedTabData?.createdBy == currentUserID //for broadcast
        )
    ) && !openedTabData?.isDeleted;
    // UI state variables controlling visibility of various sections and features

    // Show/hide media details panel
    const [showMediaDetails, setShowMediaDetails] = useState(false);

    // Show images in media details by default
    const [showPhotos, setShowPhotos] = useState(true);

    // Show/hide videos in media details
    const [showVideos, setShowVideos] = useState(false);

    // Show/hide audio files in media details
    const [showAudios, setShowAudios] = useState(false);

    // // Show/hide documents in media details
    // const [showDocuments, setShowDocuments] = useState(false);
    // Show/hide links in media details
    const [showLinks, setShowLinks] = useState(false);

    // Show/hide starred chats section
    const [showStarredChats, setShowStarredChats] = useState(false);

    // Show/hide kept chats section
    const [showKeptChats, setShowKeptChats] = useState(false);

    // Show/hide profile information section (name, about, description, members)
    const [showProfileInformation, setShowProfileInformation] = useState(false);

    // Show/hide personal information section
    const [showPersonalInfo, setShowPersonalInfo] = useState(false);

    // Store data related to profile picture changes
    const [profilePicInfo, setProfilePicInfo] = useState(null);

    // Show/hide full-screen profile picture view
    const [showFullProfilePic, setShowFullProfilePic] = useState(false);

    // Show/hide profile picture options (camera, gallery, delete)
    const [showProfilePicOption, setShowProfilePicOption] = useState(false);

    // Show/hide camera panel for capturing profile picture
    const [showCameraPanel, setShowCameraPanel] = useState(false);

    // Show/hide profile editing panel for picture adjustments
    const [showProfileEditingPanel, setShowProfileEditingPanel] = useState(false);

    // Flag to indicate if user is currently changing their name
    const [isChangeName, setIsChangeName] = useState(false);

    // Ref to the name input field element
    const nameInputRef = useRef(null);

    // Flag to check if name input field is not empty
    const [isNameInputNotEmpty, setIsNameInputNotEmpty] = useState(false);

    // Flag to indicate if user is currently changing the about/description text
    const [isChangeAbout, setIsChangeAbout] = useState(false);

    // Ref to the about/description input field element
    const aboutInputRef = useRef(null);

    // Flag to check if about input field is not empty
    const [isAboutInputNotEmpty, setIsAboutInputNotEmpty] = useState(false);

    // Show/hide emoji picker container
    const [showEmojiContainer, setShowEmojiContainer] = useState(false);

    // Store which user selection operation is active (adding/removing from group/broadcast)
    const [userSelectionFor, setUserSelectionFor] = useState(null);

    // Store target users list for adding/removing to/from group or broadcast
    const [targetUsers, setTargetUsers] = useState([]);

    // Store users selected for adding/removing in group or broadcast
    const [selectedUsers, setSelectedUsers] = useState([]);

    // Show/hide area displaying media chats (images, audio, video, docs)
    const [showMediaChats, setShowMediaChats] = useState(false);

    // Show/hide area displaying important chats (starred, kept)
    const [showImportantChats, setShowImportantChats] = useState(false);

    // Show/hide privacy actions section (block/unblock, delete, clear chat)
    const [showPrivacyActions, setShowPrivacyActions] = useState(false);

    // Options for disappearing messages timer
    let disappearingTimerOption = ["24 hours", "7 days", "90 days", "Off"];
    const [showConfirmationDialog, setShowConfirmationDialog] = useState(false); //for showing confirmation dialog
    // Array of state setters controlling visibility of multiple UI sections
    let allStateSetters = [
        setShowMediaDetails, setShowPhotos, setShowVideos, setShowAudios, setShowLinks,
        setShowStarredChats, setShowKeptChats, setShowProfileInformation, setIsChangeName, setIsChangeAbout,
        setIsNameInputNotEmpty, setIsAboutInputNotEmpty, setShowImportantChats, setShowMediaChats, setShowEmojiContainer
    ];

    // Function to hide all sections except the one specified by activeSetter
    function handleShowingSection(activeSetter) {
        // Set all sections to false (hidden)
        allStateSetters.forEach(setState => setState(false));
        // Set the active section to true (visible)
        activeSetter(true);
    };

    // Array of state setters related only to media detail sections
    let allStateSettersInMedia = [
        setShowPhotos, setShowVideos, setShowAudios, setShowLinks
    ];

    // Function to hide all media detail sections except the active one
    function handleShowingSectionInMedia(activeSetter) {
        // Hide all media sections
        allStateSettersInMedia.forEach(setState => setState(false));
        // Show the active media section
        activeSetter(true);
    };

    // Function to close/exit the activity area (where user edits name/about)
    function closeActivityArea() {
        setIsChangeName(false);           // Stop editing name
        setIsChangeAbout(false);          // Stop editing about
        setIsNameInputNotEmpty(false);    // Reset name input emptiness check
        setIsAboutInputNotEmpty(false);   // Reset about input emptiness check
        setShowEmojiContainer(false);     // Hide emoji picker
    };

    // Effect to handle profile picture changes
    useEffect(() => {
        if (profilePicInfo != null) {
            // Show error toast if file type rejected
            if (profilePicInfo?.rejection != null) {
                toast.error(`${profilePicInfo?.rejection?.msg}`);
                setProfilePicInfo(null); // Clear rejected file info
            };
            // Show profile editing panel if image was captured but not ready
            if (profilePicInfo?.isCaptured && !profilePicInfo?.isReady) {
                setShowProfileEditingPanel(true);
            };
            // Upload profile picture when ready
            if (profilePicInfo?.isReady) {
                setShowProgressBar(true); // Show loading animation
                // If user profile is being edited
                if (openedTabInfo?.tabID == currentUserID) {
                    prepareUserProfileInfoUpdating(
                        "profilePic", // Key for updating profile picture
                        { ...profilePicInfo?.newFileData, oldPublicId: openedTabData?.profileInfo?.publicId }, // Data for update
                    );
                    closeActivityArea();    // Close editing UI
                    refereshUserSelecting(); // Clear user selections
                    setShowProgressBar(true);
                };
                // If group profile is being edited
                if (openedTabInfo?.tabType == 'group') {
                    prepareGroupProfileInfoUpdating({
                        groupID: openedTabInfo?.tabID,
                        tabInfo: openedTabInfo,
                        updatingDataKey: "profilePic",
                        updatingValue: profilePicInfo?.newFileData
                    });
                };
                // If broadcast profile is being edited
                if (openedTabInfo?.tabType == 'broadcast') {
                    prepareBroadcastProfileInfoUpdating({
                        broadcastID: openedTabData?._id,
                        tabInfo: openedTabInfo,
                        updatingDataKey: "profilePic",
                        updatingValue: profilePicInfo?.newFileData
                    });
                };
                setShowProgressBar(true); // Keep showing loading animation
            };
            // console.log(profilePicInfo)
        };
    }, [profilePicInfo]);

    // Initialize chat selection state and refs

    // Flag to indicate if chats are currently being selected (multi-select mode)
    const [isChatSelecting, setIsChatSelecting] = useState(false);

    // Ref to store timeout ID for long press detection
    const holdTimeoutRef = useRef(null);

    // Array of selected chats (persisted between renders)
    const [selectedChats, setSelectedChats] = useState([]);

    // Function to reset chat selection state
    function refereshSelecting() {
        setIsChatSelecting(false);
        setSelectedChats([]);
    };

    // Function to toggle chat selection on user interaction (e.g., click or long press)
    async function handleMoreSelectedChats(chatData) {
        setSelectedChats((selectedChats) => {
            // Check if chat is already selected
            const isChatSelected = selectedChats?.some((prevChat) => prevChat?.customID == chatData?.customID);
            if (isChatSelected) {
                // Remove chat from selection if already selected
                return selectedChats?.filter((prevChat) => prevChat?.customID !== chatData?.customID);
            } else {
                // Add chat to selection if not selected
                return [...selectedChats, chatData];
            }
        });
    };

    // Handler for starting a long press (mobile or touch devices)
    const handleHoldStart = (chatData) => {
        // Set timeout to trigger selection after 800ms hold
        holdTimeoutRef.current = setTimeout(() => {
            handleMoreSelectedChats(chatData);
            setIsChatSelecting(true);
        }, 800);
    };

    // Handler to clear long press timeout on touch end or mouse up
    const handleHoldEnd = (holdTimeoutRef) => {
        if (holdTimeoutRef.current) {
            clearTimeout(holdTimeoutRef.current);
            holdTimeoutRef.current = null;
        };
    };

    // Effect to toggle isChatSelecting flag based on selectedChats length
    useEffect(() => {
        if (selectedChats?.length == 0) {
            setIsChatSelecting(false);  // Disable selection mode if no chats selected
        } else {
            setIsChatSelecting(true);   // Enable selection mode if chats are selected
        };
    }, [selectedChats, handleMoreSelectedChats, handleHoldStart, handleHoldEnd]);

    // Function to toggle user selection in add/remove users operations
    function handleSelectedUsers(userID) {
        setSelectedUsers((selectedUsers) => {
            // Check if user is already selected
            let userExists = selectedUsers?.includes(userID);
            if (userExists) {
                // Remove user if already selected
                return selectedUsers?.filter((selectedUser) => selectedUser != userID);
            } else {
                // Add user if not selected
                return [...selectedUsers || [], userID];
            };
        });
    };

    // Function to reset user selection state
    function refereshUserSelecting() {
        setSelectedUsers([]);
        setUserSelectionFor(null);
        setTargetUsers([]);
    };

    /**
     * Returns a list of common groups where both the logged-in user (currentUserID) 
     * and the selected user (openedTabInfo.tabID) are members.
     */
    function commonGroup() {
        // Only proceed if opened tab is a user chat
        if (openedTabInfo?.tabType === "user") {
            // Filter groups where both users are members
            return allGroupsData?.filter(groupInfo =>
                groupInfo.members.includes(openedTabInfo.tabID) &&
                groupInfo.members.includes(currentUserID)
            ) || [];
        }
        return [];
    };
    //  Organizes chat chats by date (Today, Yesterday, Day of the week, or Exact Date)
    function chatsDataByDate(chatsOfOpenedTab) {
        return [
            ...new Set(
                chatsOfOpenedTab?.map((chatData) => (
                    // Determine chat date category
                    moment().isSame(
                        chatData?.sentTime || chatData?.receiversInfo?.find(receiverInfo => receiverInfo?.receiverID == currentUserID)?.deliveredTime, 'day'
                    ) ?
                        `Today` :  // If chat date is today
                        moment().subtract(1, 'days').isSame(
                            moment(chatData?.sentTime || chatData?.receiversInfo?.find(receiverInfo => receiverInfo?.receiverID == currentUserID)?.deliveredTime), 'day'
                        ) ?
                            `Yesterday` :  // If chat date is yesterday
                            moment().isSame(
                                moment(chatData?.sentTime || chatData?.receiversInfo?.find(receiverInfo => receiverInfo?.receiverID == currentUserID)?.deliveredTime), 'week'
                            ) ?
                                moment(chatData?.sentTime || chatData?.receiversInfo?.find(receiverInfo => receiverInfo?.receiverID == currentUserID)?.deliveredTime).format('dddd') :  // If chat date is in current week, show weekday name
                                moment(chatData?.sentTime || chatData?.receiversInfo?.find(receiverInfo => receiverInfo?.receiverID == currentUserID)?.deliveredTime).format('DD/MM/YYYY')  // Otherwise show exact date
                ))?.filter(item => item.trim() !== '')  // Remove empty date categories
            )
        ].map((chatsDateName) => {
            // For each unique date category, filter chats that belong to that category
            return {
                chatsDateName,
                chatsData: chatsOfOpenedTab?.filter((chatData) => {
                    const chatTime = chatData?.sentTime || chatData?.receiversInfo?.find(receiverInfo => receiverInfo?.receiverID == currentUserID)?.deliveredTime;
                    return (
                        // Match chats with "Today"
                        chatsDateName === 'Today' && moment().isSame(moment(chatTime), 'day')
                    ) || (
                            // Match chats with "Yesterday"
                            chatsDateName === 'Yesterday' && moment().subtract(1, 'days').isSame(moment(chatTime), 'day')
                        ) || (
                            // Match chats with weekday name
                            chatsDateName === moment(chatTime).format('dddd')
                        ) || (
                            // Match chats with exact date
                            chatsDateName === moment(chatTime).format('DD/MM/YYYY')
                        );
                })
            };
        });
    };

    // Chat action list - start
    function ChatActionList({ chatData }) {
        return (
            <div className='chatActionList'>
                <div className="ml-1 align-self-baseline relative inline-block text-left showChildOnParentHover chatForAction" onClick={() => {
                    if (chatData?.keptByUsers?.length == 0) {
                        deleteExpiredChats();
                        deleteExpiredStories();
                    };
                }}>
                    {/* Button to toggle chat actions menu */}
                    <button type="button" id="menu-button" ariaexpanded="true" ariahaspopup="true">
                        <HiMiniChevronDown className="h-6 w-6 text-gray-300" />
                    </button>
                    {/* Dropdown menu with chat actions */}
                    <div style={{ transition: "0.3s" }} className={`${activeDarkMode ? "darkModeBg1" : ''} showOnHover text-gray-500 py-2 origin-top-right absolute top-6 right-0 z-10 mt-0 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none chatActionDropDownList ring-1 ring-black ring-opacity-5`}>
                        {
                            // show resend button if chat's sending is failed
                            (chatData?.isFailed && chatData?.senderID == currentUserID) && <div onClick={() => {
                                resendChat(chatData);
                            }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                                <p className="cursor-pointer block text-md">Resend</p>
                                <FaClockRotateLeft className='w-6 h-6 inline' strokeWidth={1} />
                            </div>
                        }
                        {/* Select chat option */}
                        <div onClick={() => {
                            setIsChatSelecting(true);
                            handleMoreSelectedChats(chatData);
                        }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                            <p href="#" className="cursor-pointer  block text-md">
                                Select
                            </p>
                            <BsCheck2 className='w-6 h-6 inline' strokeWidth={1} />
                        </div>
                        {/* chat copy - start */}
                        {
                            // Handle copying text chats dynamically
                            (chatData?.chatType == "text") && (
                                <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none"
                                    onClick={async () => {
                                        try {
                                            if (chatData?.chatType === "text") {
                                                // Handle text copy
                                                const parsedText = JSON.parse(chatData.text); // Parse text (assuming it's an array)
                                                const textValues = parsedText.map(item => item.value).join(' '); // Extract and join text values

                                                if (textValues) {
                                                    await navigator.clipboard.writeText(textValues);
                                                    toast.success("Text copied to clipboard!");
                                                } else {
                                                    console.error('No text found to copy');
                                                }
                                            };
                                        } catch (err) {
                                            console.error('Failed to copy:', err);
                                        }
                                    }}>
                                    <p className="cursor-pointer block text-md">Copy</p>
                                    <BiSolidCopy className='w-5 h-5' />
                                </div>
                            )
                        }
                        {/* chat copy - end */}
                        {/* star/unstar chat  - start*/}
                        <div onClick={() => {
                            starChat([chatData]); // Pass chat data in array for handling single or multiple chats
                        }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                            <p href="#" className="cursor-pointer block text-md">
                                {
                                    chatData?.starredByUsers.includes(currentUserID) ? "Unstar" : "Star"
                                }
                            </p>
                            {
                                chatData?.starredByUsers.includes(currentUserID) ?
                                    <LuStarOff className='w-5 h-5 ' />
                                    :
                                    <FontAwesomeIcon icon={faStar} className='' />
                            }
                        </div>
                        {/* star/unstar chat  - end */}
                        {/* keep/unkeep chat - start */}
                        <div onClick={() => {
                            const now = new Date(); // Current time
                            const oneDayInHours = 24; // Constant for 24 hours
                            const sentTime = new Date(chatData?.sentTime); // Parse sent time
                            // Determine the disappearing timer in hours based on the chat's setting
                            let timer;
                            if (chatData?.disappearingTime === "24 hours") {
                                timer = oneDayInHours;
                            } else if (chatData?.disappearingTime === "7 days") {
                                timer = oneDayInHours * 7;
                            } else if (chatData?.disappearingTime === "90 days") {
                                timer = oneDayInHours * 90;
                            } else {
                                timer = null; // For "Off" or unrecognized values
                            };
                            // ask before unkeep if this chat:
                            // 1. The disappearing timer is set (not "Off")
                            // 2. The sent time is older than the calculated expiry time
                            if (chatData?.disappearingTime != "Off" && timer && (sentTime <= new Date(now.getTime() - timer * 60 * 60 * 1000))) {
                                setShowConfirmationDialog({ for: "unkeep", data: chatData });
                            } else {
                                keepChat([chatData]); // Function handles array of chats
                            };
                            keepChat([chatData]); // Pass chat data in array for handling single or multiple chats
                        }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                            <p href="#" className="cursor-pointer block text-md">
                                {
                                    chatData?.keptByUsers.includes(currentUserID) ? "Unkeep" : "Keep"
                                }
                            </p>
                            {chatData?.keptByUsers.includes(currentUserID) ?
                                <HiMiniBookmarkSlash className='w-5 h-5 ' />
                                :
                                <HiBookmark className='w-5 h-5 ' />
                            }
                        </div>
                        {/* keep/unkeep chat - end */}
                        {/* chat download - start */}
                        {
                            // Show download option only for file type chats
                            chatData?.chatType == "file" &&
                            <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                                <p href="#" className="cursor-pointer  block text-md">
                                    Save
                                </p>
                                <HiOutlineDownload className='w-6 h-6 ' />
                            </div>
                        }
                        {/* chat download - end */}
                        {/* chat forwarding - start*/}
                        <div onClick={() => {
                            setShowChatForwardingPanel(true);
                            setForwardingChats([chatData]);
                        }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                            <p href="#" className="cursor-pointer  block text-md">
                                Forward
                            </p>
                            <HiOutlineArrowRight className='w-6 h-6 ' />
                        </div>
                        {/* chat forwarding - end */}
                        {/* delete chat - start*/}
                        <div onClick={() => {
                            deleteChats([chatData]); // Pass chat data in array for handling single or multiple chats
                            if (
                                getChatsOfSpecificTab(allUniqueChats, openedTabInfo, currentUserID)?.length == 0 &&
                                openedTabInfo?.clearingTime == ""
                            ) {
                                // Set clearingTime for tabs that have no chats
                                addOrUpdateRecentTab(openedTabInfo, { clearingTime: new Date().toISOString(), recentTime: "" });
                            } else {
                                // update recentTime for tabs that have chats with last message
                                let lastChat = getChatsOfSpecificTab(allUniqueChats, openedTabInfo, currentUserID)?.at(-1);
                                let currentUserReceiver = lastChat?.receiversInfo?.find(receiverInfo => receiverInfo?.receiverID == currentUserID);
                                addOrUpdateRecentTab(
                                    openedTabInfo,
                                    { recentTime: currentUserReceiver?.deliveredTime || lastChat?.sentTime }
                                );
                            };
                        }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                            <p href="#" className="cursor-pointer  block text-md">Delete</p>
                            <AiFillDelete className='w-5 h-5 ' />
                        </div>
                        {
                            // Show unsent option if chat was sent within last 10 minutes
                            (Date.now() - new Date(chatData.sentTime).getTime()) <= (10 * 60 * 1000) &&
                            <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                                <p href="#" className="cursor-pointer  block text-md">Unsent</p>
                                <HiMiniNoSymbol className='w-5 h-5 ' />
                            </div>
                        }
                        {/* delete chat - end */}
                    </div>
                </div>
            </div>
        )
    };
    // chat action list on top bar
    function ChatActionListOnTopBar() {
        return (
            <div className='p-3 w-full flex items-center justify-between'>
                {/* Display count of selected chats */}
                <div className='text-lg'>
                    {selectedChats?.length} Selected
                </div>
                <div className='flex items-center justify-center gap-x-3 text-sm'>
                    {
                        // Show keep, star, and forward buttons only for non-system chats (text or file)
                        selectedChats?.every((selectedChat) => selectedChat?.chatType == "text" || selectedChat?.chatType == "file") &&
                        <>
                            {/* Forward selected chats */}
                            <div onClick={() => {
                                setForwardingChats(selectedChats)
                                setShowChatForwardingPanel(true);
                                refereshSelecting();
                            }} className='cursor-pointer flex items-center gap-x-2 flex-col'>
                                <HiOutlineArrowRight className='w-5 h-5 cursor-pointer' />
                                <p>Forward</p>
                            </div>
                            {/* Keep or unkeep selected chats */}
                            <div onClick={() => {
                                keepChat(selectedChats); // Pass array of selected chats
                                refereshSelecting();
                            }} className='cursor-pointer flex items-center gap-x-2 flex-col'>
                                {
                                    (
                                        selectedChats?.every((selectedChat) => selectedChat?.keptByUsers?.includes(currentUserID))
                                        || showKeptChats
                                    ) ?
                                        <>
                                            <HiMiniBookmarkSlash className='w-5 h-5 ' />
                                            Unkeep
                                        </>
                                        :
                                        <>
                                            <HiBookmark icon={faStar} className='w-5 h-5' />
                                            Keep
                                        </>
                                }

                            </div>
                            {/* Star or unstar selected chats */}
                            <div onClick={() => {
                                starChat(selectedChats); // Pass array of selected chats
                                refereshSelecting();
                            }} className='cursor-pointer flex items-center gap-x-2 flex-col'>
                                {
                                    (
                                        selectedChats?.every((selectedChat) => selectedChat?.starredByUsers?.includes(currentUserID))
                                        || showStarredChats
                                    ) ?
                                        <>
                                            <LuStarOff className='w-5 h-5 ' />
                                            Unstar
                                        </>
                                        :
                                        <>
                                            <FontAwesomeIcon icon={faStar} className='w-5 h-5' />
                                            Star
                                        </>
                                }
                            </div>
                        </>
                    }
                    {/* Delete selected chats */}
                    <div onClick={() => {
                        deleteChats(selectedChats); // Pass array of selected chats
                        if (
                            getChatsOfSpecificTab(allUniqueChats, openedTabInfo, currentUserID)?.length == 0 &&
                            openedTabInfo?.clearingTime == ""
                        ) {
                            // Set clearingTime for tabs that have no chats
                            addOrUpdateRecentTab(openedTabInfo, { clearingTime: new Date().toISOString(), recentTime: "" });
                        } else {
                            // update recentTime for tabs that have chats with last message
                            let lastChat = getChatsOfSpecificTab(allUniqueChats, openedTabInfo, currentUserID)?.at(-1);
                            let currentUserReceiver = lastChat?.receiversInfo?.find(receiverInfo => receiverInfo?.receiverID == currentUserID);
                            addOrUpdateRecentTab(
                                openedTabInfo,
                                { recentTime: currentUserReceiver?.deliveredTime || lastChat?.sentTime }
                            );
                        };
                        refereshSelecting();
                    }} className='cursor-pointer flex items-center gap-x-2 flex-col'>
                        <AiFillDelete className='w-5 h-5' />
                        <p>Delete</p>
                    </div>
                </div>
            </div>
        )
    };
    // Utility functions to check file types
    const isImageFile = (fileType) => fileType?.startsWith("image/");  // Check if file is an image
    const isVideoFile = (fileType) => fileType?.startsWith("video/");  // Check if file is a video
    const isAudioFile = (fileType) => fileType?.startsWith("audio/");  // Check if file is an audio
    const isDocumentFile = (fileType) => !isImageFile(fileType) && !isVideoFile(fileType) && !isAudioFile(fileType);  // Check if file is a document (not image, video, or audio)

    // Component to display files by type
    function MediaChats({ typeCheck }) {
        return (
            <>
                {
                    // Filter chats of type 'file' matching the given typeCheck and organize by date
                    chatsDataByDate(
                        chatsOfOpenedTab?.filter((chatData) => {
                            return chatData?.chatType == 'file' && typeCheck(chatData?.file?.fileType)  // Filter files by type
                        })
                    )?.map((chatsByDate, idx1) => {
                        return (
                            <div key={idx1} className="w-full mb-2">
                                <div className="mediaDateWise">
                                    {/* Display the date category label */}
                                    <p className="py-1 px-3 text-md font-semibold">{chatsByDate?.chatsDateName}</p>
                                    <div className="mediaItemContainer flex flex-wrap">
                                        {
                                            // Loop through each chat file and render a ChatCard for preview
                                            chatsByDate?.chatsData?.map((chatData, idx2) => {
                                                return (
                                                    <ChatCard chatData={chatData} />
                                                )
                                            })
                                        }
                                    </div>
                                </div>
                            </div>
                        )
                    })
                }
                {
                    // If no chats match the filter, display appropriate empty state message & icon
                    chatsDataByDate(
                        chatsOfOpenedTab?.filter((chatData) => {
                            return chatData?.chatType == 'file' && typeCheck(chatData?.file?.fileType)
                        })
                    ).length == 0 && <div style={{ height: "50%" }} className='text-xl w-full flex flex-col items-center justify-center'>
                        {
                            // Show icon and message for empty image files
                            typeCheck == isImageFile &&
                            <>
                                <HiPhoto className="w-10 h-10 cursor-pointer" />
                                <p>No Photos</p>
                            </>
                        }
                        {
                            // Show icon and message for empty audio files
                            typeCheck == isAudioFile &&
                            <>
                                <IoMusicalNotes className="w-10 h-10 cursor-pointer" />
                                <p>No Audios</p>
                            </>
                        }
                        {
                            // Show icon and message for empty video files
                            typeCheck == isVideoFile &&
                            <>
                                <BiSolidVideos className="w-10 h-10 cursor-pointer" />
                                <p>No Videos</p>
                            </>
                        }
                        {
                            // Show icon and message for empty document files
                            typeCheck == isDocumentFile &&
                            <>
                                <HiDocument className="w-10 h-10 cursor-pointer" />
                                <p>No Documents</p>
                            </>
                        }
                    </div>
                }
            </>
        );
    };
    // Component to preview shared links in chat chats
    function LinkPrev() {
        return (
            <>
                {
                    // Filter chats that are text type and contain links, then organize by date
                    chatsDataByDate(
                        chatsOfOpenedTab?.filter((chatData) => {
                            if (chatData?.chatType === "text") {
                                const textParts = safeParseJSON(chatData?.text);  // Parse text content safely
                                return textParts.some((part) => part.type === 'text' && part.isLink);  // Check if any part is a link
                            }
                            return false;  // Skip if not text chat
                        })
                    )?.map((chatsByDate, idx1) => {
                        return (
                            <div key={idx1} className="w-full mb-2">
                                <div className="mediaDateWise">
                                    {/* Display date label for the group of chats */}
                                    <p className="py-1 px-3 text-md font-semibold">{chatsByDate?.chatsDateName}</p>
                                    <div className="mediaItemContainer flex flex-wrap mt-2">
                                        {
                                            // Loop through each chat containing links and render ChatCard
                                            chatsByDate?.chatsData?.map((chatData, idx2) => {
                                                return (
                                                    <ChatCard chatData={chatData} />
                                                );
                                            })
                                        }
                                    </div>
                                </div>
                            </div>
                        );
                    })
                }
                {
                    // If no link chats are found, show an empty state with icon and message
                    chatsDataByDate(
                        chatsOfOpenedTab?.filter((chatData) => {
                            if (chatData?.chatType === "text") {
                                const textParts = safeParseJSON(chatData?.text);
                                return textParts.some((part) => part.type === 'text' && part.isLink);
                            }
                            return false;
                        })
                    ).length == 0 && <div style={{ height: "50%" }} className='text-xl w-full flex flex-col items-center justify-center'>
                        <BiLinkAlt className="w-10 h-10 cursor-pointer" />
                        <p>No Links</p>
                    </div>
                }
            </>
        );
    };
    // Important Chats (starred and kept chats)
    function ImportantChats({ condition }) {
        return (
            <>
                {
                    // Filter chats where current user ID is included in the given condition array (starredByUsers or keptByUsers), then organize by date
                    chatsDataByDate(
                        chatsOfOpenedTab?.filter((chatData) => {
                            return chatData?.[condition]?.includes(currentUserID);
                        })
                    )?.map((chatsByDate, idx1) => {
                        return <>
                            <div key={idx1} className="w-full mb-2">
                                {/* Display date label for the grouped chats */}
                                <p className="py-1 px-3 text-md font-semibold">{chatsByDate?.chatsDateName}</p>
                                <div className="mediaItemContainer flex flex-wrap">
                                    {
                                        // Loop through each chat in the group and render ChatCard component
                                        chatsByDate?.chatsData?.map((chatData, idx2) => {
                                            return (
                                                <ChatCard chatData={chatData} />
                                            )
                                        })
                                    }
                                </div>
                            </div>
                        </>
                    })
                }
                {
                    // If no chats found matching the condition, display an empty state message with appropriate icon
                    chatsOfOpenedTab?.filter((chatData) => {
                        return chatData?.[condition]?.includes(currentUserID);
                    }).length == 0 && <div style={{ height: "70vh" }} className="w-full mb-2">
                        <div className='w-full h-full flex justify-center items-center'>
                            <div className='w-full'>
                                <div className="w-full flex justify-center">
                                    {
                                        // Show star icon if condition is starredByUsers, else bookmark icon for keptByUsers
                                        condition == "starredByUsers" ?
                                            <HiStar className="w-10 h-10" />
                                            :
                                            <HiBookmark className="w-8 h-8" />
                                    }
                                </div>
                                <div className="w-full flex justify-center mt-1 text-lg">
                                    {
                                        // Show corresponding message depending on the condition
                                        condition == "starredByUsers" ? "No Starred Chats" : "No Kept Chats"
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                }
            </>
        );
    };

    function ChatCard({ chatData }) {
        return (
            <div id={chatData?.customID} className="w-full relative px-3" onClick={() => {
                // Call handleMoreSelectedChats if chat selection mode is active
                if (isChatSelecting) {
                    handleMoreSelectedChats(chatData);
                }
            }}
                // For mobile: start long press timer for selecting chat
                onTouchStart={(e) => {
                    handleHoldStart(chatData);
                }}
                // For mobile: end long press and enable selecting mode
                onTouchEnd={(e) => {
                    handleHoldEnd(holdTimeoutRef)
                }}
                // For mobile: cancel long press and enable selecting mode
                onTouchCancel={(e) => {
                    handleHoldEnd(holdTimeoutRef)
                }}>
                <div className={`chatCard sender`}>
                    <div className={`w-full flex items-center justify-end`}>
                        {
                            (chatData?.senderID == currentUserID && chatData?.chatType != "unsent" && !chatData?.aiAssistant) &&
                            // {/* chat status info - start */}
                            <div className="ml-1 align-self-baseline relative inline-block text-left chatForAction showChildOnParentHover">
                                {/* Dropdown Toggle Button */}
                                <button type="button" className="text-white" id="menu-button" ariaexpanded="true" ariahaspopup="true">
                                    <HiOutlineInformationCircle className="h-5 w-5 text-gray-300" />
                                </button>
                                <ChatStatusInfo
                                    chatData={chatData}
                                    getSingleUserData={getSingleUserData}
                                    activeDarkMode={activeDarkMode}
                                />
                            </div>
                            // {/* chat status info - end */}
                        }
                        {/* Render chat action options like reply, forward, delete */}
                        <ChatActionList
                            chatData={chatData}
                        />
                        {/* chat's meta info: kept/starred status, sent/delivered time and status */}
                    </div>

                    {/* --- Chat Text Link Preview START --- */}
                    {
                        safeParseJSON(chatData?.text)?.filter((part) => {
                            return part?.isLink
                        })?.map((part, partIdx) => {
                            if (part.type === 'text') {
                                const { value, format } = part;
                                if (part?.isLink) {
                                    if (partIdx > 0) return; // Only show one preview
                                    const fullUrl = value.startsWith('http') ? value : `https://${value}`;
                                    return <a href={fullUrl} key={partIdx} className="chatAttachmentBox">
                                        {
                                            part?.logo &&
                                            <img
                                                className="w-full h-full rounded-lg mb-2"
                                                src={part?.logo}
                                                alt="URL logo"
                                            />
                                        }
                                        <div className="url-title">
                                            {part?.title}
                                        </div>
                                        <p className="text-gray-500">{part?.description}</p>
                                        <a
                                            href={fullUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="url-link"
                                        >
                                            {fullUrl}
                                        </a>
                                    </a>
                                }
                            }
                        })
                    }
                    {/* --- Reply Preview START --- */}
                    {
                        chatData?.repliedToInfo && (() => {
                            let repliedToInfo = chatData?.repliedToInfo;
                            let repliedToType = repliedToInfo?.repliedToType;
                            let repliedToID = repliedToInfo?.repliedToID;
                            const repliedChat_Story = repliedToType == "chat" ? getSingleChatData(repliedToID) : getSingleStoryData(repliedToID);
                            return (
                                <div className="chatAttachmentBox text-gray-500">
                                    {
                                        repliedChat_Story == null ?
                                            <>
                                                {repliedToType == "chat" ? "Chat is deleted" : "Story is deleted"}
                                            </>
                                            :
                                            <div
                                                onClick={() => {
                                                    if (repliedToType == "chat") {
                                                        if (repliedChat_Story?.isGroupType) {
                                                            let tabInfo = currentUserData?.recentChatsTabs?.find(
                                                                (recentChatTabInfo) => recentChatTabInfo?.tabID == repliedChat_Story?.toGroupID
                                                            );
                                                            setOpenedTabInfo(
                                                                tabInfo ||
                                                                {
                                                                    tabType: "group",
                                                                    tabID: repliedChat_Story?.toGroupID,
                                                                    recentTime: "",
                                                                    clearingTime: "",
                                                                    isArchived: false,
                                                                    isPinned: false,
                                                                    disappearingTime: "Off",
                                                                }
                                                            );
                                                        };
                                                        setIsChatSelecting(false);
                                                        setSelectedChats([]);
                                                        setShowProfileInfo(false);
                                                        setTimeout(() => {
                                                            document.getElementById(repliedToID)?.scrollIntoView({ behavior: "smooth" });
                                                        }, 100);
                                                    } else {
                                                        setShowProfileInfo(false);
                                                        setStoryForDirectDisplay(repliedChat_Story);
                                                        handleShowingSections(setShowStoriesSection);
                                                    };
                                                }}
                                                className="cursor-pointer repliedInfo"
                                            >
                                                <div className="flex items-center font-semibold text-lg">
                                                    {
                                                        repliedChat_Story?.senderID === currentUserID ? `You `
                                                            :
                                                            <TextWithEmojis
                                                                hide={true}
                                                                textWidth="100px"
                                                                textData={
                                                                    openedTabInfo?.tabType == "aiAssistant" ? aiAssistant?.profileInfo?.name :
                                                                        getSingleUserData(repliedChat_Story?.data?.senderID)?.profileInfo?.name
                                                                }
                                                                isSearching={false}
                                                            />
                                                    }
                                                    {repliedToType == "story" ? " : story" : ""}
                                                </div>
                                                {
                                                    (repliedChat_Story?.chatType === "text" || repliedChat_Story?.storyType === "text") &&
                                                    <TextWithEmojis
                                                        hide={true}
                                                        textWidth="120px"
                                                        textData={repliedChat_Story?.text}
                                                        isSearching={false}
                                                    />
                                                }
                                                {
                                                    (repliedChat_Story?.chatType === "file" || repliedChat_Story?.storyType === "media") &&
                                                    <div style={{ width: `${(repliedChat_Story?.file?.fileWidth || repliedChat_Story?.mediaFile?.fileWidth) / 6}px` }}>
                                                        <FileChat
                                                            chatData={repliedChat_Story}
                                                        />
                                                    </div>
                                                }
                                                {/* voice call or video call as chat */}
                                                {
                                                    ["voice-call", "video-call"]?.includes(repliedChat_Story?.chatType) &&
                                                    <CallDataAsChat
                                                        callData={getSingleCallData(safeParseJSON(repliedChat_Story?.text)[0]?.callID)}
                                                        currentUserID={currentUserID}
                                                        showMoreCallInfo={false}
                                                    />
                                                }
                                                {
                                                    // for contact sharing or group invitaion 
                                                    ["group-invitaion", "contact-share"]?.includes(repliedChat_Story?.chatType) &&
                                                    <div className='w-full flex items-center justify-start gap-x-2'>
                                                        {
                                                            repliedChat_Story?.chatType == "contact-share" ?
                                                                <HiUser className="text-lg" />
                                                                :
                                                                <BiSolidGroup className="text-lg" />
                                                        }
                                                        <TextWithEmojis
                                                            hide={true}
                                                            textWidth={`120px`}
                                                            textData={
                                                                repliedChat_Story?.chatType == "group-invitaion" ?
                                                                    getSingleGroupData(safeParseJSON(repliedChat_Story?.text)[0]?.targetGroupID)?.profileInfo?.name
                                                                    :
                                                                    getSingleUserData(safeParseJSON(repliedChat_Story?.text)[0]?.targetUserID)?.profileInfo?.name
                                                            }
                                                            isSearching={false}
                                                        />
                                                    </div>
                                                }
                                            </div>
                                    }
                                </div>
                            );
                        })()
                    }
                    {/* --- Reply Preview END --- */}
                    {/* chat's main content - start */}
                    {
                        chatData?.chatType == "file" &&
                        <div className={`w-full h-full`} onClick={() => {
                            if (chatData?.receiversInfo?.every(receiverInfo => receiverInfo?.status != "sending")) {
                                setShowFileChatsInCarousel(true);
                                setOpenedFileChatData(chatData);
                                setShowProfileInfo(false);
                            };
                        }}>
                            <FileChat
                                chatData={chatData}
                            />
                        </div>
                    }
                    {
                        // Show text chat for unsent or text types
                        ["unsent", "text"]?.includes(chatData?.chatType) &&
                        <span className={`textWrapper ${chatData?.text && "mr-0"}`} style={{ fontSize: '16px' }}>
                            {
                                <TextChat textData={chatData?.text} />
                            }
                        </span>
                    }
                    {
                        // Show call data if chat type is voice-call or video-call
                        ["voice-call", "video-call"]?.includes(chatData?.chatType) &&
                        <CallDataAsChat
                            callData={getSingleCallData(safeParseJSON(chatData?.text)[0]?.callID)}
                            currentUserID={currentUserID}
                            showMoreCallInfo={true}
                        />
                    }
                    {
                        // Show group invitation info card if chat type is group-invitaion
                        chatData?.chatType == "group-invitaion" &&
                        <div className="profileInfoCard mt-2 w-full flex items-center justify-center flex-col gap-y-1">
                            <ProfileInfoCard
                                tabData={{
                                    ...getSingleGroupData(JSON.parse(chatData?.text)[0]?.targetGroupID),
                                    members: getSingleGroupData(JSON.parse(chatData?.text)[0]?.targetGroupID)?.members?.map((memberID) => {
                                        return getSingleUserData(memberID)
                                    })
                                }}
                                currentUserID={currentUserID}
                                isSearching={false}
                            />
                            {
                                // If group is not deleted, show join group button or already joined message
                                !getSingleGroupData(safeParseJSON(chatData?.text)[0]?.targetGroupID)?.isDeleted &&
                                <>
                                    {
                                        (
                                            !getSingleGroupData(JSON.parse(chatData?.text)[0]?.targetGroupID)?.members?.includes(currentUserID) &&
                                            checkLinkExpiration(JSON.parse(chatData?.text)[0]?.invitingTime)?.expired == false
                                        ) ?
                                            <div className="rounded-lg p-3 font-semi text-md text-center" style={{ width: "50%", backgroundColor: "rgba(38,46,53,0.2)" }}>
                                                <p className="cursor-pointer w-full" onClick={() => {
                                                    // Trigger joining the group on click
                                                    joinGroup(
                                                        JSON.parse(chatData?.text)[0]?.targetGroupID // Pass the target group ID
                                                    )
                                                }}>
                                                    Join Group
                                                </p>
                                            </div>
                                            :
                                            <div className="font-semi text-md text-center w-auto">
                                                You are already in this group
                                            </div>
                                    }
                                    {
                                        // Show expiration message for group invite link
                                        <div className="font-semi text-md text-center w-auto">
                                            {
                                                checkLinkExpiration(JSON.parse(chatData?.text)[0]?.invitingTime)?.message
                                            }
                                        </div>
                                    }
                                </>
                            }
                        </div>
                    }
                    {
                        // Show contact share info card if chat type is contact-share
                        chatData?.chatType == "contact-share" &&
                        <div className="w-full flex items-center justify-center flex-col gap-y-2">
                            <ProfileInfoCard
                                tabData={getSingleUserData(safeParseJSON(chatData?.text)[0]?.targetUserID)}
                                currentUserID={currentUserID}
                                isSearching={false}
                            />
                            {
                                // If user is not deleted, show open profile button
                                !getSingleUserData(safeParseJSON(chatData?.text)[0]?.targetUserID)?.isDeleted &&
                                <div className="rounded-lg w-auto p-3 font-semi text-md text-center" style={{ backgroundColor: "rgba(38,46,53,0.2)" }}>
                                    <p
                                        className="cursor-pointer w-full"
                                        onClick={() => {
                                            // Find recent chat tab for the user or create default tab info
                                            let tabInfo = currentUserData?.recentChatsTabs?.find(
                                                (recentChatTabInfo) => recentChatTabInfo?.tabID == safeParseJSON(chatData?.text)[0]?.targetUserID
                                            );
                                            setOpenedTabInfo(
                                                tabInfo ||
                                                {
                                                    tabType: "user",
                                                    tabID: safeParseJSON(chatData?.text)[0]?.targetUserID,
                                                    recentTime: "",
                                                    clearingTime: "",
                                                    isArchived: false,
                                                    isPinned: false,
                                                    disappearingTime: "Off",
                                                }
                                            );
                                            setShowProfileInfo(false);
                                        }}
                                    >
                                        Open Profile
                                    </p>
                                </div>
                            }
                        </div>
                    }
                    {/* chat's main content - end */}
                    <div className='w-full text-right white opacity-60 flex items-center justify-end' style={{ position: 'relative', top: '2px' }}>
                        <span>
                            {
                                // Show bookmark icon if current user kept the chat
                                chatData?.keptByUsers?.includes(currentUserID) && (
                                    <HiBookmark className='w-4 h-4 text-white mr-1' />
                                )
                            }
                        </span>
                        <span style={{ fontSize: "12px" }}>
                            {
                                // Show star icon if current user starred the chat
                                chatData?.starredByUsers?.includes(currentUserID) && (
                                    <FontAwesomeIcon icon={faStar} />
                                )
                            }
                        </span>
                        <span className='ml-1'>
                            {
                                // Show sent time if current user is sender, else show delivered time
                                currentUserID == chatData?.senderID ?
                                    new Date(chatData?.sentTime).toLocaleTimeString('en-US', timeOptions)
                                    :
                                    new Date(
                                        chatData?.receiversInfo?.find(receiverInfo => receiverInfo?.receiverID == currentUserID)?.deliveredTime
                                    ).toLocaleTimeString('en-US', timeOptions)
                            }
                        </span>
                    </div>
                    {/* chat's meta info - end */}
                </div>
                {
                    // Highlight chat if it's selected
                    isChatSelecting &&
                    <div className={`selecting cursor-pointer absolute right-0 top-0 w-full h-full`} style={{
                        backgroundColor: selectedChats?.some(selectedChat => selectedChat?.customID == chatData?.customID) ? "rgba(196, 192, 248, 0.5)" : "transparent"
                    }}></div>
                }
            </div>
        )
    };
    function truncateMembers(members, limit = 4) {
        // If members exceed limit, show first 'limit' members followed by '...'
        return members.length > limit
            ? members.slice(0, limit).join(', ') + '...'
            // Otherwise, join all members with comma
            : members.join(', ');
    };
    // Function to handle incoming WebSocket messages related to the profile settings
    // This is used to hide the loading animation and show a success toast when a setting change is successful
    function handleCommingWebSocketMessage(event) {
        // Parse the received WebSocket message data
        const webSocketMessageData = JSON.parse(event.data);

        // Check the type of WebSocket message and perform actions accordingly
        switch (webSocketMessageData.type) {
            case 'user:profileInfo:change':
                // check if current user is taking action 
                if (showProgressBar) {
                    // Handle user profile info update
                    handleChangeUserPorfileInfo(webSocketMessageData?.newProfileInfo);
                    closeActivityArea(); // Close any active UI overlay
                    refereshUserSelecting(); // Refresh user selection UI
                    setShowProgressBar(false); // Hide the loading animation
                    setShowProfileInfo(false); // Hide the profile info panel
                    toast.success("Setting is updated!"); // Show success notification
                };
                break;
            case 'setting:updated':
                if (showProgressBar) {
                    // Handle general setting update success
                    closeActivityArea();
                    refereshUserSelecting();
                    setShowProgressBar(false); // Hide the loading animation
                    setShowProfileInfo(false); // Hide the profile info panel
                    toast.success("Setting is updated!"); // Show success notification
                };
                break;
            case 'setting:failed':
                if (showProgressBar) {
                    // Handle setting update failure
                    closeActivityArea();
                    refereshUserSelecting();
                    setShowProgressBar(false); // Hide the loading animation
                    setShowProfileInfo(false); // Hide the profile info panel
                    toast.error("Setting is failed!"); // Show failure notification
                };
                break;
            default:
                // If the message type is unknown, do nothing
                // console.log('not found');
                break;
        }
    }

    // useEffect to add and remove WebSocket event listener
    useEffect(() => {
        // Attach the WebSocket event listener when the component mounts
        wbServer.addEventListener("message", handleCommingWebSocketMessage);

        // Cleanup function to remove the event listener when the component unmounts
        return () => {
            wbServer.removeEventListener("message", handleCommingWebSocketMessage);
        };
    }, [wbServer, handleCommingWebSocketMessage]); // Dependencies: Re-run if `wbServer` or `handleCommingWebSocketMessage` changes

    return (
        <React.Fragment>
            {
                // Show loading animation if showProgressBar is true
                showProgressBar &&
                <ProgressBar
                    position={'absolute'}
                />
            }
            {/* profile picture handling - start */}
            {
                // Option for profile picture actions: camera, gallery, and delete (to remove previous profile pic)
                showProfilePicOption &&
                <div className='overlay w-full h-full flex justify-center items-center'>
                    <div style={{ borderRadius: '10px' }} className={`optionForProfileImgInner w-auto h-auto bg-indigo-100`}>
                        <div className='w-full h-full flex justify-center items-center'>
                            {/* Back arrow to close the profile picture options */}
                            <BsArrowLeft className='cursor-pointer myColor w-8 h-8'
                                onClick={() => {
                                    setShowProfilePicOption(false);
                                }}
                            />
                        </div>
                        <div className='btnsContainer'>
                            {/* Camera option to open camera panel */}
                            <p onClick={() => {
                                if (currentCallData == null) {
                                    setShowCameraPanel(true);
                                    setShowProfilePicOption(false);
                                };
                            }} className={`flex items-center justify-center flex-col ${currentCallData && "cursor-not-allowed"} `}>
                                <button className='p-4 rounded-full text-white myBgColor'>
                                    <BsCameraFill className='w-6 h-6' />
                                </button>
                                <span className='mt-1 text-md text-gray-600 font-semibold'>
                                    Camera
                                </span>
                            </p>
                            {/* Gallery option to upload image file */}
                            <p className='flex items-center justify-center flex-col'>
                                <label className='p-4 rounded-full text-white myBgColor cursor-pointer'>
                                    <HiMiniPhoto className='w-6 h-6' />
                                    <input
                                        type='file'
                                        accept='image/*'
                                        onChange={(e) => {
                                            handlePictureUpload(
                                                e,
                                                setProfilePicInfo,
                                                setShowProfileEditingPanel
                                            );
                                            setShowProfilePicOption(false); // Hide the profile picture option after upload
                                        }}
                                        className='hidden'  // Hide the default file input UI
                                    />
                                </label>
                                <span className='mt-1 text-md text-gray-600 font-semibold'>
                                    Gallery
                                </span>
                            </p>
                            {
                                // Show remove option only if a profile picture exists
                                openedTabData?.profileInfo?.profilePic &&
                                <p className='flex items-center justify-center flex-col'>
                                    <button className='p-4 rounded-full text-white myBgColor'>
                                        {/* Delete icon button to remove current profile picture */}
                                        <AiFillDelete onClick={() => {
                                            // Remove user profile picture if the tab is the current user
                                            if (openedTabInfo?.tabID == currentUserID) {
                                                prepareUserProfileInfoUpdating(
                                                    "profilePic", // Updating key
                                                    { oldPublicId: openedTabData?.profileInfo?.publicId, }, // Data for removal
                                                );
                                                closeActivityArea();
                                                refereshUserSelecting();
                                                setShowProgressBar(true); // Show loading animation
                                            };
                                            // Remove group profile picture if the tab is a group
                                            if (openedTabInfo?.tabType == 'group') {
                                                prepareGroupProfileInfoUpdating({
                                                    groupID: openedTabInfo?.tabID,
                                                    tabInfo: openedTabInfo,
                                                    updatingDataKey: "profilePic",
                                                    updatingValue: { oldPublicId: openedTabData?.profileInfo?.publicId, } // Removal data
                                                })
                                            };
                                            // Remove broadcast profile picture if the tab is a broadcast
                                            if (openedTabInfo?.tabType == 'broadcast') {
                                                prepareBroadcastProfileInfoUpdating({
                                                    broadcastID: openedTabData?._id,
                                                    tabInfo: openedTabInfo,
                                                    updatingDataKey: "profilePic",
                                                    updatingValue: { oldPublicId: openedTabData?.profileInfo?.publicId, } // Removal data
                                                })
                                            };
                                            setShowProgressBar(true);
                                            setShowProfilePicOption(false); // Hide options after removal
                                        }} className='w-6 h-6' />
                                    </button>
                                    <span className='mt-1 text-md text-gray-600 font-semibold'>
                                        Remove
                                    </span>
                                </p>
                            }
                        </div>
                    </div>
                </div>
            }
            {
                // Show camera panel only if showCameraPanel is true
                showCameraPanel &&
                <CameraFrame
                    needToCapture={"image"} // Specify that only image capture is needed
                    setShowCameraPanel={setShowCameraPanel} // To toggle camera panel visibility
                    setCaptureImage={setProfilePicInfo} // Callback for captured image data
                    setCaptureVideo={null} // No video capture needed
                />
            }
            {
                // Profile picture editing component, shown only if editing panel is active
                showProfileEditingPanel &&
                <HandleProfileImage
                    profilePicInfo={profilePicInfo} // Current profile picture info
                    setProfilePicInfo={setProfilePicInfo} // Setter for profile picture info
                    setShowProfileEditingPanel={setShowProfileEditingPanel} // To toggle editing panel visibility
                />
            }
            {/* profile picture full view */}
            {
                // Full view of profile picture, shown if toggled
                showFullProfilePic &&
                <div className='prfoileImgContainer'>
                    <div className='prfoileImgBtn flex items-center justify-between'>
                        {/* Back arrow to close full view */}
                        <BsArrowLeft className='cursor-pointer w-8 h-8'
                            onClick={() => {
                                setShowFullProfilePic(false);
                            }}
                        />
                        {
                            // Edit icon to open profile editing panel from full view
                            isProfileChangeAllowed &&
                            <FontAwesomeIcon
                                icon={faPen}
                                className="w-5 h-5 cursor-pointer"
                                onClick={() => {
                                    setShowFullProfilePic(false);
                                    setProfilePicInfo({ fileURL: openedTabData?.profileInfo?.profilePic });
                                    setShowProfileEditingPanel(true);
                                }}
                            />
                        }
                    </div>
                    <div className='prfoileImg h-auto overflow-hidden'>
                        {/* Display the full profile image */}
                        <img src={openedTabData?.profileInfo?.profilePic} alt="Uploaded" className="pointer-events-none w-full h-auto object-cover" />
                    </div>
                </div>
            }
            {/* profile picture handling - end */}
            {
                // Rendering the ChatForwarding panel only when showChatForwardingPanel is true
                showChatForwardingPanel &&
                <ChatForwarding />
            }
            {
                !showChatForwardingPanel && !showProfilePicOption &&
                <div className='profileInfo overlay flex items-end justify-end'>
                    {/* users selecting - start */}
                    {
                        // Render user selection overlay only if userSelectionFor is not null
                        userSelectionFor != null &&
                        <div className='overlay'>
                            <div style={{ backgroundColor: "rgb(245,247,251)" }} className='overlayInner overflow-y-auto h-full m-auto text-gray-900'>
                                {
                                    // If there are target users to display
                                    targetUsers?.length > 0 ?
                                        <>
                                            {/* Header section with back arrow and selected users count */}
                                            <div className={`${activeDarkMode ? "darkModeBg2" : ''} border-b border-gray-200 px-2 py-4 flex items-center justify-between`}>
                                                <div className='flex justify-center items-center gap-x-2'>
                                                    <BsArrowLeft className='cursor-pointer w-8 h-8'
                                                        onClick={() => {
                                                            refereshUserSelecting(); // Reset user selection on back
                                                        }}
                                                    />
                                                    <p className='text-xl font-sm'>
                                                        {
                                                            // Show "Select" if no users selected, otherwise show count
                                                            selectedUsers?.length == 0 ?
                                                                "Select"
                                                                :
                                                                selectedUsers?.length + " Selected"
                                                        }
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-center gap-x-2 relative showChildOnParentHover">
                                                    {
                                                        // Show add or options button if users are selected
                                                        selectedUsers?.length != 0 &&
                                                        <>
                                                            {
                                                                userSelectionFor == "addingToGroupOrBroadcast" ?
                                                                    // Show add button when adding users to group/broadcast
                                                                    <>
                                                                        <BsPlus className="cursor-pointer w-7 h-7" onClick={() => {
                                                                            if (openedTabInfo?.tabType == "group") {
                                                                                prepareMemberAddition({
                                                                                    groupID: openedTabData?._id,
                                                                                    tabInfo: openedTabInfo,
                                                                                    targetMemberIDs: selectedUsers
                                                                                });
                                                                            } else {
                                                                                prepareBroadcastMemberAddition({
                                                                                    broadcastID: openedTabData?._id,
                                                                                    tabInfo: openedTabInfo,
                                                                                    targetMemberIDs: selectedUsers
                                                                                })
                                                                            };
                                                                            refereshUserSelecting(); // Reset selection after adding
                                                                        }} />
                                                                    </>
                                                                    :
                                                                    // Show dropdown menu for select/unselect all and remove
                                                                    <>
                                                                        <div className={`cursor-pointer flex justify-center items-center p-1 rounded-md text-sm`}>
                                                                            <BiDotsVerticalRounded className={`h-6 w-6 ${activeDarkMode ? "text-white" : 'text-gray-600'}`} />
                                                                        </div>
                                                                        <div style={{ transition: "0.3s" }} className={`${activeDarkMode ? "darkModeBg3" : ''} showOnHover text-gray-500 py-2 px-2 origin-top-right absolute top-10 right-2 z-10 mt-0 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none w-max`}>
                                                                            <div onClick={() => {
                                                                                // Toggle select all or unselect all
                                                                                selectedUsers?.length == targetUsers?.length ? setSelectedUsers([]) : setSelectedUsers(targetUsers);
                                                                            }} className="px-3 py-2 flex items-center justify-between cursor-pointer" role="none">
                                                                                {selectedUsers?.length == targetUsers?.length ? "Unselect" : "Select All"}
                                                                                <BsCheck2 className='w-6 h-6 inline' strokeWidth={1} />
                                                                            </div>
                                                                            <div onClick={() => {
                                                                                // Remove selected users if not the creator
                                                                                if (!selectedUsers?.includes(openedTabData?.createdBy)) {
                                                                                    if (openedTabInfo?.tabType == "group") {
                                                                                        prepareMemberRemoval({
                                                                                            groupID: openedTabInfo?.tabID,
                                                                                            tabInfo: openedTabInfo,
                                                                                            targetMemberIDs: selectedUsers,
                                                                                            textMsg: {
                                                                                                type: 'text',
                                                                                                value: `removed`, // Message content
                                                                                                targetUsers: selectedUsers // Target users info
                                                                                            }
                                                                                        });
                                                                                    } else {
                                                                                        prepareBroadcastMemberRemoval({
                                                                                            broadcastID: openedTabInfo?.tabID,
                                                                                            tabInfo: openedTabInfo,
                                                                                            targetMemberIDs: selectedUsers,
                                                                                        })
                                                                                    };
                                                                                } else {
                                                                                    toast.error(`You cant not remove the creator of the group`);
                                                                                };
                                                                                refereshUserSelecting(); // Reset selection after removal
                                                                            }} className="px-3 py-2 flex items-center justify-between cursor-pointer" role="none">
                                                                                Remove
                                                                                <FaUserMinus className='w-6 h-6 inline' strokeWidth={1} />
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                            }
                                                        </>
                                                    }
                                                </div>
                                            </div>
                                            {/* List of target users */}
                                            <div className={`${activeDarkMode ? "darkModeBg2" : ''} w-full h-full`}>
                                                {
                                                    targetUsers?.map((targetUserID, idx) => {
                                                        // Exclude current user from list
                                                        return targetUserID != currentUserID && <div key={idx} onClick={() => {
                                                            handleSelectedUsers(targetUserID); // Toggle user selection
                                                        }} className={`relative`}>
                                                            <button className={`${activeDarkMode ? "darkModeBg1" : ''} profileTab border-b border-gray-200 flex items-center justify-start w-full`}>
                                                                <ProfileTab
                                                                    tabData={getSingleUserData(targetUserID)}
                                                                    currentUserID={currentUserID}
                                                                />
                                                            </button>
                                                            <div style={{
                                                                display: selectedUsers?.includes(targetUserID)
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
                                            </div>
                                        </>
                                        :
                                        // Display this if no target users found
                                        <div className={`w-full h-full ${activeDarkMode ? "darkModeBg2" : ''}`}>
                                            <div className='px-2 py-2 flex items-center justify-between'>
                                                <BsArrowLeft className='cursor-pointer w-8 h-8'
                                                    onClick={() => {
                                                        // Reset selections and close user selection overlay
                                                        setSelectedUsers([]);
                                                        setUserSelectionFor(null);
                                                        setTargetUsers([]);
                                                    }}
                                                />
                                            </div>
                                            <div className={`w-full h-full flex items-center justify-center`}>
                                                No Data Found
                                            </div>
                                        </div>
                                }
                            </div>
                        </div>
                    }
                    {/* users selecting - end */}
                    <div className={`${activeDarkMode ? "darkModeBg2" : ''} profileInfoComponent overlayInner relative flex flex-col h-full text-gray-600`}>
                        {/* Contact Info Section */}
                        <div className="h-full">
                            {
                                // show main view of profile info, when nothing is opned of media details, disappearing panel, starred chats and kept chats
                                (!showMediaDetails && !showStarredChats && !showKeptChats) &&
                                <>
                                    {/* top bar -start */}
                                    <div className='w-full py-3 px-4 flex flex-row items-center justify-between'>
                                        <div className="flex items-center justify-center text-xl font-semibold">
                                            <BsArrowLeft className='cursor-pointer w-8 h-8'
                                                onClick={() => {
                                                    setShowProfileInfo(false);
                                                }}
                                            />
                                        </div>
                                    </div>
                                    {/* top bar -end */}
                                    <div className="w-full h-full">
                                        {/* Profile Avatar and Name - start */}
                                        <div className="flex items-center justify-center flex-col px-4">
                                            <div style={{
                                                //background color for user, group and broadcast avatar only when they don't have any image
                                                backgroundColor: openedTabData?.profileInfo?.profilePic == "" && openedTabData?.profileInfo?.bgColor,
                                                borderColor: `${activeDarkMode ? "rgb(48,56,65)" : '#f5f7fb'}`,
                                                outlineColor: `${activeDarkMode ? "rgb(75, 85, 99)" : '#e6ebf5'}`
                                            }} className="largeProfileAvatar flex items-center justify-center rounded-full relative">
                                                {
                                                    openedTabData?.profileInfo?.profilePic ? (
                                                        <img
                                                            className="w-full h-full rounded-full cursor-pointer"
                                                            src={`${openedTabData?.profileInfo?.profilePic}`}
                                                            alt="Profile"
                                                            onClick={() => {
                                                                setShowFullProfilePic(true);
                                                            }}
                                                        />
                                                    )
                                                        : openedTabInfo?.tabType == "user" ?
                                                            safeParseJSON(openedTabData?.profileInfo?.name)?.find(item => item.type === 'text')?.value?.charAt(0)?.toUpperCase()
                                                            : (
                                                                // For groups, show group icon
                                                                <BiSolidGroup className="text-4xl text-white" />
                                                            )

                                                }
                                                {
                                                    isProfileChangeAllowed &&
                                                    <button className='p-2 myBgColor absolute bottom-0 right-0 rounded-full flex items-center justify-center' onClick={() => { setShowProfilePicOption(true) }}>
                                                        <FontAwesomeIcon icon={faPen} className="w-3 h-3" />
                                                    </button>
                                                }
                                            </div>
                                            <div className="w-auto text-center">
                                                <h3 className="text-inherit text-xl font-semibold">
                                                    <TextWithEmojis
                                                        hide={false}
                                                        textWidth={`auto`}
                                                        textData={openedTabData?.profileInfo?.name}
                                                    />
                                                </h3>
                                                <p className="capitalize mt-1">
                                                    {
                                                        openedTabInfo.tabID != currentUserID && openedTabInfo.tabType == 'user' && openedTabData?.profileInfo?.activeStatus != '' &&
                                                        (openedTabData?.profileInfo?.activeStatus != 'online') &&
                                                        (
                                                            formatStatusTimestamp(openedTabData?.profileInfo?.activeStatus)
                                                        )
                                                    }
                                                    {
                                                        openedTabInfo.tabID != currentUserID && openedTabData?.profileInfo?.activeStatus == 'online' && "Online"
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        {/* Profile Avatar and Name - end */}
                                        <div className="otherSections">
                                            {
                                                // Show audio and video calling buttons only if the opened tab is a user and the user is not deleted
                                                (openedTabInfo?.tabType == 'user' && !openedTabData?.isDeleted) &&
                                                <div className={`w-full mb-4 overflow-hidden`}>
                                                    <button className="accordion cursor-pointer flex justify-center gap-x-4 w-full p-0 text-left font-medium rounded-md">
                                                        {/* Voice call button, disabled if a call is already active */}
                                                        <HiOutlinePhone className={`${currentCallData && "cursor-not-allowed"} w-7 h-7`} onClick={() => {
                                                            if (currentCallData == null) {
                                                                makeNewCall({
                                                                    caller: currentUserID,
                                                                    callee: openedTabData?._id,
                                                                    callType: 'voice'
                                                                })
                                                            };
                                                        }} />
                                                        {/* Video call button, disabled if a call is already active */}
                                                        <HiOutlineVideoCamera className={`${currentCallData && "cursor-not-allowed"} w-7 h-7`} onClick={() => {
                                                            if (currentCallData == null) {
                                                                makeNewCall({
                                                                    caller: currentUserID,
                                                                    callee: openedTabData?._id,
                                                                    callType: 'video'
                                                                })
                                                            };
                                                        }} />
                                                        {/* Contact share button to trigger chat forwarding panel with contact info */}
                                                        <HiOutlineShare className='relative top-1 w-6 h-6' onClick={() => {
                                                            let contactSharingChatData = {
                                                                chatType: "contact-share",
                                                                text: JSON.stringify([{
                                                                    type: 'text',
                                                                    value: `Contact info`,
                                                                    targetUserID: openedTabData?._id
                                                                }])
                                                            };
                                                            setShowChatForwardingPanel(true) // Show chat forwarding panel
                                                            setForwardingChats([contactSharingChatData]) // Set chats to forward with contact info
                                                        }} />
                                                    </button>
                                                </div>
                                            }
                                            {/* name,about or description,email section - start*/}
                                            <div className={`${activeDarkMode ? "darkModeBg1" : ''} w-full mb-2 mx-auto rounded-md border`}>
                                                <div onClick={() => {
                                                    // Toggle the visibility of the profile information section
                                                    handleShowingSection(setShowProfileInformation);
                                                    setShowProfileInformation(!showProfileInformation);

                                                    // Delay to allow UI update before setting input field values
                                                    setTimeout(() => {
                                                        // If the name input ref is available, populate it with the user's profile name
                                                        if (nameInputRef.current != null) {
                                                            printTextIn_InputField(nameInputRef, openedTabData?.profileInfo?.name);
                                                        };
                                                        // If the about input ref is available, populate it with the user's about or description
                                                        if (aboutInputRef.current != null) {
                                                            printTextIn_InputField(
                                                                aboutInputRef, openedTabData?.profileInfo?.about || openedTabData?.profileInfo?.description
                                                            );
                                                        };
                                                    }, 10);
                                                }} className="accordion cursor-pointer flex justify-between w-full p-3 text-left font-medium rounded-md">
                                                    {/* Section title */}
                                                    Profile Info
                                                    {/* Chevron icon rotates when the profile info section is expanded */}
                                                    <HiMiniChevronDown className={`${showProfileInformation ? "rotate-180" : ""} h-6 w-6`} />
                                                </div>
                                                {
                                                    showProfileInformation &&
                                                    <div className={`${activeDarkMode ? "darkModeBg3" : ''}`}>
                                                        {/* Container for profile info name input section */}
                                                        <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto w-full py-2.5 px-3 text-left relative border-b`}>
                                                            <div className="w-full flex items-center justify-between">
                                                                {/* Label for name field */}
                                                                <p className='opacity-80 font-sm'>
                                                                    Name
                                                                </p>
                                                                {
                                                                    // Conditions to allow name editing:
                                                                    // - If this is the current user’s own profile
                                                                    // - Or if this is a group/broadcast tab and current user is admin or creator
                                                                    (openedTabData?._id == currentUserID
                                                                        ||
                                                                        (openedTabInfo?.tabType != 'user' &&
                                                                            (openedTabData?.admins?.includes(currentUserID) ||
                                                                                openedTabData?.createdBy == currentUserID
                                                                            )
                                                                        )
                                                                    ) && !openedTabData?.isDeleted &&
                                                                    <>
                                                                        {
                                                                            // Show edit icon if not currently changing name and input is empty
                                                                            (!isChangeName && !isNameInputNotEmpty && isProfileChangeAllowed) &&
                                                                            <FontAwesomeIcon onClick={() => {
                                                                                // Populate input field with current name and enable editing
                                                                                if (nameInputRef.current) {
                                                                                    printTextIn_InputField(
                                                                                        nameInputRef, openedTabData?.profileInfo?.name
                                                                                    );
                                                                                };
                                                                                setIsChangeName(true);
                                                                                setIsChangeAbout(false);
                                                                                setIsAboutInputNotEmpty(false);
                                                                            }} icon={faPen} className="ml-2 text-lg cursor-pointer"
                                                                            />
                                                                        }
                                                                        {
                                                                            // Show check icon to confirm name change if editing and input is not empty
                                                                            (isChangeName && isNameInputNotEmpty) &&
                                                                            <FaCheck className="text-2xl cursor-pointer" onClick={async () => {
                                                                                // Extract updated name and call relevant update functions
                                                                                let extractedContentObject = await extractContentFromInputField(nameInputRef);
                                                                                if (openedTabData?._id == currentUserID) {
                                                                                    prepareUserProfileInfoUpdating(
                                                                                        "name",//updating key
                                                                                        extractedContentObject, //updating value
                                                                                    );
                                                                                };
                                                                                if (openedTabInfo?.tabType == "group") {
                                                                                    prepareGroupProfileInfoUpdating({
                                                                                        groupID: openedTabData?._id,
                                                                                        tabInfo: openedTabInfo,
                                                                                        updatingDataKey: "name",
                                                                                        updatingValue: extractedContentObject,
                                                                                    });
                                                                                    // Change group name if applicable
                                                                                } else if (openedTabInfo?.tabType == "broadcast") {
                                                                                    prepareBroadcastProfileInfoUpdating({
                                                                                        broadcastID: openedTabData?._id,
                                                                                        tabInfo: openedTabInfo,
                                                                                        updatingDataKey: "name",
                                                                                        updatingValue: extractedContentObject,
                                                                                    })
                                                                                };
                                                                                setShowProgressBar(true);
                                                                                closeActivityArea(); // Hide the activity area after update
                                                                            }} />
                                                                        }
                                                                    </>
                                                                }
                                                            </div>
                                                            <div className="flex items-center mt-2">
                                                                {
                                                                    // Show emoji icon if name is being edited, toggle emoji picker on click
                                                                    (isChangeName) &&
                                                                    <HiOutlineFaceSmile className={`cursor-pointer h-8 w-8 mr-1`} onClick={() => {
                                                                        setShowEmojiContainer(!showEmojiContainer);
                                                                    }} />
                                                                }
                                                                {/* Editable div for name input */}
                                                                <div
                                                                    ref={nameInputRef}
                                                                    contentEditable={isChangeName ? true : false}
                                                                    className={`${isChangeName ? `inputForMessage editable_div not_prevent_select input_field w-full border rounded-xl focus:outline-none focus:border-indigo-300 ${activeDarkMode ? "darkModeBg1" : ''}` : ""} `}
                                                                    onKeyDown={(e) => {
                                                                        handleInputDirection(
                                                                            e, // event object
                                                                            nameInputRef, // input field ref
                                                                            setIsNameInputNotEmpty,// setter to track if input is empty
                                                                            60, // character limit for name input
                                                                            false // disallow new lines
                                                                        );
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {
                                                            // Show about/description input section if profile is not deleted
                                                            !openedTabData?.isDeleted &&
                                                            <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto w-full py-2.5 px-3 text-left relative border-b`}>
                                                                <div className="w-full flex items-center justify-between">
                                                                    {/* Label switches between "About" or "Description" based on tab type */}
                                                                    <p className='opacity-80 font-sm'>
                                                                        {openedTabInfo?.tabType == 'user' ? "About" : "Description"}
                                                                    </p>
                                                                    {
                                                                        // Conditions to allow editing of about/description (similar to name)
                                                                        (openedTabData?._id == currentUserID
                                                                            ||
                                                                            (openedTabInfo?.tabType != 'user' &&
                                                                                (openedTabData?.admins?.includes(currentUserID) ||
                                                                                    openedTabData?.createdBy == currentUserID
                                                                                )
                                                                            )
                                                                        ) &&
                                                                        <>
                                                                            {
                                                                                // Show edit icon when not editing and input is empty
                                                                                (!isChangeAbout && !isAboutInputNotEmpty && isProfileChangeAllowed) &&
                                                                                <FontAwesomeIcon onClick={() => {
                                                                                    // Populate input field and enable editing
                                                                                    if (aboutInputRef.current) {
                                                                                        printTextIn_InputField(
                                                                                            aboutInputRef,
                                                                                            openedTabData?.profileInfo?.about || openedTabData?.profileInfo?.description
                                                                                        );
                                                                                    }
                                                                                    setIsChangeAbout(true);
                                                                                    setIsChangeName(false);
                                                                                    setIsNameInputNotEmpty(false);
                                                                                }} icon={faPen} className="ml-2 text-lg cursor-pointer"
                                                                                />
                                                                            }
                                                                            {
                                                                                // Show check icon to confirm changes when editing and input is not empty
                                                                                (isChangeAbout && isAboutInputNotEmpty) &&
                                                                                <FaCheck className="text-2xl cursor-pointer" onClick={async () => {
                                                                                    // Extract updated about/description and call update functions
                                                                                    let extractedContentObject = await extractContentFromInputField(aboutInputRef);
                                                                                    if (openedTabData?._id == currentUserID) {
                                                                                        prepareUserProfileInfoUpdating(
                                                                                            "about", //updating key
                                                                                            extractedContentObject, //updating value
                                                                                        );
                                                                                    };
                                                                                    if (openedTabInfo?.tabType == "group") {
                                                                                        prepareGroupProfileInfoUpdating({
                                                                                            groupID: openedTabData?._id,
                                                                                            tabInfo: openedTabInfo,
                                                                                            updatingDataKey: "description",
                                                                                            updatingValue: extractedContentObject
                                                                                        });
                                                                                        // Change group description if applicable
                                                                                    } else if (openedTabInfo?.tabType == "broadcast") {
                                                                                        prepareBroadcastProfileInfoUpdating({
                                                                                            broadcastID: openedTabData?._id,
                                                                                            tabInfo: openedTabInfo,
                                                                                            updatingDataKey: "description",
                                                                                            updatingValue: extractedContentObject
                                                                                        })
                                                                                    };

                                                                                    setShowProgressBar(true);
                                                                                    closeActivityArea(); // Hide activity area after update
                                                                                }} />
                                                                            }
                                                                        </>
                                                                    }
                                                                </div>
                                                                <div className="flex items-center mt-2">
                                                                    {
                                                                        // Show emoji icon if about/description is being edited, toggles emoji picker
                                                                        (isChangeAbout) &&
                                                                        <HiOutlineFaceSmile className={`cursor-pointer h-8 w-8 mr-1`} onClick={() => {
                                                                            setShowEmojiContainer(!showEmojiContainer);
                                                                        }} />
                                                                    }
                                                                    {/* Editable div for about/description input */}
                                                                    <div
                                                                        ref={aboutInputRef}
                                                                        contentEditable={isChangeAbout ? true : false}
                                                                        className={`${isChangeAbout ? `inputForMessage editable_div not_prevent_select input_field w-full border rounded-xl focus:outline-none focus:border-indigo-300 ${activeDarkMode ? "darkModeBg1" : ''}` : ""} `}
                                                                        onKeyDown={(e) => {
                                                                            handleInputDirection(
                                                                                e, // event object
                                                                                aboutInputRef, // input field ref
                                                                                setIsAboutInputNotEmpty,// setter for empty input tracking
                                                                                60, // character limit for about/description input
                                                                                false // disallow new lines
                                                                            );
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        }
                                                        {/* email of user */}
                                                        {
                                                            openedTabInfo?.tabType == 'user' &&
                                                            <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto w-full py-2.5 px-3 text-left relative border-b`}>
                                                                <div className="w-full flex items-center justify-between">
                                                                    <p className='opacity-80 font-sm'>
                                                                        Email
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center mt-2">
                                                                    {openedTabData?.email}
                                                                </div>
                                                            </div>
                                                        }
                                                        {
                                                            // Show "Created by" section only if this is a group/broadcast tab (not user tab)
                                                            !openedTabData?.isDeleted && ["group", "broadcast"]?.includes(openedTabInfo?.tabType) &&
                                                            <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto w-full py-2.5 px-3 text-left relative border-b`}>
                                                                <div className="w-full flex items-center justify-between">
                                                                    {/* Label for creator info */}
                                                                    <p className='opacity-80 font-sm'>
                                                                        Created by
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center mt-2">
                                                                    {
                                                                        // Show "You" if current user is creator, otherwise show profile tab of creator
                                                                        (openedTabData?.createdBy == currentUserID) ?
                                                                            "You"
                                                                            :
                                                                            <ProfileTab
                                                                                tabData={getSingleUserData(openedTabData?.createdBy)}
                                                                                currentUserID={currentUserID}
                                                                                descWidth={`260px`}
                                                                            />
                                                                    }
                                                                </div>
                                                            </div>
                                                        }

                                                        {
                                                            // Render this block only if the current tab is not a user (i.e., it's a group or broadcast)
                                                            !openedTabData?.isDeleted && ["group", "broadcast"]?.includes(openedTabInfo?.tabType) &&
                                                            <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto flex items-center justify-between w-full py-3 text-left relative border-b`}>
                                                                <div className='w-full'>
                                                                    <div className='px-3 w-full flex items-center justify-between'>
                                                                        <p className='opacity-80  font-sm'>
                                                                            Members
                                                                        </p>
                                                                        {
                                                                            // Show the "Add New Member" button only for admins or the creator of the group/broadcast
                                                                            (openedTabData?.admins?.includes(currentUserID) ||
                                                                                openedTabData?.createdBy == currentUserID
                                                                            ) &&
                                                                            <p className='opacity-80  font-sm cursor-pointer' onClick={() => {
                                                                                // Filter connections to find users who are accepted, not blocked, and not already members
                                                                                let newMembers = currentUserData?.connections?.filter(
                                                                                    connectionInfo => {
                                                                                        // Determine the target user in the connection (other than currentUserID)
                                                                                        let targetUserID = connectionInfo?.initiaterUserID == currentUserID ? connectionInfo?.targetUserID : connectionInfo?.initiaterUserID;
                                                                                        // Return true only if connection is accepted, target user not blocked, and not in group members already
                                                                                        return (
                                                                                            connectionInfo?.status === "accepted" &&
                                                                                            // !currentUserData?.blockedUsers?.includes(targetUserID) &&
                                                                                            !openedTabData?.members?.includes(targetUserID)
                                                                                        );
                                                                                    })?.map((connectionInfo) => {
                                                                                        // Map filtered connections to targetUserID only
                                                                                        let targetUserID = connectionInfo?.initiaterUserID == currentUserID ? connectionInfo?.targetUserID : connectionInfo?.initiaterUserID;
                                                                                        return targetUserID;
                                                                                    });
                                                                                // Set selection mode to adding members
                                                                                setUserSelectionFor("addingToGroupOrBroadcast");
                                                                                // Set the list of target users to the new filtered members
                                                                                setTargetUsers(newMembers);
                                                                            }}>
                                                                                Add Member
                                                                            </p>
                                                                        }
                                                                    </div>
                                                                    <div className='mt-1 w-full text-left flex flex-col'>
                                                                        {
                                                                            // Map through all members to display each one
                                                                            openedTabData?.members?.map((memberID, idx) => {
                                                                                return (
                                                                                    <div key={idx} onClick={() => {
                                                                                        // Empty onClick for future possible use
                                                                                    }} className={`mt-2 relative`} style={{
                                                                                        // Adjust order for styling: current user first, then admins, then others
                                                                                        order: (
                                                                                            memberID == currentUserID
                                                                                        ) ? -2 : openedTabData?.admins?.includes(memberID) ? -1 : 0
                                                                                    }}>
                                                                                        <button className={`${activeDarkMode ? "darkModeBg1" : ''} profileTab border-b border-gray-200 rounded-lg flex items-center justify-start w-full`} onClick={() => {
                                                                                            let tabInfo = currentUserData?.recentChatsTabs?.find(
                                                                                                (recentChatTabInfo) => recentChatTabInfo?.tabID == memberID
                                                                                            );
                                                                                            setOpenedTabInfo(
                                                                                                tabInfo ||
                                                                                                {
                                                                                                    tabType: "user",
                                                                                                    tabID: memberID,
                                                                                                    recentTime: "",
                                                                                                    clearingTime: "",
                                                                                                    isArchived: false,
                                                                                                    isPinned: false,
                                                                                                    disappearingTime: "Off",
                                                                                                }
                                                                                            );
                                                                                            setShowProfileInfo(false);
                                                                                        }}>
                                                                                            <ProfileTab
                                                                                                tabData={getSingleUserData(memberID)} // Get user data for profile display
                                                                                                currentUserID={currentUserID}
                                                                                                descWidth={
                                                                                                    // Narrower description box for admins, wider for regular members
                                                                                                    openedTabData?.admins?.includes(memberID) ? `160px` : `240px`
                                                                                                } //descWidth , width of the element where the description or about is present
                                                                                            />
                                                                                        </button>
                                                                                        <div style={{ top: "8%", right: "8px", zIndex: "9" }} className={`cursor-pointer absolute flex justify-center items-center showChildOnParentHover memberActions`}>
                                                                                            {
                                                                                                // Show "Group Admin" badge if member is admin
                                                                                                openedTabData?.admins?.includes(memberID) &&
                                                                                                <span style={{ backgroundColor: "rgb(114, 105, 239)", }} className="p-1 rounded-md text-sm text-white">Group Admin</span>
                                                                                            }
                                                                                            {
                                                                                                // Show action menu only if current user is admin/creator and the member is neither current user nor creator
                                                                                                (
                                                                                                    (
                                                                                                        openedTabData?.admins?.includes(currentUserID) ||
                                                                                                        openedTabData?.createdBy == currentUserID
                                                                                                    )
                                                                                                    &&
                                                                                                    memberID != currentUserID &&
                                                                                                    memberID != openedTabData?.createdBy
                                                                                                ) &&
                                                                                                <>
                                                                                                    {/* Icon for the actions menu */}
                                                                                                    <div className={`cursor-pointer flex justify-center items-center p-1 rounded-md text-sm`}>
                                                                                                        <BiDotsVerticalRounded className={`${activeDarkMode ? "darkModeTextColor" : ''} h-6 w-6 text-gray-600`} />
                                                                                                    </div>
                                                                                                    {/* Dropdown with action options */}
                                                                                                    <div style={{ transition: "0.3s" }} className={`${activeDarkMode ? "darkModeBg3" : ''} showOnHover text-gray-500 py-2 origin-top-right absolute top-12 right-10 z-10 mt-0 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none w-max`}>
                                                                                                        {/* Select members action */}
                                                                                                        <div onClick={() => {
                                                                                                            setUserSelectionFor("actionForGroup");
                                                                                                            setTargetUsers(
                                                                                                                openedTabData?.members?.filter((memberID) => memberID != currentUserID) //exclude current user
                                                                                                            );
                                                                                                        }} className="px-3 py-2 flex items-center justify-between cursor-pointer" role="none">
                                                                                                            Select
                                                                                                            <BsCheck2 className='w-6 h-6 inline' strokeWidth={1} />
                                                                                                        </div>
                                                                                                        {/* Remove member action */}
                                                                                                        <div onClick={() => {
                                                                                                            if (memberID != openedTabData?.createdBy) {
                                                                                                                if (openedTabInfo?.tabType == "group") {
                                                                                                                    prepareMemberRemoval({
                                                                                                                        groupID: openedTabInfo?.tabID,
                                                                                                                        tabInfo: openedTabInfo,
                                                                                                                        targetMemberIDs: [memberID],
                                                                                                                        textMsg: {
                                                                                                                            type: 'text',
                                                                                                                            value: `removed`, // Message content
                                                                                                                            targetUsers: [memberID] // Target users info
                                                                                                                        }
                                                                                                                    });
                                                                                                                } else {
                                                                                                                    prepareBroadcastMemberRemoval({
                                                                                                                        broadcastID: openedTabInfo?.tabID,
                                                                                                                        tabInfo: openedTabInfo,
                                                                                                                        targetMemberIDs: [memberID],
                                                                                                                    })
                                                                                                                };
                                                                                                                setShowProgressBar(true);
                                                                                                            } else {
                                                                                                                // Prevent removal of group creator and show error toast
                                                                                                                toast.error(`You cant not remove the creator of the group`);
                                                                                                            };
                                                                                                        }} className="px-3 py-2 flex items-center justify-between cursor-pointer" role="none">
                                                                                                            Remove
                                                                                                            <FaUserMinus className='ml-3 w-6 h-6 inline' strokeWidth={1} />
                                                                                                        </div>
                                                                                                        {
                                                                                                            // Show admin promotion/demotion button only for groups
                                                                                                            openedTabInfo?.tabType == "group" &&
                                                                                                            <div onClick={() => {
                                                                                                                let targetUserAdmin = openedTabData?.admins?.includes(memberID);
                                                                                                                let chatType = targetUserAdmin ? "system-member-demoting" : "system-member-promoting";
                                                                                                                let textValue = targetUserAdmin ? "demoted from admin : " : "promoted to admin : ";
                                                                                                                let eventType = targetUserAdmin ? "demote:members:from:admins" : "promote:members:to:admins"
                                                                                                                prepareMemberPromotionAndDemotion({
                                                                                                                    groupID: openedTabInfo?.tabID,
                                                                                                                    tabInfo: openedTabInfo,
                                                                                                                    targetMemberIDs: [memberID],
                                                                                                                    chatType,
                                                                                                                    textMsg: {
                                                                                                                        type: 'text',
                                                                                                                        value: textValue, // Message content
                                                                                                                        targetUsers: [memberID] // Target users info
                                                                                                                    },
                                                                                                                    eventType
                                                                                                                });
                                                                                                                setShowProgressBar(true);
                                                                                                            }} className="px-3 py-2 flex items-center justify-between cursor-pointer" role="none">
                                                                                                                {openedTabData?.admins?.includes(memberID) ? "Demote from admin" : "Promote to admin"}
                                                                                                                <FaUserTie className='ml-3 w-6 h-6 inline' strokeWidth={1} />
                                                                                                            </div>
                                                                                                        }
                                                                                                    </div>
                                                                                                </>
                                                                                            }
                                                                                        </div>
                                                                                    </div>
                                                                                )
                                                                            })
                                                                        }
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        }
                                                        {/* Groups in Common, Section to display mutual groups between current user and selected user */}
                                                        {
                                                            openedTabInfo?.tabType == "user" && commonGroup()?.length > 0 && // Check if the tab type is 'user' and there are common groups
                                                            <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto w-full py-2.5 px-3 text-left relative border-b`}>
                                                                {/* Label for creator info */}
                                                                <p className='opacity-80 font-sm'>
                                                                    <p className="font-semibold">{commonGroup()?.length} Group in Common</p>
                                                                </p>
                                                                <div className='mt-1 w-full text-left flex flex-col'>
                                                                    {
                                                                        commonGroup()?.map((groupData, index) => {
                                                                            return (
                                                                                <button className={`${activeDarkMode ? "darkModeBg1" : ''} bg-gray-200 overflow-hidden profileTab border-b border-gray-200 flex items-center justify-start w-full`} onClick={() => {
                                                                                    let tabInfo = currentUserData?.recentChatsTabs?.find(
                                                                                        (recentChatTabInfo) => recentChatTabInfo?.tabID == groupData?._id
                                                                                    );
                                                                                    setOpenedTabInfo(
                                                                                        tabInfo ||
                                                                                        {
                                                                                            tabType: "group",
                                                                                            tabID: groupData?._id,
                                                                                            recentTime: "",
                                                                                            clearingTime: "",
                                                                                            isArchived: false,
                                                                                            isPinned: false,
                                                                                            disappearingTime: "Off",
                                                                                        }
                                                                                    );
                                                                                    setShowProfileInfo(false);
                                                                                }}>
                                                                                    <ProfileTab
                                                                                        tabData={groupData}
                                                                                        currentUserID={currentUserID}
                                                                                    />
                                                                                </button>
                                                                            )
                                                                        })
                                                                    }
                                                                </div>
                                                            </div>
                                                        }
                                                        {
                                                            // Show the past members section only if the tab is a group and there are past members
                                                            (openedTabInfo?.tabType == 'group' && openedTabData?.pastMembers?.length > 0) &&
                                                            <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto flex items-center justify-between w-full text-left relative border-b`}>
                                                                <div className='w-full'>
                                                                    <div className='w-full flex items-center justify-between py-3 px-3 pb-0'>
                                                                        <p className='opacity-80  font-sm'>
                                                                            Past Members
                                                                        </p>
                                                                    </div>
                                                                    <div className='w-full text-left flex flex-col'>
                                                                        {
                                                                            // Map through past members to display each one with exit time
                                                                            openedTabData?.pastMembers?.map((memberData, idx) => {
                                                                                return (
                                                                                    <div key={idx} onClick={() => {
                                                                                        // Empty onClick for possible future use
                                                                                    }} className={`relative ${activeDarkMode ? "darkModeBg1" : ''} border-b border-gray-200`}>
                                                                                        <button className={`no profileTab rounded-lg flex items-center justify-start w-full`}>
                                                                                            <ProfileTab
                                                                                                tabData={getSingleUserData(memberData?.memberID)} // Get user data for each past member
                                                                                                currentUserID={currentUserID}
                                                                                            />
                                                                                        </button>
                                                                                        {/* Display the timestamp when the member exited the group */}
                                                                                        <div className="px-3 relative text-sm">
                                                                                            Exited at : {formatTimestamp(memberData?.exitedAt)}
                                                                                        </div>
                                                                                    </div>
                                                                                )
                                                                            })
                                                                        }
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        }
                                                        {
                                                            // Show the invite users button only if the tab is a group and current user is an admin
                                                            (openedTabInfo?.tabType == "group" && openedTabData?.admins?.includes(currentUserID)) &&
                                                            <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto w-full py-2.5 px-3 text-left relative border-b`}>
                                                                <div className="w-full flex items-center justify-center">
                                                                    {/* Invite Users button triggers forwarding panel with group invitation chat data */}
                                                                    <span style={{ backgroundColor: "rgb(114, 105, 239)", }} className="p-1 rounded-md text-md text-white cursor-pointer" onClick={() => {
                                                                        // Prepare group invitation chat data with expiry time
                                                                        let groupInvitaionChatData = {
                                                                            chatType: "group-invitaion",
                                                                            text: JSON.stringify([{
                                                                                type: 'text',
                                                                                value: `Group invitaion`,
                                                                                targetGroupID: openedTabData?._id,
                                                                                invitingTime: new Date().toISOString() //for checking the expiry time of link
                                                                            }])
                                                                        };
                                                                        // Show chat forwarding panel and set the forwarding chats array
                                                                        setShowChatForwardingPanel(true)
                                                                        setForwardingChats([groupInvitaionChatData])
                                                                    }}>
                                                                        Invite Users
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        }
                                                    </div>
                                                }
                                            </div>
                                            {/* name,about or description,email section - end*/}
                                            {/* media chat section - start */}
                                            {/* // Container for the media section with optional dark mode background */}
                                            <div className={`${activeDarkMode ? "darkModeBg1" : ''} w-full mb-2 mx-auto rounded-md border overflow-hidden`}>

                                                {/* Header bar for media section; toggles visibility on click */}
                                                <div onClick={() => {
                                                    handleShowingSection(setShowMediaChats); // Handle accordion section toggle
                                                    setShowMediaChats(!showMediaChats); // Toggle media section visibility
                                                }} className="accordion cursor-pointer flex justify-between w-full p-3 text-left font-medium rounded-md">
                                                    Media
                                                    {/* Chevron icon rotates based on the visibility of the section */}
                                                    <HiMiniChevronDown className={`${showMediaChats ? "rotate-180" : ""} h-6 w-6`} />
                                                </div>

                                                {
                                                    // Render the media content section only if showMediaChats is true
                                                    showMediaChats &&
                                                    <div className={`${activeDarkMode ? "darkModeBg3" : ''} bg-white`}>
                                                        {
                                                            // Check if there are any file-type chats to show
                                                            chatsDataByDate(
                                                                chatsOfOpenedTab?.filter((chatData) => {
                                                                    return chatData?.chatType == 'file'
                                                                })
                                                            )?.length > 0 ?
                                                                // Media items container
                                                                <div className='p-3 mediaItemContainer flex flex-wrap'>
                                                                    {
                                                                        // Loop through chats grouped by date
                                                                        chatsDataByDate(
                                                                            chatsOfOpenedTab?.filter((chatData) => {
                                                                                return chatData?.chatType == 'file'
                                                                            })
                                                                        )?.map((chatsByDate) => {
                                                                            return chatsByDate?.chatsData?.map((chatData, idx) => {
                                                                                let fileInfo = chatData?.file;

                                                                                return idx <= 10 ? <>
                                                                                    {/* Render image or video preview */}
                                                                                    <div key={idx} onClick={() => {
                                                                                        setShowMediaDetails(true); // Show media detail view
                                                                                        let profileInfoComponent = document.querySelector(".profileInfoComponent");

                                                                                        // Scroll to the specific media in the chat view
                                                                                        setTimeout(() => {
                                                                                            profileInfoComponent.querySelector(`#${chatData?.customID}`)?.scrollIntoView({ behavior: "smooth" });
                                                                                        }, 100); // Delay to ensure element is rendered
                                                                                    }} className="mediaItem">
                                                                                        {
                                                                                            // If the file is an image, render an <img> tag
                                                                                            isImageFile(fileInfo?.fileType) ?
                                                                                                <img
                                                                                                    className="w-full h-full"
                                                                                                    src={`${fileInfo?.fileURL}`}
                                                                                                    alt=""
                                                                                                />
                                                                                                // If the file is a video, render a <video> tag
                                                                                                : isVideoFile(fileInfo?.fileType) &&
                                                                                                <video
                                                                                                    style={{ borderRadius: "7px" }}
                                                                                                    src={`${fileInfo?.fileURL}`}
                                                                                                    muted
                                                                                                    className="w-full h-full object-cover"
                                                                                                >
                                                                                                    Your browser does not support the video tag.
                                                                                                </video>
                                                                                        }

                                                                                        {/* Icon for the type of media file */}
                                                                                        <div onClick={() => {
                                                                                            // Trigger the corresponding media section based on file type
                                                                                            if (isAudioFile(fileInfo?.fileType)) {
                                                                                                handleShowingSectionInMedia(setShowAudios);
                                                                                            };
                                                                                            // if (isDocumentFile(fileInfo?.fileType)) {
                                                                                            //     handleShowingSectionInMedia(setShowDocuments);
                                                                                            // };
                                                                                            if (isImageFile(fileInfo?.fileType)) {
                                                                                                handleShowingSectionInMedia(setShowPhotos);
                                                                                            };
                                                                                            if (isVideoFile(fileInfo?.fileType)) {
                                                                                                handleShowingSectionInMedia(setShowVideos);
                                                                                            };
                                                                                        }} className="mediaIcon">
                                                                                            <p style={{ fontSize: "22px" }} className='flex items-center mb-0.5'>
                                                                                                {/* FontAwesome icon based on file type */}
                                                                                                <FontAwesomeIcon icon={iconMap?.[fileInfo?.fileIcon]} />
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                </>
                                                                                    :
                                                                                    // After 11 items, show a "plus" icon indicating more media exists
                                                                                    idx == 11 && <>
                                                                                        <div className="mediaItem">
                                                                                            <div className="mediaIcon">
                                                                                                <p className='flex items-center mb-0.5'>
                                                                                                    <BsPlus className="w-7 h-7 text-white" />
                                                                                                </p>
                                                                                            </div>
                                                                                        </div>
                                                                                    </>
                                                                            })
                                                                        })
                                                                    }
                                                                </div>
                                                                :
                                                                // Show fallback if no media exists
                                                                <div className='w-full text-center py-2'>
                                                                    No Media
                                                                </div>
                                                        }
                                                    </div>
                                                }
                                            </div>
                                            {/* media chat section - end */}

                                            {/* Important Chats -start*/}
                                            <div className={`${activeDarkMode ? "darkModeBg1" : ''} w-full mb-2 mx-auto rounded-md border overflow-hidden`}>
                                                {/* Accordion header for Important Chats */}
                                                <div onClick={() => {
                                                    handleShowingSection(setShowImportantChats);
                                                    setShowImportantChats(!showImportantChats);
                                                }} className="accordion cursor-pointer flex justify-between w-full p-3 text-left font-medium rounded-md">
                                                    Important Chats
                                                    {/* Chevron icon rotates when accordion is open */}
                                                    <HiMiniChevronDown className={`${showImportantChats ? "rotate-180" : ""} h-6 w-6`} />
                                                </div>
                                                {
                                                    showImportantChats &&
                                                    <div className={`${activeDarkMode ? "darkModeBg3" : ''} bg-white`}>
                                                        {/* Starred chats option */}
                                                        <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto flex items-center justify-between w-full py-3 px-3 text-left relative border-b cursor-pointer`} onClick={() => {
                                                            handleShowingSection(setShowStarredChats);
                                                            setShowStarredChats(true);
                                                        }}>
                                                            Starred
                                                            <HiStar className="w-5 h-5" />
                                                        </div>
                                                        {/* Saved chats option */}
                                                        <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto flex items-center justify-between w-full py-3 px-3 text-left relative border-b cursor-pointer`} onClick={() => {
                                                            handleShowingSection(setShowKeptChats);
                                                            setShowKeptChats(true);
                                                        }}>
                                                            Saved
                                                            <HiBookmark className="w-5 h-5" />
                                                        </div>
                                                    </div>
                                                }
                                            </div>
                                            {/* Important Chats -end*/}

                                            {/* PrivacyActions -start */}
                                            <div className={`${activeDarkMode ? "darkModeBg1" : ''} w-full mb-2 mx-auto rounded-md border`}>
                                                {/* Accordion header for Privacy & Actions */}
                                                <div onClick={() => {
                                                    handleShowingSection(setShowPrivacyActions);
                                                    setShowPrivacyActions(!showPrivacyActions);
                                                }} className="accordion cursor-pointer flex justify-between w-full p-3 text-left font-medium rounded-md">
                                                    Privacy & Actions
                                                    {/* Chevron icon rotates when accordion is open */}
                                                    <HiMiniChevronDown className={`${showPrivacyActions ? "rotate-180" : ""} h-6 w-6`} />
                                                </div>
                                                {
                                                    showPrivacyActions &&
                                                    <div className={`${activeDarkMode ? "darkModeBg3" : ''} bg-white`}>

                                                        {
                                                            (
                                                                openedTabInfo?.tabType == "group" &&
                                                                openedTabData?.admins?.includes(currentUserID)
                                                            ) &&
                                                            // Message permission dropdown for group admins
                                                            <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto flex items-center justify-between w-full py-2 px-3 text-left relative border-b cursor-pointer showChildOnParentHover`}>
                                                                Message permission
                                                                {/* Display current permission */}
                                                                <div className={`${activeDarkMode ? "darkModeBg1" : ''} bg-gray-200 p-2 text-sm rounded-md flex items-center justify-between cursor-pointer capitalize`}>
                                                                    {openedTabData?.messagePermission}
                                                                    <HiMiniChevronDown className={`rotateShowingElementButtonOnHover h-6 w-6`} />
                                                                </div>
                                                                {/* Dropdown with permission options */}
                                                                <div
                                                                    style={{ top: "58px", right: "12px", transition: "0.3s", width: "170px", padding: '6px 0px' }} className={`showOnHover ${activeDarkMode ? "darkModeBg1" : ''} block absolute right-0 z-10 mt-0 w-auto origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}>
                                                                    {
                                                                        ["everyone", "admins"]?.map((option, idx) => {
                                                                            return (
                                                                                <p key={idx} className="text-left cursor-pointer block px-4 py-2 text-md capitalize" onClick={() => {
                                                                                    // Only update permission if changed
                                                                                    if (openedTabData?.messagePermission != option) {
                                                                                        prepareGroupMessagePermission(
                                                                                            { groupID: openedTabData?._id, newRule: option?.toLowerCase(), tabInfo: openedTabInfo, }
                                                                                        )
                                                                                    };
                                                                                }}>{option}</p>
                                                                            )
                                                                        })
                                                                    }
                                                                </div>
                                                            </div>
                                                        }

                                                        {
                                                            (!openedTabData?.isDeleted && openedTabInfo?.tabType != "aiAssistant") &&
                                                            // Disappearing timer setting
                                                            <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto flex items-center justify-between w-full py-3 px-3 text-left relative border-b cursor-pointer showChildOnParentHover`}>
                                                                Timer
                                                                {/* Display current timer */}
                                                                <div className={`${activeDarkMode ? "darkModeBg1" : ''} bg-gray-200 p-2 text-sm rounded-md flex items-center justify-between cursor-pointer capitalize`}>
                                                                    {
                                                                        currentUserData?.recentChatsTabs?.find(
                                                                            (recentChatTabInfo) => recentChatTabInfo?.tabID == openedTabInfo?.tabID
                                                                        )?.disappearingTime || "Off"
                                                                    }
                                                                    <HiMiniChevronDown className={`rotateShowingElementButtonOnHover h-6 w-6`} />
                                                                </div>
                                                                {/* Dropdown with timer options */}
                                                                <div
                                                                    style={{ top: "58px", right: "12px", transition: "0.3s", width: "170px", padding: '6px 0px' }} className={`showOnHover ${activeDarkMode ? "darkModeBg1" : ''} block absolute right-0 z-10 mt-0 w-auto origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}>
                                                                    {
                                                                        disappearingTimerOption?.map((option, idx) => {
                                                                            return (
                                                                                <p key={idx} className="text-left cursor-pointer block px-4 py-2 text-md capitalize" onClick={() => {
                                                                                    // Only update if timer is different
                                                                                    if (
                                                                                        currentUserData?.recentChatsTabs?.find(
                                                                                            (recentChatTabInfo) => recentChatTabInfo?.tabID == openedTabInfo?.tabID
                                                                                        )?.disappearingTime != option
                                                                                    ) {
                                                                                        toggleDisappearingTimer({
                                                                                            ...openedTabInfo,
                                                                                            disappearingTime: option
                                                                                        });
                                                                                    };
                                                                                }}>{option}</p>
                                                                            )
                                                                        })
                                                                    }
                                                                </div>
                                                            </div>
                                                        }

                                                        {/* Delete chat history */}
                                                        <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto flex items-center justify-between w-full py-3 px-3 text-left relative border-b cursor-pointer`} onClick={() => {
                                                            if (chatsOfOpenedTab?.length > 0) {
                                                                setShowConfirmationDialog({ for: "clearChats", data: chatsOfOpenedTab });
                                                            };
                                                        }}>
                                                            Delete Chats
                                                            <AiFillDelete className="w-5 h-5" />
                                                        </div>

                                                        {
                                                            (openedTabInfo?.tabType == "group" && !openedTabData?.isDeleted) &&
                                                            <>
                                                                {
                                                                    // Show exit group if current user is a member and not the only one
                                                                    (
                                                                        openedTabData?.members?.includes(currentUserID)
                                                                        &&
                                                                        !openedTabData?.members?.every((memberID) => memberID == currentUserID)
                                                                    ) &&
                                                                    <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto flex items-center justify-between w-full py-3 px-3 text-left relative border-b cursor-pointer warningColor`} onClick={() => {
                                                                        setShowConfirmationDialog({ for: "exitGroup", data: null });
                                                                    }}>
                                                                        Exit Group
                                                                        <AiFillDelete className="w-5 h-5" />
                                                                    </div>
                                                                }

                                                                {
                                                                    // Show delete group if current user is the creator or only member
                                                                    (
                                                                        (
                                                                            openedTabData?.createdBy == currentUserID && openedTabData?.members?.includes(currentUserID)
                                                                        )
                                                                        ||
                                                                        openedTabData?.members?.every((memberID) => memberID == currentUserID)
                                                                    ) &&
                                                                    <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto flex items-center justify-between w-full py-3 px-3 text-left relative border-b cursor-pointer warningColor`} onClick={() => {
                                                                        setShowConfirmationDialog({ for: "deleteGroup", data: null });
                                                                    }}>
                                                                        Delete group permanently
                                                                        <AiFillDelete className="w-5 h-5" />
                                                                    </div>
                                                                }
                                                            </>
                                                        }

                                                        {
                                                            (openedTabInfo?.tabType == "user" && !openedTabData?.isDeleted) &&
                                                            // Block/unblock user
                                                            <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto flex items-center justify-between w-full py-3 px-3 text-left relative border-b cursor-pointer`} onClick={() => {
                                                                setShowPrivacyActions(false);
                                                                toggleUserBlocking({
                                                                    ...openedTabInfo,
                                                                    isBlocking: getSingleUserData(currentUserID)?.blockedUsers?.includes(openedTabInfo?.tabID)
                                                                        ? false
                                                                        : true
                                                                });
                                                            }}>
                                                                <p style={{
                                                                    color: getSingleUserData(currentUserID)?.blockedUsers?.includes(openedTabInfo?.tabID)
                                                                        ? "#34D399" : "#FF4D4D"
                                                                }}>
                                                                    {
                                                                        getSingleUserData(currentUserID)?.blockedUsers?.includes(openedTabInfo?.tabID)
                                                                            ? "Unblock" : "Block"
                                                                    }
                                                                </p>
                                                                <HiOutlineBan style={{
                                                                    color: getSingleUserData(currentUserID)?.blockedUsers?.includes(openedTabInfo?.tabID)
                                                                        ? "#34D399" : "#FF4D4D"
                                                                }} className="w-5 h-5" />
                                                            </div>
                                                        }
                                                    </div>
                                                }
                                            </div>
                                            {/* PrivacyActions -end */}


                                        </div>
                                    </div>
                                </>
                            }
                            {
                                // show media details panel
                                showMediaDetails &&
                                <div className='w-full h-full mediaDetails'>
                                    {
                                        isChatSelecting ?
                                            // show top action bar when chat is being selected
                                            <ChatActionListOnTopBar />
                                            :
                                            <>
                                                {/* Top bar with back button and section label (Photos, Videos, etc.) */}
                                                <div className='flex flex-row items-center justify-between'>
                                                    <div className="py-3 px-4  flex items-center justify-center gap-2 text-lg">
                                                        <BsArrowLeft className='cursor-pointer w-8 h-8'
                                                            onClick={() => {
                                                                setShowMediaDetails(false); // hide media details panel
                                                            }}
                                                        />
                                                        {
                                                            // Show current selected media type label
                                                            showPhotos && "Photos" ||
                                                            showVideos && "Videos" ||
                                                            showAudios && "Audios" ||
                                                            showLinks && "Links"
                                                        }
                                                    </div>
                                                </div>

                                                {/* Navigation tabs for media types */}
                                                <div className={`${activeDarkMode ? "darkModeBg1" : ''} w-full flex flex-col items-center bg-white`}>
                                                    <div className="flex items-center justify-between w-full">

                                                        {/* Photos tab */}
                                                        <div onClick={() => {
                                                            handleShowingSectionInMedia(setShowPhotos);
                                                        }} style={{
                                                            borderColor: showPhotos ? "rgba(0, 135, 255, 0.5)" : 'transparent',
                                                        }} className="navMediaTab flex items-center justify-center p-4 w-full border-b-2 border-gray-200 flex-col cursor-pointer">
                                                            <HiPhoto className="w-5 h-5 cursor-pointer" />
                                                        </div>

                                                        {/* Videos tab */}
                                                        <div onClick={() => {
                                                            handleShowingSectionInMedia(setShowVideos);
                                                        }} style={{
                                                            borderColor: showVideos ? "rgba(0, 135, 255, 0.5)" : 'transparent',
                                                        }} className="navMediaTab flex items-center justify-center p-4 w-full border-b-2 border-gray-200 flex-col cursor-pointer">
                                                            <BiSolidVideos className="w-5 h-5 cursor-pointer" />
                                                        </div>

                                                        {/* Audios tab */}
                                                        <div onClick={() => {
                                                            handleShowingSectionInMedia(setShowAudios);
                                                        }} style={{
                                                            borderColor: showAudios ? "rgba(0, 135, 255, 0.5)" : 'transparent',
                                                        }} className="navMediaTab flex items-center justify-center p-4 w-full border-b-2 border-gray-200 flex-col cursor-pointer">
                                                            <IoMusicalNotes className="w-5 h-5 cursor-pointer" />
                                                        </div>

                                                        {/* Documents tab */}
                                                        {/* <div onClick={() => {
                                                            handleShowingSectionInMedia(setShowDocuments);
                                                        }} style={{
                                                            borderColor: showDocuments ? "rgba(0, 135, 255, 0.5)" : 'transparent',
                                                        }} className="navMediaTab flex items-center justify-center p-4 w-full border-b-2 border-gray-200 flex-col cursor-pointer">
                                                            <HiDocument className="w-5 h-5 cursor-pointer" />
                                                        </div> */}

                                                        {/* Links tab */}
                                                        <div onClick={() => {
                                                            handleShowingSectionInMedia(setShowLinks);
                                                        }} style={{
                                                            borderColor: showLinks ? "rgba(0, 135, 255, 0.5)" : 'transparent',
                                                        }} className="navMediaTab flex items-center justify-center p-4 w-full border-b-2 border-gray-200 flex-col cursor-pointer">
                                                            <BiLinkAlt className="w-5 h-5 cursor-pointer" />
                                                        </div>

                                                    </div>
                                                </div>
                                            </>
                                    }

                                    {
                                        // Show media items based on selected type (photos, videos, audios, documents)
                                        showMediaChats && (showPhotos || showVideos || showAudios) &&
                                        <MediaChats
                                            typeCheck={
                                                showPhotos && isImageFile ||
                                                showVideos && isVideoFile ||
                                                showAudios && isAudioFile
                                            }
                                        />
                                    }

                                    {
                                        // Show links if "Links" tab is selected
                                        showLinks &&
                                        <LinkPrev />
                                    }
                                </div>
                            }

                            {
                                // show important chats panel (starred and kept chats)
                                (showStarredChats || showKeptChats) &&
                                <div className='w-full h-auto'>
                                    {
                                        isChatSelecting ?
                                            // show top action bar when selecting important chats
                                            <ChatActionListOnTopBar />
                                            :
                                            // top bar for starred/kept chats section
                                            <div className='flex flex-row items-center justify-between'>
                                                <div className="py-3 px-4 flex items-center justify-center gap-2 text-lg">
                                                    <BsArrowLeft className='cursor-pointer w-7 h-7'
                                                        onClick={() => {
                                                            setShowStarredChats(false); // hide starred chats
                                                            setShowKeptChats(false); // hide kept chats
                                                        }}
                                                    />
                                                    {showStarredChats ? "Starred Chats" : "Kept Chats"} {/* Section title */}
                                                </div>
                                            </div>
                                    }

                                    {/* List of important chats based on condition */}
                                    <ImportantChats
                                        condition={
                                            showStarredChats ? "starredByUsers" : "keptByUsers"
                                        }
                                    />
                                </div>
                            }
                        </div>
                    </div>
                    {
                        // show emoji picker when emoji icon is clicked
                        showEmojiContainer &&
                        <div style={{ height: "280px" }} className={`profileInfoComponent absolute w-full bottom-0 px-4 bg-white overflow-y-auto`}>
                            <EmojiPicker
                                onEmojiClick={
                                    emoji =>
                                        insertEmojiIntoInputField(
                                            {
                                                emojiUrl: emoji.imageUrl,
                                                emojiUnicode: emoji.emoji
                                            }, //emoji info
                                            isChangeName ? nameInputRef : aboutInputRef,
                                            // isChangeName ? setIsNameInputNotEmpty : setIsAboutInputNotEmpty
                                        )
                                }
                                emojiStyle={"apple"}
                                lazyLoadEmojis={true}
                            />
                        </div>
                    }
                </div>
            }
            {
                showConfirmationDialog &&
                <ConfirmationDialog
                    textMsg={`Are you sure you want to ${showConfirmationDialog?.for == "unkeep" ? "unkeep this chat? It will be deleted right away." :
                        showConfirmationDialog?.for == "clearChats" ? "clear all chats?" :
                            showConfirmationDialog?.for == "clearChats" ? "clear all chats?" :
                                showConfirmationDialog?.for == "exitGroup" ? "exit this group?" :
                                    "delete this group permanently?"}
                        `}
                    handleConfirmAction={() => {
                        if (showConfirmationDialog?.for == "unkeep") {
                            keepChat([showConfirmationDialog?.data]);
                        };
                        if (showConfirmationDialog?.for == "clearChats") {
                            setShowPrivacyActions(false);
                            clearChatHistory(
                                showConfirmationDialog?.data,
                                true //need to set clearingTime
                            );
                        };
                        if (showConfirmationDialog?.for == "exitGroup") {
                            setShowPrivacyActions(false);
                            prepareMemberRemoval({
                                groupID: openedTabInfo?.tabID,
                                tabInfo: openedTabInfo,
                                targetMemberIDs: [currentUserID],
                                textMsg: {
                                    type: 'text',
                                    value: `left`,
                                    targetGroupID: openedTabInfo?.tabID
                                }
                            });
                            setShowProgressBar(true);
                        };
                        if (showConfirmationDialog?.for == "deleteGroup") {
                            sendWebSocketMessage(
                                "group:delete:permanently",
                                "groupID",
                                openedTabData?._id,
                            );
                            setShowProgressBar(true);
                        };
                        setShowConfirmationDialog(false);
                    }}
                    setShowConfirmationDialog={setShowConfirmationDialog}
                />
            }
        </React.Fragment>
    );
}

export default ProfileInfo;
