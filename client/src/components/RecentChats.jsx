import _ from 'lodash';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { BsCheck2, BsCheck2All, BsPinFill, BsPin, BsCalendar2DateFill, BsArrowLeft } from 'react-icons/bs';
import { BiDotsVerticalRounded, BiSolidArchiveIn, BiSolidGroup, BiSolidFilterAlt } from 'react-icons/bi';
import { HiOutlineClock, HiUser, HiBellAlert, HiClipboardDocumentList } from 'react-icons/hi2';
import { HiOutlineBan } from 'react-icons/hi';
import { UserContext } from '@context/UserContext';
import { ToastContainer, toast } from "react-toastify";
import { AiFillDelete } from "react-icons/ai";
import { FaCheck } from "react-icons/fa6";
import 'react-loading-skeleton/dist/skeleton.css';
import { IoIosTimer } from "react-icons/io";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { TextWithEmojis, ConfirmationDialog } from "./index.js";
import {
    faFileImage,
    faFileAudio,
    faFileVideo,
} from '@fortawesome/free-solid-svg-icons';
const iconMap = {
    faFileImage: faFileImage,
    faFileAudio: faFileAudio,
    faFileVideo: faFileVideo,
};

// Function to get the latest (newest) chatData for each tab (user, broadcast, or group)
const getLatestOneChatOfTabs = (allUniqueChats, myRecentChatsTabs, currentUserID) => {
    // Iterate over each recent chat tab
    return myRecentChatsTabs?.map((recentChatsTabInfo) => {

        // ===========================
        // Case: One-on-One User Chats
        // ===========================
        if (recentChatsTabInfo?.tabType == 'user') {
            return allUniqueChats?.filter((chatData) => {
                return (
                    (
                        // Current user is the sender, and receiver matches the tabID
                        chatData?.receiversInfo?.some(receiverInfo => receiverInfo?.receiverID === recentChatsTabInfo?.tabID) &&
                        currentUserID === chatData?.senderID &&
                        !chatData?.isBroadcastType // Exclude broadcast chats
                    )
                    ||
                    (
                        // Current user is the receiver, and sender matches the tabID
                        recentChatsTabInfo?.tabID === chatData?.senderID &&
                        chatData?.receiversInfo?.some(receiverInfo => receiverInfo?.receiverID === currentUserID)
                    )
                ) &&
                    // Exclude chats deleted by the current user
                    !chatData?.deletedByUsers?.includes(currentUserID) &&
                    // Exclude group chats
                    !chatData?.isGroupType
            })?.reverse()[0] // Get the most recent chat by reversing the list and picking the first one

            // Alternative sorting logic (commented out): sort by sent or delivered time
        }

        // ===============================
        // Case: Broadcast Chats
        // ===============================
        else if (recentChatsTabInfo?.tabType == 'broadcast') {
            return allUniqueChats?.filter((chatData) => {
                return (
                    chatData?.isBroadcastType && // Only include broadcast chats
                    chatData?.toBroadcastID === recentChatsTabInfo?.tabID && // Match broadcast ID
                    !chatData?.deletedByUsers?.includes(currentUserID) // Exclude if deleted by user
                )
            })?.reverse()[0] // Return the newest broadcast chat

            // Alternative sorting logic (commented out): sort by sent time
        }

        // ===========================
        // Case: Group Chats
        // ===========================
        if (recentChatsTabInfo?.tabType == 'group') {
            return allUniqueChats?.filter((chatData) => {
                return (
                    chatData?.isGroupType && // Ensure it's a group chat
                    chatData?.toGroupID === recentChatsTabInfo?.tabID && // Match group ID
                    !chatData?.deletedByUsers?.includes(currentUserID) // Exclude if deleted by user
                )
            })?.reverse()[0] // Return the newest group chat

            // Alternative sorting logic (commented out): sort by sent or delivered time
        };
        // ===========================
        // Case: aiAssistant Chats
        // ===========================
        if (recentChatsTabInfo?.tabType == 'aiAssistant') {
            return allUniqueChats?.filter((chatData) => {
                return (
                    chatData?.aiAssistant  // Ensure it's a aiAssistant chat
                    && !chatData?.deletedByUsers?.includes(currentUserID) // Exclude if deleted by user
                )
            })?.reverse()[0] // Return the newest group chat

            // Alternative sorting logic (commented out): sort by sent or delivered time
        };
    })
};

function RecentChats() {
    // Destructure required variables and functions from context
    const {
        allChatsData,
        currentUserID,
        deleteRecentChatTab,
        addOrUpdateRecentTab,
        getUnreadChats,
        openedTabInfo,
        setOpenedTabInfo,
        setShowChatBox,
        setShowGroupCreationPanel,
        setShowBroadcastCreationPanel,
        setSelectedUsersForGroupOrBroadcast,
        aiAssistant,
        getSingleUserData,
        getSingleGroupData,
        getSingleBroadcastData,
        safeParseJSON,
        activeDarkMode,
        formatTimestamp,
        setShowSettingsSection,
        handleShowingSections,
        deleteExpiredChats,
        deleteExpiredStories,
        isVoiceRecording
    } = useContext(UserContext);

    let allUniqueChats = _.uniqBy(allChatsData, "customID"); // Remove duplicate chats using unique customID
    let currentUserData = getSingleUserData(currentUserID); // Get the current user’s full data

    const [tabsFiltering, setTabsFiltering] = useState(null); // Toggle for showing archived tabs

    // Get latest one-on-one/broadcast/group chat for each recent tab
    let allChatsOfMyTabs = getLatestOneChatOfTabs(allUniqueChats, currentUserData?.recentChatsTabs, currentUserID);
    const [showConfirmationDialog, setShowConfirmationDialog] = useState(false); //for showing confirmation dialog
    // Action buttons on top bar
    const [dateRange, setDateRange] = useState(null); // Used for date filtering (not shown here)
    const [advanceFiltering, setAdvanceFiltering] = useState(false); // Toggles advanced filtering UI

    // Tab selection - start
    const [isTabSelecting, setIsTabSelecting] = useState(false); // Manage whether tabs are in selection mode
    const tabHoldingTimeoutRef = useRef(null); // Reference for long-press timeout
    const [selectedTabs, setSelectedTabs] = useState([]); // Tabs currently selected

    // Reset tab selection state
    function refereshTabSelecting() {
        setIsTabSelecting(false)
        setSelectedTabs([]);
    };

    // Toggle a tab in/out of selectedTabs
    function handleTabsSelection(tabInfo) {
        let { tabID } = tabInfo;
        setSelectedTabs((selectedTabs) => {
            const isTabSelected = selectedTabs?.some((prevTab) => prevTab?.tabID == tabID);
            if (isTabSelected) {
                return selectedTabs?.filter((prevTab) => prevTab?.tabID !== tabID);
            } else {
                return [...selectedTabs, tabInfo];
            }
        });
    };

    // Handle long press (click and hold) to start selection
    const handleHoldStart = (tabInfo) => {
        tabHoldingTimeoutRef.current = setTimeout(() => {
            handleTabsSelection(tabInfo);
            setIsTabSelecting(true)
        }, 1000); // Trigger selection after 1 second hold
    };

    // Cancel the long press timer
    const handleHoldEnd = (tabHoldingTimeoutRef) => {
        if (tabHoldingTimeoutRef.current) {
            clearTimeout(tabHoldingTimeoutRef.current);
            tabHoldingTimeoutRef.current = null;
        };
    };

    // Activate selection mode if there are selected tabs
    useEffect(() => {
        if (selectedTabs.length == 0) {
            setIsTabSelecting(false);
        } else {
            setIsTabSelecting(true)
        };
    }, [selectedTabs, handleTabsSelection, handleHoldStart, handleHoldEnd]);
    // Tab selection - end

    // Searching - start
    const [searchTerm, setSearchTerm] = useState(''); // User input for search
    const [searchedResults, setSearchedResults] = useState([]); // Filtered search results

    // Parse and extract plain text from JSON-formatted message
    const getExtractedTextValue = (textData) => {
        return safeParseJSON(textData)
            ?.map(g => g?.value)
            ?.join(' ') || '';
    };

    // Normalize spaces to make search matching cleaner
    const normalizeSpaces = (str) => str.replace(/\s+/g, ' ').trim();

    // Combine message text into a consistent format
    function mergeTextData(textData) {
        const combinedValue = getExtractedTextValue(textData);
        return [{
            type: "text",
            value: combinedValue,
            format: [],
            isLink: false
        }];
    };

    // Get tab name from user/group/broadcast info
    function getNameValues(chatData) {
        let tabName = chatData?.isGroupType ? getSingleGroupData(chatData?.toGroupID)?.profileInfo?.name :
            (chatData?.isBroadcastType && currentUserID == chatData?.senderID) ? getSingleBroadcastData(chatData?.toBroadcastID)?.profileInfo?.name :
                chatData?.aiAssistant ? aiAssistant?.profileInfo?.name :
                    getSingleUserData(currentUserID == chatData?.senderID ? chatData?.receiversInfo[0]?.receiverID : chatData?.senderID)?.profileInfo?.name;
        return tabName;
    }

    // Handle input change and execute search
    const handleSearch = (e) => {
        const term = e.target.value?.trim().toLowerCase(); // Clean and lowercase term
        setSearchTerm(e.target.value); // Save raw user input

        if (term === '') {
            setSearchedResults([]);
            return;
        }

        // Exclude chats deleted by the user
        let avaiableChats = allUniqueChats?.filter((chatData) => {
            return !chatData?.deletedByUsers?.includes(currentUserID);
        });

        const isMatch = (text, term) => {
            if (!text || !term) return false;
            return normalizeSpaces(text).toLowerCase().includes(normalizeSpaces(term).toLowerCase());
        };

        // Match tabs based on tab name
        let recentTabMatches = currentUserData?.recentChatsTabs?.filter((tabInfo) => {
            let tabName = tabInfo?.tabType === 'group' ? getSingleGroupData(tabInfo?.tabID)?.profileInfo?.name :
                tabInfo?.tabType === 'broadcast' ? getSingleBroadcastData(tabInfo?.tabID)?.profileInfo?.name :
                    tabInfo?.tabType === 'user' ? getSingleUserData(tabInfo?.tabID)?.profileInfo?.name :
                        aiAssistant?.profileInfo?.name;
            let tabNameValues = normalizeSpaces(getExtractedTextValue(tabName))?.toLowerCase();
            return tabNameValues.includes(term);
        })?.map(tabInfo => {
            let tabName = tabInfo?.tabType === 'group' ? getSingleGroupData(tabInfo?.tabID)?.profileInfo?.name :
                tabInfo?.tabType === 'broadcast' ? getSingleBroadcastData(tabInfo?.tabID)?.profileInfo?.name :
                    tabInfo?.tabType === 'user' ? getSingleUserData(tabInfo?.tabID)?.profileInfo?.name :
                        aiAssistant?.profileInfo?.name;
            return {
                ...tabInfo,
                tabName,
                tabData: tabInfo?.tabType === 'group' ? getSingleGroupData(tabInfo?.tabID) :
                    tabInfo?.tabType === 'broadcast' ? getSingleBroadcastData(tabInfo?.tabID) :
                        tabInfo?.tabType === 'user' ? getSingleUserData(tabInfo?.tabID) :
                            aiAssistant
            };
        });

        // Search messages, tab names, and sender names
        const chatMatches = avaiableChats?.filter(chatData => {
            const chatTextValue = normalizeSpaces(getExtractedTextValue(chatData?.text)).toLowerCase();
            let tabName = normalizeSpaces(getExtractedTextValue(getNameValues(chatData))).toLowerCase();
            let senderName = chatData?.isGroupType
                ? normalizeSpaces(chatData?.receiversInfo?.map(receiver => getExtractedTextValue(getSingleUserData(receiver?.receiverID)?.profileInfo?.name))?.join(' '))
                : '';

            return (
                senderName.includes(term) ||
                chatTextValue.includes(term) ||
                tabName.includes(term)
            ) && !chatData?.deletedByUsers?.includes(currentUserID);
        })?.map(chatData => {
            return {
                ...chatData,
                tabName: getNameValues(chatData),
                senderName: chatData?.isGroupType ? chatData?.receiversInfo?.find(receiver => getSingleUserData(receiver?.receiverID)?.profileInfo?.name) : '',
                tabData: chatData?.isGroupType ? getSingleGroupData(chatData?.toGroupID) :
                    (chatData?.isBroadcastType && currentUserID == chatData?.senderID) ? getSingleBroadcastData(chatData?.toBroadcastID) :
                        chatData?.aiAssistant ? aiAssistant :
                            getSingleUserData(currentUserID == chatData?.senderID ? chatData?.receiversInfo[0]?.receiverID : chatData?.senderID)
            };
        });

        // Identify tabs that don’t match any chat
        let tabWithoutChat = avaiableChats?.every((chatData) => {
            return recentTabMatches?.every((tabInfo) => {
                return (tabInfo?.tabType == "user" && tabInfo?.tabID != chatData?.senderID || true) && //exclude sender tab if it is user tab
                    tabInfo?.tabID != chatData?.toGroupID &&
                    tabInfo?.tabID != chatData?.toBroadcastID &&
                    !chatData?.receiversInfo?.some(receiverInfo => tabInfo?.tabID == receiverInfo?.receiverID);
            });
        });
        let matchedEmptyTab = recentTabMatches?.filter(() => {
            return tabWithoutChat;
        });
        // If no available chats, show only matched tabs
        if (avaiableChats?.length == 0) {
            setSearchedResults(recentTabMatches);
        };

        // Combine chat matches and matched tabs as search results
        if (tabWithoutChat || avaiableChats?.length != 0) {
            setSearchedResults([...chatMatches, ...matchedEmptyTab]);
        };
    };
    // Searching - end
    // filter chats by date (from - to) or starred or kept chats
    function filterChats(filterTypeInfo) {
        let result = allUniqueChats.filter(chat => {
            // Always skip chats deleted by this user
            if (chat.deletedByUsers?.includes(currentUserID)) return false;

            // Handle filtering by date range
            if (filterTypeInfo?.type === 'date') {
                const start = new Date(filterTypeInfo?.from); // Start date
                const end = new Date(filterTypeInfo?.to);     // End date

                // Check if the user is the sender
                const isSender = chat.senderID === currentUserID || chat.senderID?.$oid === currentUserID;
                if (isSender) {
                    const sentTime = new Date(chat.sentTime); // Time the message was sent
                    if (sentTime >= start && sentTime <= end) {
                        return true; // Include if sent within the range
                    }
                }

                // Check if the user is a receiver
                const receiverInfo = chat.receiversInfo?.find(
                    receiver => receiver.receiverID === currentUserID || receiver.receiverID?.$oid === currentUserID
                );

                if (receiverInfo) {
                    const deliveredTime = new Date(receiverInfo.deliveredTime); // Time the message was delivered
                    if (deliveredTime >= start && deliveredTime <= end) {
                        return true; // Include if delivered within the range
                    }
                }

                return false; // Exclude if not matching date range
            }

            // Handle filtering by starred or kept chats
            if (filterTypeInfo?.type === 'starred' || filterTypeInfo?.type === 'kept') {
                const key = filterTypeInfo?.gettingKey; // Dynamic key: 'starredByUsers' or 'keptByUsers'
                return chat[key]?.includes(currentUserID); // Include if current user marked it
            }
            // If filter type is unknown, exclude the chat
            return false;
        })?.map(chatData => {
            return {
                ...chatData,
                tabName: getNameValues(chatData), // Get and attach the chat tab name
                senderName: chatData?.isGroupType
                    ? chatData?.receiversInfo?.find(receiver => getSingleUserData(receiver?.receiverID)?.profileInfo?.name)
                    : '', // Get sender name if it's a group chat
                tabData: chatData?.isGroupType ? getSingleGroupData(chatData?.toGroupID) :
                    (chatData?.isBroadcastType && currentUserID == chatData?.senderID) ? getSingleBroadcastData(chatData?.toBroadcastID) :
                        chatData?.aiAssistant ? aiAssistant :
                            getSingleUserData(currentUserID == chatData?.senderID ? chatData?.receiversInfo[0]?.receiverID : chatData?.senderID)
            };
        });

        setSearchedResults(result); // Set filtered results
    };
    let ChatTab = ({
        chatData,
        tabInfo,
        tabData,
        unreadChats
    }) => {
        return <>
            <button
                className={`relative flex items-center justify-start w-full`}
                onClick={(e) => {
                    // Handle chat tab click:
                    // If selection mode is OFF, open the chat box and mark chat as seen (if receiver).
                    // If selection mode is ON, add this tab to selectedTabs.
                    if (!isTabSelecting) {
                        // Optional: logic to mark chat as 'seen' for the receiver (currently commented out).
                        setShowChatBox(true) // Show the chat box
                        setOpenedTabInfo(tabInfo); // Set this tab as the currently opened tab
                        deleteExpiredChats();
                        deleteExpiredStories();
                    } else {
                        // Selection mode: Add this tab to selectedTabs
                        handleTabsSelection(
                            tabInfo // Current tabInfo
                        );
                    };
                }}
                onTouchStart={(e) => {
                    // Mobile: Start long press timer for tab selection
                    handleHoldStart(
                        tabInfo
                    );
                }}
                onTouchEnd={(e) => {
                    // Mobile: End long press and clear timeout
                    handleHoldEnd(tabHoldingTimeoutRef)
                }}
                onTouchCancel={(e) => {
                    // Mobile: Cancel long press if interrupted
                    handleHoldEnd(tabHoldingTimeoutRef)
                }}
            >
                {/* Avatar Section */}
                <div style={{
                    // Show background color only if no profile picture is available
                    backgroundColor: tabData?.profileInfo?.profilePic == "" && tabData?.profileInfo?.bgColor
                }} className="user_avatar_box flex items-center justify-center text-2xl rounded-full relative showChildOnParentHover">
                    {
                        // If profile picture exists, show it
                        tabData?.profileInfo?.profilePic ? (
                            <img
                                className="w-full h-full rounded-full"
                                src={`${tabData?.profileInfo?.profilePic}`}
                                alt="Profile"
                            />
                        ) : tabInfo?.tabType == "user" ? (
                            // For user tab, show first letter of name
                            safeParseJSON(tabData?.profileInfo?.name)?.find(item => item?.type === 'text')?.value?.charAt(0)?.toUpperCase()
                        ) : (
                            // For groups, show group icon
                            <BiSolidGroup className="text-3xl text-white" />
                        )
                    }
                    {
                        // Show disappearing timer icon if set
                        (tabInfo?.disappearingTime && tabInfo?.disappearingTime != "Off") &&
                        <div className='dissapearTimerIcon'>
                            <IoIosTimer className='w-5 h-5' />
                        </div>
                    }
                    {
                        // Show voice recording icon if active
                        // isVoiceRecording &&
                        <div className='absolute bottom-0 right-0 left-0 right-0 w-full h-full rounded-full flex items-center justify-center bg-opacity-90 bg-gray-600 cursor-pointer showOnHover' onClick={() => {
                            // Selection mode: Add this tab to selectedTabs
                            handleTabsSelection(
                                tabInfo // Current tabInfo
                            );
                        }}>
                            <FaCheck className='w-6 h-6' />
                        </div>
                    }
                </div>

                {/* Tab Content Area */}
                <div className={`ml-1.5 text-left w-full profileTabInfo flex items-start justify-between`} style={{ maxWidth: "85%", padding: (chatData == null && !tabInfo?.isPinned) ? "18px 0px" : "10px 0px" }}>
                    {/* Name and message area */}
                    <div className="w-auto">
                        {/* Display user or group name */}
                        <p className='text-lg font-semibold flex'>
                            {
                                currentUserData?._id == tabData?._id ?
                                    " You"
                                    :
                                    <TextWithEmojis
                                        hide={true}
                                        textWidth={`auto`}
                                        areaName={'recentChatTabInfo'}
                                        textData={chatData?.tabName || tabData?.tabName}
                                        isSearching={searchTerm ? true : false}
                                    />
                            }
                        </p>

                        {
                            // Show last message summary if chatData exists and no typing status is active
                            (
                                chatData &&
                                (tabData?.chattingStatus == "" || tabData?.chattingStatus == undefined) &&
                                !(tabInfo?.draft?.fileData || tabInfo?.draft?.textData)
                            ) &&
                            <div className='mt-0.5 text-sm w-full flex'>
                                {
                                    // Show message status ticks for sender
                                    (
                                        currentUserData?._id == chatData?.senderID &&
                                        !chatData?.chatType?.startsWith("system-") &&
                                        ["voice-call", "video-call", "text", "file", "group-invitaion", "contact-share"]?.includes(chatData?.chatType)
                                    ) &&
                                    <span className="mr-1">
                                        {
                                            chatData?.receiversInfo?.length == 0 ?
                                                <BsCheck2 className='w-5 h-5 inline' />
                                                :
                                                chatData?.receiversInfo?.every(receiverInfo => receiverInfo?.status == "sending") ?
                                                    <HiOutlineClock className='w-5 h-5 inline text-gray-500' />
                                                    :
                                                    chatData?.receiversInfo?.some(receiverInfo => receiverInfo?.status == "sent") ?
                                                        <BsCheck2 className='w-5 h-5 inline text-gray-500' />
                                                        :
                                                        <BsCheck2All
                                                            className={`text-gray-500 ${chatData?.receiversInfo?.every(receiverInfo => receiverInfo?.status == "seen") && "chat_seen"} w-5 h-5 inline`}
                                                        />
                                        }
                                    </span>
                                }

                                {
                                    // Show sender name in group chat
                                    (!chatData?.chatType?.startsWith("system-") && chatData?.isGroupType) &&
                                    <span className='mr-1 flex items-center justify-center'>
                                        {
                                            chatData?.senderID == currentUserID ? "You" :
                                                <TextWithEmojis
                                                    hide={true}
                                                    textWidth={`70px`}
                                                    textData={getSingleUserData(chatData?.senderID)?.profileInfo?.name}
                                                    isSearching={searchTerm ? true : false}
                                                />
                                        }
                                        :
                                    </span>
                                }

                                {/* Display chat message content or icon */}
                                {
                                    chatData?.chatType == "group-invitaion" &&
                                    <BiSolidGroup className="text-lg" />
                                }
                                {
                                    chatData?.chatType == "contact-share" &&
                                    <HiUser className="text-lg" />
                                }
                                {
                                    chatData?.chatType == "unsent" &&
                                    <HiOutlineBan className="text-lg" />
                                }

                                {
                                    // Show text or file icon depending on chat type
                                    (chatData?.chatType?.startsWith("system-") || ["voice-call", "video-call", "unsent", "text", "group-invitaion", "contact-share"]?.includes(chatData?.chatType)) ?
                                        <TextWithEmojis
                                            hide={true}
                                            textWidth={`auto`}
                                            areaName={'recentChatTabInfo'}
                                            textData={chatData?.text}
                                            isSearching={searchTerm ? true : false}
                                        />
                                        :
                                        <>
                                            <FontAwesomeIcon
                                                style={{
                                                    fontSize: '18px'
                                                }}
                                                className='text-gray-400'
                                                icon={iconMap?.[chatData?.file?.fileIcon]}
                                            />
                                        </>
                                }
                            </div>
                        }
                        {
                            (tabInfo?.draft?.fileData || tabInfo?.draft?.textData) && <div className='mt-0.5 text-sm w-full flex'>
                                <span className='text-green-600 font-semibold'>
                                    Draft :
                                </span>
                                {
                                    tabInfo?.draft?.textData ?
                                        <TextWithEmojis
                                            hide={true}
                                            textWidth={`auto`}
                                            areaName={'recentChatTabInfo'}
                                            textData={tabInfo?.draft?.textData}
                                            isSearching={searchTerm ? true : false}
                                        />
                                        :
                                        <HiClipboardDocumentList className='w-5 h-5 text-gray-400' />
                                }
                            </div>
                        }
                        {
                            // If someone is typing or recording a voice
                            tabData?.chattingStatus &&
                            (
                                tabInfo?.tabType == "group" ?
                                    <div className="flex items-center">
                                        <TextWithEmojis
                                            hide={true}
                                            textWidth={`40px`}
                                            textData={getSingleUserData(tabData?.chattingStatusBy)?.profileInfo?.name}
                                            isSearching={searchTerm ? true : false}
                                        />
                                        : is {tabData?.chattingStatus}
                                    </div>
                                    :
                                    tabData?.chattingStatus
                            )
                        }
                    </div>

                    {/* Right section: timestamp and badge */}
                    {
                        !(tabInfo?.draft?.fileData || tabInfo?.draft?.textData) &&
                        <div className="w-auto">
                            <p style={{ marginRight: '8px' }}>
                                {/* Show chat time or clearing time */}
                                <span className='text-sm text-gray-500'>
                                    {
                                        (chatData != null) ?
                                            <>
                                                {formatTimestamp(
                                                    tabInfo?.recentTime
                                                )
                                                }
                                            </>
                                            :
                                            tabInfo?.clearingTime && <>
                                                {formatTimestamp(tabInfo?.clearingTime)}
                                            </>
                                    }
                                </span>

                                {/* Show unread chat badge and pin icon */}
                                <div className="w-full flex items-center justify-center gap-x-1">
                                    {
                                        unreadChats?.length > 0 &&
                                        <span id='notificationBadge' style={{ top: "36px", right: "10px" }}>
                                            {
                                                unreadChats?.length > 99 ?
                                                    '99+'
                                                    :
                                                    unreadChats?.length
                                            }
                                        </span>
                                    }
                                    {
                                        tabInfo?.isPinned &&
                                        <BsPinFill className='w-5 h-5 text-gray-500' />
                                    }
                                </div>
                            </p>
                        </div>
                    }
                </div>
            </button >

            {/* Checkbox icon if tab is selected */}
            <div style={{ display: selectedTabs?.some(selectedTab => selectedTab.tabID === tabData?._id) ? 'flex' : 'none' }}
                className="selecting flex items-center justify-between"
                onClick={() => {
                    // Toggle selection of tab
                    handleTabsSelection(
                        tabInfo
                    );
                }}
            >
                <div className='selectingIcon'>
                    <FaCheck className='w-4 h-4' />
                </div>
            </div>
        </>
    };
    return (
        <React.Fragment>
            {/* recent chats tabs main container */}
            <div id='recentChats' className='w-full h-full flex flex-col'>
                {/* menu bar - start */}
                <div className={`${activeDarkMode ? "darkModeBg2" : ''} border-b border-gray-200 text-gray-600  h-auto gap-x-4 h-12 w-full p-4`}>
                    {/* Container for menu bar header */}
                    <div className='flex flex-row items-center justify-between'>
                        {/* Title section - displays either "Recent Chats" or number of selected tabs */}
                        <div className="flex items-center justify-center text-xl font-semibold">
                            {
                                isTabSelecting ?
                                    <div className='flex gap-x-1 items-center'>
                                        <BsArrowLeft className='cursor-pointer w-6 h-6' onClick={() => {
                                            setIsTabSelecting(false);
                                            setSelectedTabs([]);
                                        }} />
                                        <span className='font-sm'>
                                            {selectedTabs.length} Selected
                                        </span>
                                    </div>
                                    :
                                    'Recent Chats'
                            }
                        </div>

                        {/* Right side icons and buttons */}
                        <div className="flex items-center gap-1 relative">
                            {/* Show delete, archive, pin buttons only when tabs are being selected */}
                            <div style={{ display: isTabSelecting ? 'flex' : 'none' }} className={`${activeDarkMode ? "darkModeBg2" : ''} gap-2 `}>
                                {/* Delete selected user chat tabs */}
                                <button
                                    onClick={() => {
                                        setShowConfirmationDialog(true);
                                    }}
                                    type='button'>
                                    {
                                        // Only show delete icon if all selected tabs are not groups
                                        selectedTabs?.every((selectedTab) => {
                                            if (selectedTab?.tabType == "group") {
                                                return !getSingleGroupData(selectedTab?.tabID)?.members?.includes(currentUserID);
                                            };
                                            return true;
                                        })
                                        &&
                                        <AiFillDelete className='w-6 h-6' />
                                    }
                                </button>

                                {/* Archive/Unarchive a single selected chat tab */}
                                {
                                    selectedTabs?.length == 1 &&
                                    <>
                                        <button type='button' onClick={() => {
                                            selectedTabs?.forEach((recentTabInfo) => {
                                                addOrUpdateRecentTab(
                                                    recentTabInfo,
                                                    {
                                                        isArchived: !recentTabInfo?.isArchived,
                                                    }
                                                );
                                            });
                                            refereshTabSelecting();
                                        }}>
                                            <BiSolidArchiveIn className='w-6 h-6'
                                                style={{ transform: selectedTabs?.every((tab) => tab?.isArchived) ? 'rotate(180deg)' : 'none' }}
                                            />
                                        </button>

                                        {/* Pin or unpin the selected chat tab */}
                                        <button type='button' onClick={() => {
                                            let pinnedTabLength = currentUserData?.recentChatsTabs?.filter((tab) => tab?.isPinned)?.length;
                                            selectedTabs?.forEach((recentTabInfo) => {
                                                addOrUpdateRecentTab(
                                                    recentTabInfo,
                                                    {
                                                        isPinned: recentTabInfo?.isPinned ? false : pinnedTabLength < 3,

                                                    }
                                                );
                                            });
                                            refereshTabSelecting();
                                        }}>
                                            {
                                                selectedTabs?.every((tab) => tab?.isPinned) ?
                                                    <BsPin className='w-6 h-6 relative top-1' />
                                                    :
                                                    <BsPinFill className='w-6 h-6 relative top-1' />
                                            }
                                        </button>
                                    </>
                                }
                            </div>

                            {
                                // Filtering options - show only when tab is not being selected
                                !isTabSelecting &&
                                <>
                                    {/* Unread chats notification */}
                                    {
                                        getUnreadChats(currentUserID, allUniqueChats, null)?.length > 0 &&
                                        <button type="button" className={`inline-flex relative items-center justify-center h-9 w-9 transition duration-500 ease-in-out focus:outline-none btnWithTitle`} data-title="Unread Chats" onClick={() => {
                                            setTabsFiltering(tabsFiltering?.type ? null : { type: "unread" });
                                            setSearchedResults([]);
                                            setAdvanceFiltering(false);
                                        }}>
                                            <HiBellAlert className='w-6 h-6' />
                                            {
                                                getUnreadChats(currentUserID, allUniqueChats, null)?.length > 0 &&
                                                <span id='notificationBadge' style={{ right: "0px" }}>
                                                    {
                                                        getUnreadChats(currentUserID, allUniqueChats, null)?.length > 99 ?
                                                            '99+'
                                                            :
                                                            getUnreadChats(currentUserID, allUniqueChats, null)?.length
                                                    }
                                                </span>
                                            }
                                        </button>
                                    }
                                    {/* Chat filter button - shows filtering dropdown */}
                                    <button type="button" className={`inline-flex relative items-center justify-center h-9 w-9 transition duration-500 ease-in-out focus:outline-none showChildOnParentHover`}>
                                        <BiSolidFilterAlt className='w-6 h-6' />
                                        {/* Chat filter dropdown */}
                                        <div style={{ top: "40px", right: "0px", transition: "0.3s", width: "170px", padding: '6px 0px' }} className={`showOnHover ${activeDarkMode ? "darkModeBg1" : ''} block absolute right-0 z-10 mt-0 w-auto origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}>
                                            {/* archived tab filtering */}
                                            <div onClick={() => {
                                                setTabsFiltering({ type: "archived" });
                                                setSearchedResults([]);
                                                setAdvanceFiltering(false);
                                            }}>
                                                <p className="text-left cursor-pointer block px-4 py-2 text-md">
                                                    Archived Chats
                                                </p>
                                            </div>
                                            {/* recent tab filtering */}
                                            <div onClick={() => {
                                                setTabsFiltering({ type: "recent" });
                                                setSearchedResults([]);
                                                setAdvanceFiltering(false);
                                            }}>
                                                <p className="text-left cursor-pointer block px-4 py-2 text-md">
                                                    Recent Chats
                                                </p>
                                            </div>
                                            {/* Filter starred chats */}
                                            <div onClick={() => {
                                                setSearchedResults([]);
                                                filterChats({
                                                    type: "starred",
                                                    key: "starredByUsers"
                                                });
                                                setAdvanceFiltering(true);
                                            }}>
                                                <p className="text-left cursor-pointer block px-4 py-2 text-md">Starred Chats</p>
                                            </div>
                                            {/* Filter kept chats */}
                                            <div onClick={() => {
                                                setSearchedResults([]);
                                                filterChats({
                                                    type: "kept",
                                                    key: "keptByUsers"
                                                });
                                                setAdvanceFiltering(true);
                                            }}>
                                                <p className="text-left cursor-pointer block px-4 py-2 text-md">Kept Chats</p>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Date filter dropdown */}
                                    <button type="button" className={`inline-flex relative items-center justify-center h-9 w-9 transition duration-500 ease-in-out focus:outline-none showChildOnParentHover`}>
                                        <BsCalendar2DateFill className='w-5 h-5' />
                                        {/* Date range selector dropdown */}
                                        <div style={{ top: "40px", right: "0px", transition: "0.3s", width: "170px", padding: '6px 0px' }} className={`showOnHover ${activeDarkMode ? "darkModeBg1" : ''} block absolute right-0 z-10 mt-0 w-auto origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}>
                                            {/* From date input */}
                                            <div class="relative">
                                                <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                                                    <BsCalendar2DateFill className="w-4 h-4" />
                                                </div>
                                                <input
                                                    type="date"
                                                    value={dateRange?.from || ''}
                                                    onChange={e =>
                                                        setDateRange(prev => ({
                                                            ...(prev || { from: null, to: null }),
                                                            from: e.target.value ? e.target.value : null
                                                        }))
                                                    }
                                                    className={`${activeDarkMode ? "darkModeBg1" : ''} bg-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5`}
                                                    placeholder="Select date start"
                                                />
                                            </div>
                                            <span className='text-center cursor-pointer block px-4 py-2 text-md'>To</span>
                                            {/* To date input */}
                                            <div class="relative">
                                                <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                                                    <BsCalendar2DateFill className="w-4 h-4" />
                                                </div>
                                                <input
                                                    type="date"
                                                    value={dateRange?.to || ''}
                                                    onChange={e =>
                                                        setDateRange(prev => ({
                                                            ...(prev || { from: null, to: null }),
                                                            to: e.target.value ? e.target.value : null
                                                        }))
                                                    }
                                                    className={`${activeDarkMode ? "darkModeBg1" : ''} bg-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5`}
                                                    placeholder="Select date end"
                                                />
                                            </div>
                                            {/* Apply date filter */}
                                            <span
                                                onClick={() => {
                                                    setSearchedResults([]);
                                                    if (!dateRange?.from || !dateRange?.to) {
                                                        toast.error('Please select both start and end dates');
                                                        return;
                                                    }

                                                    const filterTypeInfo = {
                                                        type: 'date',
                                                        from: dateRange.from,
                                                        to: dateRange.to
                                                    };
                                                    filterChats(filterTypeInfo);
                                                    setAdvanceFiltering(true);
                                                }}
                                                className="text-center cursor-pointer block px-4 py-2 text-md"
                                            >
                                                Apply
                                            </span>
                                        </div>
                                    </button>
                                </>
                            }

                            {/* dropdown -start */}
                            <button type="button" className={`inline-flex relative items-center justify-center h-9 w-9 transition duration-500 ease-in-out focus:outline-none showChildOnParentHover`}>
                                <BiDotsVerticalRounded className="w-7 h-7" />
                                {/* Menu dropdown with group, broadcast, select all, and settings options */}
                                <div
                                    style={{ top: "40px", right: "0px", transition: "0.3s", width: "170px", padding: '6px 0px' }} className={`showOnHover ${activeDarkMode ? "darkModeBg1" : ''} block absolute right-0 z-10 mt-0 w-auto origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}>

                                    {/* Open group creation panel */}
                                    <div onClick={() => {
                                        handleShowingSections(setShowGroupCreationPanel);
                                        if (selectedTabs?.length > 0) {
                                            setSelectedUsersForGroupOrBroadcast(
                                                selectedTabs?.filter((selectedTab) => {
                                                    return selectedTab?.tabType == "user"
                                                })?.map((selectedUser) => getSingleUserData(selectedUser?.tabID))
                                            );
                                        };
                                    }}>
                                        <p className="text-left cursor-pointer block px-4 py-2 text-md">New Group</p>
                                    </div>

                                    {/* Open broadcast creation panel */}
                                    <div onClick={() => {
                                        handleShowingSections(setShowBroadcastCreationPanel);
                                        if (selectedTabs?.length > 0) {
                                            setSelectedUsersForGroupOrBroadcast(
                                                selectedTabs?.filter((selectedTab) => {
                                                    return selectedTab?.tabType == "user"
                                                })?.map((selectedUser) => getSingleUserData(selectedUser?.tabID))
                                            );
                                        };
                                    }}>
                                        <p className="text-left cursor-pointer block px-4 py-2 text-md">New Broadcasts</p>
                                    </div>

                                    {/* Select/Unselect all chat tabs */}
                                    {
                                        currentUserData?.recentChatsTabs?.length > 0 &&
                                        <div>
                                            {
                                                selectedTabs.length == currentUserData?.recentChatsTabs?.length ?
                                                    <p className="text-left cursor-pointer block px-4 py-2 text-md"
                                                        onClick={() => {
                                                            refereshTabSelecting();
                                                        }}>
                                                        Unselect All
                                                    </p>
                                                    :
                                                    <p className="text-left cursor-pointer block px-4 py-2 text-md"
                                                        onClick={() => {
                                                            setIsTabSelecting(true);
                                                            setSelectedTabs(currentUserData?.recentChatsTabs);
                                                        }}>
                                                        Select All
                                                    </p>
                                            }
                                        </div>
                                    }

                                    {/* Open settings section */}
                                    {
                                        // show setting button only while not selecting
                                        !isTabSelecting &&
                                        <div onClick={() => {
                                            handleShowingSections(setShowSettingsSection);
                                        }}>
                                            <p className="text-left cursor-pointer block px-4 py-2 text-md">Settings</p>
                                        </div>
                                    }
                                </div>
                            </button>
                            {/* dropdown -end */}
                        </div>
                    </div>

                    {/* Search bar - hidden when selecting tabs unless using advanced filter */}
                    <div style={{ display: (isTabSelecting && !advanceFiltering) ? 'none' : 'block' }} className="mt-3 mx-auto">
                        <div className={`${activeDarkMode ? "darkModeBg1" : ''} relative flex items-center w-full h-10 rounded-lg bg-white overflow-hidden`}>
                            {/* Search icon */}
                            <div className={`${activeDarkMode ? "darkModeBg1" : ''} grid bg-gray-200 place-items-center h-full w-12 text-gray-300`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            {/* Search input */}
                            <div className="h-full w-full outline-none text-sm text-dark" id="search">
                                <input
                                    type="text"
                                    name=""
                                    id=""
                                    className={`${activeDarkMode ? "darkModeBg1" : ''} h-full w-full outline-none text-lg bg-gray-200 text-dark`}
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                {/* menu bar - end */}
                {/* recent chats tab  */}
                {
                    (
                        searchTerm == '' &&
                        !advanceFiltering &&
                        currentUserData?.recentChatsTabs?.filter((tabInfo) => {
                            const isArchived = tabInfo?.isArchived === true;
                            const showArchived = tabsFiltering?.type === "archived";
                            const showUnread = tabsFiltering?.type === "unread";
                            const hasUnread = getUnreadChats(currentUserID, allUniqueChats, tabInfo)?.length > 0;
                            if (showArchived) {
                                // Case 1: Show only archived chats
                                return isArchived;
                            } else if (showUnread && hasUnread) {
                                // Case 2: Show only tabs with unread messages
                                return true;
                            } else if (!showArchived && !showUnread) {
                                // Case 3: Show all tabs
                                return true;
                            }
                        })?.length > 0
                    ) &&
                    // Render recent chat tabs when there is no search term or advanced filtering and some tabs exist
                    <div className="w-full h-full flex overflow-y-auto flex-col">
                        {
                            currentUserData?.recentChatsTabs?.filter((tabInfo) => {
                                const isArchived = tabInfo?.isArchived === true;
                                const showArchived = tabsFiltering?.type === "archived";
                                const showUnread = tabsFiltering?.type === "unread";
                                const hasUnread = getUnreadChats(currentUserID, allUniqueChats, tabInfo)?.length > 0;
                                if (showArchived) {
                                    // Case 1: Show only archived chats
                                    return isArchived;
                                } else if (showUnread && hasUnread) {
                                    // Case 2: Show only tabs with unread messages
                                    return true;
                                } else if (!showArchived && !showUnread) {
                                    // Case 3: Show all tabs
                                    return true;
                                }
                            })
                                ?.sort((a, b) => {
                                    const getTime = (tab) => {
                                        // return new Date(tab.recentTime).getTime();
                                        return new Date(tab.recentTime || tab.clearingTime || 0).getTime();
                                    };
                                    return getTime(b) - getTime(a); // Descending order (latest first)
                                })
                                ?.map((tabInfo, idx) => {
                                    // Determine the type of tab (group, broadcast, or user) and get corresponding data
                                    let tabData = tabInfo?.tabType === 'group' ? getSingleGroupData(tabInfo?.tabID) :
                                        tabInfo?.tabType === 'broadcast' ? getSingleBroadcastData(tabInfo?.tabID) :
                                            tabInfo?.tabType === 'user' ? getSingleUserData(tabInfo?.tabID) :
                                                aiAssistant;

                                    // Find chat tab for one-to-one user chat
                                    let userChatTab = allChatsOfMyTabs?.find((chatData) =>
                                        (
                                            chatData?.receiversInfo?.some(receiverInfo => receiverInfo?.receiverID == tabInfo?.tabID) &&
                                            currentUserID == chatData?.senderID
                                        ) && !chatData?.isGroupType && !chatData?.isBroadcastType
                                        ||
                                        (
                                            tabInfo?.tabID == chatData?.senderID &&
                                            chatData?.receiversInfo?.some(receiverInfo => receiverInfo?.receiverID == currentUserID)
                                        ) && !chatData?.isGroupType
                                    );
                                    userChatTab = userChatTab || null;

                                    // Find group chat tab
                                    let groupTabChat = allChatsOfMyTabs?.find((chatData) =>
                                        chatData?.isGroupType && chatData?.toGroupID == tabInfo?.tabID
                                    );
                                    // Add sender's name in group tab chat if found
                                    groupTabChat = groupTabChat ? {
                                        ...groupTabChat,
                                        senderName: getSingleUserData(groupTabChat?.senderID)?.profileInfo?.name
                                    } : null;

                                    // Find broadcast chat tab
                                    let broadcastChatTab = allChatsOfMyTabs?.find((chatData) =>
                                        chatData?.isBroadcastType && currentUserID == chatData?.senderID && chatData?.toBroadcastID == tabInfo?.tabID
                                    );
                                    broadcastChatTab = broadcastChatTab || null;
                                    //find ai assistant chat tab
                                    let aiAssistantChatTab = allChatsOfMyTabs?.find((chatData) =>
                                        chatData?.aiAssistant &&
                                        (
                                            (
                                                chatData?.receiversInfo?.some(receiverInfo => receiverInfo?.receiverID == tabInfo?.tabID) &&
                                                currentUserID == chatData?.senderID
                                            )
                                            ||
                                            (
                                                tabInfo?.tabID == chatData?.senderID &&
                                                chatData?.receiversInfo?.some(receiverInfo => receiverInfo?.receiverID == currentUserID)
                                            )
                                        )
                                    );
                                    aiAssistantChatTab = aiAssistantChatTab || null;
                                    // Get unread chat count
                                    let unreadChatsNumbers = getUnreadChats(currentUserID, allUniqueChats, tabInfo);

                                    // Render each chat tab using ChatTab component
                                    return <div key={idx} id={tabData?._id} className={`${tabData?._id == openedTabInfo?.tabID ? "active" : ""} ${activeDarkMode ? "darkModeBg2" : ''} relative ${(!tabData?.isDeleted && tabInfo?.tabType != "aiAssistant") && "dropZone"} profileTab border-b border-gray-200`} style={{
                                        ...(tabInfo?.isPinned && { order: -(currentUserData?.recentChatsTabs?.length - idx) }) // Prioritize pinned chats
                                    }}>
                                        <ChatTab
                                            chatData={
                                                userChatTab ||
                                                groupTabChat ||
                                                broadcastChatTab ||
                                                aiAssistantChatTab
                                            }
                                            tabInfo={tabInfo}
                                            tabData={{ ...tabData, tabName: tabData?.profileInfo?.name }}
                                            unreadChats={unreadChatsNumbers}
                                        />
                                    </div>
                                })
                        }
                    </div>
                }
                {
                    // Show searched results if available
                    searchedResults?.length > 0 &&
                    <div className="w-full h-full flex overflow-y-auto flex-col">
                        {
                            searchedResults?.map((resultData, idx2) => {
                                // Find tab info from recentChatsTabs using searched result
                                let tabInfo = currentUserData?.recentChatsTabs?.find((tab) => tab?.tabID == resultData?.tabData?._id);
                                // Get unread chat count
                                let unreadChatsNumbers = getUnreadChats(currentUserID, allUniqueChats, tabInfo);
                                // Render searched chat tab
                                return <div key={idx2} className={`${resultData?.tabData?._id == openedTabInfo?.tabID ? "" : ""} ${activeDarkMode ? "darkModeBg1" : ''} relative profileTab border-b border-gray-200`}>
                                    <ChatTab
                                        chatData={resultData?.senderID ? resultData : null} //it indicates, it is a chat, else null
                                        tabInfo={tabInfo}
                                        tabData={{ ...resultData?.tabData, tabName: resultData?.tabData?.profileInfo?.name }}
                                        unreadChats={unreadChatsNumbers}
                                    />
                                </div>
                            })
                        }
                    </div>
                }
                {
                    // Show message if all tabs are archived or recent tabs are empty
                    ((!advanceFiltering && searchTerm == '') && currentUserData?.recentChatsTabs?.length > 0) &&
                    <>
                        {
                            currentUserData?.recentChatsTabs?.filter((tabInfo) => {
                                const isArchived = tabInfo?.isArchived === true;
                                const showArchived = tabsFiltering?.type === "archived";
                                const showUnread = tabsFiltering?.type === "unread";
                                const hasUnread = getUnreadChats(currentUserID, allUniqueChats, tabInfo)?.length > 0;
                                if (showArchived) {
                                    // Case 1: Show only archived chats
                                    return isArchived;
                                } else if (showUnread && hasUnread) {
                                    // Case 2: Show only tabs with unread messages
                                    return true;
                                } else if (!showArchived && !showUnread) {
                                    // Case 3: Show all tabs
                                    return true;
                                }
                            })?.length == 0 &&
                            <div className='text-lg flex justify-center items-center text-center h-full w-full'>
                                No
                                {tabsFiltering?.type == "archived" && ' Archived '}
                                {tabsFiltering?.type == null && ' Recent '}
                                {tabsFiltering?.type == 'unread' && ' Unread '}
                                Chats
                            </div>
                        }
                    </>
                }
                {
                    // Show message when no recent tabs are available at all
                    (!advanceFiltering && searchTerm == '' && currentUserData?.recentChatsTabs?.length == 0) &&
                    <div className='text-lg flex justify-center items-center text-center h-full w-full flex-col'>
                        <div className='mx-auto flex items-center justify-center forNonPc hidden' style={{
                            width: "150px",
                            padding: '10px'
                        }}>
                            <img src="https://res.cloudinary.com/dn0hsbnpl/image/upload/v1750832972/chat_uploads/tjmw2twyqoanavs7gdcp.png" alt="App logo" className='w-full' />
                        </div>
                        No recent chats available. Start a conversation now!
                    </div>
                }
                {
                    // Show message when no results found during search or advanced filtering
                    (searchedResults?.length == 0 && (searchTerm != "" || advanceFiltering)) &&
                    <div className='text-lg flex justify-center items-center text-center h-full w-full'>
                        No result
                    </div>
                }
                {/* recent tabs - end */}
            </div>
            {/* ToastContainer for showing notifications */}
            <ToastContainer />
            {
                showConfirmationDialog &&
                <ConfirmationDialog
                    textMsg={`Are you sure you want to delete tabs`}
                    handleConfirmAction={() => {
                        selectedTabs?.forEach((recentTabInfo) => {
                            if (recentTabInfo?.tabID != openedTabInfo?.tabID) {
                                deleteRecentChatTab(recentTabInfo);
                            };
                            // if there are no recording , delete and hide chat box
                            if (recentTabInfo?.tabID == openedTabInfo?.tabID && !isVoiceRecording) {
                                deleteRecentChatTab(recentTabInfo);
                                setShowChatBox(false) // Show the chat box
                                setOpenedTabInfo(null); // Set this tab as the currently opened tab
                            };
                            if (recentTabInfo?.tabID == openedTabInfo?.tabID && isVoiceRecording) {
                                toast.error('opened tab cannot be deleted, as you are currently recording a voice note');
                            };
                        });
                        setShowConfirmationDialog(false);
                        refereshTabSelecting();
                    }}
                    setShowConfirmationDialog={setShowConfirmationDialog}
                />
            }
        </React.Fragment >
    )
}
export default RecentChats;