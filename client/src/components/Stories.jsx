import { useContext, useEffect, useRef, useState } from 'react';
import { HiPencilSquare, HiMagnifyingGlass } from 'react-icons/hi2';
import { BsArrowLeft, BsPlus } from 'react-icons/bs';
import { BiDotsVerticalRounded } from 'react-icons/bi';
import { UserContext } from '@context/UserContext';
import _ from 'lodash';
import { FaCheck } from 'react-icons/fa6';
import { AiFillDelete } from 'react-icons/ai';
import { HiOutlineArrowRight, HiOutlineDownload } from 'react-icons/hi';
import { FaClockRotateLeft } from "react-icons/fa6";
import { ProgressBar, ProfileTab, TextPanelForStory, StoryView, ChatForwarding, TextWithEmojis } from './index.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { saveAs } from 'file-saver';
import { ToastContainer } from "react-toastify";
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


//remove story from my story list - end
function Stories() {
    // Destructuring multiple values from the UserContext
    const {
        currentUserID,
        wbServer,
        allUsersData,
        allStoriesData,
        setAllStoriesData,
        setOpenedTabInfo,
        setShowChatBox,
        getSingleUserData,
        activeDarkMode,
        handleFileUpload,
        textStoryReadyToSend,
        areMediaStoriesReadyToSend,
        isFileUploading,
        setIsFileUploading,
        setUploadedFiles,
        setShowEditingPanel,
        setFileEditingFor,
        filesForSend,
        editStoryContent,
        deleteStories,
        deleteExpiredStories,
        safeParseJSON,
        showChatForwardingPanel,
        setShowChatForwardingPanel,
        setForwardingChats,
        storyForDirectDisplay,
        sendStories,
        setShowRecentChatsSection,
        handleShowingSections,
        deleteExpiredChats,
        resendStory
    } = useContext(UserContext);

    // Get current logged-in user data
    let currentUserData = getSingleUserData(currentUserID);

    // Filter stories created by the current user
    function filteredMyStories(allStoriesData, currentUserID) {
        return allStoriesData.filter(story => story?.senderID == currentUserID)
    };

    // Filter stories from all users except the current user (that are visible to the current user)
    // this return stories in array by sender
    function filteredRecentStoryTabs(allUniqueStoriesData, currentUserID) {
        return allUsersData?.map(userInfo => {
            return allUniqueStoriesData?.filter(story => {
                const receivers = story.receiversInfo;
                return (
                    story?.senderID === userInfo?._id &&
                    receivers?.some(receiverInfo => receiverInfo?.receiverID === currentUserID)
                );
            });
        })?.filter(stories => stories?.length > 0)
    };

    // Filter stories by a specific sender considering visibility to the current user
    function filteredStoriesList(storySender, currentUserID) {
        return allStoriesData?.filter(story => {
            const receivers = story.receiversInfo;
            return (
                storySender == currentUserID ?
                    story?.senderID == storySender
                    :
                    story?.senderID == storySender &&
                    receivers?.some(receiverInfo => receiverInfo?.receiverID == currentUserID)
            );
        })
    };

    // Open full screen view for stories and set appropriate flags and state
    function openFullStoriesView(previousStories, curentStory) {
        setShowChatBox(false); // Hide chat box when viewing story
        setShowStoryView(true); // Show story view
        setStorySender(curentStory?.senderID); // Set sender of current story

        // Set opened tab info if exists in recent chats, otherwise initialize
        setOpenedTabInfo(
            currentUserData?.recentChatsTabs?.find((recentTabInfo) => {
                recentTabInfo?.tabID == curentStory?.senderID
            })
            ||
            {
                tabType: "user",
                tabID: curentStory?.senderID,
                recentTime: "",
                clearingTime: "",
                isArchived: false,
                isPinned: false,
                disappearingTime: "Off",
            }
        );
        setAllStoriesData((prev) =>
            prev.map((prevStory, idx) => {
                if (previousStories.some((prevStoryFilter) => prevStoryFilter.customID === prevStory.customID)) {
                    return {
                        ...prevStory,
                        width: 100, // Mark previous stories as fully watched
                        watched: prevStory?.watched, // Keep existing watched status
                        currentStory: false,
                        goingToFullView: true
                    };
                };
                if (prevStory.customID == curentStory?.customID) {
                    return {
                        ...prevStory,
                        currentStory: true,
                        width: 0, // Mark previous stories as fully watched
                        watched: false, // Keep existing watched status
                        goingToFullView: true
                    };
                };
                return {
                    ...prevStory,
                    width: 0, // Collapse width for unviewed stories
                    watched: false,
                    currentStory: false,
                    goingToFullView: true
                };
            })
        );
        deleteExpiredChats();
        deleteExpiredStories();
    };

    // Get unique stories using lodash to remove duplicates based on customID
    const allUniqueStoriesData = _.uniqBy(allStoriesData, "customID");

    const myStories = filteredMyStories(allStoriesData, currentUserID);
    let recentStoryTabs = filteredRecentStoryTabs(allUniqueStoriesData, currentUserID);
    // Local state variables
    const [showStoryView, setShowStoryView] = useState(false); // Controls full story view
    const [storySender, setStorySender] = useState(null); // Tracks current story sender
    const [showStoriesList, setShowStoriesList] = useState(false); // Toggle stories list view
    const [currentStoriesListSender, setCurrentStoriesListSender] = useState(null); // Track sender whose stories are listed
    const [showStoryReceivers, setShowStoryReceivers] = useState(false); // For showing who received a story (used in deletion)
    const [selectedUsers, setSelectedUsers] = useState([]); // Selected users for targeted actions
    const [showTextPanelForStory, setShowTextPanelForStory] = useState(false); // Controls visibility of text panel
    const [targetStoryForReplyOrEdit, setTargetStoryForReplyOrEdit] = useState(null); // Stores target story for reply/edit
    const [showProgressBar, setShowProgressBar] = useState(false); // Toggle for showing upload/progress bar

    // Searching functionality - start
    const [showSearchBox, setShowSearchBox] = useState(false); // Toggle for displaying search input
    const [searchTerm, setSearchTerm] = useState(''); // State to hold current search input
    const [searchedStoryTabs, setSearchedStoryTabs] = useState([]); // State to hold searched story tabs
    // Function to handle search input and highlight matching users
    const handleSearch = (e) => {
        const term = e.target.value?.trim().toLowerCase(); // Normalize user input
        setSearchTerm(e.target.value); // Store raw input

        // If search is empty, reset results
        if (term === '') {
            setSearchedStoryTabs([]);
            return;
        }

        // Normalize extra spaces in strings
        const normalizeSpaces = (str) => str.replace(/\s+/g, ' ').trim();

        // Retrieve a particular field's text value from user profile (e.g., name, about)
        const getTextValue = (values) => {
            return safeParseJSON(values)
                ?.map(g => g?.value)
                ?.join(' ') || '';
        };

        // Match users by sender name
        const storyTabMatches = filteredRecentStoryTabs(allUniqueStoriesData, currentUserID)?.filter(storiesArrayOfSender => {
            let senderNameObject = getSingleUserData(storiesArrayOfSender[0]?.senderID)?.profileInfo?.name
            let senderName = normalizeSpaces(getTextValue(senderNameObject))?.toLowerCase();
            return senderName.includes(term);
        });

        setSearchedStoryTabs(storyTabMatches);
    };
    // Searching functionality - end
    // File width to size class mapping
    const sizeMap = {
        330: "square",
        600: "wide",
        400: "moderate",
        190: "tall",
        150: "miniTall",
        90: "mini2Tall",
        auto: "audio"
    };

    function formatStoryTime(time) {
        const now = new Date();
        const sentDate = new Date(time);
        const diffInMs = now - sentDate;
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

        if (diffInMinutes < 1) {
            return "just now";
        } else if (diffInMinutes < 60) {
            return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        } else {
            // Return time in HH:MM AM/PM format
            const options = { hour: '2-digit', minute: '2-digit', hour12: true };
            return sentDate.toLocaleTimeString(undefined, options);
        }
    };

    // Handle selecting/deselecting users
    function handleSelectedUsers(userID) {
        setSelectedUsers((selectedUsers) => {
            let userExists = selectedUsers?.includes(userID);
            if (userExists) {
                return selectedUsers?.filter((selectedUser) => selectedUser != userID);
            } else {
                return [...selectedUsers || [], userID];
            };
        });
    };

    // === Story selection states ===
    const [isStorySelecting, setIsStorySelecting] = useState(false); // Toggle story selection mode
    const storyHoldingTimeoutRef = useRef(null); // Store timeout for hold
    const [selectedStories, setSelectedStories] = useState([]); // Store selected stories

    // Reset story selection state
    function refereshStoriesSelecting() {
        setIsStorySelecting(false)
        setSelectedStories([]);
    };

    // Toggle story selection on click
    async function handleStoriesSelection(story) {
        let { customID } = story;
        setSelectedStories((selectedStories) => {
            const isStorySelected = selectedStories?.some((prevStory) => prevStory?.customID == customID);
            if (isStorySelected) {
                return selectedStories?.filter((prevStory) => prevStory?.customID != customID);
            } else {
                return [...selectedStories, story];
            }
        });
    };

    // Trigger selection after long press
    const handleHoldStart = (story) => {
        storyHoldingTimeoutRef.current = setTimeout(() => {
            handleStoriesSelection(story);
            setIsStorySelecting(true)
        }, 1000); // 1 second hold
    };

    // Cancel the hold action
    const handleHoldEnd = (storyHoldingTimeoutRef) => {
        if (storyHoldingTimeoutRef.current) {
            clearTimeout(storyHoldingTimeoutRef.current);
            storyHoldingTimeoutRef.current = null;
        };
    };

    // Monitor selectedStories to enable or disable selection mode
    useEffect(() => {
        if (selectedStories.length == 0) {
            setIsStorySelecting(false);
        } else {
            setIsStorySelecting(true)
        };
    }, [selectedStories, handleStoriesSelection, handleHoldStart, handleHoldEnd]);

    // Show a specific story directly (e.g., from chat click)
    useEffect(() => {
        if (storyForDirectDisplay) {
            let currentStoryIDX = filteredStoriesList(storyForDirectDisplay?.senderID, currentUserID).findIndex(
                (story) => story?.customID === storyForDirectDisplay?.customID
            );
            const previousStories = filteredStoriesList(storyForDirectDisplay?.senderID, currentUserID).filter((story, idx) => idx < currentStoryIDX);
            openFullStoriesView(previousStories, storyForDirectDisplay);
        };
    }, [storyForDirectDisplay]);

    // === Send story when ready ===
    useEffect(() => {
        // If story is in edit mode
        if ((areMediaStoriesReadyToSend || textStoryReadyToSend != null) && targetStoryForReplyOrEdit?.type == "edit") {
            editStoryContent({
                ...targetStoryForReplyOrEdit?.data,
                text: JSON.stringify(textStoryReadyToSend) || "",
                mediaFile: areMediaStoriesReadyToSend ? filesForSend[0] : null,
                oldFileURL: targetStoryForReplyOrEdit?.data?.mediaFile?.fileURL
            });
            setTargetStoryForReplyOrEdit(null);
            setShowProgressBar(true);
        };
        // If it is a new story
        if ((areMediaStoriesReadyToSend || textStoryReadyToSend != null) && targetStoryForReplyOrEdit == null) {
            sendStories(
                textStoryReadyToSend || null,
                areMediaStoriesReadyToSend ? filesForSend : null,
                false
            );
        };
    }, [textStoryReadyToSend, areMediaStoriesReadyToSend]);

    // Handle incoming WebSocket messages related to stories
    function handleCommingWebSocketMessage(event) {
        const webSocketMessageData = JSON.parse(event.data);
        switch (webSocketMessageData.type) {
            case "new:stories":
                setShowProgressBar(false);
                break;
            case "stories:removed":
                setShowProgressBar(false);
                break;
            default:
                break;
        }
    };

    // Attach WebSocket event listener
    useEffect(() => {
        wbServer.addEventListener("message", handleCommingWebSocketMessage);
        return () => {
            wbServer.removeEventListener("message", handleCommingWebSocketMessage);
        };
    }, [wbServer, handleCommingWebSocketMessage]);

    // Automatically delete expired stories
    useEffect(() => {
        deleteExpiredStories();
    }, [allStoriesData]);

    // Hide story list if there are no stories
    useEffect(() => {
        if (filteredStoriesList(currentStoriesListSender, currentUserID).length == 0) {
            setShowStoriesList(false);
        };
    }, [allStoriesData])

    // Component to show thumbnail preview of text stories
    function TextStoryThumbnail({ text }) {
        const textDataArray = safeParseJSON(text);
        let bgInfo = textDataArray?.find(item => item?.bgInfo)?.bgInfo

        // Check for text and emoji presence
        const hasText = textDataArray.some(part => part.type === 'text');
        const hasEmoji = textDataArray.some(part => part.type === 'emoji');

        return (
            <div className='overflow-hidden w-full h-full' style={{
                background: bgInfo?.type == 'solid_color' ?
                    bgInfo?.background :
                    `url('/uploads/Story_bg/${bgInfo?.background}') no-repeat center center/cover`,
                color: `${bgInfo?.color}`,
                fontSize: '10px'
            }}>
                <div className='w-full h-full flex items-center justify-center'>
                    {hasText && !hasEmoji && (
                        textDataArray
                            .filter(part => part.type === 'text')
                            .map((part, partIdx) => (
                                partIdx == 0 &&
                                <span key={partIdx}>{part.value?.slice(0, 6)}...</span>
                            ))
                    )}
                    {hasEmoji && !hasText && (
                        textDataArray
                            .filter(part => part.type === 'emoji')
                            .map((part, partIdx) => (
                                partIdx <= 2 &&
                                <img className="w-5 h-5 inline-block" key={partIdx} src={part.url} alt={part.value} />
                            ))
                    )}
                    {hasText && hasEmoji && (
                        textDataArray
                            .filter(part => part.type === 'text')
                            .map((part, partIdx) => (
                                partIdx == 0 &&
                                <span key={partIdx}>{part.value?.slice(0, 6)}...</span>
                            ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            {
                // Rendering ChatForwarding panel if showChatForwardingPanel is true
                showChatForwardingPanel &&
                <ChatForwarding />
            }
            {
                // Rendering TextPanelForStory if showTextPanelForStory is true
                // Passing necessary props to manage its state and target story
                showTextPanelForStory &&
                <TextPanelForStory
                    setShowTextPanelForStory={setShowTextPanelForStory}
                    targetStoryForReplyOrEdit={targetStoryForReplyOrEdit}
                />
            }
            {
                // Rendering overlay for showing story receivers when showStoryReceivers is true
                showStoryReceivers &&
                <div className='overlay'>
                    <div style={{ backgroundColor: "rgb(245,247,251)" }} className={`${activeDarkMode ? "darkModeBg2" : ''} overlayInner h-full m-auto text-gray-900`}>
                        {/* Header Section with Back Arrow and Selected Count */}
                        <div className={`px-2 py-4 flex items-center justify-between`}>
                            <div className='flex justify-center items-center gap-x-2'>
                                {/* Back button to close overlay and reset selections */}
                                <BsArrowLeft className='cursor-pointer w-8 h-8'
                                    onClick={() => {
                                        setShowStoryReceivers(false);
                                        setSelectedUsers([]);
                                        setTargetStoryForReplyOrEdit(null);
                                    }}
                                />
                                <p className='text-xl font-semibold'>
                                    {
                                        // Showing either 'Select' or number of selected users
                                        selectedUsers?.length == 0 ?
                                            "Select"
                                            :
                                            selectedUsers?.length + " Selected"
                                    }
                                </p>
                            </div>
                            <div>
                                {
                                    // Check icon to confirm deletion if users are selected
                                    selectedUsers?.length != 0 &&
                                    <FaCheck className="text-2xl cursor-pointer" onClick={() => {
                                        deleteStories(
                                            [targetStoryForReplyOrEdit?.data],
                                            "some",
                                            selectedUsers
                                        );
                                        setShowProgressBar(true);
                                        setShowStoryReceivers(false);
                                        setSelectedUsers([]);
                                    }} />
                                }
                            </div>
                        </div>
                        {/* List of receivers to select/deselect for story action */}
                        <div className={`${activeDarkMode ? "darkModeBg2" : ''} w-full h-full overflow-y-auto`}>
                            {
                                // Mapping each receiver info to a clickable profile row
                                targetStoryForReplyOrEdit?.data?.receiversInfo?.map((receiverInfo, idx) => {
                                    return <div key={idx} onClick={() => {
                                        handleSelectedUsers(receiverInfo?.receiverID);
                                    }} className={`relative`}>
                                        {/* Each user profile as a button row */}
                                        <button className={`${activeDarkMode ? "darkModeBg1" : ''} profileTab flex items-center justify-start w-full border-b border-gray-200`}>
                                            <ProfileTab
                                                tabData={
                                                    {
                                                        ...getSingleUserData(receiverInfo?.receiverID),
                                                        tabName: getSingleUserData(receiverInfo?.receiverID)?.profileInfo?.name
                                                    }
                                                }
                                                currentUserID={currentUserID}
                                            />
                                        </button>
                                        {/* Checkmark indicator for selected users */}
                                        <div style={{
                                            display: selectedUsers?.includes(receiverInfo?.receiverID)
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
                            {
                                // Show this message if there are no receivers for the story
                                targetStoryForReplyOrEdit?.data?.receiversInfo?.length == 0 && <>
                                    <div className={`w-full h-full ${activeDarkMode ? "darkModeBg2" : ''}`}>
                                        <div className={`w-full h-full flex items-center justify-center`}>
                                            You have no receiver
                                        </div>
                                    </div>
                                </>
                            }
                        </div>
                    </div>
                </div>
            }
            {
                // Show loading animation when file is uploading or progress bar should be shown
                (isFileUploading || showProgressBar) &&
                <ProgressBar
                    position={'fixed'}
                />
            }

            {
                (!isFileUploading && !showProgressBar) &&
                <div className="relative h-full w-full">
                    {
                        // Conditional rendering: only render this block if showStoriesList is false
                        !showStoriesList &&
                        <>
                            {/* Menu bar section - start */}
                            <div className={`${activeDarkMode ? "darkModeBg2" : ''} text-gray-600 border-b border-gray-200 h-auto gap-x-4 h-12 w-full p-4`}>
                                <div className='flex flex-row items-center justify-between'>
                                    {/* Left section with title and back button */}
                                    <div className="flex items-center justify-center text-xl font-semibold">
                                        {/* Back button to go to recent chats section (hidden by default) */}
                                        <button onClick={() => {
                                            handleShowingSections(setShowRecentChatsSection);
                                        }} className='hidden hideStoriesButton'>
                                            <BsArrowLeft className='cursor-pointer w-6 h-6 mr-2' />
                                        </button>
                                        Story
                                    </div>
                                    {/* Right section with Add and Search buttons */}
                                    <div className="flex items-center gap-1">
                                        {/* Add new story button with dropdown options */}
                                        <button type="button" className={`inline-flex dropdownInRecentChats relative items-center justify-center h-9 w-9 transition duration-500 ease-in-out text-gray-600 focus:outline-none ${activeDarkMode ? "darkModeTextColor" : ''} showChildOnParentHover`}>
                                            <BsPlus className="w-7 h-7" />
                                            {/* Dropdown menu with Text and Photo/Video upload options */}
                                            <div style={{ top: "40px", right: "0px", transition: "0.3s", width: "175px", padding: '6px 0px' }} className={`showOnHover ${activeDarkMode ? "darkModeBg1" : ''} block absolute right-0 z-10 mt-0 w-auto origin-top-right rounded-md bg-white text-gray-600 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`} role="menu" aria-orientation="vertical" aria-labelledby="menu-button" tabIndex="-1">
                                                {/* Option to create a text story */}
                                                <div onClick={() => {
                                                    if (!showTextPanelForStory) {
                                                        setShowTextPanelForStory(true);
                                                    };
                                                    setShowChatBox(false);
                                                    setOpenedTabInfo({});
                                                }}>
                                                    <p className="text-left cursor-pointer block px-4 py-2 text-md"
                                                        role="menuitem" tabIndex="-1" id="menu-item-0" >Text</p>
                                                </div>
                                                {/* Option to upload media file as story */}
                                                <div>
                                                    <label type='button' className="text-left cursor-pointer block px-4 py-2 text-md" href="#">
                                                        <input
                                                            type='file'
                                                            className='hidden' // Hide the default file input UI
                                                            multiple
                                                            accept="image/*,video/*,audio/*" // Accept only image, video, and audio
                                                            onChange={(e) => {
                                                                handleFileUpload(
                                                                    e.target.files, // Pass event to handler
                                                                    "story" // Specify it's for story
                                                                );
                                                                e.target.value = ""; // Reset the input
                                                            }}
                                                        />
                                                        <p className="btn_name"
                                                            role="menuitem" tabIndex="-1" id="menu-item-0" >Photo & Video</p>
                                                    </label>
                                                </div>
                                            </div>
                                        </button>
                                        {/* Search button */}
                                        <button type="button" className={`inline-flex dropdownInRecentChats relative items-center justify-center h-9 w-9 transition duration-500 ease-in-out text-gray-600 focus:outline-none ${activeDarkMode ? "darkModeTextColor" : ''} showChildOnParentHover`}>
                                            <HiMagnifyingGlass className="w-6 h-6" onClick={() => {
                                                setShowSearchBox(!showSearchBox)
                                            }} />
                                        </button>
                                    </div>
                                </div>

                                {/* Search input box shown conditionally */}
                                {
                                    showSearchBox &&
                                    <div className="block mt-3 mb-4 mx-auto">
                                        <div className={`${activeDarkMode ? "darkModeBg1" : ''} relative flex items-center w-full h-10 rounded-lg bg-white overflow-hidden`}>
                                            {/* Back arrow inside search box */}
                                            <div className={`${activeDarkMode ? "darkModeBg1" : ''} grid bg-gray-200 place-items-center h-full w-12 text-gray-300`}>
                                                <BsArrowLeft className="w-6 h-6 cursor-pointer" onClick={() => {
                                                    setShowSearchBox(false)
                                                }} />
                                            </div>
                                            {/* Input field for search */}
                                            <div className="h-full w-full outline-none text-sm text-dark"
                                                id="search">
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
                                }

                                {/* Displaying 'My Story' if user has at least one story */}
                                {
                                    myStories?.length > 0 ?
                                        <div className="w-full" onClick={() => {
                                            setShowStoriesList(true);
                                            setShowChatBox(false);
                                            setCurrentStoriesListSender(currentUserID);
                                        }}>
                                            <div className='relative'>
                                                {/* Story preview button */}
                                                <button className={`no relative hover:bg-gray-100 flex flex-row w-full`}>
                                                    {/* Displaying latest story preview */}
                                                    <div className={`storyWatched p-0.5 flex items-center justify-center text-2xl rounded-full relative`}>
                                                        <span style={{
                                                            color: 'white',
                                                            width: '45px',
                                                            height: '45px',
                                                            fontWeight: '400',
                                                            borderRadius: '50%',
                                                        }} className='flex items-center justify-center overflow-hidden relative'>
                                                            {
                                                                // Show appropriate media type preview
                                                                myStories[myStories.length - 1]?.mediaFile?.fileType?.startsWith("image/") ?
                                                                    <img src={`${myStories[myStories.length - 1]?.mediaFile?.fileURL}`} alt="" className='rounded-full w-full h-full' /> :
                                                                    myStories[myStories.length - 1]?.mediaFile?.fileType?.startsWith("video/") ?
                                                                        <video src={`${myStories[myStories.length - 1]?.mediaFile?.fileURL}`} className='rounded-full w-full h-full' /> :
                                                                        <FontAwesomeIcon icon={iconMap?.[myStories[myStories.length - 1]?.mediaFile?.fileIcon]} className="text-gray-500" />
                                                            }
                                                            {
                                                                // If it's a text story, render its thumbnail
                                                                myStories[myStories.length - 1]?.storyType == 'text' &&
                                                                <TextStoryThumbnail text={myStories[myStories.length - 1]?.text} />
                                                            }
                                                        </span>
                                                    </div>
                                                    {/* Story details section */}
                                                    <div className="ml-2 text-left w-full">
                                                        <p className='flex justify-between items-center'>
                                                            <span className='text-lg font-semibold'>
                                                                My Story
                                                            </span>
                                                        </p>
                                                        <p className='text-md flex gap-x-1'>
                                                            {
                                                                myStories[myStories.length - 1]?.isFailed && <span className='text-red-500'>Failed</span>
                                                            }
                                                            {
                                                                myStories[myStories.length - 1]?.statusForSender == 'sending' && 'sending'
                                                            }
                                                            {
                                                                myStories[myStories.length - 1]?.statusForSender == 'sent' &&
                                                                formatStoryTime(
                                                                    myStories[myStories.length - 1]?.sentTime
                                                                )
                                                            }
                                                        </p>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                        :
                                        // If user has no story, show "Add story" option
                                        <div className='relative myStory mt-1'>
                                            <button className={`no relative hover:bg-gray-100 flex flex-row w-full items-center`}>
                                                {/* Avatar or first letter of user's name */}
                                                <div style={{
                                                    backgroundColor: currentUserData?.profileInfo?.profilePic == "" && currentUserData?.profileInfo?.bgColor
                                                }} className="user_avatar_box flex items-center justify-center text-2xl rounded-full relative">
                                                    {
                                                        currentUserData?.profileInfo?.profilePic ? (
                                                            <img
                                                                className="w-full h-full rounded-full"
                                                                src={`${currentUserData?.profileInfo?.profilePic}`}
                                                                alt="Profile"
                                                            />
                                                        ) : safeParseJSON(currentUserData?.profileInfo?.name)?.find(item => item?.type === 'text')?.value?.charAt(0)?.toUpperCase()
                                                    }
                                                </div>
                                                {/* Info text for adding a new story */}
                                                <div className="ml-2 text-left w-full profileTabInfo" style={{ width: "85%" }}>
                                                    <p className='flex justify-between items-center'>
                                                        <span className='text-md font-semibold'>
                                                            My Story
                                                        </span>
                                                    </p>
                                                    <p className='text-sm'>
                                                        Add story
                                                    </p>
                                                </div>
                                            </button>
                                        </div>
                                }
                            </div>
                            {/* Menu bar section - end */}
                        </>
                    }

                    {
                        // Mapping through each user's story array
                        !showStoriesList &&
                        (searchTerm == '' ? recentStoryTabs : searchedStoryTabs)?.map((storiesArrayOfSender, index) => {
                            // Check if there is any story in the array that has not been watched by the current user
                            let isNeedToWatchStory = storiesArrayOfSender?.filter((story) => {
                                const receiversInfo = story.receiversInfo;
                                return (
                                    receiversInfo?.some((receiverInfo) =>
                                        receiverInfo?.receiverID == currentUserID && receiverInfo?.seenTime == null
                                    )
                                )
                            });

                            return (
                                // Each user's story preview container
                                <div key={index} className="w-full py-2 px-3" onClick={() => {
                                    // On clicking the story, set the sender, open story list, and hide chat box
                                    setCurrentStoriesListSender(storiesArrayOfSender[0]?.senderID);
                                    setShowStoriesList(true);
                                    setShowChatBox(false);
                                }}>
                                    <div className='relative'>
                                        {/* Story preview button */}
                                        <button className={`no relative hover:bg-gray-100 flex flex-row w-full`}>
                                            <div className={`${isNeedToWatchStory?.length == 0 == true ?
                                                'storyWatched' : // If all stories are watched
                                                'needToWatchStory' // If there are unseen stories
                                                } p-0.5 flex items-center justify-center text-2xl rounded-full relative`}>
                                                <span style={{
                                                    color: 'white',
                                                    width: '45px',
                                                    height: '45px',
                                                    fontWeight: '400',
                                                    borderRadius: '50%',
                                                }} className='flex items-center justify-center overflow-hidden'>
                                                    {
                                                        // If the latest story is a media type (image/video/icon)
                                                        storiesArrayOfSender[storiesArrayOfSender.length - 1]?.storyType == 'media' ?
                                                            <>
                                                                {
                                                                    // If the file is image
                                                                    storiesArrayOfSender[storiesArrayOfSender.length - 1]?.mediaFile?.fileType?.startsWith("image/") ?
                                                                        <img src={`${storiesArrayOfSender[storiesArrayOfSender.length - 1]?.mediaFile?.fileURL}`} alt="" className='rounded-full w-full h-full' /> :
                                                                        // If the file is video
                                                                        storiesArrayOfSender[storiesArrayOfSender.length - 1]?.mediaFile?.fileType?.startsWith("video/") ?
                                                                            <video src={`${storiesArrayOfSender[storiesArrayOfSender.length - 1]?.mediaFile?.fileURL}`} className='rounded-full w-full h-full' /> :
                                                                            // For other media types, show icon
                                                                            <FontAwesomeIcon icon={iconMap?.[storiesArrayOfSender[storiesArrayOfSender.length - 1]?.mediaFile?.fileIcon]} className="text-gray-500" />
                                                                }
                                                            </>
                                                            :
                                                            // If the story is text type, show text story thumbnail
                                                            <TextStoryThumbnail text={storiesArrayOfSender[storiesArrayOfSender.length - 1]?.text} />
                                                    }
                                                </span>
                                            </div>
                                            <div className="ml-2 text-left w-full">
                                                {/* Display sender name with emoji handling */}
                                                <p className='text-lg font-semibold flex'>
                                                    <TextWithEmojis
                                                        hide={true}
                                                        textWidth={`auto`}
                                                        areaName={'tabInfo'}
                                                        textData={
                                                            getSingleUserData(
                                                                storiesArrayOfSender[storiesArrayOfSender.length - 1]?.senderID
                                                            )?.profileInfo?.name
                                                        }
                                                        isSearching={false}
                                                    />
                                                </p>
                                                {/* Show story time or "sending" or fail */}
                                                <p className='text-md flex gap-x-1'>
                                                    {
                                                        storiesArrayOfSender[storiesArrayOfSender.length - 1]?.isFailed && <span className='text-red-500'>Failed</span>
                                                    }
                                                    {
                                                        storiesArrayOfSender[storiesArrayOfSender.length - 1]?.statusForSender == 'sending' && 'sending'
                                                    }
                                                    {
                                                        storiesArrayOfSender[storiesArrayOfSender.length - 1]?.statusForSender == 'sent' &&
                                                        formatStoryTime(
                                                            storiesArrayOfSender[storiesArrayOfSender.length - 1]?.sentTime
                                                        )
                                                    }
                                                </p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    }
                    {
                        showStoriesList &&
                        <div className='w-full'>
                            {/* Header section with back button and title */}
                            <div className='p-2 pb-0 w-full flex items-center justify-between mb-2'>
                                <div className="flex items-center gap-x-2">
                                    {/* Back arrow icon to close the story list and reset states */}
                                    <BsArrowLeft
                                        onClick={() => {
                                            setShowStoriesList(false); // Hide story list view
                                            setCurrentStoriesListSender(null); // Reset selected story sender
                                            setShowStoriesList(false); // Redundant reset to false
                                            refereshStoriesSelecting(); // Refresh story selection state
                                        }}
                                        className='w-7 h-7 cursor-pointer text-gray-white' />

                                    {/* Display story title: either "My Story" or sender's name with emoji handling */}
                                    {
                                        !isStorySelecting ?
                                            <p className="text-xl">
                                                {
                                                    filteredStoriesList(currentStoriesListSender, currentUserID)[0]?.senderID == currentUserID ? "My Story"
                                                        :
                                                        <TextWithEmojis
                                                            hide={true}
                                                            textWidth={`auto`}
                                                            areaName={'tabInfo'}
                                                            textData={
                                                                getSingleUserData(
                                                                    filteredStoriesList(currentStoriesListSender, currentUserID)[0]?.senderID
                                                                )?.profileInfo?.name
                                                            }
                                                            isSearching={false}
                                                        />
                                                }
                                            </p>
                                            :
                                            // If in selection mode, show count of selected stories
                                            <div className='flex gap-x-1'>
                                                <BsArrowLeft className='cursor-pointer w-6 h-6' onClick={() => {
                                                    setIsStorySelecting(false);
                                                    setSelectedStories([]);
                                                }} />
                                                <span className='text-xl'>
                                                    {selectedStories.length} Selected
                                                </span>
                                            </div>
                                    }
                                </div>

                                {/* Action buttons shown only in selection mode */}
                                {
                                    isStorySelecting &&
                                    <div className='flex items-center gap-x-2'>

                                        {/* Check if all selected stories belong to current user */}
                                        {
                                            selectedStories?.every((storyInfo) => storyInfo?.senderID == currentUserID) &&
                                            <>

                                                {/* Forward selected stories */}
                                                <div className="flex items-center justify-center flex-col cursor-pointer" role="none" onClick={() => {
                                                    setShowChatForwardingPanel(true); // Show forward panel
                                                    setForwardingChats(
                                                        selectedStories?.map((story) => {
                                                            return {
                                                                chatType: story?.storyType == "media" ? "file" : "text", // Determine chat type
                                                                text: story?.text, // Text content
                                                                file: story?.mediaFile // Attached media file
                                                            }
                                                        })
                                                    );
                                                    setIsStorySelecting(false); // Exit selection mode
                                                    setSelectedStories([]); // Clear selected stories
                                                }}>
                                                    <HiOutlineArrowRight className='w-5 h-5' />
                                                    <p className="cursor-pointer block text-md">
                                                        Forward
                                                    </p>
                                                </div>

                                                {/* Delete selected stories */}
                                                <div className="flex items-center justify-center flex-col cursor-pointer" role="none"
                                                    onClick={() => {
                                                        deleteStories(
                                                            selectedStories,
                                                            "all",
                                                            null
                                                        );
                                                        setShowProgressBar(true); // Show progress bar after delete
                                                    }}>
                                                    <AiFillDelete className='w-5 h-5' />
                                                    <p className="cursor-pointer block text-md">Delete</p>
                                                </div>
                                            </>
                                        }

                                        {/* Download selected stories (option shown regardless of sender) */}
                                        <div className="flex items-center justify-center flex-col cursor-pointer" role="none"
                                            onClick={() => {
                                                for (const story of selectedStories) {
                                                    let fileData = story?.mediaFile;
                                                    saveAs(fileData.fileURL, fileData?.fileName);
                                                };
                                            }}>
                                            <HiOutlineDownload className='w-5 h-5' />
                                            <p className="cursor-pointer block text-md">Download</p>
                                        </div>
                                    </div>
                                }
                            </div>
                            {
                                // Map over all filtered stories to render each story in the list
                                filteredStoriesList(currentStoriesListSender, currentUserID).map((story, index) => {
                                    const receivers = story.receiversInfo; // Get the list of receivers for the current story

                                    return <div key={index} className={`relative py-1 w-full border-b border-gray-200 ${activeDarkMode ? "darkModeBg2" : ''}`}>

                                        {/* Container for the story item */}
                                        <div className={`px-2 relative w-full flex items-center justify-between`}>

                                            {/* Story button: click or long press actions */}
                                            <button
                                                onClick={() => {
                                                    // If not selecting stories, open full story view
                                                    if (!isStorySelecting) {
                                                        const previousStories = filteredStoriesList(currentStoriesListSender, currentUserID).filter((story, idx) => idx < index);
                                                        openFullStoriesView(previousStories, story); // Open full screen story view
                                                    } else {
                                                        handleStoriesSelection(story); // In selection mode, select or deselect story
                                                    };
                                                }}
                                                onTouchStart={(e) => {
                                                    handleHoldStart(story); // Start long-press (for mobile)
                                                }}
                                                onTouchEnd={(e) => {
                                                    handleHoldEnd(storyHoldingTimeoutRef); // End long-press
                                                }}
                                                onTouchCancel={(e) => {
                                                    handleHoldEnd(storyHoldingTimeoutRef); // Cancel long-press
                                                }}
                                                className={`no relative hover:bg-gray-100 flex flex-row w-full`}>

                                                {/* Avatar or thumbnail for the story */}
                                                <div className="p-0.5 user_avatar_box flex items-center justify-center text-2xl rounded-full relative">
                                                    <span style={{
                                                        color: 'white',
                                                        width: '45px',
                                                        height: '45px',
                                                        fontWeight: '400',
                                                        borderRadius: '50%'
                                                    }} className='flex items-center justify-center overflow-hidden'>
                                                        {
                                                            // If story type is media (image/video/file)
                                                            story?.storyType == 'media' ?
                                                                <>
                                                                    {
                                                                        // Render image or video preview
                                                                        story?.mediaFile?.fileType?.startsWith("image/") ?
                                                                            <img src={`${story?.mediaFile?.fileURL}`} alt="" className='rounded-full w-full h-full' /> :
                                                                            story?.mediaFile?.fileType?.startsWith("video/") ?
                                                                                <video src={`${story?.mediaFile?.fileURL}`} className='rounded-full w-full h-full' /> :
                                                                                // For other file types, use icon
                                                                                <FontAwesomeIcon icon={iconMap?.[story?.mediaFile?.fileIcon]} className="text-gray-500" />
                                                                    }
                                                                </>
                                                                :
                                                                // For text story, render text-based thumbnail
                                                                <TextStoryThumbnail text={story?.text} />
                                                        }
                                                    </span>
                                                </div>

                                                {/* Story metadata section */}
                                                <div className="ml-2 text-left w-full">
                                                    <p className='flex justify-between items-center'>
                                                        <span className='text-lg font-semibold'>
                                                            {
                                                                // Show number of views for own story or default label for others
                                                                story?.senderID == currentUserID ?
                                                                    receivers.filter((receiverID) => receiverID?.seenTime != null)?.length + ' Views'
                                                                    :
                                                                    `Story ${index + 1}`
                                                            }
                                                        </span>
                                                    </p>
                                                    <p className='text-md flex gap-x-1'>
                                                        {
                                                            story?.isFailed && <span className='text-red-500'>Failed</span>
                                                        }
                                                        {
                                                            story?.statusForSender == 'sending' && 'sending'
                                                        }
                                                        {
                                                            story?.statusForSender == 'sent' &&
                                                            formatStoryTime(
                                                                story?.sentTime
                                                            )
                                                        }
                                                    </p>
                                                </div>
                                            </button>

                                            {/* Dots menu shown if media story or own story */}
                                            {
                                                (
                                                    story?.storyType == "media"
                                                    ||
                                                    story?.senderID == currentUserID
                                                ) &&
                                                <button type="button" className="inline-flex relative items-center justify-center h-9 w-9 transition duration-500 ease-in-out text-gray-white focus:outline-none showChildOnParentHover">
                                                    <BiDotsVerticalRounded className="w-7 h-7" />

                                                    {/* Action menu dropdown */}
                                                    <div style={{ top: "40px", right: "0px", transition: "0.3s", width: "170px", padding: '6px 0px' }} className={`menuForMyStoryAction showOnHover ${activeDarkMode ? "darkModeBg1" : ''} block absolute right-0 z-10 mt-0 w-auto origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}>

                                                        {
                                                            // Actions available only if the story is user's own
                                                            story?.senderID == currentUserID &&
                                                            <>
                                                                {/* resend button if failed */}
                                                                {
                                                                    story?.isFailed &&
                                                                    <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none" onClick={() => {
                                                                        resendStory(story);
                                                                    }}>
                                                                        <p className="cursor-pointer text-gray-700 block text-md">Resend</p>
                                                                        <FaClockRotateLeft className='w-6 h-6 inline' strokeWidth={1} />
                                                                    </div>
                                                                }
                                                                {/* Edit story button */}
                                                                <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none" onClick={() => {
                                                                    if (story?.storyType == 'media') {
                                                                        setUploadedFiles([
                                                                            {
                                                                                fileID: story?.customID,
                                                                                fileData: null,
                                                                                editedFile: null,
                                                                                ...story?.mediaFile,
                                                                                sizeType: sizeMap?.[story?.mediaFile?.fileWidth],
                                                                                oldFilePublicId: story?.mediaFile?.publicId,
                                                                                coloursDataOnImage: [],
                                                                                emoji: [],
                                                                                rejection: null,
                                                                                isFileReEditing: true
                                                                            }
                                                                        ]);
                                                                        setIsFileUploading(true);
                                                                        setShowEditingPanel(true);
                                                                        setFileEditingFor('story');
                                                                    } else {
                                                                        setShowTextPanelForStory(true);
                                                                    };
                                                                    setTargetStoryForReplyOrEdit({ data: story, type: "edit" });
                                                                }}>
                                                                    <p className="cursor-pointer  block text-md">Edit</p>
                                                                    <HiPencilSquare className='w-5 h-5 ' />
                                                                </div>

                                                                {/* Forward story button */}
                                                                <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none" onClick={() => {
                                                                    setShowChatForwardingPanel(true);
                                                                    setForwardingChats([{
                                                                        chatType: story?.storyType == "media" ? "file" : "text",
                                                                        text: story?.text,
                                                                        file: story?.mediaFile
                                                                    }]);
                                                                    setTargetStoryForReplyOrEdit(null);
                                                                }}>
                                                                    <p className="cursor-pointer  block text-md">
                                                                        Forward
                                                                    </p>
                                                                    <HiOutlineArrowRight className='w-6 h-6 ' />
                                                                </div>

                                                                {/* Delete for specific people or show receiver list */}
                                                                {
                                                                    story?.receiversInfo?.length > 0 &&
                                                                    <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none" onClick={() => {
                                                                        setShowStoryReceivers(true);
                                                                        setTargetStoryForReplyOrEdit({ data: story, type: "delete" });
                                                                    }}>
                                                                        <p className="cursor-pointer  block text-md">Delete for</p>
                                                                        <AiFillDelete className='w-5 h-5 ' />
                                                                    </div>
                                                                }

                                                                {/* Delete story for all */}
                                                                <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none" onClick={() => {
                                                                    deleteStories([story], "all", null);
                                                                    setShowProgressBar(true); // Show progress
                                                                }}>
                                                                    <p className="cursor-pointer  block text-md">Delete for all</p>
                                                                    <AiFillDelete className='w-5 h-5 ' />
                                                                </div>
                                                            </>
                                                        }

                                                        {
                                                            // If story is media, allow download
                                                            story?.storyType == "media" &&
                                                            <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none" onClick={() => {
                                                                let fileData = story?.mediaFile;
                                                                saveAs(fileData.fileURL, fileData?.fileName);
                                                            }}>
                                                                <p className="cursor-pointer  block text-md">
                                                                    Download
                                                                </p>
                                                                <HiOutlineDownload className='w-6 h-6 ' />
                                                            </div>
                                                        }
                                                    </div>
                                                </button>
                                            }
                                        </div>

                                        {/* Selection check icon overlay if story is selected */}
                                        <div style={{ display: selectedStories?.some((prevStory) => prevStory?.customID == story?.customID) ? 'flex' : 'none' }}
                                            className="selecting flex items-center justify-between"
                                            onClick={() => {
                                                handleStoriesSelection(story); // Toggle selection
                                            }}
                                        >
                                            <div className='selectingIcon'>
                                                <FaCheck className='w-4 h-4' />
                                            </div>
                                        </div>
                                    </div>
                                })
                            }
                        </div>
                    }
                </div>
            }
            {
                // Conditionally render the StoryView component if 'showStoryView' is true
                showStoryView &&
                <StoryView
                    // Pass the sender of the story to be viewed
                    storySender={storySender}
                    // Function to update the story sender
                    setStorySender={setStorySender}
                    // Function to hide StoryView
                    setShowStoryView={setShowStoryView}
                    // Function to show progress bar during some story action (e.g., deletion)
                    setShowProgressBar={setShowProgressBar}

                    // Function to control visibility of story receivers panel
                    setShowStoryReceivers={setShowStoryReceivers}

                    // Function to open text panel for editing or replying to a story
                    setShowTextPanelForStory={setShowTextPanelForStory}

                    // Function to set the target story for reply or edit
                    setTargetStoryForReplyOrEdit={setTargetStoryForReplyOrEdit}
                />
            }
            {/* ToastContainer for showing notifications */}
            <ToastContainer />
        </>
    )
}

export default Stories;
