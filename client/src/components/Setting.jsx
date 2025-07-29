import React, { useEffect, useContext, useState, useRef } from 'react'
import { FaCheck, FaUserPlus } from "react-icons/fa6";
import { faPen, faRightFromBracket, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { BsArrowLeft, BsCameraFill } from 'react-icons/bs';
import { HiOutlineFaceSmile, HiMiniChevronDown, HiMiniPhoto, HiLockClosed } from "react-icons/hi2";
import { UserContext } from '@context/UserContext';
import _ from 'lodash';
import { extractContentFromInputField } from "@utils";
import { ProfileTab, ProgressBar, HandleProfileImage, CameraFrame, TextWithEmojis, ConfirmationDialog } from "./index.js";
import EmojiPicker from 'emoji-picker-react';
import { ToastContainer, toast } from "react-toastify";
import { AiFillDelete } from "react-icons/ai";
import { useNavigate } from 'react-router-dom';
function Setting() {
    const {
        wbServer,
        setAllUsersData,
        getSingleUserData,
        currentUserID,
        setShowRecentChatsSection,
        handleShowingSections,
        activeDarkMode,
        setActiveDarkMode,
        safeParseJSON,
        handleInputDirection,
        insertEmojiIntoInputField,
        sendWebSocketMessage,
        logoutUser,
        toggleUserBlocking,
        handlePictureUpload,
        printTextIn_InputField,
        prepareUserProfileInfoUpdating,
        handleChangeUserPorfileInfo,
        currentCallData,
    } = useContext(UserContext);

    // For programmatic navigation
    const navigate = useNavigate();

    // Get the current user's data
    let currentUserData = getSingleUserData(currentUserID);

    // State variables for UI control and editing
    const [showPersonalInfoSection, setShowPersonalInfoSection] = useState(false); // Show personal information section
    const [isChangeName, setIsChangeName] = useState(false); // Enable name changing mode
    const nameInputRef = useRef(null); // Ref for name input field
    const [isNameInputNotEmpty, setIsNameInputNotEmpty] = useState(false); // Track if name input field is non-empty
    const [isChangeAbout, setIsChangeAbout] = useState(false); // Enable about-changing mode
    const aboutInputRef = useRef(null); // Ref for about input field
    const [isAboutInputNotEmpty, setIsAboutInputNotEmpty] = useState(false); // Track if about input field is non-empty
    const [showEmojiContainer, setShowEmojiContainer] = useState(false); // Toggle emoji picker
    const [profilePicInfo, setProfilePicInfo] = useState(null); // Info related to profile picture upload/change
    const [showFullProfilePic, setShowFullProfilePic] = useState(false); // Show full profile picture
    const [showProfilePicOption, setShowProfilePicOption] = useState(false); // Toggle profile pic options (camera/gallery/delete)
    const [showCameraPanel, setShowCameraPanel] = useState(false); // Toggle camera panel
    const [showProfileEditingPanel, setShowProfileEditingPanel] = useState(false); // Toggle profile editing component
    const [showPrivacyInfoSection, setShowPrivacyInfoSection] = useState(false); // Show privacy info section
    let visibilityOptions = ["public", "connections", "private", "included", "excluded"]; // Available visibility levels
    const [usersSelectingFor, setUsersSelectingFor] = useState(null); // Track which field visibility is being changed
    const [targetUsersForDisplay, setTargetUsersForDisplay] = useState([]); // Store users for current visibility setting
    const [selectedUsers, setSelectedUsers] = useState([]); // Users selected in visibility settings
    const [showProgressBar, setShowProgressBar] = useState(false); // Show progress bar during updates
    const [showAccountInfoSection, setShowAccountInfoSection] = useState(false); // Show account info section
    const [showConfirmationDialog, setShowConfirmationDialog] = useState(false); // Show confirmation dialog

    // Group all states controlling visibility sections into an array
    let allShowingStateSetters = [
        setShowPersonalInfoSection, setShowProfilePicOption, setIsChangeName, setIsChangeAbout,
        setShowEmojiContainer, setIsNameInputNotEmpty, setIsAboutInputNotEmpty,
        setShowPrivacyInfoSection, setShowAccountInfoSection
    ];

    // Function to show a specific section and hide all others
    function handleShowingSection(activeSetter) {
        allShowingStateSetters.forEach(setState => setState(false)); // Hide all
        activeSetter(true); // Show the selected one
    };

    // Function to close name/about editing area
    function closeActivityArea() {
        setIsChangeName(false);
        setIsChangeAbout(false);
        setIsNameInputNotEmpty(false);
        setIsAboutInputNotEmpty(false);
        setShowEmojiContainer(false);
    };

    // useEffect to handle profile picture upload logic
    useEffect(() => {
        if (profilePicInfo != null) {
            // Handle unsupported file rejection
            if (profilePicInfo?.rejection != null) {
                toast.error(`${profilePicInfo?.rejection?.msg}`);
                setProfilePicInfo(null);
            };
            // Open profile editing panel if a new image is captured
            if (profilePicInfo?.isCaptured && !profilePicInfo?.isReady) {
                setShowProfileEditingPanel(true);
            };
            // Upload the image once it's ready
            if (profilePicInfo?.isReady) {
                setShowProgressBar(true);
                prepareUserProfileInfoUpdating(
                    "profilePic",
                    {
                        ...profilePicInfo?.newFileData,
                        oldPublicId: currentUserData?.profileInfo?.publicId
                    },
                );
            };
        };
    }, [profilePicInfo]);

    // Function to reset all visibility-related variables
    function refreshAllVisibilitiesVariables() {
        setShowProgressBar(true);
        setUsersSelectingFor(null);
        setSelectedUsers([]);
    };

    // Check if a user already exists in actionedTo list with given condition
    function checkUserExistence(usersSelectingFor, targetUser, condition) {
        let actionedTo = [];
        if (usersSelectingFor?.startsWith("profilePic-")) actionedTo = currentUserData?.visibility?.profilePicActionedTo;
        if (usersSelectingFor?.startsWith("about-")) actionedTo = currentUserData?.visibility?.aboutActionedTo;
        if (usersSelectingFor?.startsWith("activeStatus-")) actionedTo = currentUserData?.visibility?.activeStatusActionedTo;
        if (usersSelectingFor?.startsWith("story-")) actionedTo = currentUserData?.visibility?.storyActionedTo;
        if (usersSelectingFor?.startsWith("chatDeliveryStatus-")) actionedTo = currentUserData?.visibility?.chatDeliveryStatusActionedTo;
        if (usersSelectingFor?.startsWith("chatSeenStatus-")) actionedTo = currentUserData?.visibility?.chatSeenStatusActionedTo;
        if (usersSelectingFor?.startsWith("storySeenStatus-")) actionedTo = currentUserData?.visibility?.storySeenStatusActionedTo;
        if (usersSelectingFor?.startsWith("addingToGroupAllowence-")) actionedTo = currentUserData?.visibility?.addingToGroupActionedTo;
        let checking = actionedTo?.some((actionedToInfo) => actionedToInfo?.targetUserID == targetUser && actionedToInfo?.[condition]);
        return checking;
    };

    // Handle changes to visibility settings (like profilePic, about, activeStatus)
    function handleChangePrivacy(condition, selectedUsers, visibilityKey, actionedToKey, eventName) {
        // Update user data locally
        setAllUsersData((prevUsersData) =>
            prevUsersData?.map((user) => {
                if (user?._id === currentUserID) {
                    return {
                        ...user,
                        visibility: {
                            ...user?.visibility,
                            [visibilityKey]: condition,
                            [actionedToKey]: selectedUsers?.length > 0 ? selectedUsers : user?.visibility?.[actionedToKey]
                        },
                    };
                }
                return user;
            })
        );

        // Send update via WebSocket
        sendWebSocketMessage(
            eventName,
            "newConditionData",
            {
                currentUserID,
                visibilityKey,
                actionedToKey,
                visibilityValue: condition,
                actionedToValues: selectedUsers?.length > 0 ? selectedUsers : []
            }
        );

        // Reset visibility variables
        refreshAllVisibilitiesVariables();
    };

    // Function to update group add permission settings
    function changeGroupAddingMeAllowence(condition, selectedUsers) {
        setAllUsersData(prevUsersData =>
            prevUsersData?.map(user =>
                user._id === currentUserID
                    ? {
                        ...user,
                        visibility: {
                            ...user.visibility,
                            addingToGroupAllowence: condition,
                            addingToGroupActionedTo:
                                selectedUsers?.length > 0
                                    ? selectedUsers
                                    : user.visibility.addingToGroupActionedTo,
                        },
                    }
                    : user
            )
        );

        // Notify server using WebSocket
        sendWebSocketMessage("group:adding-me:allowance:change", "newConditionData", {
            userID: currentUserID,
            addingToGroupAllowence: condition,
            addingToGroupActionedTo: selectedUsers?.length > 0 ? selectedUsers : [],
        });

        refreshAllVisibilitiesVariables();
    };

    // Decide if the tick icon should be shown for a user (based on selectedUsers list)
    const shouldShow = (userID) => {
        return selectedUsers?.some((selectedUser) => selectedUser?.targetUserID == userID);
    };

    // When targetUsersForDisplay changes, set selectedUsers based on current condition
    useEffect(() => {
        if (targetUsersForDisplay?.length > 0) {
            let conditionKey = usersSelectingFor?.split("-")?.pop() == "excluded" ? "isExcluded" : "isIncluded";
            setSelectedUsers(targetUsersForDisplay?.filter((userInfo) => userInfo?.[conditionKey]));
        };
    }, [targetUsersForDisplay, usersSelectingFor]);

    // Toggle user in/out of selectedUsers list
    function handleSelectedUsers(targetUserInfo) {
        setSelectedUsers((selectedUsers) => {
            let userExists = selectedUsers?.some((selectedUser) => selectedUser?.targetUserID == targetUserInfo?.targetUserID);
            if (userExists) {
                return selectedUsers?.filter((selectedUser) => selectedUser?.targetUserID != targetUserInfo?.targetUserID);
            } else {
                return [...selectedUsers || [], targetUserInfo];
            };
        });
    };

    // Handle incoming WebSocket messages to update UI accordingly
    function handleCommingWebSocketMessage(event) {
        const webSocketMessageData = JSON.parse(event.data);

        switch (webSocketMessageData.type) {
            case 'user:profileInfo:change':
                handleChangeUserPorfileInfo(webSocketMessageData?.newProfileInfo);
                closeActivityArea();
                setShowProgressBar(false);
                break;
            case 'setting:updated':
                closeActivityArea();
                setShowProgressBar(false);
                toast.success("Setting is updated!");
                break;
            case 'setting:failed':
                closeActivityArea();
                setShowProgressBar(false);
                toast.error("Setting is failed!");
                break;
            default:
                break;
        }
    }

    // Add WebSocket event listener on mount and remove on unmount
    useEffect(() => {
        wbServer.addEventListener("message", handleCommingWebSocketMessage);

        return () => {
            wbServer.removeEventListener("message", handleCommingWebSocketMessage);
        };
    }, [wbServer, handleCommingWebSocketMessage]);

    return (
        <React.Fragment>
            {/* profile picture handling - start */}
            {
                // If profile picture options are to be shown (camera, gallery, delete)
                showProfilePicOption &&
                <div className='overlay w-full h-full flex justify-center items-center'>
                    <div style={{ borderRadius: '10px' }} className={`optionForProfileImgInner w-auto h-auto bg-indigo-100`}>
                        {/* Back arrow button to close the profile pic option panel */}
                        <div className='w-full h-full flex justify-center items-center'>
                            <BsArrowLeft className='cursor-pointer myColor w-8 h-8'
                                onClick={() => {
                                    setShowProfilePicOption(false); // Close the option panel
                                }}
                            />
                        </div>
                        <div className='btnsContainer'>
                            {/* Option to open camera for capturing profile picture */}
                            <p onClick={() => {
                                if (currentCallData == null) {
                                    setShowCameraPanel(true); // Open the camera panel
                                    setShowProfilePicOption(false); // Close options panel
                                };
                            }} className={`flex items-center justify-center flex-col ${currentCallData && "cursor-not-allowed"}`}>
                                <button className='p-4 rounded-full text-white myBgColor'>
                                    <BsCameraFill className='w-6 h-6' />
                                </button>
                                <span className='mt-1 text-md text-gray-600 font-semibold'>
                                    Camera
                                </span>
                            </p>

                            {/* Option to open gallery and upload image */}
                            <p className='flex items-center justify-center flex-col'>
                                <label className='p-4 rounded-full text-white myBgColor cursor-pointer'>
                                    <HiMiniPhoto className='w-6 h-6' />
                                    <input
                                        type='file'
                                        accept='image/*'
                                        onChange={(e) => {
                                            // Handle the uploaded image file
                                            handlePictureUpload(
                                                e,
                                                setProfilePicInfo,
                                                setShowProfileEditingPanel
                                            );
                                            setShowProfilePicOption(false); // Close options panel
                                        }}
                                        className='hidden'  // Hide default file input UI
                                    />
                                </label>
                                <span className='mt-1 text-md text-gray-600 font-semibold'>
                                    Gallery
                                </span>
                            </p>

                            {
                                // If profile picture already exists, show "Remove" option
                                currentUserData?.profileInfo?.profilePic &&
                                <p className='flex items-center justify-center flex-col'>
                                    <button className='p-4 rounded-full text-white myBgColor' onClick={() => {
                                        setShowProgressBar(true); // Show loading/progress bar
                                        setShowProfilePicOption(false); // Close options panel
                                        prepareUserProfileInfoUpdating(
                                            "profilePic", // Key to update
                                            { oldPublicId: currentUserData?.profileInfo?.publicId }, // Value to update
                                        );
                                    }}>
                                        <AiFillDelete className='w-6 h-6' />
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
                // Show camera panel only when showCameraPanel is true
                showCameraPanel &&
                <CameraFrame
                    needToCapture={"image"} // Set capture mode to image
                    setShowCameraPanel={setShowCameraPanel} // Close camera panel
                    setCaptureImage={setProfilePicInfo} // Set captured image
                    setCaptureVideo={null} // Not capturing video in this case
                />
            }

            {
                // Show image editing panel only when showProfileEditingPanel is true
                showProfileEditingPanel &&
                <HandleProfileImage
                    profilePicInfo={profilePicInfo} // Pass profile picture info
                    setProfilePicInfo={setProfilePicInfo} // Update profile picture info
                    setShowProfileEditingPanel={setShowProfileEditingPanel} // Close editing panel
                />
            }

            {/* profile picture full view */}
            {
                // Show full profile picture view if showFullProfilePic is true
                showFullProfilePic &&
                <div className='prfoileImgContainer'>
                    <div className='prfoileImgBtn flex items-center justify-between'>
                        {/* Back button to exit full view */}
                        <BsArrowLeft className='cursor-pointer w-8 h-8'
                            onClick={() => {
                                setShowFullProfilePic(false); // Close full screen view
                            }}
                        />
                        {/* Edit button to open editing panel directly */}
                        <FontAwesomeIcon
                            icon={faPen}
                            className="w-3.5 h-3.5 cursor-pointer"
                            onClick={() => {
                                setShowFullProfilePic(false); // Close full screen
                                setProfilePicInfo({ fileURL: currentUserData?.profileInfo?.profilePic }); // Set current image to edit
                                setShowProfileEditingPanel(true); // Open editing panel
                            }}
                        />
                    </div>
                    <div className='prfoileImg h-auto overflow-hidden'>
                        {/* Display the full profile image */}
                        <img src={currentUserData?.profileInfo?.profilePic} alt="Uploaded" className="pointer-events-none w-full h-auto object-cover" />
                    </div>
                </div>
            }
            {/* profile picture handling - end */}

            {
                // Show progress/loading animation while uploading or changing profile picture
                showProgressBar &&
                <ProgressBar
                    position={'fixed'}
                />
            }

            {/* show users for selecting - start */}
            {
                // Check if there's an active selection context (e.g., selecting users for privacy settings)
                usersSelectingFor != null &&
                <div className='overlay'>
                    <div style={{ backgroundColor: "rgb(245,247,251)" }} className='overlayInner h-full m-auto text-gray-900'>
                        {/* Header section with back arrow and selection count */}
                        <div className={`${activeDarkMode ? "darkModeBg2" : ''} px-2 py-4 flex items-center justify-between`}>
                            <div className='flex justify-center items-center gap-x-2'>
                                {/* Back button to close user selection */}
                                <BsArrowLeft className='cursor-pointer w-8 h-8'
                                    onClick={() => {
                                        setUsersSelectingFor(null); // Clear selection context
                                        setSelectedUsers([]); // Clear selected users
                                        setTargetUsersForDisplay([]); // Clear display targets
                                    }}
                                />
                                <p className='text-xl font-semibold'>
                                    {
                                        // Display "Select" or count of selected users
                                        selectedUsers?.length == 0 ?
                                            "Select"
                                            :
                                            selectedUsers?.length + " Selected"
                                    }
                                </p>
                            </div>
                            <div>
                                {
                                    // Show confirmation check icon only when users are selected
                                    selectedUsers?.length != 0 &&
                                    <FaCheck className="cursor-pointer text-2xl" onClick={() => {
                                        // Extract condition type from usersSelectingFor string
                                        let condition = usersSelectingFor?.split("-")?.pop();
                                        let isIncluded = condition === "included"; // If the condition is inclusion
                                        let isExcluded = condition === "excluded"; // If the condition is exclusion

                                        // Filter selected users to exclude already present in targetUsersForDisplay
                                        let newSelectedUsers = selectedUsers?.filter((selectedUser) => {
                                            return (
                                                !targetUsersForDisplay?.some((targetUser) => targetUser?.targetUserID == selectedUser?.targetUserID)
                                            )
                                        });


                                        // Merge old and new selected users and apply inclusion/exclusion flags
                                        let checkedSelectedUsers = targetUsersForDisplay?.concat(newSelectedUsers)?.map((selectedUserInfo) => {
                                            return {
                                                ...selectedUserInfo,
                                                isIncluded: isIncluded ?
                                                    selectedUsers?.some((selectedUserInfo2) => selectedUserInfo2?.targetUserID == selectedUserInfo?.targetUserID)
                                                    :
                                                    selectedUserInfo?.isIncluded,
                                                isExcluded: isExcluded ?
                                                    selectedUsers?.some((selectedUserInfo2) => selectedUserInfo2?.targetUserID == selectedUserInfo?.targetUserID)
                                                    :
                                                    selectedUserInfo?.isExcluded,
                                            };
                                        });


                                        // Perform privacy updates based on selection context
                                        if (usersSelectingFor?.startsWith("profilePic-")) {
                                            handleChangePrivacy(
                                                condition, checkedSelectedUsers, "profilePicVisibility", "profilePicActionedTo", "profileInfo:visibility:change"
                                            );
                                        };
                                        if (usersSelectingFor?.startsWith("about-")) {
                                            handleChangePrivacy(
                                                condition, checkedSelectedUsers, "aboutVisibility", "aboutActionedTo",
                                                "profileInfo:visibility:change"
                                            );
                                        };
                                        if (usersSelectingFor?.startsWith("activeStatus-")) {
                                            handleChangePrivacy(
                                                condition, checkedSelectedUsers, "activeStatusVisibility", "activeStatusActionedTo",
                                                "profileInfo:visibility:change"
                                            );
                                        };
                                        if (usersSelectingFor?.startsWith("story-")) {
                                            handleChangePrivacy(
                                                condition, checkedSelectedUsers, "storyVisibility", "storyActionedTo",
                                                "storyOrChat:visibility:change"
                                            );
                                        };
                                        if (usersSelectingFor?.startsWith("chatDeliveryStatus-")) {
                                            handleChangePrivacy(
                                                condition, checkedSelectedUsers, "chatDeliveryStatusVisibility", "chatDeliveryStatusActionedTo",
                                                "storyOrChat:visibility:change"
                                            );
                                        };
                                        if (usersSelectingFor?.startsWith("chatSeenStatus-")) {
                                            handleChangePrivacy(
                                                condition, checkedSelectedUsers, "chatSeenStatusVisibility", "chatSeenStatusActionedTo",
                                                "storyOrChat:visibility:change"
                                            );
                                        };
                                        if (usersSelectingFor?.startsWith("storySeenStatus-")) {
                                            handleChangePrivacy(
                                                condition, checkedSelectedUsers, "storySeenStatusVisibility", "storySeenStatusActionedTo",
                                                "storyOrChat:visibility:change"
                                            );
                                        };
                                        if (usersSelectingFor?.startsWith("addingToGroupAllowence-")) {
                                            changeGroupAddingMeAllowence(condition, checkedSelectedUsers); // Special handler for group adding permission
                                        };
                                    }} />
                                }
                            </div>
                        </div>

                        {/* List of users to select from */}
                        <div className={`${activeDarkMode ? "darkModeBg2" : ''} w-full h-full overflow-y-auto`}>
                            {
                                (
                                    [
                                        ...targetUsersForDisplay, // Users already selected
                                        ...currentUserData?.connections?.filter(connection => {
                                            // Determine target user ID from connection data
                                            let targetUserID = connection?.initiaterUserID == currentUserID ? connection?.targetUserID : connection?.initiaterUserID;

                                            // Filter out users already displayed or blocked
                                            return (
                                                !targetUsersForDisplay?.some((selectedUser) => selectedUser?.targetUserID == targetUserID) &&
                                                !currentUserData?.blockedUsers?.includes(targetUserID)
                                            )
                                        })?.map((connection) => {
                                            // Build user info with inclusion/exclusion flags
                                            let targetUserID = connection?.initiaterUserID == currentUserID ? connection?.targetUserID : connection?.initiaterUserID;
                                            let isIncludedCheck = checkUserExistence(usersSelectingFor, targetUserID, "isIncluded");
                                            let isExcludedCheck = checkUserExistence(usersSelectingFor, targetUserID, "isExcluded");
                                            return {
                                                targetUserID,
                                                isIncluded: isIncludedCheck,
                                                isExcluded: isExcludedCheck
                                            }
                                        })
                                    ]
                                )?.map((targetUserInfo, idx) => {
                                    // Render each user tab with selection click handler
                                    return <div key={idx} onClick={() => {
                                        handleSelectedUsers(targetUserInfo); // Toggle user selection
                                    }} className={`relative`}>
                                        {/* Display user profile tab */}
                                        <button className={`${activeDarkMode ? "darkModeBg1" : ''} profileTab border-b border-gray-200 flex items-center justify-start w-full`}>
                                            <ProfileTab
                                                tabData={
                                                    {
                                                        ...getSingleUserData(targetUserInfo?.targetUserID),
                                                        tabName: getSingleUserData(targetUserInfo?.targetUserID)?.profileInfo?.name
                                                    }
                                                }
                                                currentUserID={currentUserID}
                                            />
                                        </button>

                                        {/* Show selection checkmark if user is selected */}
                                        <div style={{
                                            display: shouldShow(targetUserInfo?.targetUserID)
                                                ? 'flex'
                                                : 'none'
                                        }}
                                            className="selecting flex items-center justify-between">
                                            <div className={`selectingIcon ${usersSelectingFor?.split("-")?.pop() == "excluded" ? "bg-red-600" : ""}`}>
                                                <FaCheck className='w-4 h-4' />
                                            </div>
                                        </div>
                                    </div>
                                })
                            }
                        </div>
                    </div>
                </div>
            }
            {/* show users for selecting - end */}

            <div id="settings" className="w-full h-full">
                {/* Settings Title*/}
                <div className={`${activeDarkMode ? "darkModeBg2" : ''} text-gray-600 h-auto gap-x-4 h-12 w-full py-3 px-4`}>
                    <div className='flex flex-row items-center justify-between'>
                        <div className="flex items-center justify-center gap-x-2 text-xl font-semibold">
                            <button onClick={() => {
                                handleShowingSections(setShowRecentChatsSection);
                            }}>
                                <BsArrowLeft className='cursor-pointer w-6 h-6' />
                            </button>
                            Settings
                        </div>
                    </div>
                </div>
                {/* Profile */}
                <div className="flex flex-col items-center relative">
                    <div style={{
                        //background color for user, group and broadcast avatar only when they don't have any image
                        backgroundColor: currentUserData?.profileInfo?.bgColor,
                        borderColor: `${activeDarkMode ? "rgb(48,56,65)" : '#f5f7fb'}`,
                        outlineColor: `${activeDarkMode ? "rgb(75, 85, 99)" : '#e6ebf5'}`,
                    }} className={`largeProfileAvatar flex items-center justify-center rounded-full relative`}>
                        {
                            currentUserData?.profileInfo?.profilePic ? (
                                <img
                                    className="w-full h-full rounded-full cursor-pointer"
                                    src={`${currentUserData?.profileInfo?.profilePic}`}
                                    alt="Profile"
                                    onClick={() => {
                                        setShowFullProfilePic(true);
                                    }}
                                />
                            )
                                :
                                safeParseJSON(currentUserData?.profileInfo?.name)?.find(item => item.type === 'text')?.value?.charAt(0)?.toUpperCase()
                        }
                        <button onClick={() => {
                            setShowProfilePicOption(true);
                        }} className='p-2 myBgColor absolute bottom-0 right-1 rounded-full flex items-center justify-center'>
                            <FontAwesomeIcon icon={faPen} className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <h3 className="text-3xl font-semibold w-full text-center flex items-center justify-center">
                        <TextWithEmojis
                            hide={false}
                            textWidth={`auto`}
                            textData={currentUserData?.profileInfo?.name}
                        />
                    </h3>

                    {/* <!-- Status Dropdown --> */}
                    <div className="relative">
                        <div id="statusBtn" style={{ width: "90%" }} className="mx-auto text-center text-md flex items-center mt-1">
                            <TextWithEmojis
                                hide={false}
                                textWidth={`auto`}
                                textData={currentUserData?.profileInfo?.about}
                            />
                        </div>
                    </div>
                </div>

                {/* <!-- Accordion Sections --> */}
                <div className="mt-6 py-2">
                    {/* Wrapper div for the entire personal info section, with conditional dark mode styling */}
                    {/* Personal Info Section - start */}
                    <div style={{ width: "95%" }} className={`${activeDarkMode ? "darkModeBg1" : ''} mt-2 mx-auto rounded-md border`}>
                        {/* Button to toggle the visibility of the personal info section */}
                        <button onClick={() => {
                            handleShowingSection(setShowPersonalInfoSection); // Handle accordion section visibility logic
                            setShowPersonalInfoSection(!showPersonalInfoSection); // Toggle personal info section
                            setTimeout(() => {
                                // Autofill name and about fields if their refs exist
                                if (nameInputRef.current != null) {
                                    printTextIn_InputField(nameInputRef, currentUserData?.profileInfo?.name);
                                };
                                if (aboutInputRef.current != null) {
                                    printTextIn_InputField(aboutInputRef, currentUserData?.profileInfo?.about);
                                };
                            }, 10);
                        }} className="accordion flex justify-between w-full p-3 text-left font-medium rounded-md">
                            {/* Personal Info Section Title */}
                            Personal Info
                            {/* Toggle icon with rotation if section is open */}
                            <HiMiniChevronDown className={`${showPersonalInfoSection ? "rotate-180" : ""} h-6 w-6`} />
                        </button>

                        {/* Collapsible section that opens when `showPersonalInfoSection` is true */}
                        {
                            showPersonalInfoSection &&
                            <div className={`${activeDarkMode ? "darkModeBg3" : ''} bg-white`}>

                                {/* Name Field  Subsection */}
                                <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto w-full py-2.5 px-3 text-left relative border-b`}>
                                    <div className="w-full flex items-center justify-between">
                                        <p className='opacity-90 font-sm'>
                                            Name
                                        </p>
                                        {
                                            // Edit icon for name appears only when not already editing or input is empty
                                            (!isChangeName && !isNameInputNotEmpty) &&
                                            <FontAwesomeIcon onClick={() => {
                                                if (nameInputRef.current) {
                                                    printTextIn_InputField(nameInputRef, currentUserData?.profileInfo?.name);
                                                }
                                                // Enable name editing mode and reset about state
                                                setIsChangeName(true);
                                                setIsChangeAbout(false);
                                                setIsAboutInputNotEmpty(false);
                                            }} icon={faPen} className="ml-2 text-lg cursor-pointer"
                                            />
                                        }
                                        {
                                            // Check icon for name appears only when editing and input is not empty
                                            (isChangeName && isNameInputNotEmpty) &&
                                            <FaCheck className="text-2xl cursor-pointer" onClick={async () => {
                                                // Save new name if changed
                                                let extractedContentObject = await extractContentFromInputField(nameInputRef);
                                                prepareUserProfileInfoUpdating(
                                                    "name", // Updating name field
                                                    extractedContentObject, // New value
                                                );
                                                closeActivityArea(); // Close activity area
                                                setShowProgressBar(true); // Show progress bar
                                            }} />
                                        }
                                    </div>

                                    {/* Editable name input field with emoji icon if editing */}
                                    <div className="flex items-center mt-2">
                                        {
                                            (isChangeName) &&
                                            <HiOutlineFaceSmile className={`cursor-pointer h-8 w-8 mr-1`} onClick={() => {
                                                setShowEmojiContainer(true);
                                            }} />
                                        }
                                        <div
                                            ref={nameInputRef}
                                            contentEditable={isChangeName ? true : false}
                                            className={`${isChangeName ? `inputForMessage editable_div not_prevent_select input_field w-full border rounded-xl focus:outline-none focus:border-indigo-300 ${activeDarkMode ? "darkModeBg1" : ''}` : ""} `}
                                            onKeyDown={(e) => {
                                                // Handle input direction, max length, and prevent new lines
                                                handleInputDirection(
                                                    e,
                                                    nameInputRef,
                                                    setIsNameInputNotEmpty,
                                                    60,
                                                    false
                                                );
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* About Field  Subsection */}
                                <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto w-full py-2.5 px-3 text-left relative border-b`}>
                                    <div className="w-full flex items-center justify-between">
                                        <p className='opacity-90 font-sm'>
                                            About
                                        </p>
                                        {
                                            // Edit icon for about appears only when not already editing or input is empty
                                            (!isChangeAbout && !isAboutInputNotEmpty) &&
                                            <FontAwesomeIcon onClick={() => {
                                                if (aboutInputRef.current) {
                                                    printTextIn_InputField(aboutInputRef, currentUserData?.profileInfo?.about);
                                                }
                                                // Enable about editing and reset name state
                                                setIsChangeAbout(true);
                                                setIsChangeName(false);
                                                setIsNameInputNotEmpty(false);
                                            }} icon={faPen} className="ml-2 text-lg cursor-pointer"
                                            />
                                        }
                                        {
                                            // Check icon for about appears only when editing and input is not empty
                                            (isChangeAbout && isAboutInputNotEmpty) &&
                                            <FaCheck className="text-2xl cursor-pointer" onClick={async () => {
                                                // Save new about if changed
                                                let extractedContentObject = await extractContentFromInputField(aboutInputRef);
                                                prepareUserProfileInfoUpdating(
                                                    "about",
                                                    extractedContentObject,
                                                );
                                                closeActivityArea();
                                                setShowProgressBar(true);
                                            }} />
                                        }
                                    </div>

                                    {/* Editable about input field with emoji icon if editing */}
                                    <div className="flex items-center mt-2">
                                        {
                                            (isChangeAbout) &&
                                            <HiOutlineFaceSmile className={`cursor-pointer h-8 w-8 mr-1`} onClick={() => {
                                                setShowEmojiContainer(true);
                                            }} />
                                        }
                                        <div
                                            ref={aboutInputRef}
                                            contentEditable={isChangeAbout ? true : false}
                                            className={`${isChangeAbout ? `mt-2 inputForMessage editable_div not_prevent_select input_field w-full border rounded-xl focus:outline-none focus:border-indigo-300 ${activeDarkMode ? "darkModeBg1" : ''}` : ""} `}
                                            onKeyDown={(e) => {
                                                // Handle input direction, max length, and prevent new lines
                                                handleInputDirection(
                                                    e,
                                                    aboutInputRef,
                                                    setIsAboutInputNotEmpty,
                                                    100,
                                                    false
                                                );
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Email display section (not editable) */}
                                <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto flex flex-col w-full py-2.5 px-3 text-left relative border-b`}>
                                    <div className="w-full flex items-center justify-between">
                                        <p className='opacity-90 font-sm'>
                                            Email
                                        </p>
                                        <FontAwesomeIcon onClick={() => {
                                            if (currentCallData == null) {
                                                navigate("/auth/reset-email")
                                            };
                                        }} icon={faPen} className={`ml-2 text-lg ${currentCallData == null ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                        />
                                    </div>
                                    <div className="flex items-center mt-2">
                                        <p className='font-medium'>
                                            {currentUserData?.email}
                                        </p>
                                    </div>
                                </div>

                                {/* Toggle between Light and Dark mode */}
                                <div className={`${activeDarkMode ? "darkModeBg3" : ''} cursor-pointer m-auto flex flex-col w-full py-2.5 px-3 text-left relative border-b`} onClick={() => {
                                    // Update dark mode preference and persist to local storage
                                    setActiveDarkMode((prevMode) => {
                                        const newMode = !prevMode;
                                        localStorage.setItem('darkMode', JSON.stringify(newMode));
                                        return newMode;
                                    });
                                }}>
                                    <p className='opacity-90 font-sm'>
                                        Appearance
                                    </p>
                                    <p className='font-medium'>
                                        {
                                            activeDarkMode ?
                                                "Dark Mode"
                                                :
                                                "Light Mode"
                                        }
                                    </p>
                                </div>
                            </div>
                        }

                        {/* Emoji Picker Container */}
                        {
                            showEmojiContainer &&
                            <div style={{ height: "300px" }} className={`absolute bottom-0 w-full px-4 bg-white overflow-y-auto`}>
                                <EmojiPicker
                                    onEmojiClick={
                                        emoji =>
                                            insertEmojiIntoInputField(
                                                {
                                                    emojiUrl: emoji.imageUrl,
                                                    emojiUnicode: emoji.emoji
                                                },
                                                isChangeName ? nameInputRef : aboutInputRef,
                                                isChangeName ? setIsNameInputNotEmpty : setIsAboutInputNotEmpty
                                            )
                                    }
                                    emojiStyle={"apple"}
                                    lazyLoadEmojis={true}
                                />
                            </div>
                        }
                    </div>
                    {/* Personal Info Section - end */}
                    {/* Privacy Info Section - start */}
                    <div style={{ width: "95%" }} className={`${activeDarkMode ? "darkModeBg1" : ''} mt-2 mx-auto rounded-md border `}>
                        {/* // Button to toggle the Privacy section visibility */}
                        <button
                            onClick={() => {
                                handleShowingSection(setShowPrivacyInfoSection); // Handle accordion section visibility logic
                                setShowPrivacyInfoSection(!showPrivacyInfoSection); // Toggle privacy info section
                            }}
                            className="accordion flex justify-between w-full p-3 text-left font-medium rounded-md"
                        >
                            {/* Privacy Info Section label */}
                            Privacy
                            {/* Chevron icon that rotates when section is expanded */}
                            <HiMiniChevronDown className={`${showPrivacyInfoSection ? "rotate-180" : ""} h-6 w-6`} />
                        </button>
                        {
                            showPrivacyInfoSection &&
                            <div className={`${activeDarkMode ? "darkModeBg3" : ''} bg-white`}>
                                {/* Profile Visibility Privacy Subsection */}
                                <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto flex items-center justify-between w-full py-2.5 px-3 text-left relative border-b`}>
                                    {/* Subsection Label */}
                                    <p className='font-sm text-md'>Profile</p>

                                    {/* Visibility Option Button */}
                                    <div className={`${activeDarkMode ? "darkModeBg1" : ''} bg-gray-200 p-2 text-sm rounded-md flex items-center justify-between cursor-pointer capitalize showChildOnParentHover`}>
                                        {/* Currently selected visibility option */}
                                        {
                                            currentUserData?.visibility?.profilePicVisibility
                                        }
                                        {/* Down Arrow Icon */}
                                        <HiMiniChevronDown className={`rotateShowingElementButtonOnHover h-6 w-6`} />

                                        {/* Dropdown menu for visibility options */}
                                        <div
                                            style={{ top: "50px", right: "0px", transition: "0.3s", width: "170px", padding: '6px 0px' }}
                                            className={`showOnHover ${activeDarkMode ? "darkModeBg1" : ''} block absolute right-0 z-10 mt-0 w-auto origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}>
                                            {
                                                visibilityOptions?.map((option, idx) => {
                                                    return (
                                                        <p
                                                            key={idx}
                                                            className="text-left cursor-pointer block px-4 py-2 text-md capitalize"
                                                            onClick={() => {
                                                                // Handle options that require user selection
                                                                if (option == "included" || option == "excluded") {
                                                                    setTargetUsersForDisplay(currentUserData?.visibility?.profilePicActionedTo);
                                                                    setUsersSelectingFor(`profilePic-${option}`);
                                                                } else {
                                                                    // Directly apply visibility change
                                                                    handleChangePrivacy(
                                                                        option,
                                                                        null,
                                                                        "profilePicVisibility",
                                                                        "profilePicActionedTo",
                                                                        "profileInfo:visibility:change"
                                                                    );
                                                                };
                                                            }}>{option}</p>
                                                    )
                                                })
                                            }
                                        </div>
                                    </div>
                                </div>

                                {/* About Visibility Privacy Subsection */}
                                <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto flex items-center justify-between w-full py-2.5 px-3 text-left relative border-b`}>
                                    {/* Subsection Label */}
                                    <p className='font-sm text-md'>About</p>

                                    {/* Visibility Option Button */}
                                    <div className={`${activeDarkMode ? "darkModeBg1" : ''} bg-gray-200 p-2 text-sm rounded-md flex items-center justify-between cursor-pointer capitalize showChildOnParentHover`}>
                                        {/* Currently selected visibility option */}
                                        {
                                            currentUserData?.visibility?.aboutVisibility
                                        }
                                        {/* Down Arrow Icon */}
                                        <HiMiniChevronDown className={`rotateShowingElementButtonOnHover h-6 w-6`} />

                                        {/* Dropdown menu for visibility options */}
                                        <div
                                            style={{ top: "50px", right: "0px", transition: "0.3s", width: "170px", padding: '6px 0px' }}
                                            className={`showOnHover ${activeDarkMode ? "darkModeBg1" : ''} block absolute right-0 z-10 mt-0 w-auto origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}>
                                            {
                                                visibilityOptions?.map((option, idx) => {
                                                    return (
                                                        <p
                                                            key={idx}
                                                            className="text-left cursor-pointer block px-4 py-2 text-md capitalize"
                                                            onClick={() => {
                                                                // Handle options that require user selection
                                                                if (option == "included" || option == "excluded") {
                                                                    setTargetUsersForDisplay(currentUserData?.visibility?.aboutActionedTo);
                                                                    setUsersSelectingFor(`about-${option}`);
                                                                } else {
                                                                    // Directly apply visibility change
                                                                    handleChangePrivacy(
                                                                        option, null, "aboutVisibility", "aboutActionedTo",
                                                                        "profileInfo:visibility:change"
                                                                    );
                                                                };
                                                            }}>{option}</p>
                                                    )
                                                })
                                            }
                                        </div>
                                    </div>
                                </div>

                                {/* Active Status Visibility Privacy Subsection */}
                                <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto flex items-center justify-between w-full py-2.5 px-3 text-left relative border-b `}>
                                    {/* Subsection Label */}
                                    <p className='font-sm text-md'>Active status</p>

                                    {/* Visibility Option Button */}
                                    <div className={`${activeDarkMode ? "darkModeBg1" : ''} bg-gray-200 p-2 text-sm rounded-md flex items-center justify-between cursor-pointer capitalize showChildOnParentHover`}>
                                        {/* Currently selected visibility option */}
                                        {
                                            currentUserData?.visibility?.activeStatusVisibility
                                        }
                                        {/* Down Arrow Icon */}
                                        <HiMiniChevronDown className={`rotateShowingElementButtonOnHover h-6 w-6`} />

                                        {/* Dropdown menu for visibility options */}
                                        <div
                                            style={{ top: "50px", right: "0px", transition: "0.3s", width: "170px", padding: '6px 0px' }}
                                            className={`showOnHover ${activeDarkMode ? "darkModeBg1" : ''} block absolute right-0 z-10 mt-0 w-auto origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}>
                                            {
                                                visibilityOptions?.map((option, idx) => {
                                                    return (
                                                        <p
                                                            key={idx}
                                                            className="text-left cursor-pointer block px-4 py-2 text-md capitalize"
                                                            onClick={() => {
                                                                // Handle options that require user selection
                                                                if (option == "included" || option == "excluded") {
                                                                    setTargetUsersForDisplay(currentUserData?.visibility?.activeStatusActionedTo);
                                                                    setUsersSelectingFor(`activeStatus-${option}`);
                                                                } else {
                                                                    // Directly apply visibility change
                                                                    handleChangePrivacy(
                                                                        option, null, "activeStatusVisibility", "activeStatusActionedTo",
                                                                        "profileInfo:visibility:change"
                                                                    );
                                                                };
                                                            }}>{option}</p>
                                                    )
                                                })
                                            }
                                        </div>
                                    </div>
                                </div>

                                {/* Story Visibility Privacy Subsection */}
                                <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto flex items-center justify-between w-full py-2.5 px-3 text-left relative border-b `}>
                                    {/* Subsection Label */}
                                    <p className='font-sm text-md'>Story</p>

                                    {/* Visibility Option Button */}
                                    <div className={`${activeDarkMode ? "darkModeBg1" : ''} bg-gray-200 p-2 text-sm rounded-md flex items-center justify-between cursor-pointer capitalize showChildOnParentHover`}>
                                        {/* Currently selected visibility option */}
                                        {currentUserData?.visibility?.storyVisibility}
                                        {/* Down Arrow Icon */}
                                        <HiMiniChevronDown className={`rotateShowingElementButtonOnHover h-6 w-6`} />

                                        {/* Dropdown menu for visibility options (excluding 'public') */}
                                        <div style={{ top: "50px", right: "0px", transition: "0.3s", width: "170px", padding: '6px 0px' }} className={`showOnHover ${activeDarkMode ? "darkModeBg1" : ''} block absolute right-0 z-10 mt-0 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5`}>
                                            {visibilityOptions.map((option, idx) => (
                                                option != 'public' &&
                                                <p
                                                    key={idx}
                                                    className="text-left cursor-pointer block px-4 py-2 text-md capitalize"
                                                    onClick={() => {
                                                        // Handle options that require user selection
                                                        if (option == "included" || option == "excluded") {
                                                            setTargetUsersForDisplay(currentUserData?.visibility?.storyActionedTo);
                                                            setUsersSelectingFor(`story-${option}`);
                                                        } else {
                                                            // Directly apply visibility change
                                                            handleChangePrivacy(
                                                                option,
                                                                null,
                                                                "storyVisibility",
                                                                "storyActionedTo",
                                                                "storyOrChat:visibility:change"
                                                            );
                                                        }
                                                    }}>{option}</p>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Chat Delivery Status Privacy Subsection */}
                                <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto flex items-center justify-between w-full py-2.5 px-3 text-left relative border-b `}>
                                    {/* Subsection Label */}
                                    <p className='font-sm text-md'>Chat Delivery</p>

                                    {/* Dropdown Trigger */}
                                    <div className={`${activeDarkMode ? "darkModeBg1" : ''} bg-gray-200 p-2 text-sm rounded-md flex items-center justify-between cursor-pointer capitalize showChildOnParentHover`}>
                                        {/* Display current visibility setting */}
                                        {currentUserData?.visibility?.chatDeliveryStatusVisibility}

                                        {/* Dropdown Arrow Icon */}
                                        <HiMiniChevronDown className={`rotateShowingElementButtonOnHover h-6 w-6`} />

                                        {/* Dropdown Options */}
                                        <div style={{ top: "50px", right: "0px", transition: "0.3s", width: "170px", padding: '6px 0px' }} className={`showOnHover ${activeDarkMode ? "darkModeBg1" : ''} block absolute right-0 z-10 mt-0 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5`}>
                                            {visibilityOptions.map((option, idx) => (
                                                // Render each visibility option
                                                <p key={idx} className="text-left cursor-pointer block px-4 py-2 text-md capitalize" onClick={() => {
                                                    if (option == "included" || option == "excluded") {
                                                        // Handle custom user selection for included/excluded
                                                        setTargetUsersForDisplay(currentUserData?.visibility?.chatDeliveryStatusActionedTo);
                                                        setUsersSelectingFor(`chatDeliveryStatus-${option}`);
                                                    } else {
                                                        // Handle default visibility setting
                                                        handleChangePrivacy(
                                                            option,
                                                            null,
                                                            "chatDeliveryStatusVisibility",
                                                            "chatDeliveryStatusActionedTo",
                                                            "storyOrChat:visibility:change"
                                                        );
                                                    }
                                                }}>{option}</p>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Chat Seen Status Privacy Subsection */}
                                <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto flex items-center justify-between w-full py-2.5 px-3 text-left relative border-b `}>
                                    {/* Subsection Label */}
                                    <p className='font-sm text-md'>Chat Seen</p>

                                    {/* Dropdown Trigger */}
                                    <div className={`${activeDarkMode ? "darkModeBg1" : ''} bg-gray-200 p-2 text-sm rounded-md flex items-center justify-between cursor-pointer capitalize showChildOnParentHover`}>
                                        {/* Display current visibility setting */}
                                        {currentUserData?.visibility?.chatSeenStatusVisibility}

                                        {/* Dropdown Arrow Icon */}
                                        <HiMiniChevronDown className={`rotateShowingElementButtonOnHover h-6 w-6`} />

                                        {/* Dropdown Options */}
                                        <div style={{ top: "50px", right: "0px", transition: "0.3s", width: "170px", padding: '6px 0px' }} className={`showOnHover ${activeDarkMode ? "darkModeBg1" : ''} block absolute right-0 z-10 mt-0 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5`}>
                                            {visibilityOptions.map((option, idx) => (
                                                // Render each visibility option
                                                <p key={idx} className="text-left cursor-pointer block px-4 py-2 text-md capitalize" onClick={() => {
                                                    if (option == "included" || option == "excluded") {
                                                        // Handle custom user selection
                                                        setTargetUsersForDisplay(currentUserData?.visibility?.chatSeenStatusActionedTo);
                                                        setUsersSelectingFor(`chatSeenStatus-${option}`);
                                                    } else {
                                                        // Handle default visibility setting
                                                        handleChangePrivacy(
                                                            option, null, "chatSeenStatusVisibility", "chatSeenStatusActionedTo",
                                                            "storyOrChat:visibility:change"
                                                        );
                                                    }
                                                }}>{option}</p>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Story Seen Status Privacy Subsection */}
                                <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto flex items-center justify-between w-full py-2.5 px-3 text-left relative border-b `}>
                                    {/* Subsection Label */}
                                    <p className='font-sm text-md'>Story Seen</p>

                                    {/* Dropdown Trigger */}
                                    <div className={`${activeDarkMode ? "darkModeBg1" : ''} bg-gray-200 p-2 text-sm rounded-md flex items-center justify-between cursor-pointer capitalize showChildOnParentHover`}>
                                        {/* Display current visibility setting */}
                                        {currentUserData?.visibility?.storySeenStatusVisibility}

                                        {/* Dropdown Arrow Icon */}
                                        <HiMiniChevronDown className={`rotateShowingElementButtonOnHover h-6 w-6`} />

                                        {/* Dropdown Options */}
                                        <div style={{ top: "50px", right: "0px", transition: "0.3s", width: "170px", padding: '6px 0px' }} className={`showOnHover ${activeDarkMode ? "darkModeBg1" : ''} block absolute right-0 z-10 mt-0 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5`}>
                                            {visibilityOptions.map((option, idx) => (
                                                // Render each visibility option
                                                <p key={idx} className="text-left cursor-pointer block px-4 py-2 text-md capitalize" onClick={() => {
                                                    if (option == "included" || option == "excluded") {
                                                        // Handle custom user selection
                                                        setTargetUsersForDisplay(currentUserData?.visibility?.storySeenStatusActionedTo);
                                                        setUsersSelectingFor(`storySeenStatus-${option}`);
                                                    } else {
                                                        // Handle default visibility setting
                                                        handleChangePrivacy(
                                                            option, null, "storySeenStatusVisibility", "storySeenStatusActionedTo",
                                                            "storyOrChat:visibility:change"
                                                        );
                                                    }
                                                }}>{option}</p>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Group Adding Allowance Privacy Subsection */}
                                <div className={`${activeDarkMode ? "darkModeBg3" : ''} m-auto flex items-center justify-between w-full py-2.5 px-3 text-left relative border-b `}>
                                    {/* Subsection Label */}
                                    <p className='font-sm text-md'>Group Adding</p>

                                    {/* Dropdown Trigger */}
                                    <div className={`${activeDarkMode ? "darkModeBg1" : ''} bg-gray-200 p-2 text-sm rounded-md flex items-center justify-between cursor-pointer capitalize showChildOnParentHover`}>
                                        {/* Display current allowance setting */}
                                        {currentUserData?.visibility?.addingToGroupAllowence}

                                        {/* Dropdown Arrow Icon */}
                                        <HiMiniChevronDown className={`rotateShowingElementButtonOnHover h-6 w-6`} />

                                        {/* Dropdown Options */}
                                        <div style={{ top: "50px", right: "0px", transition: "0.3s", width: "170px", padding: '6px 0px' }} className={`showOnHover ${activeDarkMode ? "darkModeBg1" : ''} block absolute right-0 z-10 mt-0 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5`}>
                                            {visibilityOptions.map((option, idx) => (
                                                // Render each visibility option
                                                <p key={idx} className="text-left cursor-pointer block px-4 py-2 text-md capitalize" onClick={() => {
                                                    if (option == "included" || option == "excluded") {
                                                        // Handle included/excluded user lists
                                                        setTargetUsersForDisplay(currentUserData?.visibility?.addingToGroupActionedTo);
                                                        setUsersSelectingFor(`addingToGroupAllowence-${option}`);
                                                    } else {
                                                        // Handle general allowance change
                                                        changeGroupAddingMeAllowence(option, null);
                                                    }
                                                }}>{option}</p>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {
                                    // Check if the user has any blocked users
                                    currentUserData?.blockedUsers?.length > 0 &&
                                    <div className={`m-auto w-full text-left relative`}>
                                        {/* Section title for blocked users */}
                                        <p className='font-sm text-md mb-2 py-2.5 px-3 pb-0'>
                                            Blocked Users :
                                        </p>

                                        {
                                            // Map through each blocked user ID and display their profile tab
                                            currentUserData?.blockedUsers?.map((blockedUserID, idx) => {
                                                return (
                                                    <div key={idx} className={`relative`}>
                                                        {/* Button displaying the blocked user's profile information */}
                                                        <button className={`${activeDarkMode ? "darkModeBg1" : ''} profileTab border-b border-gray-200 flex items-center justify-start w-full`}>
                                                            <ProfileTab
                                                                tabData={{
                                                                    // Get data of the blocked user using their ID
                                                                    ...getSingleUserData(blockedUserID),
                                                                    tabName: getSingleUserData(blockedUserID)?.profileInfo?.name
                                                                }}
                                                                currentUserID={currentUserID}
                                                                descWidth={`210px`}
                                                            />
                                                        </button>

                                                        {/* Unblock button for each blocked user */}
                                                        <div
                                                            style={{ backgroundColor: "rgb(114, 105, 239)", top: "8%", right: "8px", zIndex: "9" }}
                                                            className={`cursor-pointer absolute flex justify-center items-center p-1 rounded-md text-sm`}
                                                            onClick={() => {
                                                                // Try to find the recent chat tab info for the blocked user
                                                                let tabInfo = currentUserData?.recentChatsTabs?.find(
                                                                    (recentChatTabInfo) => recentChatTabInfo?.tabID == blockedUserID
                                                                ) || {
                                                                    // If not found, create a default tab info object
                                                                    tabID: blockedUserID,
                                                                    tabType: "user",
                                                                    recentTime: "",
                                                                    clearingTime: "",
                                                                    isArchived: false,
                                                                    isPinned: false,
                                                                    disappearingTime: "off"
                                                                };

                                                                // Trigger unblock functionality by setting isBlocking to false
                                                                toggleUserBlocking({
                                                                    ...tabInfo,
                                                                    isBlocking: false, // as it is time of unblocking
                                                                });
                                                            }}
                                                        >
                                                            Unblock
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        }
                                    </div>
                                }
                            </div>
                        }
                    </div>
                    {/* Privacy Info Section - end */}
                    {/* Account Info Section - start */}
                    <div style={{ width: "95%" }} className={`${activeDarkMode ? "darkModeBg1" : ''} mt-2 mx-auto rounded-md border `}>

                        {/* Accordion button to toggle Account section */}
                        <button className="accordion flex justify-between w-full p-3 text-left font-medium rounded-md" onClick={() => {
                            handleShowingSection(setShowAccountInfoSection); // Handle accordion behavior
                            setShowAccountInfoSection(!showAccountInfoSection); // Toggle visibility of Account section
                        }}>
                            Account
                            {/* Dropdown arrow icon */}
                            <HiMiniChevronDown className="h-6 w-6" />
                        </button>

                        {
                            // Show Account info content if toggled open
                            showAccountInfoSection &&
                            <div className={`${activeDarkMode ? "darkModeBg3" : ''} bg-white`}>
                                {/* Create another account */}
                                <div className={`${activeDarkMode ? "darkModeBg3" : 'text-gray-600'} ${currentCallData == null ? 'cursor-pointer' : 'cursor-not-allowed'} m-auto w-full p-3 text-left relative border-b`} onClick={() => {
                                    if (currentCallData == null) {
                                        navigate("/auth/signup")
                                    };
                                }}>
                                    <div className="w-full flex items-center justify-between">
                                        <p className='font-sm'>
                                            Create another account
                                        </p>
                                        <FaUserPlus className="ml-2 h- w-6 cursor-pointer" />
                                    </div>
                                </div>
                                {/* Login with another account */}
                                <div className={`${activeDarkMode ? "darkModeBg3" : 'text-gray-600'} ${currentCallData == null ? 'cursor-pointer' : 'cursor-not-allowed'} m-auto w-full p-3 text-left relative border-b`} onClick={() => {
                                    if (currentCallData == null) {
                                        navigate("/auth/login")
                                    };
                                }}>
                                    <div className="w-full flex items-center justify-between">
                                        <p className='font-sm'>
                                            Login with another account
                                        </p>
                                        <FontAwesomeIcon icon={faRightFromBracket} style={{ transform: "rotate(180deg)" }} className="ml-2 text-xl cursor-pointer" />
                                    </div>
                                </div>
                                {/* Password change option */}
                                <div className={`${activeDarkMode ? "darkModeBg3" : 'text-gray-600'} ${currentCallData == null ? 'cursor-pointer' : 'cursor-not-allowed'} m-auto w-full p-3 text-left relative border-b`} onClick={() => {
                                    if (currentCallData == null) {
                                        navigate("/auth/reset-password")
                                    };
                                }}>
                                    <div className="w-full flex items-center justify-between">
                                        <p className='font-sm'>
                                            Reset Password
                                        </p>
                                        {/* Password icon */}
                                        <HiLockClosed className="ml-2 h- w-6 cursor-pointer" />
                                    </div>
                                </div>
                                {/* Logout option */}
                                <div className={`${activeDarkMode ? "darkModeBg3" : 'text-gray-600'} m-auto w-full p-3 text-left relative border-b`} onClick={() => {
                                    handleShowingSections(setShowRecentChatsSection);
                                    logoutUser(); // Trigger logout function
                                }}>
                                    <div className="w-full flex items-center justify-between">
                                        <p className='font-sm'>
                                            Logout
                                        </p>
                                        {/* Logout icon */}
                                        <FontAwesomeIcon icon={faRightFromBracket} className="ml-2 text-xl cursor-pointer" />
                                    </div>
                                </div>

                                {/* Delete Account option */}
                                <div className={`${activeDarkMode ? "darkModeBg3" : 'text-gray-600'} ${currentCallData == null ? 'cursor-pointer' : 'cursor-not-allowed'} m-auto w-full py-2.5 px-3 text-left relative border-b`} onClick={() => {
                                    if (currentCallData == null) {
                                        setShowConfirmationDialog(true); // Open confirmation dialog before deleting account
                                    };
                                }}>
                                    <div className="w-full flex items-center justify-between text-red-500">
                                        <p className='font-sm'>
                                            Delete Account
                                        </p>
                                        {/* Trash icon for delete account */}
                                        <FontAwesomeIcon icon={faTrashCan} className="ml-2 text-xl cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                        }
                    </div>
                    {/* Account Info Section - end */}

                    {/* Help Section - start */}
                    <div style={{ width: "95%" }} className={`${activeDarkMode ? "darkModeBg1" : ''} mt-2 mx-auto rounded-md border `}>

                        {/* Accordion button to toggle Help section */}
                        <button className="accordion flex justify-between w-full p-3 text-left font-medium rounded-md" onClick={() => {
                            navigate('/feedback');
                        }}>
                            Give feedback
                        </button>

                    </div>
                    {/* Help Section - end */}

                    <div className={` mt-2 w-full text-center text-sm text-gray-500 p-2`}>
                        Powered by <a href="mailto:infostndmaketech@gmail.com">Abdul Kareem</a>
                    </div>
                </div>
            </div>
            {
                // Confirmation dialog (e.g., delete confirmation)
                showConfirmationDialog &&
                <ConfirmationDialog
                    textMsg={`Deleting your account is permanent.\nAll your data, including chats, media, and preferences, will be lost forever.\nAre you absolutely sure you want to continue?`}
                    textColor={'text-red-500'}
                    handleConfirmAction={() => {
                        setShowConfirmationDialog(false);
                        navigate("/auth/delete-account")
                    }}
                    setShowConfirmationDialog={setShowConfirmationDialog}
                />
            }
            {/* toast for success message and error */}
            <ToastContainer />
        </React.Fragment>
    )
}

export default Setting;
