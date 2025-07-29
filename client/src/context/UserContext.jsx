import { createContext, useEffect, useState, useRef } from 'react'
export const UserContext = createContext();
import moment from 'moment';
import {
    userProfile,
    fetchUsersData,
    fetchCallsData,
    fetchStoriesData,
    fetchGroupsData,
    fetchChatBroadcastsData,
    updateUserData,
    createChat,
    updateChatData,
    fetchChatsData,
    userLogout
} from "@api";
import { peer } from "@utils";
import { useNavigate } from 'react-router-dom';
import GraphemeSplitter from 'grapheme-splitter';
function UserContextProvider({ children }) {
    const [wbServer, setWbServer] = useState(null); // WebSocket server instance state
    const [currentUserID, setCurrentUserID] = useState(null); // Current logged-in user's ID state
    const isEmailVerifying = useRef(false); // Ref to track email verification process (mutable but no re-render)
    const [allChatsData, setAllChatsData] = useState([]); // Array state to store all chat data
    const [needToPrepareSystemChat, setNeedToPrepareSystemChat] = useState(false); // Flag to prepare system chats
    const [allCallsData, setAllCallsData] = useState([]); // Array state to store all call data
    const [allStoriesData, setAllStoriesData] = useState([]); // Array state to store all stories data
    const [allUsersData, setAllUsersData] = useState([]); // Array state to store all user data
    const [allGroupsData, setAllGroupsData] = useState([]); // Array state to store all group data
    const [allChatBroadcastData, setAllChatBroadcastData] = useState([]); // Array state for broadcast chats
    const [showLoading, setShowLoading] = useState(true); // Show loading spinner by default on load
    const [usersDataLoaded, setUsersDataLoaded] = useState(false); // Flag if user data finished loading
    const [chatsDataLoaded, setChatsDataLoaded] = useState(false); // Flag if chat data finished loading
    const [groupsDataLoaded, setGroupsDataLoaded] = useState(false); // Flag if group data finished loading
    const [broadcastsDataLoaded, setBroadcastsDataLoaded] = useState(false); // Flag if broadcasts data loaded
    const [openedTabInfo, setOpenedTabInfo] = useState(null); // Object storing info about currently opened tab
    const [showProfileInfo, setShowProfileInfo] = useState(false); // Boolean to toggle user profile info panel visibility
    const [showChatBox, setShowChatBox] = useState(false); // Boolean to toggle chat box UI visibility
    const [showFileChatsInCarousel, setShowFileChatsInCarousel] = useState(false); // for showing file chats in carousel
    const [openedFileChatData, setOpenedFileChatData] = useState(null); // for showing file chats in carousel
    const [isVoiceRecording, setIsVoiceRecording] = useState(false); // Flag to indicate if voice recording is active
    const isVoiceRecordingCancelledRef = useRef(false); // Ref to track if voice recording was cancelled without re-render
    const [showStoryView, setShowStoryView] = useState(false); // Flag to show/hide story viewing UI
    // Voice and video calling data, includes callID, caller, callee, status, offer, etc.
    const [currentCallData, setCurrentCallData] = useState(null);
    // Section visibility states for different UI parts
    const [showRecentChatsSection, setShowRecentChatsSection] = useState(true); // Show recent chats by default
    const [showContactListSection, setShowContactListSection] = useState(false);
    const [showCallsSection, setShowCallsSection] = useState(false);
    const [showStoriesSection, setShowStoriesSection] = useState(false);
    const [showSettingsSection, setShowSettingsSection] = useState(false);
    const [showGroupCreationPanel, setShowGroupCreationPanel] = useState(false);
    const [showBroadcastCreationPanel, setShowBroadcastCreationPanel] = useState(false);
    const [selectedUsersForGroupOrBroadcast, setSelectedUsersForGroupOrBroadcast] = useState([]); // Selected users for creating group or broadcast
    const [showProgressBar, setShowProgressBar] = useState(false); // Show progress bar during async operations like group/broadcast creation
    const [showProfileEditingPanel, setShowProfileEditingPanel] = useState(false); // Show profile editing panel
    const [editedProfileImgInfo, setEditedProfileImgInfo] = useState(null); // Edited profile image info, usable for user, group, or broadcast profile
    let allSections = [
        setShowRecentChatsSection, setShowCallsSection, setShowGroupCreationPanel, setShowBroadcastCreationPanel, setShowStoriesSection, setShowSettingsSection, setShowContactListSection
    ];
    // Helper to toggle visibility: hides all sections except the one passed as activeSetter
    function handleShowingSections(activeSetter) {
        allSections.forEach(setState => setState(false)); // Hide all sections
        activeSetter(true); // Show only the active section
        // Delete expired chats and stories from local or server
        deleteExpiredChats(); // delete expired chats
        deleteExpiredStories(); // delete expired stories
    };
    // File uploading related state variables - start
    const [isFileUploading, setIsFileUploading] = useState(null); // Flag for file uploading in progress
    const [uploadedFiles, setUploadedFiles] = useState([]); // Array to hold uploaded files
    const [showEditingPanel, setShowEditingPanel] = useState(false); // Show/hide file editing panel
    const [fileEditingFor, setFileEditingFor] = useState(null); // Context of file editing (chats or stories)
    const [areChatsFilesReadyToSend, setAreChatsFilesReadyToSend] = useState(false); // Track if chat files are ready to send
    const [areMediaStoriesReadyToSend, setAreMediaStoriesReadyToSend] = useState(false); // Track if media stories are ready to send
    const [filesForSend, setFilesForSend] = useState([]); // Files queued for sending
    const [textStoryReadyToSend, setTextStoryReadyToSend] = useState(null); // Text story content ready for sending
    const [storyForDirectDisplay, setStoryForDirectDisplay] = useState(null); // Story data for immediate display
    // File uploading related state variables - end
    // Chat or story forwarding state variables - start
    const [showChatForwardingPanel, setShowChatForwardingPanel] = useState(false); // Show/hide chat forwarding panel
    const [forwardingChats, setForwardingChats] = useState([]); // Chats currently selected for forwarding
    // Chat or story forwarding state variables - end
    const [activeDarkMode, setActiveDarkMode] = useState(false); // Toggle for dark mode UI
    const navigate = useNavigate(); // React Router's navigation hook to change pages

    // Connect to WebSocket server and set up event handlers
    function connectToWs() {
        // const ws = new WebSocket("ws://localhost:3030") // Connect to WebSocket server
        // const ws = new WebSocket(`ws://${import.meta.env.VITE_API_URL}`)
        // const ws = new WebSocket(import.meta.env.VITE_API_URL.replace("https", "wss"))
        const ws = new WebSocket(
            import.meta.env.DEV
                ? "ws://localhost:3030"
                : `${import.meta.env.VITE_API_URL.replace("https", "wss")}`
        );
        setWbServer(ws); // Save WebSocket instance in state
        ws.addEventListener("message", handleCommingWebSocketMessage); // Listen for incoming messages
        ws.onopen = () => {
            console.log('WebSocket is open now.'); // Log connection success
            setWbServer(ws); // Update state with WebSocket instance
        };
        ws.onerror = (error) => {
            console.error('WebSocket error:', error); // Log errors
        };
        ws.addEventListener("close", () => {
            console.log('WebSocket is closed now.'); // Log when connection closes
            setTimeout(() => {
                connectToWs() // Reconnect after 500ms delay
            }, 500)
        });
    };
    // Run WebSocket connect function on component mount
    useEffect(() => {
        connectToWs()
    }, []);

    let aiAssistant = {
        _id: "683008d58200d47fd4987a86",
        profileInfo: {
            name: JSON.stringify([{ type: 'text', value: "My AI" }]),
            bgColor: "green",
            profilePic: "https://res.cloudinary.com/dn0hsbnpl/image/upload/v1748934167/chat_uploads/AI%20Assitant.png",
            activeStatus: "",
            description: JSON.stringify([{ type: 'text', value: "I'm an AI assistant that helps you with your queries." }]),
        },
        isDeleted: false
    };
    // Dummy data for deleted user fallback
    let deletedUserDummyData = {
        profileInfo: {
            name: JSON.stringify([{ type: 'text', value: "Deleted Account" }]),
            bgColor: "red",
            profilePic: "",
            activeStatus: ""
        },
        isDeleted: true
    };
    // Get user data by ID or return dummy if not found
    let getSingleUserData = (userID) => (allUsersData?.find((userData) => userData?._id == userID) || { ...deletedUserDummyData, _id: userID });
    let currentUserData = getSingleUserData(currentUserID); // Current logged-in user data

    // Get value of a cookie by name
    function getCookies(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    };

    // Dummy data for deleted group fallback
    let deletedGroupDummyData = {
        profileInfo: {
            name: JSON.stringify([{ type: 'text', value: "Deleted Group" }]),
            bgColor: "red",
            profilePic: ""
        },
        isDeleted: true
    };
    // Get group data by ID or return dummy if not found
    let getSingleGroupData = (groupID) => (allGroupsData?.find((groupData) => groupData?._id == groupID) || { ...deletedGroupDummyData, _id: groupID });
    // Dummy data for deleted braodcast fallback
    let deletedBroadcastDummyData = {
        profileInfo: {
            name: JSON.stringify([{ type: 'text', value: "Deleted Broadcast" }]),
            bgColor: "red",
            profilePic: "",
            activeStatus: ""
        },
        isDeleted: true
    };
    // Get broadcast data by ID
    let getSingleBroadcastData = (broadcastID) => (allChatBroadcastData?.find((broadcast) => broadcast?._id == broadcastID) || { ...deletedBroadcastDummyData, _id: broadcastID });

    // Get chat data by custom chat ID
    let getSingleChatData = (chatID) => (allChatsData?.find((chatData) => chatData?.customID == chatID));

    // Get call data by custom call ID
    let getSingleCallData = (callID) => (allCallsData?.find((callData) => callData?.customID == callID));

    // Get story data by custom story ID
    let getSingleStoryData = (storyID) => (allStoriesData?.find((storyData) => storyData?.customID == storyID));

    // utilities - start
    // Predefined set of colors for user/group/broadcast display avatars or labels
    const colors = [
        "#FF5733", "#33FF57", "#3357FF", "#FF33A5", "#FFB833",
        "#8D33FF", "#33FFEC", "#FF5733", "#33FFA5", "#FFA533",
        "#6A0DAD", "#0D98BA", "#F4C430", "#F28E1C", "#FF8C00",
        "#4682B4", "#C71585", "#808000", "#FF69B4", "#00BFFF",
        "#FFD700", "#DA70D6", "#7FFFD4", "#DC143C", "#98FB98",
        "#AFEEEE", "#FF4500", "#32CD32", "#8B4513", "#9400D3"
    ];
    // Get a color based on the first letter of a name string
    function getColorForName(name) {
        if (!name) return colors[0]; // Default color if name is empty
        const colorIndex = stringToColorIndex(name);
        return colors[colorIndex];
    };
    // Hash function to generate color index based on string input
    function stringToColorIndex(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash % colors.length);
    };
    // Safe JSON parser that returns empty array if parsing fails
    const safeParseJSON = (value, fallback = []) => {
        try {
            return typeof value === "string" ? JSON.parse(value) : value;
        } catch (e) {
            return fallback;
        }
    };
    // Highlight matched search terms in chat messages or names
    const highlightText = (data, term) => {
        const normalizeSpaces = (str) => str.replace(/\s+/g, ' ').trim();
        if (!term) return data; // No search term, return original data
        let normalizedTerm = normalizeSpaces(term);
        let combinedText = normalizeSpaces(data?.map(item => (item?.type === "text" || item?.type === "emoji") ? item?.value : "")?.join(" "));
        // Create regex for search term, matching case-insensitive
        const regex = new RegExp(`(${normalizedTerm})`, 'gi');
        // Split combined text into parts for highlighting
        let parts = combinedText.split(regex);
        let newData = data.map((item) => {
            if (item?.type === "text") {
                // Map parts to highlight matching segments
                return parts?.filter((part) => part != '')?.map((part) => {
                    return {
                        type: "text",
                        value: part,
                        highlight: part.trim().toLowerCase() === term.toLowerCase(), // Mark matching text
                    }
                });
            }
            return item; // Keep non-text elements unchanged
        }).flat(); // Flatten nested arrays to a single array
        return newData;
    };
    // Generate a unique ID for entities like users, chats, groups, broadcasts
    function generateUniqueID(forThe) {
        // "forThe" describes the entity type for ID (user, chat, etc.)
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const randomString = Array.from({ length: 8 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length))
        ).join('');
        return `${forThe}${Date.now()}${randomString}`;
    };
    //function to update inputRef's status with true and false
    const checkIsTyping = (node = inputRef.current) => {
        // Ensure we are dealing with a valid DOM node
        if (!node || !node.current) return false;
        node = node.current; // Extract the actual DOM element from the ref
        // Check if text is present
        if (node.innerText.trim().length > 0) {
            return true;
        }
        // Check if it contains any image (emoji)
        if (node.querySelector("img")) {
            return true;
        }
        return false;
    };

    // function to replace unicode emojies with real emojies (img), and update text direction based on the character
    const splitter = new GraphemeSplitter();
    function handleInputDirection(e, inputRef, setInputEmpty, limit, newLine) {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const inputField = inputRef?.current;
        let inputText = e.target.textContent;
        // Split input text into grapheme clusters (characters + combined emoji parts)
        const graphemes = splitter.splitGraphemes(inputText);
        // The following commented block was intended to replace emoji text with emoji images
        e.target.setAttribute(
            'dir',
            /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(e.target.textContent.charAt(0))
                ? 'rtl'
                : 'ltr'
        );
        // Update state to indicate whether input is empty or contains text/images
        setInputEmpty(checkIsTyping(inputRef));
        // handle typing limitation
        // Count emojis and new lines in input field for length calculation
        let insertedEmojis = inputField.querySelectorAll(".emoji_img") || []; // Ensure it returns a list
        // Calculate total length considering graphemes, emojis (counted as 2 chars), and optional new line weight
        // let totalLength = graphemes.length + (insertedEmojis.length * 2 /*multiply to 2 as the each emoji has place of two char*/) + (newLineLimit ? (newLines.length * 24) : 0); // Count text + insertedEmojis
        let totalLength = graphemes.length + (insertedEmojis.length * 2 /*multiply to 2 as the each emoji has place of two char*/); // Count text + insertedEmojis
        // Prevent exceeding the limit (except on backspace)
        if (totalLength > limit && e.key !== "Backspace") {
            e.preventDefault(); // Stop further input
            return;
        };
        // Prevent new line if:
        // 1. newLine is false
        // 2. Input field height reaches 200px
        // Prevent new line if newLine is false
        if (!newLine && e.key === "Enter") {
            e.preventDefault();
        }
        // The following commented block is an alternative new line prevention method based on height
    };

    // Function to insert emojis into the input field
    function insertEmojiIntoInputField(emojiInfo, inputRef) {
        let { emojiUrl, emojiUnicode } = emojiInfo;
        // Create an image element for the emoji with proper attributes and styles
        const emojiImg = document.createElement("img");
        emojiImg.style.display = "inline-block";
        emojiImg.contentEditable = "false";
        emojiImg.setAttribute("src", emojiUrl);
        emojiImg.setAttribute("alt", emojiUnicode);
        emojiImg.setAttribute("class", "not_prevent_select emoji_img");

        // Get the current selection and create a range if none exists
        const selection = document.getSelection();
        if (!selection.rangeCount) {
            const range = document.createRange();
            range.setStart(inputRef.current, 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }

        const range = selection.getRangeAt(0);
        if (selection.rangeCount > 0) {
            let currentNode = range.commonAncestorContainer;

            // Traverse up the DOM tree to check if inputRef.current exists in the hierarchy
            while (currentNode) {
                if (currentNode === inputRef.current) {

                    // Insert emoji image at cursor position
                    range.insertNode(emojiImg);
                    // Move cursor to after inserted emoji
                    range.setStartAfter(emojiImg);
                    range.setEndAfter(emojiImg);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    return; // Exit once a valid parent is found
                }
                currentNode = currentNode.parentNode; // Move up to the next parent
            }
        }
    };

    // Function to print styled text and emojis in the input field from a parsed JSON array
    function printTextIn_InputField(inputRef, text) {
        const textDataArray = safeParseJSON(text);
        // Function to apply styles based on the format array of each text segment
        function applyFormatting(value, format) {
            if (!format || format.length === 0) {
                // Wrap in a span if no format is provided
                return `<span>${value}</span>`;
            }

            if (format.includes("bold")) value = `<b>${value}</b>`;
            if (format.includes("italic")) value = `<i>${value}</i>`;
            if (format.includes("underline")) value = `<u>${value}</u>`;
            if (format.includes("strikethrough")) value = `<s>${value}</s>`;
            if (format.includes("unordered-list")) value = `<ul><li>${value}</li></ul>`;

            return value;
        };
        // Apply data into the DOM using document methods only if input field is empty
        const editableDiv = inputRef.current;
        editableDiv.innerHTML = '';
        if (editableDiv.innerHTML == '') {
            textDataArray.forEach(item => {
                if (item.type === "text") {
                    let content = applyFormatting(item.value, item.format);
                    editableDiv.innerHTML += content;
                } else if (item.type === "newline") {
                    editableDiv.innerHTML += "<br />";
                } else if (item.type === "emoji") {
                    editableDiv.innerHTML += `<img class="inline-block not_prevent_select emoji_img" src="${item.url}" alt="${item.value}"/>`;
                }
            });
        };
    };

    // function to handle image uploading for user or group, broadcast profile
    const handlePictureUpload = async (e, setProfilePicInfo, setShowProfileEditingPanel) => {
        //calculating image dimension difference, square, wide, moderate, tall - start
        const sizes = {
            square: 350,
            wide: 650,
            moderate: 450,
            tall: 220,
            miniTall: 180,
            mini2Tall: 110,
        };
        // Determine new width based on original width and height with predefined categories
        function getNewWidth(width, height) {
            let newWidth;
            if (width === height) {
                newWidth = sizes.square; // Handles square
            } else if (width > height * 1.75) {
                newWidth = sizes.wide; // Handles very wide images
            } else if (width > height) {
                newWidth = sizes.moderate; // Handles moderately wide images
            } else if (height > width * 3.5) {
                newWidth = sizes?.mini2Tall; // Handles tall images
            } else if (height > width * 3) {
                newWidth = sizes?.miniTall; // Handles tall images
            } else if (height > width) {
                newWidth = sizes?.tall; // Handles tall images
            };
            return newWidth;
        };
        const allowedType = "image"; // Allowed type
        const maxFileSize = 10 * 1024 * 1024; // 10 MB in bytes
        const file = e.target.files[0];
        if (file) {
            let fileURL = URL.createObjectURL(file);
            const fileType = file.type.split("/")[0]; // Get the type category
            // Validate file type
            if (fileType != allowedType) {
                setProfilePicInfo({
                    rejection: {
                        rejectType: 'type',
                        msg: 'Unsupported file type.'
                    }
                });
                return;
            };

            // Validate file size
            if (file.size > maxFileSize) {
                setProfilePicInfo({
                    rejection: {
                        rejectType: 'size',
                        msg: '"Your file is rejected due to size exceeding 10MB."'
                    }
                });
                return;
            };

            // If file is valid, load image and set profile pic info accordingly
            if (fileType == allowedType && file.size <= maxFileSize && fileURL) {
                const img = new Image();
                img.src = fileURL;
                img.onload = () => {
                    let { width, height } = img;
                    // Get the new width and size type
                    setProfilePicInfo(
                        {
                            fileData: file,
                            fileType: file.type,
                            fileName: file.name,
                            fileURL: URL.createObjectURL(file),
                            fileWidth: getNewWidth(width, height),
                            rejection: null,
                            isCropped: false
                        }
                    );
                    setShowProfileEditingPanel(true);
                };
            };
        };
    };

    // Function to handle file uploading for chat and story
    function handleFileUpload(files, useFor) {
        // Allowed file type categories for different upload scenarios
        const allowedTypes = ["image", "video", "audio"]; // Only media files allowed for stories
        const maxFileSize = 10 * 1024 * 1024; // 10 MB in bytes
        const maxVideoDuration = 5 * 60; // 5 minutes in seconds

        // Convert FileList to an array for easier handling
        const multipleFiles = Array.from(files);

        // Set the condition for file uploading
        setFileEditingFor(useFor);

        // Track processed files count
        let processedFilesCount = 0;

        // Iterate over each selected file
        multipleFiles.forEach((file) => {
            if (file) {
                const fileType = file.type.split("/")[0]; // Get the file category (e.g., "image", "video", "audio")

                // **Validation
                if (!allowedTypes.includes(fileType)) {
                    addRejectedFile(file, "type", "Unsupported file type. Only images, videos, and audio are allowed.");
                    incrementAndCheckCompletion();
                    return;
                }

                // **File size validation (applies to all uploads)**
                if (file.size > maxFileSize) {
                    addRejectedFile(file, "size", "Your file is rejected due to size exceeding 50MB.");
                    incrementAndCheckCompletion();
                    return;
                }

                // **Video duration validation (only for video files)**
                if (fileType === "video") {
                    const videoElement = document.createElement("video");
                    videoElement.src = URL.createObjectURL(file);

                    videoElement.onloadedmetadata = () => {
                        if (videoElement.duration > maxVideoDuration) {
                            addRejectedFile(file, "duration", "Your video is rejected due to duration exceeding 5 minutes.");
                        } else {
                            addFileToState(file);
                        }
                        incrementAndCheckCompletion();
                    };
                } else {
                    // **Directly add image, audio
                    addFileToState(file);
                    incrementAndCheckCompletion();
                };
            }
        });

        // Function to add an accepted file to the state
        function addFileToState(file) {
            setUploadedFiles((prevFiles) => [
                ...prevFiles,
                {
                    fileID: generateUniqueID("FILE"),
                    fileData: file,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    fileURL: URL.createObjectURL(file),
                    editedFile: null,
                    coloursDataOnImage: [],
                    emoji: [],
                    fileWidth: null,
                    fileHeight: null,
                    fileDuration: null, // Duration for video files
                    rejection: null
                }
            ]);
        }

        // Function to add a rejected file to the state
        function addRejectedFile(file, rejectType, msg) {
            setUploadedFiles((prevFiles) => [
                ...prevFiles,
                {
                    fileID: generateUniqueID(),
                    rejection: {
                        rejectType,
                        msg
                    }
                }
            ]);
        }

        // Function to track the completion of processing all selected files
        function incrementAndCheckCompletion() {
            processedFilesCount++;
            // When all files processed, show editing panel and mark uploading state
            if (processedFilesCount === multipleFiles.length) {
                setShowEditingPanel(true);
                setIsFileUploading(true);
            }
        };
    };
    // Function to format chat timestamp into a user-friendly date or time
    function formatTimestamp(time) {
        return moment().isSame(moment(time), 'day')
            ? // If the chat time is from today, show time in hh:mm AM/PM format
            moment(time).format('hh:mm a')
            :
            moment().subtract(1, 'days').isSame(moment(time), 'day')
                ? // If the chat time is from yesterday, return "Yesterday"
                "Yesterday"
                :
                moment().isSame(moment(time), 'week')
                    ? // If the chat is within the current week, return the day name (e.g., Monday, Tuesday)
                    moment(time).format('dddd')
                    :
                    // If the chat is older than a week, show the full date in DD/MM/YYYY format
                    moment(time).format('DD/MM/YYYY');
    };
    // Function to hide the file editing panel and reset states
    function hideFileEditingPanel() {
        setShowEditingPanel(false); // Hide the editing panel UI
        setUploadedFiles([]); // Clear uploaded files state
        setFilesForSend([]); // Clear files prepared for sending
        setIsFileUploading(false); // Reset uploading flag
        setFileEditingFor(null); // Reset editing target
        setAreChatsFilesReadyToSend(false); // Reset chat files ready flag
        setAreMediaStoriesReadyToSend(false); // Reset media stories ready flag
        setTextStoryReadyToSend(null); // Reset text story ready state
    };
    const chatBoxRef = useRef(null); // Reference to the chat box DOM element
    const chatBoxEndRef = useRef(null);
    //update user's data in database
    function updateUserDataInDatabase(filterCondition, updateOperation) {
        updateUserData({ filterCondition, updateOperation }) // Call API to update user data
            .then((response) => {
                setNeedToPrepareSystemChat(true); // Trigger system chat preparation after update
            })
            .catch((err) => {
                console.log(err) // Log any error occurred during update
            });
    };
    //update chat's data in database
    function updateChatDataInDatabase(chatsForUpdation) {
        updateChatData({ chatsForUpdation }) // Call API to update chat data
            .then((response) => {
                console.log(response?.data); // (Commented) Optionally log success response
            })
            .catch((err) => {
                console.log(err) // Log any error occurred during update
            });
    };
    //sendWebSocketMessage to send the socket message containing the (chat, story, call, user update,group update etc.)
    function sendWebSocketMessage(sendingType, typeName, sendingData) {
        const message = JSON.stringify({
            type: sendingType, // Type of message being sent
            [typeName]: sendingData, // Data payload under dynamic key
        });

        const sendMessage = () => wbServer.send(message); // Function to send message over websocket

        if (wbServer.readyState === WebSocket.OPEN) {
            sendMessage(); // If socket is open, send immediately
        } else if (wbServer.readyState === WebSocket.CONNECTING) {
            wbServer.addEventListener('open', sendMessage, { once: true }); // Wait for socket open event, then send
        } else {
            console.warn("WebSocket is not in a state to send messages."); // Warn if socket cannot send
        };
    };
    // users ralted - start
    // function to check if the current user is logged in or not
    function checkUserLoggedIn() {
        userProfile()
            .then((response) => {
                //if currentUserID exist, navigate to the home page
                if (response?.data?.currentUserID) {
                    setCurrentUserID(response?.data?.currentUserID);
                    navigate("/") //navigate to the home page
                };
            })
            .catch((error) => {
                if (!isEmailVerifying.current) {
                    navigate("/auth/login") //navigate to the login page
                    console.log(error?.response?.data?.error)
                    setCurrentUserID(null)
                };
            })
    };
    useEffect(() => {
        checkUserLoggedIn();
    }, []);
    //function to add new tab or update the old tab in my recentChatsTabs
    async function addOrUpdateRecentTab(tabInfo, updatingField) {
        let currentUserIDClone = currentUserID || getCookies("currentUserID");
        let { tabID } = tabInfo;
        setAllUsersData((prevUsersData) => {
            return prevUsersData?.map((userData) => {
                // find current user's data to update recentChatsTabs
                if (userData?._id === currentUserIDClone) {
                    let tabExists = userData?.recentChatsTabs?.find(tab => tab.tabID === tabID);
                    // If tab exists, update it both on client and server
                    if (tabExists) {
                        let updatedTabInfo = {
                            ...tabExists,
                            ...updatingField
                        };
                        // Client-side update
                        const updatedUserData = {
                            ...userData,
                            recentChatsTabs: userData?.recentChatsTabs?.map(tab =>
                                tab.tabID === tabID ? { ...tab, ...updatedTabInfo } : tab
                            )
                        };
                        // Server-side update
                        const filterCondition = {
                            _id: currentUserIDClone,
                            "recentChatsTabs.tabID": tabID
                        };

                        const updateOperation = {
                            $set: {
                                "recentChatsTabs.$": updatedTabInfo
                            }
                        };
                        updateUserDataInDatabase(filterCondition, updateOperation);

                        return updatedUserData;
                    } else if (tabID && tabInfo?.recentTime != '') {
                        // If tab doesn't exist, add it on client only
                        return {
                            ...userData,
                            recentChatsTabs: [...(userData?.recentChatsTabs || []), tabInfo]
                        }
                    }
                    return userData;
                }

                return userData;
            });
        });
        deleteExpiredChats(); // delete expired chats
        deleteExpiredStories(); // delete expired stories
    };
    // prepare data and send websocket message to update user profile info
    function prepareUserProfileInfoUpdating(updatingDataKey, updatingValue) {
        let visibilityKey = `${updatingDataKey}Visibility`; //aboutVisibility
        let actionedToKey = `${updatingDataKey}ActionedTo` //aboutActionedTo
        // get background color for name if updating name
        let bgColor = updatingDataKey == "name" && getColorForName(updatingValue?.map(g => g.type == 'text' ? g?.value : [])?.join(' '));
        // send websocket message to update the user dataz
        sendWebSocketMessage(
            "user:profileInfo:change",
            "newProfileInfo",
            {
                currentUserID,
                visibilityKey,
                actionedToKey,
                updatingDataKey,
                updatingValue: updatingDataKey == "profilePic" ? updatingValue : {
                    ...(
                        updatingDataKey == "name" ? { name: JSON.stringify(updatingValue), bgColor }
                            :
                            { about: updatingValue }
                    )
                },
            }
        );
    };
    // function to update user's profile info locally in allUsersData state
    function handleChangeUserPorfileInfo(newProfileInfo) {
        let { userID, updatingData } = newProfileInfo;
        // userID is the id of the user whose profile info is being changed
        setAllUsersData((prevUsersData) =>
            prevUsersData?.map((userData) => {
                if (userData?._id === userID) {
                    return {
                        ...userData,
                        profileInfo: {
                            ...userData?.profileInfo,
                            ...updatingData
                        }
                    };
                }
                return userData;
            })
        );
    };
    // function to change user's email 
    function handleChangeUserEmail(emailInfo) {
        let { userID, email } = emailInfo;
        // userID is the id of the user whose email is being changed
        setAllUsersData((prevUsersData) =>
            prevUsersData?.map((userData) => {
                if (userData?._id === userID) {
                    return {
                        ...userData,
                        email
                    };
                }
                return userData;
            })
        );
    };
    // function to get connection status between current user and specified userID
    function getUserConnectionStatus(userID) {
        // check if connection exists in current user's connections list
        let userConnectionExist = currentUserData?.connections?.find((connectionInfo) =>
            connectionInfo?.initiaterUserID == userID || connectionInfo?.targetUserID == userID
        );
        // check if connection is pending
        let userConnectionPending = currentUserData?.connections?.find((connectionInfo) =>
            (connectionInfo?.initiaterUserID == userID || connectionInfo?.targetUserID == userID)
            && connectionInfo?.status == "pending"
        );
        // check if connection is accepted
        let userConnectionAccepted = currentUserData?.connections?.find((connectionInfo) =>
            (connectionInfo?.initiaterUserID == userID || connectionInfo?.targetUserID == userID)
            && connectionInfo?.status == "accepted"
        );
        if (userConnectionExist == null) {
            return { condition: "not_exist", result: null }
        } else if (userConnectionPending) {
            return { condition: "pending", result: userConnectionPending }
        } else if (userConnectionAccepted) {
            return { condition: "accepted", result: userConnectionAccepted }
        };
    };
    // function to add new connection requests to current user's connections list with "pending" status
    function addNewUsersToConnections(newConnectionInfos) {
        setAllUsersData((prevUsersData = []) => {
            let currentUserIDClone = currentUserID || getCookies("currentUserID");

            // Step 1: Add connections to the current (target) user, only if not already existing
            const updatedUsersData = prevUsersData.map((prevUserInfo) => {
                if (prevUserInfo?._id === currentUserIDClone) {
                    const existingConnections = prevUserInfo?.connections || [];

                    const filteredNewConnections = newConnectionInfos.filter((newConn) =>
                        !existingConnections.some((existingConn) =>
                            (existingConn.initiaterUserID === newConn.initiaterUserID && existingConn.targetUserID === newConn.targetUserID) ||
                            (existingConn.initiaterUserID === newConn.targetUserID && existingConn.targetUserID === newConn.initiaterUserID)
                        )
                    );

                    return {
                        ...prevUserInfo,
                        connections: [...existingConnections, ...filteredNewConnections],
                    };
                }
                return prevUserInfo;
            });

            // Step 2: Add initiaterUserData ONLY if currentUserID === targetUserId
            let currentUserIsTargetUser = newConnectionInfos?.every((conn) => conn?.targetUserID === currentUserIDClone);
            const newInitiatorsToAdd = [];
            if (currentUserIsTargetUser) {
                for (const conn of newConnectionInfos) {
                    const { targetUserID, initiaterUserData } = conn;
                    // Add initiator data if not already present in users list
                    if (!prevUsersData.some((u) => u._id === initiaterUserData._id)) {
                        newInitiatorsToAdd.push(initiaterUserData);
                    }
                }
            };


            return [...updatedUsersData, ...newInitiatorsToAdd];
        });
    };
    // `removeUsersFromConnections` executes when:  
    // 1. The initiating user cancels the connection request.  
    // 2. The target user rejects the connection request.  
    // 3. Either user removes the connection after it has been accepted.  
    function removeUsersFromConnections(connectionInfos) {
        // removingType can be request cancel type, or , request rejecting type, or removing after accepting
        //update in allUsersData , in client side
        setAllUsersData((prevUsersData) => {
            return prevUsersData?.map((prevUserInfo) => {
                let currentUserIDClone = currentUserID || getCookies("currentUserID");
                if (prevUserInfo?._id == currentUserIDClone) {
                    return {
                        ...prevUserInfo,
                        // remove connections matching the given connection IDs
                        connections: prevUserInfo?.connections?.filter((oldConnectionInfo) =>
                            !connectionInfos?.some((connectionInfoForRemoving) =>
                                oldConnectionInfo?.connectionID == connectionInfoForRemoving?.connectionID
                            )
                        )
                    };
                };
                return prevUserInfo;
            })
        });
    };
    // function to accept connection requests and update status to "accepted"
    function acceptUsersConnectionsReq(connectionInfos) {
        setAllUsersData((prevUsersData) => {
            return prevUsersData?.map((prevUserInfo) => {
                let currentUserIDClone = currentUserID || getCookies("currentUserID");
                if (prevUserInfo?._id == currentUserIDClone) {
                    return {
                        ...prevUserInfo,
                        connections: prevUserInfo?.connections?.map((oldConnectionInfo) =>
                            // update status to accepted if connectionID matches
                            connectionInfos?.some((connectionInfoForAccepting) =>
                                oldConnectionInfo?.connectionID == connectionInfoForAccepting?.connectionID
                            )
                                ? { ...oldConnectionInfo, status: "accepted" } : oldConnectionInfo
                        )
                    };
                };
                return prevUserInfo;
            })
        });
    };

    // Function to log out the current user
    function logoutUser() {
        userLogout()
            .then((response) => {
                // Clear the currentUserID cookie by setting its expiration date to the past
                document.cookie = "currentUserID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                // Navigate to the login page after logout
                navigate("/auth/login") //navigate to the login page
                // Clear the current user ID in the state to reflect logged out status
                setCurrentUserID(null); // Clear the current user ID in the state
                // Send a websocket message to update the user's active status as offline with timestamp
                sendWebSocketMessage(
                    "user:profileInfo:change",
                    "newProfileInfo",
                    {
                        currentUserID,
                        visibilityKey: "activeStatusVisibility",
                        actionedToKey: "activeStatusActionedTo",
                        updatingDataKey: "activeStatus",
                        updatingValue: { activeStatus: new Date().toISOString() }
                    }
                );
                // Reset opened tab info and UI visibility states after logout
                setOpenedTabInfo(null);
                setShowChatBox(false);
                setShowRecentChatsSection(true);
                // window.location.reload();
            })
            .catch((err) => {
                // Handle any errors silently or log if needed
            });
    };

    // function to block or unblock a user
    function toggleUserBlocking(tabInfo) {
        let { tabID: targetUserID, isBlocking } = tabInfo;
        // Update blocked users list in the client-side state for the current user
        setAllUsersData(prevUsersData =>
            prevUsersData?.map(user =>
                user?._id === currentUserID
                    ? {
                        ...user,
                        blockedUsers: isBlocking
                            ? [...user.blockedUsers, targetUserID] // Add user to blocked list
                            : user.blockedUsers.filter(id => id !== targetUserID) // Remove user from blocked list
                    }
                    : user
            )
        );

        // Create a system message for blocking/unblocking to notify chat participants
        const chatData = {
            customID: generateUniqueID("CHAT"),
            senderID: currentUserID,
            chatType: isBlocking ? 'system-user-blocked' : 'system-user-unblocked', // Set chat type
            text: JSON.stringify([{
                type: 'text',
                value: `have ${isBlocking ? 'blocked' : 'unblocked'}`, // Message content
                targetUsers: [targetUserID] // Target users info
            }]),
            disappearingTime: tabInfo?.disappearingTime,
            sentTime: new Date().toISOString(),
            receiversInfo: [{
                status: 'sent',
                deliveredTime: null,
                seenTime: null,
                receiverID: targetUserID,
            }],// sender and receiver is initiator as this only for this not for target user
            deletedByUsers: [targetUserID],
        };
        // Save the blocking/unblocking chat message in the database
        let newChats = [chatData]
        createChat({ newChats })
            .then((response) => {
                // Optional: handle success response if needed
                // Add this new system chat message to the client-side allChatsData state
                setAllChatsData((prev) => ([...prev, response?.data?.chat]));
            })
            .catch((err) => {
                // Log error if chat creation fails
                console.log(err)
            });
        // Add or update the recent chat tab for the target user with the new chat time and reset clearing time
        addOrUpdateRecentTab(
            {
                tabType: "user",
                tabID: targetUserID,
                recentTime: chatData?.sentTime, // Use the sentTime of the chatData
                clearingTime: "", // make clearingTime empty,
                isArchived: false,
                isPinned: false,
                disappearingTime: "Off"
            }, //it for adding if tab not exist,
            {
                recentTime: chatData?.sentTime, // Use the sentTime of the chatData
                clearingTime: "", // make clearingTime empty,
            } //it for updating if tab exist
        );
        // Send real-time websocket event about blocking or unblocking the user
        sendWebSocketMessage(
            isBlocking ? "user:block" : "user:unblock", // Event type
            isBlocking ? "blockingInfo" : "unblockingInfo", // Payload type
            { actionType: isBlocking ? 'block' : 'unblock', initiatorID: currentUserID, targetUserID }
        );
        // Set flag to prepare system chat for display in UI
        setNeedToPrepareSystemChat(true); // Set flag to prepare system chat for display
    };
    // Function to clear chat history for a tab
    async function clearChatHistory(tabInfo, isNeedToSetClearingTime) {
        let { tabID } = tabInfo;
        // Filter chats related to the specified tab based on tab type
        let relatedChats = allChatsData?.filter((chat) => {
            // Condition for user-to-user chats
            if (tabInfo?.tabType === "user") {
                return (
                    (!chat?.isGroupType) && // Exclude group and broadcast chats
                    (
                        // Condition where the current user is the sender and the target user is the receiver
                        ((chat?.senderID === currentUserID && chat?.receiversInfo?.some(r => r.receiverID === tabID)) && !chat?.isBroadcastType)
                        ||
                        // Condition where the target user is the sender and the current user is the receiver
                        (chat?.senderID === tabID && chat?.receiversInfo?.some(r => r.receiverID === currentUserID))
                    )
                );
            }

            // Condition for group chats
            if (tabInfo?.tabType === "group") {
                return (
                    chat?.isGroupType && // Ensure it's a group chat
                    chat?.toGroupID === tabID // Match the group ID with the target tab
                );
            }

            // Condition for broadcast chats
            if (tabInfo?.tabType === "broadcast") {
                return (
                    chat?.isBroadcastType && // Ensure it's a broadcast chat
                    chat?.toBroadcastID === tabID // Match the broadcast ID with the target tab
                );
            }
            // Condition for aiAssistant chats
            if (tabInfo?.tabType == 'aiAssistant') {
                return (
                    chat?.aiAssistant // Ensure it's a aiAssistant chat
                    // && !chat?.deletedByUsers?.includes(currentUserID) // Ensure the current user hasn't deleted the chat
                );
            }
        });

        // Proceed with deletion only if related chats are found
        if (relatedChats?.length > 0) {
            // Delete the filtered chats from database
            await deleteChats(relatedChats); // Delete filtered chats

            // Update the clearing time in the related tab data of recent chat tabs for the current user, if tab exist,
            if (isNeedToSetClearingTime) {
                addOrUpdateRecentTab(tabInfo, { clearingTime: new Date().toISOString(), draft: null, recentTime: "" });
            };
            // This ensures that the UI knows when the chat history was last cleared
        }
    };

    // Function to delete a tab from recentChatsTabs
    function deleteRecentChatTab(tabInfo) {
        let { tabID } = tabInfo;
        // Check if the tab exists in current user's recentChatsTabs
        let isTabExists = currentUserData?.recentChatsTabs?.some(
            (recentChatTabInfo) => recentChatTabInfo?.tabID === tabID
        );
        // Delete only if the tab exists
        if (isTabExists) {
            // If the tab is a broadcast type, notify server to delete it permanently
            if (tabInfo?.tabType === "broadcast") {
                sendWebSocketMessage(
                    'broadcast:delete:permanently',
                    'broadcastData',
                    { broadcastID: tabInfo?.tabID, createdBy: currentUserID }
                );
            };
            // Update the client-side state to remove the tab from recentChatsTabs
            setAllUsersData((prevUsersData) =>
                prevUsersData?.map((prevUserInfo) =>
                    prevUserInfo?._id == currentUserID
                        ? {
                            ...prevUserInfo,
                            recentChatsTabs: prevUserInfo?.recentChatsTabs?.filter(
                                (recentChatsTabInfo) => recentChatsTabInfo?.tabID != tabID
                            )
                        }
                        : prevUserInfo
                )
            );
            // Clear all chats related to this tab before deleting the tab
            clearChatHistory(
                tabInfo,
                false //no need to set clearingTime
            );
            // Prepare the filter and update objects for database update
            let filterCondition = {
                _id: currentUserID,
                recentChatsTabs: { $elemMatch: { tabID } }
            };

            let updateOperation = {
                // Remove the tab from recentChatsTabs array in the database
                $pull: {
                    recentChatsTabs: { tabID } // ✅ Corrected key
                }
            };

            // Update the user data in database to remove the tab
            updateUserDataInDatabase(filterCondition, updateOperation);
        }
    };
    // users related -end
    // chats related -start
    //function for showing badge on chatData tab, only for receiver
    //it returns the number of unread chats for the current user
    function getUnreadChats(currentUserID, allUniqueChats, tabInfo) {
        let currentUserIDClone = currentUserID || getCookies("currentUserID");
        if (tabInfo == null) {
            // Return all unread chats for the current user that are not deleted or system messages
            return allUniqueChats?.filter(chatData =>
                chatData?.receiversInfo?.some(receiverInfo => receiverInfo?.receiverID == currentUserIDClone && receiverInfo?.seenTime == null) &&
                !chatData?.deletedByUsers?.includes(currentUserIDClone) &&
                !chatData?.chatType?.startsWith("system-") &&
                !chatData?.receiversInfo?.every(receiverInfo => receiverInfo?.receiverID === chatData?.senderID) //Ensure the sender and receiver are not same
            )
        } else if (tabInfo?.tabType == "user") {
            //for individual chatData
            // Return unread chats where the opened tab is the sender and chat is not group or system message
            return allUniqueChats?.filter(chatData =>
                tabInfo?.tabID == chatData?.senderID &&
                chatData?.receiversInfo?.some(receiverInfo => receiverInfo?.receiverID == currentUserIDClone && receiverInfo?.seenTime == null) &&
                !chatData?.isGroupType &&
                !chatData?.deletedByUsers?.includes(currentUserIDClone) &&
                !chatData?.chatType?.startsWith("system-") &&
                !chatData?.receiversInfo?.every(receiverInfo => receiverInfo?.receiverID === chatData?.senderID) //Ensure the sender and receiver are not same
            )
        } else {
            //for group chatData
            // Return unread chats for groups or broadcasts matching the tab id, excluding system messages
            return allUniqueChats?.filter(chatData =>
                (tabInfo?.tabType == "group" ? chatData?.isGroupType : chatData?.isBroadcastType) &&
                (tabInfo?.tabType == "group" ? (tabInfo?.tabID == chatData?.toGroupID) : (tabInfo?.tabID == chatData?.toBroadcastID)) &&
                chatData?.receiversInfo?.some(receiverInfo => receiverInfo?.receiverID == currentUserIDClone && receiverInfo?.seenTime == null) &&
                !chatData?.chatType?.startsWith("system-")
            )
        };
    };
    // Function to handle and update chat status (locally in the frontend)
    function updateChatReceiversInfo(chatsData) {
        // Update all chats in state using the incoming status updates
        setAllChatsData((prevChats) =>
            prevChats.map((chat) => {
                // Find the updated chat by customID
                let updatedChat = chatsData?.find(chatData => chatData?.customID === chat?.customID);
                if (!updatedChat) return chat; // If no update found, return the original chat
                // Map over receivers and update their status if present in updated chat
                const updatedReceiversInfo = chat?.receiversInfo.map((receiver) => {
                    const updatedReceiver = updatedChat?.receiversInfo.find(r => r.receiverID === receiver.receiverID);
                    // If this receiver has an update, merge the new status info
                    return updatedReceiver
                        ? {
                            ...receiver,
                            status: updatedReceiver.status ?? receiver.status,
                            deliveredTime: updatedReceiver.deliveredTime ?? receiver.deliveredTime,
                            seenTime: updatedReceiver.seenTime ?? receiver.seenTime,
                        }
                        : receiver;
                });
                // Return updated chat object with new receiversInfo
                return {
                    ...chat,
                    receiversInfo: updatedReceiversInfo,
                };
            })
        );
    };
    function updateChatStatus(allChatsData, statusData, openedTabInfo) {
        let currentUserIDClone = currentUserID || getCookies("currentUserID");
        // Filter chats based on opened tab type and status conditions
        let checkingChats = openedTabInfo ? allChatsData?.filter((chatData) => {
            if (openedTabInfo?.tabType == 'user') {
                // Filter chats where opened user is sender and current user is receiver who hasn't seen or received
                return (
                    (
                        openedTabInfo?.tabID == chatData?.senderID &&
                        chatData?.receiversInfo?.some(receiverInfo =>
                            receiverInfo?.receiverID == currentUserID
                            &&
                            (receiverInfo?.deliveredTime == null || receiverInfo?.seenTime == null)
                        )
                    )
                )
                    &&
                    !chatData?.deletedByUsers?.includes(currentUserID) // Ensure not deleted by current user
                    && !chatData?.isGroupType // Exclude group chats
            }
            // Group chats for an opened group tab
            else if (openedTabInfo?.tabType == 'group') {
                // Filter chats that are group chats with matching group ID and unread for current user
                return (
                    chatData?.isGroupType
                    && chatData?.toGroupID === openedTabInfo?.tabID
                    && !chatData?.deletedByUsers?.includes(currentUserID)
                    && chatData?.receiversInfo?.some(receiverInfo =>
                        receiverInfo?.receiverID == currentUserID &&
                        (receiverInfo?.deliveredTime == null || receiverInfo?.seenTime == null)
                    )
                );
            }
        }) : allChatsData?.filter(chatData =>
            // If no tab opened, get all chats unread by current user excluding deleted and system messages
            chatData?.receiversInfo?.some(receiverInfo =>
                receiverInfo?.receiverID == currentUserIDClone &&
                (receiverInfo?.deliveredTime == null && receiverInfo?.seenTime == null)
            ) &&
            !chatData?.deletedByUsers?.includes(currentUserIDClone) &&
            !chatData?.chatType?.startsWith("system-")
        );
        // Map over filtered chats to determine updates
        let chatsToUpdate = checkingChats?.map((chatData) => {
            let receiversInfo = chatData?.receiversInfo;
            // Check if current user is among receivers who haven't seen or received message
            let meInReceiversInfo = receiversInfo?.some(
                (receiverInfo) => receiverInfo.receiverID === currentUserIDClone &&
                    (receiverInfo?.deliveredTime == null || receiverInfo?.seenTime == null)
            );
            if (!meInReceiversInfo) return chatData; // No update if current user not in receivers needing update

            let shouldUpdate = false;

            // Check if seen time needs update for current user
            let isNeedToSeen = receiversInfo.some(
                (receiver) =>
                    receiver.receiverID === currentUserIDClone &&
                    receiver?.seenTime == null
            );

            // Check if delivered time needs update for current user
            let isNeedToDelivered = receiversInfo.some(
                (receiver) =>
                    receiver.receiverID === currentUserIDClone &&
                    receiver?.deliveredTime == null
            );

            // Update receiversInfo array with new status times as appropriate
            let updatedReceiversInfo = receiversInfo?.map((receiverInfo) => {
                if (receiverInfo.receiverID !== currentUserIDClone) return receiverInfo; // No change for other receivers

                // Check flags for allowing delivery and seen status updates
                const chatDeliveryStatusAllowed = receiverInfo?.isDeliveredStatusAllowed;
                const chatSeenStatusAllowed = receiverInfo?.isSeenStatusAllowed;
                // Determine if seen time update is allowed based on opened tab type and chatData type
                let allowSeenTimeUpdate = (
                    (openedTabInfo?.tabType === "user" &&
                        chatData.senderID === openedTabInfo?.tabID &&
                        !chatData?.isGroupType &&
                        isNeedToSeen
                    ) ||

                    (openedTabInfo?.tabType === "group" &&
                        chatData.toGroupID === openedTabInfo?.tabID &&
                        chatData?.isGroupType &&
                        isNeedToSeen
                    )
                );
                // Determine if seen status update is allowed
                let allowSeenStatusUpdate = chatSeenStatusAllowed && allowSeenTimeUpdate;
                // Determine if delivered status update is allowed (only if no tab is opened)
                let allowDeliveredUpdate = (
                    openedTabInfo == null &&
                    isNeedToDelivered &&
                    chatDeliveryStatusAllowed
                );

                if (isNeedToDelivered || isNeedToSeen) {
                    shouldUpdate = true;
                    // Compose new status object based on permissions and update times
                    const appliedStatus = {
                        status: allowDeliveredUpdate ? "delivered" : allowSeenStatusUpdate ? "seen" : receiverInfo?.status,
                        seenTime: allowSeenTimeUpdate ? statusData?.seenTime : receiverInfo?.seenTime,
                        deliveredTime: receiverInfo?.deliveredTime || statusData?.deliveredTime
                    };
                    if (isNeedToDelivered) {
                        // update recentTimw with deliveredTime for receiver
                        let tabInfo = {
                            tabType: chatData?.isGroupType ? 'group' : 'user', // Determine type
                            tabID: chatData?.isGroupType ? chatData?.toGroupID : chatData?.senderID, // Determine ID
                        };

                        // Check if this chatData tab exists in the user's recent chatData tabs
                        let isTabExists = currentUserData?.recentChatsTabs?.find(
                            (recentChatTabInfo) => recentChatTabInfo?.tabID == tabInfo?.tabID
                        );

                        // If tab exists, update its recentTime info
                        addOrUpdateRecentTab(
                            {
                                ...isTabExists,
                                recentTime: appliedStatus?.deliveredTime, // Extract sentTime for current user
                                clearingTime: "", // No clearing time at the moment
                            },
                            {
                                recentTime: appliedStatus?.deliveredTime, // Extract sentTime for current user
                                clearingTime: "", // No clearing time at the moment
                            }
                        );
                    };

                    return { ...receiverInfo, ...appliedStatus };
                }

                return receiverInfo;
            });

            // Return updated chatData if updates are made, else original
            return shouldUpdate ? { ...chatData, receiversInfo: updatedReceiversInfo } : chatData;
        });

        // Prepare array of chats that have changed for websocket update
        let chatsUpdationArray = chatsToUpdate
            ?.filter((chatData, index) => chatData !== allChatsData[index]) // Only chats that differ from original
            .map((chatData) => ({
                senderID: chatData?.senderID,
                customID: chatData?.customID,
                receiversInfo: chatData?.receiversInfo,
            }));

        if (chatsUpdationArray?.length > 0) {
            // Log updates and send websocket message, then update local state
            sendWebSocketMessage("update:chats:status", "chatsData", chatsUpdationArray);
            updateChatReceiversInfo(chatsUpdationArray);
        }
    };

    // function to prepare system chat for show like "you blocked UserA" or "UserA added you to group" etc.
    function prepareSystemChatForShow() {
        // Get current user ID or fallback to cookie
        let currentUserIDClone = currentUserID || getCookies("currentUserID");
        // Update all chats data with prepared system messages
        setAllChatsData((prevChatsData) => {
            return prevChatsData?.map((prevChat) => {
                // Check if chat is a system message type
                if (prevChat?.chatType?.startsWith("system-")) {
                    // Parse chat text safely
                    let textData = safeParseJSON(prevChat?.text);
                    // Prevent re-processing if already prepared
                    if (Array.isArray(textData) && textData?.some(item => item?.isPrepared)) {
                        return prevChat;
                    }

                    let completed = false;
                    // If textData is an array, map and transform its items
                    textData = Array.isArray(textData) ? textData.flatMap((textItem) => {
                        // Extract target users, group, and broadcast names
                        let parsedTargetUsers = Array.isArray(textItem?.targetUsers) ? textItem.targetUsers : [];
                        let parsedTargetGroup = textItem?.targetGroupID
                            ? safeParseJSON(getSingleGroupData(textItem?.targetGroupID)?.profileInfo?.name) || []
                            : [];
                        let parsedTargetBroadcast = textItem?.targetBroadcastID
                            ? safeParseJSON(getSingleBroadcastData(textItem?.targetBroadcastID)?.profileInfo?.name) || []
                            : [];
                        if (!completed) {
                            // If current user is sender, format message as "You ..."
                            if (prevChat?.senderID === currentUserIDClone) {
                                completed = true;
                                return [
                                    { type: 'text', value: `You` }, // Message content for sender
                                    ...textData,
                                    // Add target users names with commas
                                    ...parsedTargetUsers.flatMap((targetUserID, idx) => {
                                        return [...safeParseJSON(
                                            getSingleUserData(targetUserID)?.profileInfo?.name
                                        ), idx < parsedTargetUsers.length - 1 && { type: 'text', value: `,` }] || [];
                                    }),
                                    ...parsedTargetBroadcast,
                                    ...parsedTargetGroup,
                                    { isPrepared: true } // Mark as prepared
                                ];
                            } else {
                                // If current user is in target users, format message as "Sender ... you"
                                if (parsedTargetUsers.includes(currentUserIDClone)) {
                                    completed = true;
                                    return [
                                        ...safeParseJSON(getSingleUserData(prevChat?.senderID)?.profileInfo?.name) || [],
                                        { type: 'text', value: ` ${textItem?.value} you` }, // Message content for receiver
                                        { isPrepared: true } // Mark as prepared
                                    ];
                                } else {
                                    // Otherwise, format message as "Sender ... target users and groups"
                                    completed = true;
                                    return [
                                        ...safeParseJSON(getSingleUserData(prevChat?.senderID)?.profileInfo?.name) || [],
                                        // { type: 'text', value: ` ${textItem?.value} ` }, // Message content (commented out)
                                        ...textData,
                                        ...parsedTargetUsers.flatMap((targetUserID) => {
                                            return (safeParseJSON(getSingleUserData(targetUserID)?.profileInfo?.name) || []).map((userNameText) => {
                                                return { ...userNameText, value: `${userNameText?.value} ` };
                                            });
                                        }),
                                        ...parsedTargetGroup,
                                        { isPrepared: true } // Mark as prepared
                                    ];
                                }
                            }
                        }
                    }) : []; // Ensure textData is always an array
                    // Return updated chat object with new prepared text
                    return {
                        ...prevChat,
                        text: JSON.stringify(textData),
                    };
                }
                // Return chat as is if not a system message
                return prevChat;
            });
        });
    };

    // function to send single chat
    function sendTextChat(tabInfo, chatType, textContent, targetChatForReply) {
        // Prepare receivers information based on chat tab type
        let groupParticipants = tabInfo?.tabType == "group" ?
            getSingleGroupData(tabInfo?.tabID)?.members?.filter((memberID) => memberID != currentUserID)?.map((memberID) => {
                return {
                    status: 'sending',       // Initial status of message delivery
                    deliveredTime: null,     // Delivery timestamp
                    seenTime: null,          // Seen timestamp
                    receiverID: memberID,    // Receiver user ID
                }
            })
            : null;
        let broadcastParticipants = tabInfo?.tabType == "broadcast" ?
            getSingleBroadcastData(tabInfo?.tabID)?.members?.filter((memberID) => memberID != currentUserID)?.map((memberID) => {
                return {
                    status: 'sending',
                    deliveredTime: null,
                    seenTime: null,
                    receiverID: memberID,
                }
            })
            : null;
        let recentTime = new Date().toISOString();
        tabInfo = {
            ...tabInfo,
            recentTime: recentTime,
            clearingTime: "",
        };
        // aiAssistantReceiver is a receiver data, but not in real, only for following the rules of chat data
        let aiAssistantReceiver = tabInfo?.tabType == "aiAssistant" ? [{
            status: 'sending',
            deliveredTime: null,
            seenTime: null,
            receiverID: tabInfo?.tabID
        }] : null;
        // Determine receivers info based on tab type (user, group, broadcast)
        let receiversInfo = tabInfo?.tabType == "user" ? [{
            status: 'sending',
            deliveredTime: null,
            seenTime: null,
            receiverID: tabInfo?.tabID
        }] : tabInfo?.tabType == "group" ? groupParticipants : tabInfo?.tabType == "broadcast" ? broadcastParticipants : aiAssistantReceiver;
        // Construct chat message data object
        const chatData = {
            customID: generateUniqueID('CHAT'), // Unique ID for the chat
            senderID: currentUserID,            // Sender user ID
            aiAssistant: tabInfo?.tabType == "aiAssistant", //Flag for aiAssistant chat
            isGroupType: tabInfo?.tabType == "group", // Flag for group chat
            toGroupID: tabInfo?.tabType == "group" ? tabInfo?.tabID : null, // Group ID if group chat
            isBroadcastType: tabInfo?.tabType == "broadcast", // Flag for broadcast
            toBroadcastID: tabInfo?.tabType == "broadcast" ? tabInfo?.tabID : null, // Broadcast ID if broadcast
            chatType,                          // Type of chat (text, system, etc.)
            text: JSON.stringify(textContent), // Message text content serialized
            file: null,                       // No file for text message
            receiversInfo,                   // Recipients info array
            disappearingTime: tabInfo?.disappearingTime, // Disappearing timer
            sentTime: recentTime, // Timestamp of sending
            repliedToInfo: targetChatForReply || null, // Reply to message info if any
            starredByUsers: [],              // Users who starred the message
            keptByUsers: [],                 // Users who saved the message
            deletedByUsers: tabInfo?.tabType == "aiAssistant" ? [tabInfo?.tabID] : [], //mark as deleted for aiAssistant, as it is not a real receiver
            isEdited: false,                 // Edited flag
            tabInfo: tabInfo,              // Info of the tab chat belongs to
            isForwarded: false,              // Forwarded flag
        };
        // Send chat data via WebSocket to server and other recipients
        sendWebSocketMessage(
            'new:chats',
            'newChats',
            [chatData]
        );
        // Update local chat data state with new chat
        setAllChatsData((prev) => ([...prev, chatData]));
        // Update recent tab info (add or update)
        addOrUpdateRecentTab(
            {
                ...tabInfo,
                draft: null
            }, // for adding if tab does not exist
            {
                recentTime: chatData?.sentTime, // Use chat sent time
                clearingTime: "",               // Clear clearing time on sending
                draft: null
            } // for updating if tab exists
        );
        deleteExpiredChats(); // delete expired chats
        deleteExpiredStories(); // delete expired stories
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    };

    // Function to send files in chat
    async function sendFileChat(uploadedFiles, openedTabInfo, targetChatForReply) {
        // Process each uploaded file asynchronously to create chat messages
        const filePromises = uploadedFiles?.map(async (file) => {
            // Prepare recipients list if group chat
            let groupParticipants = openedTabInfo?.tabType === "group"
                ? getSingleGroupData(openedTabInfo?.tabID)?.members?.filter((memberID) => memberID != currentUserID)?.map((memberID) => ({
                    status: 'sending',    // Initial sending status
                    deliveredTime: null,  // Delivery time placeholder
                    seenTime: null,       // Seen time placeholder
                    receiverID: memberID, // Receiver user ID
                }))
                : null;

            // Prepare recipients list if broadcast chat
            let broadcastParticipants = openedTabInfo?.tabType === "broadcast"
                ? getSingleBroadcastData(openedTabInfo?.tabID)?.members?.filter((memberID) => memberID != currentUserID)?.map((memberID) => ({
                    status: 'sending',
                    deliveredTime: null,
                    seenTime: null,
                    receiverID: memberID,
                }))
                : null;

            // Assign receivers info based on chat tab type
            let receiversInfo = openedTabInfo?.tabType === "user"
                ? [{ status: 'sending', deliveredTime: null, seenTime: null, receiverID: openedTabInfo?.tabID }]
                : openedTabInfo?.tabType === "group"
                    ? groupParticipants
                    : broadcastParticipants;
            let recentTime = new Date().toISOString();
            openedTabInfo = {
                ...openedTabInfo,
                recentTime,
                clearingTime: ""
            };
            // Construct chat message data object for the file
            let chatData = {
                customID: generateUniqueID("CHAT"),    // Unique message ID
                senderID: currentUserID,               // Sender user ID
                aiAssistant: openedTabInfo?.tabType == "aiAssistant", //Flag for aiAssistant chat
                isGroupType: openedTabInfo?.tabType === "group",  // Group chat flag
                toGroupID: openedTabInfo?.tabType === "group" ? openedTabInfo?.tabID : null, // Group ID if applicable
                isBroadcastType: openedTabInfo?.tabType === "broadcast", // Broadcast flag
                toBroadcastID: openedTabInfo?.tabType === "broadcast" ? openedTabInfo?.tabID : null, // Broadcast ID if applicable
                chatType: 'file',                      // Message type file
                text: "",                             // No text content for file
                disappearingTime: openedTabInfo?.disappearingTime, // Disappearing time for message
                file,                                // File object
                sentTime: recentTime, // Time sent
                receiversInfo,                       // Recipients info
                tabInfo: openedTabInfo,              // Chat tab info
                repliedToInfo: targetChatForReply || null, // Reply message info
                isEdited: false,                     // Edited flag
                starredByUsers: [],                  // Starred users
                keptByUsers: [],                     // Kept users
                deletedByUsers: [],                  // Deleted users
                isForwarded: false,                  // Forwarded flag
            };
            return chatData;
        });

        // Await all files to be processed into chat messages
        const resolvedFileChats = await Promise.all(filePromises);
        // Update recent tab info with last file sent time
        addOrUpdateRecentTab(
            {
                ...openedTabInfo,
                draft: null
            }, // for adding if tab does not exist
            {
                recentTime: resolvedFileChats[resolvedFileChats?.length - 1]?.sentTime, // Use last file sent time
                clearingTime: "", // Clear clearing time on sending
                draft: null
            } // for updating if tab exists
        );

        // Send file chats to server through WebSocket
        sendWebSocketMessage(
            'new:chats', // WebSocket event name
            'newChats',  // Event action
            resolvedFileChats // Chat data array
        );

        // Update local chat state with new file chats
        setAllChatsData((prev) => ([...prev, ...resolvedFileChats]));

        // Hide file editing UI panel after sending files
        hideFileEditingPanel();
        deleteExpiredChats(); // delete expired chats
        deleteExpiredStories(); // delete expired stories
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    };

    // function to edit the text content or file content of the chat
    function editChatContent(chatData) {
        // Destructure relevant fields from chatData
        let { customID, senderID, chatType, text, file, isGroupType, toGroupID, isBroadcastType, toBroadcastID, deletedByUsers } = chatData;

        // Create a new updated chat object
        let updatedChatData = {
            customID, senderID, chatType, text, file, isGroupType, toGroupID, isBroadcastType, toBroadcastID, tabInfo: openedTabInfo, deletedByUsers,
            receiversInfo: chatData?.receiversInfo?.map((receiverInfo) => {
                return {
                    ...receiverInfo,
                    status: "sending", // reset status
                    seenTime: null // Set seenTime to null for all receivers, as the chat is being edited
                }
            }),
            isEdited: true, // Mark the chat as edited
        };

        // Update chat in local state
        setAllChatsData((prevChats) => {
            return prevChats?.map((chat) => {
                if (chat.customID == updatedChatData?.customID) {
                    return {
                        ...chat,
                        ...updatedChatData //update the chat
                    }
                } else {
                    return chat
                }
            })
        });

        // Send updated chat to server using WebSocket
        sendWebSocketMessage(
            'new:chats',
            'newChats',
            [updatedChatData]
        ); //send to the server and then target user or group
        deleteExpiredChats(); // delete expired chats
        deleteExpiredStories(); // delete expired stories
    };
    // function to resend the chat
    function resendChat(chatData) {
        // Update chat in local state
        setAllChatsData((prevChats) => {
            return prevChats?.map((chat) => {
                if (chat.customID == chatData?.customID) {
                    return {
                        ...chat,
                        sentTime: new Date().toISOString(),
                        isFailed: false
                    }
                } else {
                    return chat
                }
            })
        });

        // Send updated chat to server using WebSocket
        sendWebSocketMessage(
            'new:chats',
            'newChats',
            [{ ...chatData, isFailed: false }]
        );
        deleteExpiredChats(); // delete expired chats
        deleteExpiredStories(); // delete expired stories
    };
    // Function to handle making multiple chats unsent (deleted for everyone)
    function makeChatUnsent(chatsData) {
        // Create the updated chats array
        const updatedChatsData = chatsData.map((chatData) => ({
            ...chatData,
            chatType: "unsent", // Mark as unsent
            text: JSON.stringify([{ type: "text", value: "this chat is deleted" }]), // Replace text
            file: chatData?.file, // Keep existing file
            starredByUsers: [], // Clear starred info
            keptByUsers: [], // Clear kept info
            repliedToInfo: null, // Clear replied info
            receiversInfo: chatData?.receiversInfo?.map((receiverInfo) => ({
                ...receiverInfo,
                status: "sending", // Reset status
                seenTime: null // reset seenTime
            })),
            isEdited: true // optionally mark as edited
        }));

        // Update local chat data
        setAllChatsData((prevChats) => {
            return prevChats?.map((chat) => {
                const updatedChat = updatedChatsData.find((updated) => updated.customID === chat.customID);
                return updatedChat ? { ...chat, ...updatedChat } : chat;
            });
        });

        // Send updated chats to server
        sendWebSocketMessage(
            'new:chats',
            'newChats',
            updatedChatsData
        ); //send to the server and then target user or group
        deleteExpiredChats(); // delete expired chats
        deleteExpiredStories(); // delete expired stories
    };

    // Function to keep/unkeep chat
    function keepChat(chatsArray) {
        // Prepare chat update operations
        let chatsKeepArray = chatsArray?.map((chat) => ({
            filterCondition: {
                customID: chat.customID, // Identify the chat by custom ID
                keptByUsers: chat.keptByUsers.includes(currentUserID) ? currentUserID : { $ne: currentUserID } // Check if kept or not
            },
            updateOperation: chat.keptByUsers.includes(currentUserID)
                ? { $pull: { keptByUsers: currentUserID } } // Unkeep if already kept
                : { $addToSet: { keptByUsers: currentUserID } } // Keep if not already kept
        }));

        // Update database in a single API call
        updateChatDataInDatabase(chatsKeepArray);

        // Update client-side state
        setAllChatsData((prevChatsData) => {
            return prevChatsData?.map((prevChat) => {
                let isKeptByMe = prevChat?.keptByUsers?.includes(currentUserID);

                // Toggle keep/unkeep status
                if (chatsArray.some((chatData) => chatData.customID === prevChat.customID)) {
                    return {
                        ...prevChat,
                        keptByUsers: isKeptByMe
                            ? prevChat?.keptByUsers?.filter((id) => id !== currentUserID) // Unkeep
                            : [...(prevChat?.keptByUsers || []), currentUserID] // Keep
                    };
                }
                return prevChat; // Return unchanged if no update needed
            });
        });

        deleteExpiredChats(); // delete expired chats
        deleteExpiredStories(); // delete expired stories
    };

    // Function to star/unstar chat
    function starChat(chatsArray) {
        // Prepare chat update operations
        let chatsStarArray = chatsArray?.map((chat) => ({
            filterCondition: {
                customID: chat.customID, // Identify the chat by custom ID
                starredByUsers: chat.starredByUsers.includes(currentUserID) ? currentUserID : { $ne: currentUserID } // Check if starred or not
            },
            updateOperation: chat.starredByUsers.includes(currentUserID)
                ? { $pull: { starredByUsers: currentUserID } } // Unstar if already starred
                : { $addToSet: { starredByUsers: currentUserID } } // Star if not already starred
        }));

        // Update database in a single API call
        updateChatDataInDatabase(chatsStarArray);

        // Update client-side state
        setAllChatsData((prevChatsData) => {
            return prevChatsData?.map((prevChat) => {
                let isStarredByMe = prevChat?.starredByUsers?.includes(currentUserID);

                // Toggle star/unstar status
                if (chatsArray.some((chatData) => chatData.customID === prevChat.customID)) {
                    return {
                        ...prevChat,
                        starredByUsers: isStarredByMe
                            ? prevChat?.starredByUsers?.filter((id) => id !== currentUserID) // Unstar
                            : [...(prevChat?.starredByUsers || []), currentUserID] // Star
                    };
                }
                return prevChat; // Return unchanged if no update needed
            });
        });
        deleteExpiredChats(); // delete expired chats
        deleteExpiredStories(); // delete expired stories
    };

    // Function to delete chat
    async function deleteChats(chatsArray) {
        // chatsArray is an array of chats to be deleted (one or multiple)
        // Handles deletion on both client and server in one API call

        // Send deletion request via WebSocket to server
        sendWebSocketMessage(
            "delete:chats",
            "chatsData",
            {
                currentUserID,
                chatIDsForDelete: chatsArray?.map((chatData) => chatData?.customID)
            }
        );

        // Update client-side state
        setAllChatsData((prevChatsData) =>
            prevChatsData?.map((prevChat) => {
                let isDeletedByMe = prevChat?.deletedByUsers?.includes(currentUserID);

                // If the chat matches and isn't deleted yet, update its state
                if (chatsArray.some((chatData) => chatData.customID === prevChat.customID) && !isDeletedByMe) {
                    return {
                        ...prevChat,
                        deletedByUsers: [...(prevChat.deletedByUsers || []), currentUserID] // Ensure array exists
                    };
                }
                return prevChat;
            })
        );
    };

    // Check and delete chats that have expired based on their disappearing timer
    function deleteExpiredChats() {
        const now = new Date(); // Current time
        const oneDayInHours = 24; // Constant for 24 hours

        // Filter out chats that meet the following criteria:
        const expiredChats = allChatsData.filter(chatData => {
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
            }
            // Only expire chats if:
            // 1. The disappearing timer is set (not "Off")
            // 2. No users have kept the chat (keptByUsers is empty)
            // 3. The sent time is older than the calculated expiry time
            return chatData?.disappearingTime !== "Off" && chatData?.keptByUsers?.length === 0 &&
                timer && (sentTime <= new Date(now.getTime() - timer * 60 * 60 * 1000));
        });
        // If there are any expired chats, delete them
        if (expiredChats?.length > 0) {
            deleteChats(expiredChats);
        }
    };
    // chats related -end
    // stories related -start

    // Function to send stories (either text or media) to the server
    async function sendStories(textStory, mediaFiles, isForwarded) {
        let newStories = [];

        // Handle text-based story creation
        if (textStory) {
            newStories.push({
                customID: generateUniqueID("STORY"),            // Generate a unique story ID
                senderID: currentUserID,                        // Set current user as the sender
                storyType: "text",                              // Indicate story type as text
                text: JSON.stringify(textStory),                // Convert text content to JSON string
                mediaFile: null,                                // No media for text stories
                receiversInfo: [],                              // Will be populated with recipients later
                sentTime: new Date().toISOString(),             // Capture current timestamp
                statusForSender: "sending",                     // Local state: sending in progress
                isEdited: false,                                // New story (not edited)
                isForwarded: false                              // Story is not forwarded
            });
        }

        // Handle media-based stories
        if (mediaFiles?.length) {
            let mediaStoryPromises = mediaFiles.map(async (file) => {
                // If forwarded, generate a new unique file name
                let fileName = generateUniqueID("FILE") + file?.fileName?.split('.').pop()?.toLowerCase();

                return {
                    customID: generateUniqueID("STORY"),         // Generate story ID
                    senderID: currentUserID,                     // Current user as sender
                    storyType: "media",                          // Indicate media story
                    text: null,                                  // No text for media stories
                    mediaFile: file,
                    receiversInfo: [],                           // To be populated with recipients
                    sentTime: new Date().toISOString(),          // Timestamp of story creation
                    statusForSender: "sending",                  // Local status indicator
                    isEdited: false,                             // New story, not edited
                    isForwarded: isForwarded                           // Not a forwarded story
                };
            });

            // Wait for all media story objects to resolve
            const resolvedMediaStories = await Promise.all(mediaStoryPromises);
            newStories.push(...resolvedMediaStories);           // Add resolved media stories to the main list
        }

        // Send all stories (text + media) to the server
        sendWebSocketMessage("new:stories", "storiesData", newStories);

        // Update the local state with newly added stories
        setAllStoriesData((prev) => [...prev, ...newStories]);

        // Hide the file editing UI after sending stories
        hideFileEditingPanel();
        deleteExpiredChats(); // delete expired chats
        deleteExpiredStories(); // delete expired stories
    };

    // Function to edit an existing story (text or media)
    function editStoryContent(targetStory) {
        let updatedStoryData = {
            ...targetStory,
            receiversInfo: targetStory?.receiversInfo?.map((receiverInfo) => {
                return {
                    ...receiverInfo,
                    seenTime: null // Reset seen time for all recipients as the story is now edited
                }
            }),
            isEdited: true, // Mark story as edited
        };

        // Update the local state with edited story
        setAllStoriesData((prevStories) => {
            return prevStories?.map((storyData) => {
                if (storyData.customID == updatedStoryData?.customID) {
                    return {
                        ...storyData,
                        ...updatedStoryData // Replace old data with edited data
                    }
                } else {
                    return storyData; // Keep story unchanged
                }
            });
        });

        // Send the edited story to the server
        sendWebSocketMessage("new:stories", "storiesData", [updatedStoryData]);

        // Hide the editing panel after submitting the edit
        hideFileEditingPanel();
        deleteExpiredChats(); // delete expired chats
        deleteExpiredStories(); // delete expired stories
    };
    // Function to resend story
    function resendStory(targetStory) {
        // Update the local state
        setAllStoriesData((prevStories) => {
            return prevStories?.map((storyData) => {
                if (storyData.customID == targetStory?.customID) {
                    return {
                        ...storyData,
                        sentTime: new Date().toISOString(),
                        isFailed: false, // Mark story as not failed
                    }
                } else {
                    return storyData; // Keep story unchanged
                }
            });
        });

        // Send the edited story to the server
        sendWebSocketMessage("new:stories", "storiesData", [{ ...targetStory, isFailed: false }]);

        // Hide the editing panel after submitting the edit
        hideFileEditingPanel();
        deleteExpiredChats(); // delete expired chats
        deleteExpiredStories(); // delete expired stories
    };
    // Function to delete story either for specific receivers or for all
    function deleteStories(targetStories, removingType, targetReceivers) {
        const { customID } = targetStories[0]; // Assume all stories have the same ID

        // Delete story for selected receivers only
        if (removingType == 'some') {
            sendWebSocketMessage(
                'remove:stories:some',
                'removingStoryForSome',
                {
                    senderID: currentUserID,
                    customID,
                    targetReceivers // List of users from whom the story should be removed
                }
            );

            // Update local state to remove story for specific receivers
            setAllStoriesData((prevStories) => {
                return prevStories.map((storyInfo) => {
                    if (storyInfo?.customID == customID) {
                        const receivers = storyInfo.receiversInfo;
                        return {
                            ...storyInfo,
                            receiversInfo: receivers?.filter((receiverInfo) =>
                                !targetReceivers?.includes(receiverInfo?.receiverID)
                            )
                        }
                    };
                    return storyInfo; // Keep story unchanged
                });
            });

        } else if (removingType == 'all') {
            // Delete story from all recipients
            sendWebSocketMessage(
                'remove:stories:all',
                'removeStoriesFromAll',
                targetStories?.map((storyInfo) => {
                    return {
                        senderID: storyInfo?.senderID,
                        customID: storyInfo?.customID,
                        targetReceivers: storyInfo?.receiversInfo?.map((receiverInfo) => receiverInfo?.receiverID)
                    }
                })
            );

            // Remove story completely from local state
            targetStories?.forEach((targetStory) => {
                setAllStoriesData((prevStories) => {
                    return prevStories?.filter((storyInfo) => storyInfo?.customID != targetStory?.customID);
                });
            });
        };
    };

    // Function to delete expired stories after 24 hours
    function deleteExpiredStories() {
        const now = new Date(); // Get current time
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Calculate time 24h ago

        // Filter out stories that are older than 24 hours
        const expiredStories = allStoriesData.filter(story => {
            const sentTime = new Date(story.sentTime);
            return sentTime <= twentyFourHoursAgo; // Expired if older than 24h
        });

        // If there are expired stories, delete them for all
        if (expiredStories?.length > 0) {
            deleteStories(
                expiredStories,
                "all",    // Delete for all
                null      // No specific receivers since it's for everyone
            );
        };
    };
    // useEffect(() => {
    //     deleteExpiredStories(); // delete expired stories
    // }, [allStoriesData])

    // stories related -end
    // call related -start

    // Function to initiate a new call
    async function makeNewCall(callData) {
        // Create WebRTC offer from the peer connection
        const offer = await peer.getOffer();

        // Generate a unique call ID
        let callID = generateUniqueID("CALL");

        // Prepare full call data with additional metadata
        let callDataClone = {
            ...callData,                         // Spread incoming call data (callee, type, etc.)
            customID: callID,                    // Unique identifier for the call
            offer,                               // WebRTC offer to initiate the call
            callingTime: new Date().toISOString(), // Timestamp when the call is initiated
            callDuration: "",                    // Duration of the call (to be updated later)
            ringDuration: "",                    // Duration of ringing before answer (to be updated)
            status: "calling",                   // Current call status
            seenByCallee: false,                 // Whether the callee has seen the call
            deletedByUsers: []                   // Tracks users who have deleted this call
        };

        // Store the current call data locally (used to track in real-time)
        setCurrentCallData(callDataClone);

        // Check if there’s already a tab opened for this callee
        const existingTab = currentUserData?.recentChatsTabs?.find(tab => tab?.tabID === callData?.callee);

        // Send a chat message representing the start of the call (to callee)
        sendTextChat(
            existingTab || {                    // If no existing tab, create a temporary one
                tabType: "user",                // Type: individual user
                tabID: callData?.callee,        // ID of the callee
                recentTime: new Date().toISOString(), // Timestamp for tab update
                clearingTime: "",               // No auto-clear time
                isArchived: false,              // Not archived
                isPinned: false,                // Not pinned
                disappearingTime: "Off"         // Disappearing messages off
            },
            `${callData?.callType}-call`,       // Message type (e.g., video-call, voice-call)
            [{ type: "text", value: `${callData?.callType} call`, callID: callID }], // Message content
            null                                // No message being replied to
        );

        // Add the call data to local call logs
        setAllCallsData((prev) => ([...prev, callDataClone]));

        // Send the call data to the server via WebSocket
        sendWebSocketMessage('make:new:call', 'newCallData', callDataClone);
    };
    // call related -end


    // Function to toggle activation/deactivation of disappearing timer for a chat tab
    function toggleDisappearingTimer(tabInfo) {
        // Find if the tab already exists in the user's recent chat tabs
        const existingTab = currentUserData?.recentChatsTabs?.find(tab => tab?.tabID === tabInfo?.tabID);

        // Generate participants info for group chat if applicable (excluding current user)
        let groupParticipants = tabInfo?.tabType === "group"
            ? getSingleGroupData(tabInfo?.tabID)?.members?.filter((memberID) => memberID != currentUserID)?.map((memberID) => ({
                status: 'sending',              // Initial delivery status
                deliveredTime: null,            // Will be set when delivered
                seenTime: null,                 // Will be set when seen
                receiverID: memberID,           // Receiver ID
            }))
            : null;

        // Generate participants info for broadcast chat if applicable (excluding current user)
        let broadcastParticipants = tabInfo?.tabType === "broadcast"
            ? getSingleBroadcastData(tabInfo?.tabID)?.members?.filter((memberID) => memberID != currentUserID)?.map((memberID) => ({
                status: 'sending',              // Initial delivery status
                deliveredTime: null,            // Will be set when delivered
                seenTime: null,                 // Will be set when seen
                receiverID: memberID,           // Receiver ID
            }))
            : null;

        // Define receiversInfo based on the type of chat (user, group, or broadcast)
        let receiversInfo = tabInfo?.tabType === "user"
            ? [{
                status: 'sending',              // Initial delivery status
                deliveredTime: null,            // Will be set when delivered
                seenTime: null,                 // Will be set when seen
                receiverID: tabInfo?.tabID      // Receiver ID for 1-on-1 chat
            }]
            : tabInfo?.tabType === "group"
                ? groupParticipants
                : broadcastParticipants;

        // Prepare the chat message with system-disappearing type to notify timer change
        let recentTime = new Date().toISOString();
        tabInfo = {
            ...tabInfo,
            recentTime,
            clearingTime: ""
        };
        const chatData = {
            customID: generateUniqueID('CHAT'),     // Unique chat message ID
            senderID: currentUserID,                // Sender is the current user
            isGroupType: tabInfo?.tabType === "group",       // Boolean flag for group
            toGroupID: tabInfo?.tabType === "group" ? tabInfo?.tabID : null, // Group ID if applicable
            isBroadcastType: tabInfo?.tabType === "broadcast",               // Boolean flag for broadcast
            toBroadcastID: tabInfo?.tabType === "broadcast" ? tabInfo?.tabID : null, // Broadcast ID
            chatType: "system-disappearing",        // Type of system message
            text: JSON.stringify([{
                type: 'text',
                value: `have ${(existingTab?.disappearingTime != "Off" && tabInfo?.disappearingTime == "Off")
                    ? 'deactivated disappearing timer' // Case 1: Timer turned off
                    : (existingTab?.disappearingTime === "Off" && tabInfo?.disappearingTime !== "Off")
                        ? "activated disappearing timer by " + tabInfo?.disappearingTime // Case 2: Timer activated
                        : 'changed disappearing timer by ' + tabInfo?.disappearingTime}` // Case 3: Timer changed
            }]),
            receiversInfo,                           // Who will receive this system message
            sentTime: recentTime,      // Timestamp when the system message is sent
            tabInfo: tabInfo,                        // Complete tab info passed in
            disappearingTime: tabInfo?.disappearingTime, // The updated disappearing time
        };

        // Add the system message to local chat state for UI
        setAllChatsData((prev) => ([...prev, chatData]));

        // Add new tab or update existing one in the recent chats
        addOrUpdateRecentTab(
            {
                ...tabInfo,
            },
            {
                recentTime: chatData?.sentTime,      // Update last activity time
                disappearingTime: tabInfo?.disappearingTime, // Set disappearing time
                clearingTime: "",                    // No clearing time
            }
        );

        // Send system chat update to server via WebSocket
        sendWebSocketMessage(
            'new:chats',
            'newChats',
            [chatData]
        );

        // Set local flag to indicate that a system chat is being prepared
        setNeedToPrepareSystemChat(true);
    };
    // groups related - start

    // Function to update the group's message sending permission locally
    function handleChangeGroupMessagePermission(groupData) {
        let { groupID, newRule } = groupData;
        // Update the message permission of the target group in state
        setAllGroupsData((prevGroupData) =>
            prevGroupData?.map((groupData) => {
                if (groupData?._id === groupID) {
                    return {
                        ...groupData,
                        messagePermission: newRule
                    };
                }
                return groupData;
            })
        );
        setNeedToPrepareSystemChat(true); // Flag to trigger system chat update
    };

    // Function to prepare and send system message about group message permission change
    function prepareGroupMessagePermission(groupData) {
        let { groupID, newRule, tabInfo } = groupData;
        let recentTime = new Date().toISOString();
        tabInfo = {
            ...tabInfo,
            recentTime,
            clearingTime: ""
        };
        let changingChatData = {
            customID: generateUniqueID("CHAT"), // Generate unique chat ID
            senderID: currentUserID,
            isGroupType: true,
            toGroupID: groupID,
            isBroadcastType: false,
            toBroadcastID: null,
            chatType: "system-group-msg-permission-changing", // Message type
            sentTime: recentTime, // Current time
            receiversInfo: getSingleGroupData(groupID)?.members?.filter((memberID) => memberID != currentUserID)?.map((memberID) => ({
                status: 'sending', // Message sending status
                deliveredTime: null,
                seenTime: null,
                receiverID: memberID,
            })), // Info of members who will receive the message
            tabInfo,
            text: JSON.stringify([
                {
                    type: 'text',
                    value: `changed group message permission to > ${newRule} `, // Message content
                }
            ]),
            disappearingTime: tabInfo?.disappearingTime,
        };
        // Send system message to server via WebSocket
        sendWebSocketMessage(
            "group:message:permission:change",
            "groupData",
            { groupID, newRule, changerID: currentUserID, changingChatData }
        );
    };

    // Function to prepare system message and send profile info update of the group
    function prepareGroupProfileInfoUpdating(newProfileInfo) {
        let { groupID, tabInfo, updatingDataKey, updatingValue } = newProfileInfo;
        let currentGroupData = getSingleGroupData(groupID); // Get current group data
        // Get old value based on type (name or description)
        let oldUpdatingValue = updatingDataKey == "name" ? safeParseJSON(currentGroupData?.profileInfo?.name) : safeParseJSON(currentGroupData?.profileInfo?.description);

        // Prepare message content depending on updating key
        let textDataForChat = ["name", "description"]?.includes(updatingDataKey) ? JSON.stringify([
            { type: 'text', value: `changed group ${updatingDataKey} from > ` }, ...oldUpdatingValue,
            { type: 'text', value: `< to >` },
            ...updatingValue
        ]) :
            JSON.stringify([
                {
                    type: 'text', value: `${updatingValue?.fileURL ? `changed group profile picture ${currentGroupData?.profileInfo?.profilePic && " from >"}` : "removed group profile picture"}`,
                },
                ...(currentGroupData?.profileInfo?.profilePic &&
                    [{ type: "emoji", url: currentGroupData?.profileInfo?.profilePic, usedFor: "profilePic", publicId: currentGroupData?.profileInfo?.publicId, oldProfilePic: true }]
                ),
                ...(updatingValue?.fileURL ? [{ type: 'text', value: "< to > ", }, { type: "emoji", url: updatingValue?.fileURL, usedFor: "profilePic", publicId: currentGroupData?.profileInfo?.publicId, newProfilePic: true }] : [])
            ]);

        // Generate background color for new group name
        let bgColor = updatingDataKey == "name" && getColorForName(updatingValue?.map(g => g.type == 'text' ? g?.value : [])?.join(' '));
        let recentTime = new Date().toISOString();
        tabInfo = {
            ...tabInfo,
            recentTime,
            clearingTime: ""
        };
        let changingChatData = {
            customID: generateUniqueID("CHAT"),
            senderID: currentUserID,
            isGroupType: true,
            toGroupID: groupID,
            isBroadcastType: false,
            toBroadcastID: null,
            chatType: `system-group-${updatingDataKey}-changing`,
            sentTime: recentTime,
            receiversInfo: currentGroupData?.members?.filter((memberID) => memberID != currentUserID)?.map((memberID) => ({
                status: 'sending', // Initial status
                deliveredTime: null,
                seenTime: null,
                receiverID: memberID,
            })), // Info of recipients
            tabInfo,
            disappearingTime: tabInfo?.disappearingTime,
            text: textDataForChat
        };

        // Send group profile update data to server
        sendWebSocketMessage(
            'group:profileInfo:change',
            'newProfileInfo',
            {
                groupID,
                changerID: currentUserID,
                updatingDataKey,
                updatingValue: updatingDataKey == "profilePic" ? updatingValue : {
                    ...(updatingDataKey == "name" ? { name: JSON.stringify(updatingValue), bgColor }
                        : { description: JSON.stringify(updatingValue) }
                    )
                },
                changingChatData
            }
        );
    };

    // Function to update group profile info locally in state
    function handleChangeGroupePorfileInfo(newProfileInfo) {
        let { groupID, updatingData } = newProfileInfo;
        // Update group's profileInfo in state
        setAllGroupsData((prevGroupData) =>
            prevGroupData?.map((groupData) => {
                if (groupData?._id === groupID) {
                    return {
                        ...groupData,
                        profileInfo: {
                            ...groupData?.profileInfo,
                            ...updatingData
                        }
                    };
                }
                return groupData;
            })
        );
        setNeedToPrepareSystemChat(true); // Flag to trigger system chat update
    };

    // Function to check if the group invitation link has expired
    function checkLinkExpiration(sentTime) {
        const expiryLimit = 24 * 60 * 60 * 1000; // 24 hours in ms
        const sent = new Date(sentTime).getTime(); // Convert to timestamp
        const now = Date.now();
        const diff = now - sent; // Time difference

        // Check if the link has expired
        if (diff >= expiryLimit) {
            return { expired: true, message: "Link expired" };
        }

        const timeLeftMs = expiryLimit - diff;
        const hoursLeft = Math.floor(timeLeftMs / (60 * 60 * 1000));
        const minutesLeft = Math.floor((timeLeftMs % (60 * 60 * 1000)) / (60 * 1000));

        const parts = [];
        if (hoursLeft > 0) parts.push(`${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`);
        if (minutesLeft > 0 || hoursLeft === 0) parts.push(`${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}`);

        // Return expiry status and remaining time
        return {
            expired: false,
            expiresInHours: hoursLeft,
            expiresInMinutes: minutesLeft,
            message: `Link expires in ${parts.join(" ")}`
        };
    };

    // Function to initiate join request to a group and send system message
    function joinGroup(targetGroupID) {
        let recentTime = new Date().toISOString(); // Current time
        let recentTabInfo = {
            tabType: "group",
            tabID: targetGroupID,
            recentTime,
            clearingTime: "",
            isArchived: false,
            isPinned: false
        };

        // Check if the group tab already exists in user’s recent chats
        let isTabExists = currentUserData?.recentChatsTabs?.find(
            (recentChatTabInfo) => recentChatTabInfo?.tabID == recentTabInfo?.tabID
        );

        // If tab exists, update it
        if (isTabExists) {
            recentTabInfo = {
                ...isTabExists,
                newTabForReceiver: true,
                recentTime,
                clearingTime: "",
            }
        } else {
            recentTabInfo = {
                ...recentTabInfo,
                newTabForReceiver: false
            }
        };

        // Prepare group joining system message
        let groupJoiningChatData = {
            customID: generateUniqueID("CHAT"),
            senderID: currentUserID,
            isGroupType: true,
            toGroupID: targetGroupID,
            isBroadcastType: false,
            toBroadcastID: null,
            chatType: "system-joining-group",
            sentTime: recentTime,
            receiversInfo: [],
            tabInfo: recentTabInfo,
            text: JSON.stringify([{
                type: 'text',
                value: `joined `,
                targetGroupID: targetGroupID
            }]),
        };

        setAllChatsData((prev) => ([...prev, groupJoiningChatData])); // Add new chat to state
        sendWebSocketMessage(
            "join:to:group",
            "groupJoiningInfo",
            { groupID: targetGroupID, newMemberIDs: [currentUserID], joinerUserID: currentUserID, groupJoiningChatData }
        );
        setShowProgressBar(true); // Show loading indicator
    };

    // Function to handle UI updates after successfully joining a group
    function handleGroupJoinedSuccessfully(newGroupData) {
        updateGroupData(newGroupData);
        setShowProgressBar(false);
        setNeedToPrepareSystemChat(true); // Flag for system chat update
    };

    // Function to update group data in allGroupsData state
    function updateGroupData(groupData) {
        let { _id } = groupData;
        setAllGroupsData((prevGroupsData) => {
            const groupExists = prevGroupsData.some(group => group._id === _id);
            if (!groupExists) {
                return [...prevGroupsData, groupData]; // Add new group
            }
            return prevGroupsData.map((prevGroupInfo) => {
                if (prevGroupInfo._id === _id) {
                    return {
                        ...prevGroupInfo,
                        ...groupData
                    };
                }
                return prevGroupInfo;
            });
        });
        setShowProgressBar(false);
        setNeedToPrepareSystemChat(true); // Trigger system chat update
    };

    // Function to update members list when new members are added to a group
    function handleAddMemberToGroup(groupData) {
        const { _id: groupID, members: newMemberIDs } = groupData;

        setAllGroupsData((prevGroupsData) => {
            const groupExists = prevGroupsData.some(group => group._id === groupID);
            if (!groupExists) {
                return [...prevGroupsData, groupData]; // Add group if not exist
            }

            return prevGroupsData.map((prevGroupInfo) => {
                if (prevGroupInfo._id === groupID) {
                    const groupMembers = prevGroupInfo.members || [];
                    const groupPastMembers = prevGroupInfo.pastMembers || [];
                    const invitedUsers = prevGroupInfo.invitedUsers || [];

                    // Filter out members already in group
                    const uniqueNewMembers = newMemberIDs.filter(
                        memberID => !groupMembers.includes(memberID)
                    );

                    // Remove re-added members from pastMembers and invitedUsers
                    const updatedGroupPastMembers = groupPastMembers.filter(
                        pastMember => !newMemberIDs.includes(pastMember.memberID)
                    );
                    const updatedGroupInvitedUsers = invitedUsers.filter(
                        invitedUser => !newMemberIDs.includes(invitedUser)
                    );

                    if (uniqueNewMembers.length > 0) {
                        return {
                            ...prevGroupInfo,
                            members: [...groupMembers, ...uniqueNewMembers],
                            pastMembers: updatedGroupPastMembers,
                            invitedUsers: updatedGroupInvitedUsers
                        };
                    }
                }
                return prevGroupInfo;
            });
        });
    };

    // Function to prepare promoting/demoting info for promoting members to admins
    function prepareMemberPromotionAndDemotion(promotingData) {
        // Destructure necessary data from the input
        let { groupID, tabInfo, targetMemberIDs, chatType, textMsg, eventType } = promotingData;

        // Get the current group data based on group ID
        let currentGroupData = getSingleGroupData(groupID);
        let recentTime = new Date().toISOString();
        tabInfo = {
            ...tabInfo,
            recentTime,
            clearingTime: ""
        };
        // Create chat data for the action to promote/demote members
        let actionChatData = {
            customID: generateUniqueID("CHAT"),
            senderID: currentUserID,
            isGroupType: true,
            toGroupID: groupID,
            isBroadcastType: false,
            toBroadcastID: null,
            chatType,
            sentTime: recentTime,
            receiversInfo: currentGroupData?.members?.map((memberID) => ({
                status: 'sending', // Initial status before delivery
                deliveredTime: null,
                seenTime: null,
                receiverID: memberID, // Receiver ID
            })), // Message recipient info
            tabInfo,
            disappearingTime: tabInfo?.disappearingTime,
            text: JSON.stringify([textMsg]), // System message content
        };

        // Send WebSocket message to promote/demote members
        sendWebSocketMessage(
            eventType,
            "actionInfo",
            { groupID, targetMemberIDs, actionChatData }
        );

        // Show progress bar during the operation
        setShowProgressBar(true);
    };

    // Function to update state by removing specified members from the admins list
    function handleDemoteMembersFromAdmins(demotingInfo) {
        let { groupID, targetMemberIDs } = demotingInfo;

        // Update state for group data to remove admin rights
        setAllGroupsData((prevGroupsData) =>
            prevGroupsData.map((group) => {
                if (group._id === groupID) {
                    return { ...group, admins: group.admins.filter(adminID => !targetMemberIDs.includes(adminID)) };
                }
                return group;
            })
        );

        // Hide progress bar after operation
        setShowProgressBar(false);

        // Set flag to prepare system chat message
        setNeedToPrepareSystemChat(true);
    };

    // Function to prepare chat data and handle demotion of members from admin role
    function prepareMemberDemotion(demotingData) {
        // Destructure data
        let { groupID, tabInfo, targetMemberIDs } = demotingData;

        // Get current group data
        let currentGroupData = getSingleGroupData(groupID);
        let recentTime = new Date().toISOString();
        tabInfo = {
            ...tabInfo,
            recentTime,
            clearingTime: ""
        };
        // Prepare chat data object
        let demotingChatData = {
            customID: generateUniqueID("CHAT"),
            senderID: currentUserID,
            isGroupType: true,
            toGroupID: groupID,
            isBroadcastType: false,
            toBroadcastID: null,
            chatType: "system-member-deomoting",
            sentTime: recentTime,
            receiversInfo: currentGroupData?.members?.map((memberID) => ({
                status: 'sending',
                deliveredTime: null,
                seenTime: null,
                receiverID: memberID,
            })),
            tabInfo,
            text: JSON.stringify([{
                type: 'text',
                value: `removed from admin list`, // Text message to display
                targetUsers: targetMemberIDs // List of users affected
            }]),
            disappearingTime: tabInfo?.disappearingTime,
        };

        // Add demotion chat to state
        setAllChatsData((prev) => ([...prev, demotingChatData]));

        // Send chat to server using WebSocket
        sendWebSocketMessage(
            'new:chats',
            'newChats',
            [demotingChatData]
        );

        // Create demotion info object
        let demotingInfo = {
            groupID,
            targetMemberIDs: targetMemberIDs
        };

        // Update group data to reflect demotion
        handleDemoteMembersFromAdmins(demotingInfo);

        // Notify server of demotion action
        sendWebSocketMessage(
            "demote:members:from:admins",
            "demotingInfo",
            { ...demotingInfo, managerID: currentUserID }
        );

        // Trigger UI update for system message
        setNeedToPrepareSystemChat(true);
    };

    // Function to prepare chat and data for adding members to a group
    function prepareMemberAddition(addingData) {
        let { groupID, tabInfo, targetMemberIDs } = addingData;
        let recentTime = new Date().toISOString();
        tabInfo = {
            ...tabInfo,
            recentTime,
            clearingTime: ""
        };
        // Prepare chat data object
        let addingChatData = {
            customID: generateUniqueID("CHAT"),
            senderID: currentUserID,
            isGroupType: true,
            toGroupID: groupID,
            isBroadcastType: false,
            toBroadcastID: null,
            chatType: "system-member-adding",
            sentTime: recentTime,
            receiversInfo: null, // Will be filled after successful additions
            tabInfo,
            text: null, // Will be set after confirming added users
            disappearingTime: tabInfo?.disappearingTime,
        };

        // Send WebSocket message to initiate member addition process
        sendWebSocketMessage(
            "add:member:to:group",
            "addingInfo",
            { groupID, newMemberIDs: targetMemberIDs, managerID: currentUserID, addingChatData }
        );

        // Show progress bar
        setShowProgressBar(true);
    };

    // Function to update state to remove members from a group
    function handleRemoveMemberFromGroup(removingInfo) {
        let { groupID, targetMembersData } = removingInfo;

        // Update group data in state
        setAllGroupsData((prevGroupsData) => {
            return prevGroupsData.map((prevGroupInfo) => {
                if (prevGroupInfo._id === groupID) {
                    let groupMembers = prevGroupInfo.members || [];
                    let groupAdmins = prevGroupInfo.admins || [];
                    let groupPastMembers = prevGroupInfo.pastMembers || [];

                    // Extract member IDs to be removed
                    let targetMemberIDs = targetMembersData.map(member => member.memberID);

                    // Remove from current members and admins
                    let updatedGroupMembers = groupMembers.filter(memberID => !targetMemberIDs.includes(memberID));
                    let updatedGroupAdmins = groupAdmins.filter(adminID => !targetMemberIDs.includes(adminID));

                    // Add removed members to pastMembers list
                    let updatedGroupPastMembers = [...groupPastMembers, ...targetMembersData];

                    return {
                        ...prevGroupInfo,
                        members: updatedGroupMembers,
                        admins: updatedGroupAdmins,
                        pastMembers: updatedGroupPastMembers
                    };
                }
                return prevGroupInfo;
            });
        });

        // Hide progress bar
        setShowProgressBar(false);

        // Set flag to prepare system chat for display
        setNeedToPrepareSystemChat(true);
    };

    // Function to prepare data for removing members from group and send it to server
    function prepareMemberRemoval(removingData) {
        let { groupID, tabInfo, targetMemberIDs, textMsg } = removingData;

        // Get current group data
        let currentGroupData = getSingleGroupData(groupID);
        let recentTime = new Date().toISOString();
        tabInfo = {
            ...tabInfo,
            recentTime,
            clearingTime: ""
        };
        // Prepare system message chat data
        let removingChatData = {
            customID: generateUniqueID("CHAT"),
            senderID: currentUserID,
            isGroupType: true,
            toGroupID: groupID,
            isBroadcastType: false,
            toBroadcastID: null,
            chatType: "system-member-removing",
            sentTime: recentTime,
            receiversInfo: currentGroupData?.members?.filter(memberID => memberID !== currentUserID)?.map((memberID) => ({
                status: 'sending',
                deliveredTime: null,
                seenTime: null,
                receiverID: memberID,
            })), // List of receivers excluding current user
            tabInfo,
            disappearingTime: tabInfo?.disappearingTime,
            text: JSON.stringify([textMsg]), // Text message
        };

        // Create removing info object
        let removingInfo = {
            groupID,
            targetMemberIDs
        };

        // Send removal info to server
        sendWebSocketMessage(
            "remove:group:member",
            "removingInfo",
            { ...removingInfo, managerID: currentUserID, removingChatData }
        );

        // Show progress bar during the operation
        setShowProgressBar(true);
    };
    function handleRemoveGroupData(groupID) {
        // remove group data
        setAllGroupsData((prevGroupsData) => prevGroupsData?.filter((groupData) => groupData?._id != groupID));
        // remove all chats matched with it group id
        setAllChatsData((prevChatsData) => {
            return prevChatsData?.map((chatData) => chatData?.toGroupID != groupID);
        });
        // Hide progress bar
        setShowProgressBar(false);
    };
    // groups related - end
    // broadcast related - start

    // Function to prepare data for adding members to a broadcast
    function prepareBroadcastMemberAddition(addingData) {
        let { broadcastID, tabInfo, targetMemberIDs } = addingData;
        let recentTime = new Date().toISOString();
        tabInfo = {
            ...tabInfo,
            recentTime,
            clearingTime: ""
        };
        // Prepare the system message chat data for broadcast member addition
        let addingChatData = {
            customID: generateUniqueID("CHAT"), // Generate unique chat ID
            senderID: currentUserID, // ID of the user sending this action
            isGroupType: false, // This is not a group chat
            toGroupID: null, // No group ID involved
            isBroadcastType: true, // Mark as a broadcast
            toBroadcastID: broadcastID, // Target broadcast ID
            chatType: "system-broadcast-member-adding", // Type of system message
            sentTime: recentTime, // Timestamp of the action
            receiversInfo: [], // To be populated later
            tabInfo, // Additional tab info
            text: JSON.stringify([
                {
                    type: 'text',
                    value: `added`, // Message indicating members were added
                    targetUsers: targetMemberIDs // List of added users
                }
            ]),
            disappearingTime: tabInfo?.disappearingTime,
        };

        // Send WebSocket message to server to handle member addition
        sendWebSocketMessage(
            "add:member:to:broadcast",
            "addingInfo",
            { broadcastID, newMemberIDs: targetMemberIDs, addingChatData }
        );

        setShowProgressBar(true); // Show progress bar during operation
    };

    // Function to prepare data for removing members from a broadcast
    function prepareBroadcastMemberRemoval(removingData) {
        let { broadcastID, tabInfo, targetMemberIDs } = removingData;
        let recentTime = new Date().toISOString();
        tabInfo = {
            ...tabInfo,
            recentTime,
            clearingTime: ""
        };
        // Prepare the system message chat data for broadcast member removal
        let removingChatData = {
            customID: generateUniqueID("CHAT"), // Generate unique chat ID
            senderID: currentUserID, // ID of the user sending this action
            isGroupType: false, // Not a group chat
            toGroupID: null, // No group ID involved
            isBroadcastType: true, // Mark as a broadcast
            toBroadcastID: broadcastID, // Target broadcast ID
            chatType: "system-broadcast-member-removing", // Type of system message
            sentTime: recentTime, // Timestamp of the action
            receiversInfo: [], // To be populated later
            tabInfo, // Additional tab info
            text: JSON.stringify([
                {
                    type: 'text',
                    value: `removed`, // Message indicating members were removed
                    targetUsers: targetMemberIDs // List of removed users
                }
            ]),
            disappearingTime: tabInfo?.disappearingTime,
        };

        // Send WebSocket message to server to handle member removal
        sendWebSocketMessage(
            "remove:broadcast:member",
            "removingInfo",
            { broadcastID, targetMemberIDs, removingChatData }
        );

        setShowProgressBar(true); // Show progress bar during operation
    };

    // Function to update local state when user joins a broadcast
    function updateBroadcastData(broadcastData) {
        let { _id } = broadcastData;

        setAllChatBroadcastData((prevBroadcastData) => {
            const broadcastExists = prevBroadcastData.some(broadcastInfo => broadcastInfo._id === _id);

            // If broadcast doesn't exist in local state, add it
            if (!broadcastExists) {
                return [...prevBroadcastData, broadcastData];
            }

            // If broadcast exists, update its data
            return prevBroadcastData.map((broadcastInfo) => {
                if (broadcastInfo._id === _id) {
                    return {
                        ...broadcastInfo,
                        ...broadcastData
                    };
                }
                return broadcastInfo;
            });
        });

        setShowProgressBar(false); // Hide progress bar
        setNeedToPrepareSystemChat(true); // Flag to prepare system chat for display
    };

    // Function to prepare profile info change data for a broadcast and send it
    function prepareBroadcastProfileInfoUpdating(newProfileInfo) {
        let { broadcastID, tabInfo, updatingDataKey, updatingValue } = newProfileInfo;

        let currentBroadcastData = getSingleBroadcastData(broadcastID); // Get current broadcast data

        // Determine old value being changed (for name/description)
        let oldUpdatingValue = updatingDataKey == "name"
            ? safeParseJSON(currentBroadcastData?.profileInfo?.name)
            : safeParseJSON(currentBroadcastData?.profileInfo?.description);

        // Prepare chat text data depending on type of update
        let textDataForChat = ["name", "description"].includes(updatingDataKey)
            ? JSON.stringify([
                { type: 'text', value: `changed broadcast ${updatingDataKey} from > ` },
                ...oldUpdatingValue,
                { type: 'text', value: `< to >` },
                ...updatingValue
            ])
            : JSON.stringify([
                {
                    type: 'text',
                    value: `${updatingValue?.fileURL
                        ? `changed broadcast profile picture ${currentBroadcastData?.profileInfo?.profilePic && " from >"}`
                        : "removed broadcast profile picture"}`
                },
                ...(currentBroadcastData?.profileInfo?.profilePic
                    ? [{ type: "emoji", url: currentBroadcastData?.profileInfo?.profilePic, usedFor: "profilePic", publicId: currentBroadcastData?.profileInfo?.publicId, oldProfilePic: true }]
                    : []),
                ...(updatingValue?.fileURL
                    ? [{ type: 'text', value: "< to > " }, { type: "emoji", url: updatingValue?.fileURL, usedFor: "profilePic", publicId: currentBroadcastData?.profileInfo?.publicId, newProfilePic: true }]
                    : [])
            ]);

        // Assign background color if name is being updated
        let bgColor = updatingDataKey == "name" &&
            getColorForName(updatingValue?.map(g => g.type == 'text' ? g?.value : [])?.join(' '));
        let recentTime = new Date().toISOString();
        tabInfo = {
            ...tabInfo,
            recentTime,
            clearingTime: ""
        };
        // Create chat message for broadcast profile info update
        let changingChatData = {
            customID: generateUniqueID("CHAT"),
            senderID: currentUserID,
            isGroupType: false,
            toGroupID: null,
            isBroadcastType: true,
            toBroadcastID: broadcastID,
            chatType: `system-broadcast-${updatingDataKey}-changing`,
            sentTime: recentTime,
            receiversInfo: [], // Broadcast messages have no direct receivers
            tabInfo,
            text: textDataForChat,
            disappearingTime: tabInfo?.disappearingTime,
        };
        // Update recent tab info (add or update)
        addOrUpdateRecentTab(
            {
                ...tabInfo,
                draft: null
            }, // for adding if tab does not exist
            {
                recentTime: changingChatData?.sentTime, // Use chat sent time
                clearingTime: "",               // Clear clearing time on sending
                draft: null
            } // for updating if tab exists
        );
        // Send update info to server
        sendWebSocketMessage(
            'broadcast:profileInfo:change',
            'newProfileInfo',
            {
                broadcastID,
                changerID: currentUserID,
                updatingDataKey,
                updatingValue: updatingDataKey == "profilePic" ? updatingValue : (
                    updatingDataKey == "name"
                        ? { name: JSON.stringify(updatingValue), bgColor }
                        : { description: JSON.stringify(updatingValue) }
                ),
                changingChatData
            }
        );
    };

    // Function to update local broadcast profile info
    function handleChangeBroadcastPorfileInfo(newProfileInfo) {
        let { broadcastID, updatingData } = newProfileInfo;

        setAllChatBroadcastData((prevBroadcastData) =>
            prevBroadcastData?.map((broadcastData) => {
                if (broadcastData?._id === broadcastID) {
                    return {
                        ...broadcastData,
                        profileInfo: {
                            ...broadcastData?.profileInfo,
                            ...updatingData // Merge new profile data
                        }
                    };
                }
                return broadcastData;
            })
        );

        setShowProgressBar(false); // Hide progress bar
        setNeedToPrepareSystemChat(true); // Flag to prepare system chat for display
    };
    // broadcast related - end
    // execute the prepareSystemChatForShow function when it is needed
    useEffect(() => {
        // Check if system chat preparation is required
        if (needToPrepareSystemChat) {
            prepareSystemChatForShow(); // Prepare system messages for display
            setNeedToPrepareSystemChat(false); // Reset the flag after preparing
        };
    }, [allChatsData, needToPrepareSystemChat]); // Dependencies: allChatsData and the flag

    // check all data is ready or not, then show loading
    useEffect(() => {
        // Determine if all essential data has finished loading
        let isReady = usersDataLoaded &&
            chatsDataLoaded &&
            groupsDataLoaded &&
            broadcastsDataLoaded;

        if (isReady) {
            let currentUserData = getSingleUserData(currentUserID); // Get the current user's full data

            // Update all chats' status to "delivered"
            updateChatStatus(
                allChatsData,
                {
                    status: 'delivered', // Mark as delivered
                    deliveredTime: new Date().toISOString() // Set delivery timestamp
                },
                null // No specific tab opened
            );


            setShowLoading(false); // Hide the loading screen
            setNeedToPrepareSystemChat(true); // Trigger system chat preparation
            // Delete expired chats and stories from local or server
            deleteExpiredChats(); // delete expired chats
            deleteExpiredStories(); // delete expired stories
        };
    }, [
        showLoading, // Dependency to track loading screen
        usersDataLoaded, // Wait for user data
        chatsDataLoaded, // Wait for chat data
        groupsDataLoaded, // Wait for group data
        broadcastsDataLoaded // Wait for broadcast data
    ]);

    // handleCommingWebSocketMessage to handle the incoming socket message containing the (chat, story, call, user update, group update etc.)
    // handle to the blocking the currentUser from another user 
    function handleCommingWebSocketMessage(event) {
        const webSocketMessageData = JSON.parse(event.data); // Parse the incoming WebSocket message

        // handle incoming chats
        function handleIncomingChats(incomingChats) {
            let currentUserIDClone = currentUserID || getCookies("currentUserID"); // Get current user ID if not already set

            // Ensure incomingChats is always an array
            const chatsArray = incomingChats;
            if (!chatsArray.length) return; // No chats to process

            chatsArray.forEach((newChat) => {
                // Determine tabType for sender and receiver
                let tabType = newChat?.senderID == currentUserIDClone ? (
                    newChat?.isGroupType ? 'group' : newChat?.isBroadcastType ? 'broadcast' : 'user')
                    : (newChat?.isGroupType ? 'group' : 'user');

                // Determine tabID for sender and receiver
                let tabID = newChat?.senderID == currentUserIDClone ? (
                    newChat?.isGroupType ? newChat?.toGroupID : newChat?.isBroadcastType ? newChat?.toBroadcastID : newChat?.receiversInfo[0]?.receiverID)
                    : (newChat?.isGroupType ? newChat?.toGroupID : newChat?.senderID);

                // Build tab information object
                let tabInfo = {
                    tabType, // tab type: user, group, or broadcast
                    tabID, // unique ID for the tab
                    recentTime: newChat?.senderID == currentUserIDClone ? newChat?.sentTime : newChat?.receiversInfo.find((receiverInfo) => receiverInfo?.receiverID == currentUserIDClone)?.deliveredTime, // time message was sent/delivered
                    clearingTime: "", // keep empty initially
                    isArchived: false, // default: not archived
                    isPinned: false, // default: not pinned
                    disappearingTime: newChat?.disappearingTime // default disappearing time
                };

                // Add or update recent chat tab
                addOrUpdateRecentTab(
                    tabInfo,
                    {
                        recentTime: tabInfo?.recentTime,
                        clearingTime: "", // no clearing time for now
                        disappearingTime: newChat?.disappearingTime
                    }
                );

                // If chat is a group invitation, update group data
                if (newChat?.chatType == "group-invitaion" && newChat?.targetGroupData) {
                    updateGroupData(newChat?.targetGroupData);
                };

                // Update or insert chat into allChatsData
                setAllChatsData((prevChats) => {
                    const index = prevChats.findIndex(chat => chat.customID === newChat.customID);
                    if (index !== -1) {
                        // Chat exists, update it
                        return prevChats.map(chat =>
                            chat.customID === newChat.customID ? { ...chat, ...newChat } : chat
                        );
                    } else {
                        // Chat does not exist, add it
                        return [...prevChats, newChat];
                    }
                });
            })
        };

        // function to handle chatting indicator actions (e.g. typing)
        function handleChatingIndicatorAction(actionInfo) {
            // Extract relevant fields from action info
            let { initiatorUserID, chattingStatus, toGroupID } = actionInfo;

            if (toGroupID) {
                // Update group data with chatting status
                setAllGroupsData((prevGroupsData) =>
                    prevGroupsData.map((group) => {
                        if (group._id === toGroupID) {
                            return { ...group, chattingStatus, chattingStatusBy: initiatorUserID };
                        }
                        return group;
                    })
                );
            } else {
                // Update user data with chatting status
                setAllUsersData((prevUsersData) =>
                    prevUsersData?.map((userData) => {
                        if (userData?._id === initiatorUserID) {
                            return {
                                ...userData,
                                chattingStatus
                            };
                        }
                        return userData;
                    })
                );
            };
        };

        // function to handle successful group creation
        function handleGroupCreateSuccess(newGroupData) {
            setAllGroupsData((prev) => ([...prev, newGroupData])); // Add new group data
            setShowGroupCreationPanel(false); // Hide group creation panel
            setShowRecentChatsSection(true); // Show recent chats
            setEditedProfileImgInfo(null); // Clear profile image edit info
            setShowProfileEditingPanel(false); // Hide profile editing panel
            setSelectedUsersForGroupOrBroadcast(null); // Clear selected users
            setShowProgressBar(false); // Hide progress bar
            setNeedToPrepareSystemChat(true); // Trigger system chat preparation
        };

        // function to handle successful broadcast creation
        function handleBroadcastCreateSuccess(newBroadcastData) {
            setAllChatBroadcastData((prev) => ([...prev, newBroadcastData])); // Add new broadcast
            setShowBroadcastCreationPanel(false); // Hide creation panel
            setShowRecentChatsSection(true); // Show recent chats
            setEditedProfileImgInfo(null); // Clear profile image edit info
            setShowProfileEditingPanel(false); // Hide profile editing panel
            setSelectedUsersForGroupOrBroadcast(null); // Clear selected users
            setShowProgressBar(false); // Hide progress bar
            setNeedToPrepareSystemChat(true); // Trigger system chat preparation
        };

        // handle new incoming stories
        function handleIncomingStories(storiesData) {
            if (!storiesData.length) return; // No stories to process

            storiesData.forEach((newStoryData) => {
                // Update or insert new story into allStoriesData
                setAllStoriesData((prevStories) => {
                    const index = prevStories.findIndex(story => story.customID === newStoryData.customID);
                    if (index !== -1) {
                        // Story exists, update it
                        return prevStories.map(story =>
                            story.customID === newStoryData.customID ? { ...story, ...newStoryData, watched: false, width: 0 } : story
                        );
                    } else {
                        // New story, add it
                        return [...prevStories, newStoryData];
                    }
                });
            });
        };

        // handle updating story's watching (seen) info
        function handleStoryWatching(storyData) {
            setAllStoriesData((prevStories) => {
                return prevStories?.map((prevStory) => {
                    if (prevStory?.customID == storyData?.customID) {
                        const watchedStoryReceivers = prevStory?.receiversInfo;
                        const updatedReceivers = watchedStoryReceivers?.map((receiverInfo) => {
                            if (receiverInfo?.receiverID === storyData?.watchedBy && receiverInfo?.seenTime == null) {
                                return {
                                    ...receiverInfo,
                                    seenTime: storyData?.seenTime, // Update seen time
                                };
                            }
                            return receiverInfo;
                        });
                        let updatedWatchetStory = {
                            ...prevStory,
                            receiversInfo: updatedReceivers
                        };
                        return updatedWatchetStory;
                    }
                    return prevStory;
                });
            });
        };

        // handle story deletion
        function handleRemoveStory(removingStoriesIDs) {
            // Remove stories from allStoriesData based on given IDs
            removingStoriesIDs?.forEach((storyID) => {
                setAllStoriesData((prevStories) => {
                    return prevStories?.filter((storyInfo) => storyInfo?.customID != storyID);
                });
            });
        };

        // handle incoming call
        function handleIncomming(callData) {
            // If not in call, set current call data, else notify caller that user is busy
            if (currentCallData == null) {
                setCurrentCallData(callData);
                setAllCallsData((prev) => ([...prev, callData]));
            } else {
                setAllCallsData((prev) => ([...prev, callData]));
                sendWebSocketMessage('busy:on:call', 'callData', callData); // Notify caller of busy status
            };
        };

        // handle when callee is busy during a call
        function handleBusyCall(callData) {
            setCurrentCallData((currentCallData) => {
                return {
                    ...currentCallData,
                    isCalleeBusy: true // UI should show that the callee is busy
                }
            });
        };

        // Switch-case to handle different types of WebSocket messages
        switch (webSocketMessageData?.type) {
            case "connections:requests":
                addNewUsersToConnections(webSocketMessageData?.connectionInfos);
                break;
            case "remove:connections":
                removeUsersFromConnections(webSocketMessageData?.connectionInfos);
                break;
            case "connections:accepted":
                acceptUsersConnectionsReq(webSocketMessageData?.connectionInfos);
                break;
            case 'user:profileInfo:change':
                handleChangeUserPorfileInfo(webSocketMessageData?.newProfileInfo);
                break;
            case 'user:email:update':
                handleChangeUserEmail(webSocketMessageData?.emailInfo);
                break;
            case 'group:create:success':
                handleGroupCreateSuccess(webSocketMessageData?.newGroupData);
                break;
            case 'group:profileInfo:change':
                handleChangeGroupePorfileInfo(webSocketMessageData?.newProfileInfo);
                break;
            case 'group:message:permission:change':
                handleChangeGroupMessagePermission(webSocketMessageData?.groupData);
                break;
            case "add:or:update:group":
                updateGroupData(webSocketMessageData?.groupData);
                break;
            case "group:join:success":
                handleGroupJoinedSuccessfully(webSocketMessageData?.newGroupData);
                break;
            case "remove:group:member":
                handleRemoveMemberFromGroup(webSocketMessageData?.removingInfo);
                break;
            case "remove:group:data":
                handleRemoveGroupData(webSocketMessageData?.groupID);
                break;
            case 'broadcast:create:success':
                handleBroadcastCreateSuccess(webSocketMessageData?.newBroadcastData);
                break;
            case "add:or:update:broadcast":
                updateBroadcastData(webSocketMessageData?.broadcastData);
                break;
            case 'broadcast:profileInfo:change':
                handleChangeBroadcastPorfileInfo(webSocketMessageData?.newProfileInfo);
                break;
            case "delete:broadcast:data":
                setAllChatBroadcastData((prevBroadcastData) => {
                    return prevBroadcastData?.filter((broadcastData) => broadcastData?._id != webSocketMessageData?.broadcastID);
                });
                break;
            case 'new:chats':
                handleIncomingChats(webSocketMessageData?.newChats);
                break;
            case "update:chats:status":
                updateChatReceiversInfo(webSocketMessageData?.chatsData);
                break;
            case "user:chatting:indicator":
                handleChatingIndicatorAction(webSocketMessageData?.actionInfo);
                break;
            case 'new:stories':
                handleIncomingStories(webSocketMessageData?.storiesData);
                break;
            case 'update:story:watching':
                handleStoryWatching(webSocketMessageData?.storyData);
                break;
            case 'remove:stories':
                handleRemoveStory(webSocketMessageData?.removingStoriesIDs);
                break;
            case 'incomming:call':
                handleIncomming(webSocketMessageData?.callData);
                break;
            case "busy:on:call":
                handleBusyCall(webSocketMessageData?.callData);
                break;
            case 'remove:user:data':
                setAllUsersData((prevUsersData) => prevUsersData?.filter((userData) => userData?._id != webSocketMessageData?.userID));
                break;
            default:
                // If no matching message type, do nothing
                break;
        }
    };

    useEffect(() => {
        if (currentUserID != null) {
            // Get dark mode preference from localStorage and apply if available
            const savedMode = JSON.parse(localStorage.getItem('darkMode'));
            if (savedMode !== null) {
                setActiveDarkMode(savedMode);
            };

            // Update user status to "online" in database
            handleChangeUserPorfileInfo({
                userID: currentUserID, updatingData: { activeStatus: "online" }
            });

            // Send user online status update via WebSocket
            sendWebSocketMessage(
                "user:profileInfo:change",
                "newProfileInfo",
                {
                    currentUserID,
                    visibilityKey: "activeStatusVisibility",
                    actionedToKey: "activeStatusActionedTo",
                    updatingDataKey: "activeStatus",
                    updatingValue: { activeStatus: "online" }
                }
            );

            // Fetch all users' data from server
            fetchUsersData()
                .then((response) => {
                    setAllUsersData(response?.data?.allUsers);
                    setUsersDataLoaded(true);
                })
                .catch((error) => {
                    console.log(error)
                });

            // Fetch all chat data from server
            fetchChatsData()
                .then((response) => {
                    let fetchedChats = response?.data?.chats;
                    setAllChatsData(fetchedChats);
                    setChatsDataLoaded(true);
                })
                .catch((error) => {
                    console.log(error)
                });

            // Fetch all call data
            fetchCallsData()
                .then((response) => {
                    // console.log('ok', response?.data?.calls)
                    setAllCallsData(response?.data?.calls)
                })
                .catch((error) => {
                    console.log(error)
                });

            // Fetch all stories data
            fetchStoriesData()
                .then((response) => {
                    setAllStoriesData(response?.data?.stories);
                })
                .catch((error) => {
                    console.log('Error:', error)
                });

            // Fetch all chat broadcasts data
            fetchChatBroadcastsData()
                .then((response) => {
                    setAllChatBroadcastData(response?.data?.broadcastData);
                    setBroadcastsDataLoaded(true);
                })
                .catch((error) => {
                    console.log(error)
                });

            // Fetch all group chat data
            fetchGroupsData()
                .then((response) => {
                    setAllGroupsData(response?.data?.groups);
                    setGroupsDataLoaded(true);
                })
                .catch((error) => {
                    console.log(error)
                });
        }
    }, [currentUserID])

    // Return UserContext.Provider with all context values and functions exposed to children components
    return (
        <UserContext.Provider
            value={{
                // web socket related
                wbServer,
                sendWebSocketMessage,
                showLoading,
                setShowLoading,
                getUserConnectionStatus,
                addNewUsersToConnections,
                removeUsersFromConnections,
                acceptUsersConnectionsReq,
                checkUserLoggedIn,

                // users related
                currentUserID,
                setCurrentUserID,
                isEmailVerifying,
                allUsersData,
                setAllUsersData,
                deleteRecentChatTab,
                clearChatHistory,
                addOrUpdateRecentTab,
                toggleUserBlocking,
                toggleDisappearingTimer,
                updateUserDataInDatabase,
                showProfileInfo,
                setShowProfileInfo,
                openedTabInfo,
                setOpenedTabInfo,
                showChatBox,
                showFileChatsInCarousel,
                setShowFileChatsInCarousel,
                openedFileChatData,
                setOpenedFileChatData,
                isVoiceRecordingCancelledRef,
                isVoiceRecording,
                setIsVoiceRecording,
                setShowChatBox,
                getSingleUserData,
                aiAssistant,
                prepareUserProfileInfoUpdating,
                handleChangeUserPorfileInfo,
                logoutUser,

                // groups related
                allGroupsData,
                setAllGroupsData,
                handleAddMemberToGroup,
                joinGroup,
                checkLinkExpiration,
                prepareMemberAddition,
                prepareMemberPromotionAndDemotion,
                prepareMemberDemotion,
                handleRemoveMemberFromGroup,
                prepareMemberRemoval,
                showGroupCreationPanel,
                setShowGroupCreationPanel,
                getSingleGroupData,
                prepareGroupMessagePermission,
                prepareGroupProfileInfoUpdating,

                // chats related
                allChatsData,
                getSingleChatData,
                setAllChatsData,
                deleteChats,
                deleteExpiredChats,
                keepChat,
                starChat,
                updateChatStatus,
                getUnreadChats,
                isFileUploading,
                setIsFileUploading,
                uploadedFiles,
                setUploadedFiles,
                showEditingPanel,
                setShowEditingPanel,
                fileEditingFor,
                setFileEditingFor,
                sendTextChat,
                sendFileChat,
                editChatContent,
                resendChat,
                makeChatUnsent,
                areChatsFilesReadyToSend,
                setAreChatsFilesReadyToSend,
                prepareSystemChatForShow,
                filesForSend,
                setFilesForSend,
                showChatForwardingPanel,
                setShowChatForwardingPanel,
                forwardingChats,
                setForwardingChats,
                chatBoxRef,
                chatBoxEndRef,
                setNeedToPrepareSystemChat,

                // story related
                showStoryView,
                setShowStoryView,
                allStoriesData,
                getSingleStoryData,
                setAllStoriesData,
                textStoryReadyToSend,
                setTextStoryReadyToSend,
                storyForDirectDisplay,
                setStoryForDirectDisplay,
                areMediaStoriesReadyToSend,
                setAreMediaStoriesReadyToSend,
                sendStories,
                editStoryContent,
                resendStory,
                deleteStories,
                deleteExpiredStories,

                // calls related
                allCallsData,
                getSingleCallData,
                setAllCallsData,
                makeNewCall,
                currentCallData,
                setCurrentCallData,

                // broadcast related
                showProgressBar,
                setShowProgressBar,
                allChatBroadcastData,
                setAllChatBroadcastData,
                showBroadcastCreationPanel,
                setShowBroadcastCreationPanel,
                getSingleBroadcastData,
                selectedUsersForGroupOrBroadcast,
                setSelectedUsersForGroupOrBroadcast,
                prepareBroadcastMemberAddition,
                prepareBroadcastMemberRemoval,
                prepareBroadcastProfileInfoUpdating,

                // section related
                handleShowingSections,
                showContactListSection,
                setShowContactListSection,
                showRecentChatsSection,
                setShowRecentChatsSection,
                showCallsSection,
                setShowCallsSection,
                showStoriesSection,
                setShowStoriesSection,
                showSettingsSection,
                setShowSettingsSection,
                editedProfileImgInfo,
                setEditedProfileImgInfo,
                showProfileEditingPanel,
                setShowProfileEditingPanel,

                // utilities
                activeDarkMode,
                setActiveDarkMode,
                getColorForName,
                safeParseJSON,
                highlightText,
                generateUniqueID,
                handleInputDirection,
                insertEmojiIntoInputField,
                printTextIn_InputField,
                handlePictureUpload,
                handleFileUpload,
                formatTimestamp,
                hideFileEditingPanel,
            }}
        >
            {children}
        </UserContext.Provider>
    )
}

export default UserContextProvider;
