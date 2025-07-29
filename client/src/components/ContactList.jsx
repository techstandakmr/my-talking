import React, { useContext, useEffect, useRef, useState } from 'react';
import { HiBellAlert } from 'react-icons/hi2';
import { BsArrowLeft } from 'react-icons/bs';
import { BiDotsVerticalRounded, BiSolidGroup } from 'react-icons/bi';
import { UserContext } from '@context/UserContext';
import _ from 'lodash';
import { FaCheck, FaClockRotateLeft, FaUserCheck, FaUserClock, FaUserPlus } from 'react-icons/fa6';
import LoadingIcons from 'react-loading-icons';
import { fetchUsersData } from "@api";
import { TextWithEmojis } from "./index.js";
import { ToastContainer, toast } from "react-toastify";
import { HiOutlineSearch } from "react-icons/hi";

// Safe JSON parser to avoid errors if the input is not valid JSON
const safeParseJSON = (value) => {
    try {
        // Attempt to parse the value, return an empty array if parsing fails
        return JSON.parse(value) || [];
    } catch (e) {
        // Return an empty array in case of error during parsing
        return [];
    }
};

// ProfileTab component to render user or group profile info in a tab
function ProfileTab({
    tabData, currentUserID, isSearching
}) {
    return (
        <React.Fragment>
            {/* User avatar box with dynamic background color */}
            <div
                style={{
                    backgroundColor: tabData?.profileInfo?.bgColor
                }}
                className="user_avatar_box flex items-center justify-center"
            >
                {/* Conditional rendering for profile picture or other avatar */}
                {
                    tabData?.profileInfo?.profilePic ? (
                        // If profile picture exists, display it
                        <div className='imgContainer flex items-center justify-center text-2xl rounded-full relative'>
                            <img
                                className="w-full h-full rounded-full"
                                src={`${tabData?.profileInfo?.profilePic}`}
                                alt="Profile"
                            />
                        </div>
                    ) : tabData?.profileInfo?.description // If description exists, it indicates this is a group
                        ? (
                            // Render a group icon if this is a group
                            <BiSolidGroup className="text-3xl text-white" />
                        ) : (
                            // Otherwise, render the first letter of the user's name if it's not a group
                            safeParseJSON(tabData?.profileInfo?.name)?.find(item => item.type === 'text' && item?.value != '')?.value?.charAt(0)?.toUpperCase()
                        )
                }
            </div>
            {/* Profile information section */}
            <div className={`ml-2 text-left w-full profileTabInfo`} style={{
                // Adjust padding based on the presence of 'about' or 'description'
                // width: '85%',
                padding: (tabData?.profileInfo?.about == null && !tabData?.profileInfo?.description) ? "18px 0px" : "8px 0px"
            }}>
                {/* User name section */}
                <p className='flex justify-between items-center'>
                    <span className='flex text-lg font-semibold'>
                        {
                            // Display 'You' if it's the current user, otherwise display their name with emojis
                            currentUserID == tabData?._id ? "You" :
                                <TextWithEmojis
                                    hide={true}
                                    textWidth={`auto`}
                                    areaName={'tabInfo'}
                                    textData={tabData?.profileInfo?.name}
                                    isSearching={isSearching}
                                />
                        }
                    </span>
                </p>
                {/* Description or about section */}
                <p className='text-sm'>
                    <TextWithEmojis
                        hide={true}
                        textWidth={`auto`}
                        areaName={'tabInfo'}
                        textData={tabData?.profileInfo?.about || tabData?.profileInfo?.description}
                        isSearching={isSearching}
                    />
                </p>
            </div>
        </React.Fragment>
    )
};

function ContactList() {
    const {
        allUsersData,
        currentUserID,
        setAllUsersData,
        setOpenedTabInfo,
        showChatBox,
        setShowChatBox,
        allChatsData,
        safeParseJSON,
        activeDarkMode,
        getSingleUserData,
        aiAssistant,
        getUserConnectionStatus,
        addNewUsersToConnections,
        acceptUsersConnectionsReq,
        removeUsersFromConnections,
        sendWebSocketMessage,
        generateUniqueID,
        setShowRecentChatsSection,
        handleShowingSections,
        deleteExpiredChats,
        deleteExpiredStories,
        updateUserDataInDatabase
    } = useContext(UserContext);

    // Fetch current user data
    let currentUserData = getSingleUserData(currentUserID);

    // State for loading state when user refreshes the user list
    const [dataLoading, setDataLoading] = useState(false);

    // Alphabet array for organizing users by name initials
    const alphabetArray = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

    // State for selecting users
    const [isSelecting, setIsSelecting] = useState(false);

    // Ref to store the timeout ID for long press functionality
    const holdTimeoutRef = useRef(null);

    // State for tracking selected users across renders
    const [selectedUsers, setSelectedUsers] = useState([]);
    // Function to handle user selection (add or remove user from selected list)
    async function handleUserSelecting(userID) {
        setSelectedUsers((selectedUsers) => {
            // Check if the user is already selected
            const isUserSelected = selectedUsers?.includes(userID);
            if (isUserSelected) {
                // If already selected, remove the user
                return selectedUsers?.filter((prevUserID) => prevUserID !== userID);
            } else {
                // If not selected, add the user to the list
                return [...selectedUsers, userID];
            }
        });
    };

    // Function to start the long press action
    const handleHoldStart = (userID) => {
        // Set a timeout to trigger long press after 500ms
        holdTimeoutRef.current = setTimeout(() => {
            // Call handleUserSelecting to add user to selection after long press
            handleUserSelecting(userID);
            setIsSelecting(true);
        }, 500);
    };

    // Function to clear the hold (mouse up or touch end)
    const handleHoldEnd = (holdTimeoutRef) => {
        // Clear timeout if the long press ends
        if (holdTimeoutRef.current) {
            clearTimeout(holdTimeoutRef.current);
            holdTimeoutRef.current = null;
        }
    };
    // Handle changes in selected users based on the selection state
    useEffect(() => {
        // If no users are selected, stop selecting
        if (selectedUsers?.length === 0) {
            setIsSelecting(false);
        } else {
            setIsSelecting(true);
        }
    }, [selectedUsers, handleUserSelecting, handleHoldStart, handleHoldEnd]);

    // States to control visibility of different connection sections
    const [showAcceptedConnections, setShowAcceptedConnections] = useState(true);
    const [showPendingConnections, setShowPendingConnections] = useState(false);
    const [showNonConnectionsUsers, setShowNonConnectionsUsers] = useState(false);
    const [showConnectionsNotifications, setShowConnectionsNotifications] = useState(false);
    const wasInNotificationView = useRef(false);
    // All setters for showing connection sections
    const allShowingSettersOfConnections = [
        setShowAcceptedConnections,
        setShowPendingConnections,
        setShowNonConnectionsUsers,
        setShowConnectionsNotifications
    ];

    // Function to control visibility of the connection sections
    function handleShowingSetterOfConnections(activeSetter) {
        allShowingSettersOfConnections.forEach(setState => setState(false)); // Set all to false
        activeSetter(true); // Set active section to true
    };

    // Fetch connection notifications
    let connectionsNotifications = () => {
        return currentUserData?.connections?.filter((connectionInfo) =>
            (connectionInfo?.targetUserID == currentUserID && connectionInfo?.status == "pending")
            ||
            (connectionInfo?.initiaterUserID == currentUserID && connectionInfo?.status == "accepted" && !connectionInfo?.acceptingSeenByInitiator)
        )
    };
    // function to seen accepted connections
    function readNewAcceptedConnections() {
        let readAcceptedConnections = currentUserData?.connections?.map((connectionInfo) => {
            if (connectionInfo?.initiaterUserID == currentUserID && connectionInfo?.status == "accepted" && !connectionInfo?.acceptingSeenByInitiator) {
                return { ...connectionInfo, acceptingSeenByInitiator: true }
            };
            return connectionInfo;
        });
        let filterCondition = {
            _id: currentUserID,
        };
        let updateOperation = {
            connections: readAcceptedConnections
        };
        updateUserDataInDatabase(filterCondition, updateOperation);
        setAllUsersData((prevUsersData) =>
            prevUsersData?.map((userData) => {
                if (userData?._id === currentUserID) {
                    return {
                        ...userData,
                        connections: readAcceptedConnections
                    };
                }
                return userData;
            })
        );
    };
    // update accepted connections seen by initiator 
    useEffect(() => {
        if (showConnectionsNotifications) {
            wasInNotificationView.current = true;
        };
        // When user switches away from notifications area
        if (
            wasInNotificationView.current &&
            !showConnectionsNotifications &&
            (showAcceptedConnections || showPendingConnections || showNonConnectionsUsers || showChatBox)
        ) {
            readNewAcceptedConnections();
            wasInNotificationView.current = false; // reset after calling
        }
    }, [showChatBox, showAcceptedConnections, showPendingConnections, showNonConnectionsUsers, showConnectionsNotifications]);
    // Function to get users data based on connection visibility states
    function getUsersDataForShowing() {
        // Fetch accepted connections
        let acceptedConnections = currentUserData?.connections?.filter((connectionInfo) => connectionInfo?.status == "accepted")
            ?.map((connectionInfo) => {
                if (connectionInfo?.initiaterUserID == currentUserID) {
                    return getSingleUserData(connectionInfo?.targetUserID)
                } else {
                    return getSingleUserData(connectionInfo?.initiaterUserID)
                };
            });

        // Fetch pending connections
        let pendingConnections = currentUserData?.connections?.filter((connectionInfo) =>
            connectionInfo?.initiaterUserID == currentUserID && connectionInfo?.status == "pending")?.map((connectionInfo) =>
                getSingleUserData(connectionInfo?.targetUserID)
            );
        // Fetch non-connected users
        let nonConnectionsUsers = allUsersData?.filter((user) =>
            user?._id != currentUserID // Exclude current user
            && !currentUserData?.connections?.some((connectionInfo) =>
                (connectionInfo?.initiaterUserID == user?._id || connectionInfo?.targetUserID == user?._id)
            )
        );

        // Return the appropriate user data based on the visibility flags
        if (showAcceptedConnections) {
            return acceptedConnections;
        } else if (showPendingConnections) {
            return pendingConnections;
        } else if (showNonConnectionsUsers) {
            return nonConnectionsUsers;
        };
    };

    // Searching functionality - start
    const [showSearchBox, setShowSearchBox] = useState(false); // Visibility state for the search box
    const [searchTerm, setSearchTerm] = useState(''); // State to store the search term
    const [searchedUsers, setSearchedUsers] = useState([]); // State to store search results
    // Function to handle search term input and filter users
    const handleSearch = (e) => {
        const term = e.target.value?.trim().toLowerCase(); // Trim and convert input to lowercase
        setSearchTerm(e.target.value); // Update state with the search term

        // Reset search results if term is empty
        if (term === '') {
            setSearchedUsers([]);
            return;
        }

        // Helper function to normalize spaces in strings
        const normalizeSpaces = (str) => str.replace(/\s+/g, ' ').trim();

        // Function to get name or about field from user profile
        const getTextValue = (userData, key) => {
            let values = userData?.profileInfo?.[key];
            return safeParseJSON(values)
                ?.map(g => g?.value)
                ?.join(' ') || ''; // Join values if there are multiple
        };

        // Filter users based on matching search term with name, about, or username
        const userMatches = getUsersDataForShowing()?.filter(user => {
            let name = normalizeSpaces(getTextValue(user, 'name'))?.toLowerCase();
            let about = normalizeSpaces(getTextValue(user, 'about'))?.toLowerCase();
            let username = user?.username?.toLowerCase();
            return (name.includes(term) || about.includes(term) || username.includes(term));
        });

        setSearchedUsers(userMatches); // Update state with highlighted search results
    };
    // Searching functionality - end

    // Organize users by alphabet letter for easy browsing
    let usersDataForShowing = alphabetArray.flatMap((letter) => {
        const sourceData = (searchTerm === '' ? getUsersDataForShowing() : searchedUsers)?.filter((user) => {
            let firstChar = safeParseJSON(user?.profileInfo?.name)
                ?.find(item => item.type === 'text' && item?.value != '')?.value
                ?.charAt(0)?.toUpperCase();
            return firstChar === letter;
        });
        return sourceData?.length > 0 ? [{ sourceData, letter }] : [];
    });
    function openeTheTab(tabID, tabType) {
        const existingTab = currentUserData?.recentChatsTabs?.find(tab => tab?.tabID === tabID);
        setOpenedTabInfo(
            existingTab
            || {
                tabType: tabType,
                tabID: tabID,
                recentTime: new Date().toISOString(), // Use the current time as recentTime
                clearingTime: "", // clearingTime initially empty
                isArchived: false,
                isPinned: false,
                disappearingTime: "Off"
            }
        ); // Set opened tab info
        setShowChatBox(true);
        handleShowingSections(setShowRecentChatsSection);
        deleteExpiredChats(); // delete expired chats
        deleteExpiredStories(); // delete expired stories
    };
    // ContactTab component for each user or connection
    function ContactTab({ tabData }) {
        return (
            <div onClick={(e) => {
                if (!isSelecting) {
                    openeTheTab(tabData?._id, "user");
                } else {
                    // except the current user
                    if (tabData?._id != currentUserID) {
                        handleUserSelecting(tabData?._id);
                    };
                }
            }}
                onTouchStart={(e) => {
                    // except the current user
                    if (tabData?._id != currentUserID) {
                        handleHoldStart(tabData?._id);
                    };
                }} // For mobile: touch start begins the long press timer
                onTouchEnd={(e) => {
                    handleHoldEnd(holdTimeoutRef)
                }}
                onTouchCancel={(e) => {
                    handleHoldEnd(holdTimeoutRef)
                }} className='relative'>
                <button className={`${activeDarkMode ? "darkModeBg2" : ''} profileTab border-b border-gray-200 relative flex items-center justify-start w-full`}>
                    <ProfileTab
                        tabData={tabData}
                        currentUserID={currentUserID}
                        isSearching={searchTerm ? true : false}
                    />
                </button>
                <div style={{
                    display: selectedUsers?.includes(tabData?._id)
                        ? 'flex'
                        : 'none'
                }}
                    className="selecting flex items-center justify-between">
                    <div className='selectingIcon'>
                        <FaCheck className='w-4 h-4' />
                    </div>
                </div>
            </div>
        )
    };
    return (
        <div className="flex flex-col px-0 py-2 w-70 flex-shrink-0 h-full">
            {/* top bar - start */}
            <div className={`${activeDarkMode ? "darkModeBg2" : ''} h-auto border-b border-gray-200 gap-x-4 h-12 w-full py-2.5 px-4`}>
                <div className='flex flex-row items-center justify-between'>
                    {/* Title Section: Shows either number of selected users or 'Contact List' */}
                    <div className="flex items-center justify-center gap-x-2 text-xl font-semibold">
                        {/* this button for mobile view */}
                        <button onClick={() => {
                            handleShowingSections(setShowRecentChatsSection);
                        }} className={`hidden ${!showConnectionsNotifications && "hideContactsButton"}`}>
                            <BsArrowLeft className='cursor-pointer w-6 h-6' />
                        </button>
                        {
                            // show button for hiding connections notifications area, when it is opened
                            showConnectionsNotifications &&
                            <button onClick={() => {
                                handleShowingSetterOfConnections(setShowAcceptedConnections);
                            }} className=''>
                                <BsArrowLeft className='cursor-pointer w-6 h-6' />
                            </button>
                        }
                        {/* show contact list */}
                        {!isSelecting && !showConnectionsNotifications && "Contact list"}
                        {
                            isSelecting &&
                            <span className='font-semi'>
                                {selectedUsers?.length} Selected
                            </span>
                        }
                        {/* Contact List */}
                    </div>

                    {/* Action Buttons Section */}
                    <div className={`${activeDarkMode ? "darkModeTextColor" : 'text-gray-600'} flex items-center `}>
                        {
                            // Hide search & refresh buttons when selecting users and connections notifications are opened
                            (!isSelecting && !showConnectionsNotifications) &&
                            <>
                                {/* notification */}

                                <button type="button" className="relative inline-flex items-center justify-center h-9 w-9 transition duration-500 ease-in-out focus:outline-none" onClick={() => {
                                    handleShowingSetterOfConnections(setShowConnectionsNotifications);
                                }}>
                                    <HiBellAlert className={`${activeDarkMode ? "darkModeTextColor" : ''} w-6 h-6`} />
                                    {
                                        connectionsNotifications()?.length > 0 &&
                                        <span id='notificationBadge' style={{ right: "0px" }}>
                                            {
                                                connectionsNotifications()?.length > 99 ?
                                                    connectionsNotifications()?.length + '99+'
                                                    :
                                                    connectionsNotifications()?.length
                                            }
                                        </span>
                                    }
                                </button>
                                {/* Search Button */}
                                <button type="button" className="relative inline-flex items-center justify-center h-9 w-9 transition duration-500 ease-in-out focus:outline-none">
                                    <HiOutlineSearch className={`${activeDarkMode ? "darkModeTextColor" : ''} w-6 h-6`}
                                        onClick={() => {
                                            // Toggle search box and reset search state
                                            setShowSearchBox(!showSearchBox);
                                            setSearchTerm("");
                                            setSearchedUsers([]);
                                        }}
                                    />
                                </button>

                                {/* Refresh Button */}
                                <button type="button" className="relative inline-flex items-center justify-center h-9 w-9 transition duration-500 ease-in-out  focus:outline-none">
                                    {
                                        dataLoading ?
                                            // Loading spinner when data is being fetched
                                            <LoadingIcons.Bars width={20} height={20} fill='rgb(114, 105, 239)' stroke="rgb(114, 105, 239)" strokeOpacity={.125} speed={.75} />
                                            :
                                            // Refresh icon
                                            <FaClockRotateLeft className={`${activeDarkMode ? "darkModeTextColor" : ''} w-5 h-5`}
                                                onClick={() => {
                                                    setDataLoading(true);
                                                    // Fetch users again and update list
                                                    fetchUsersData()
                                                        .then((response) => {
                                                            setAllUsersData(response?.data?.allUsers);
                                                            setDataLoading(false);
                                                            toast.success('Updated successfully');
                                                        })
                                                        .catch((error) => {
                                                            console.log(error)
                                                        });
                                                }}
                                            />
                                    }
                                </button>
                            </>
                        }

                        {
                            selectedUsers?.length > 0 &&
                            <>
                                {/* Options Menu */}
                                <button type="button" className={`relative inline-flex items-center justify-center h-9 w-9 transition duration-500 ease-in-out  focus:outline-none showChildOnParentHover`}>
                                    <BiDotsVerticalRounded className={`w-7 h-7`} />
                                    {/* Dropdown Menu */}
                                    <div style={{ top: "40px", right: "0px", transition: "0.3s", padding: '6px 0px' }} className={`showOnHover block absolute right-0 z-10 mt-0 w-max origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none text-gray-700 ${activeDarkMode ? "darkModeBg1" : ''}`} role="menu" aria-orientation="vertical" aria-labelledby="menu-button" tabIndex="-1">
                                        {/* Dynamic action buttons when users are selected */}
                                        <div onClick={() => {
                                            if (showAcceptedConnections || showPendingConnections) {
                                                let connectionInfos = selectedUsers?.map((userID) => {
                                                    let connectionInfo = getUserConnectionStatus(userID)?.result;
                                                    let remover = getUserConnectionStatus(userID)?.result?.targetUserID == currentUserID ? "targetUser" : "initiaterUser";
                                                    return { ...connectionInfo, remover };
                                                });
                                                removeUsersFromConnections(connectionInfos);
                                                sendWebSocketMessage(
                                                    'remove:connections',
                                                    'connectionInfos',
                                                    connectionInfos
                                                );
                                            } else if (showNonConnectionsUsers) {
                                                let newConnectionInfo = selectedUsers?.map((userID) => {
                                                    return {
                                                        initiaterUserID: currentUserID,
                                                        targetUserID: userID,
                                                        status: "pending",
                                                        connectionID: generateUniqueID("CON"),
                                                        acceptingSeenByInitiator: false
                                                    }
                                                });
                                                addNewUsersToConnections(newConnectionInfo);
                                                sendWebSocketMessage(
                                                    'connections:requests',
                                                    'connectionInfos',
                                                    newConnectionInfo
                                                );
                                            } else if (showConnectionsNotifications) {
                                                let connectionInfos = selectedUsers?.map((userID) => {
                                                    let connectionInfo = getUserConnectionStatus(userID)?.result;
                                                    return connectionInfo;
                                                });
                                                acceptUsersConnectionsReq(connectionInfos);
                                                sendWebSocketMessage(
                                                    "connections:accepted",
                                                    'connectionInfos',
                                                    connectionInfos
                                                );
                                            };
                                            // Reset selection state
                                            setIsSelecting(false);
                                            setSelectedUsers([]);
                                        }}>
                                            <p className="text-left cursor-pointer block px-4 py-2 text-md" role="menuitem" tabIndex="-1" id="menu-item-0">
                                                {showAcceptedConnections && "Remove connections"}
                                                {showPendingConnections && "Cancel connections request"}
                                                {showNonConnectionsUsers && "Add to connections"}
                                                {showConnectionsNotifications && "Accept connections"}
                                            </p>
                                        </div>
                                        {/* Extra option: Only for notifications tab */}
                                        {
                                            showConnectionsNotifications &&
                                            <div onClick={() => {
                                                let connectionInfos = selectedUsers?.map((userID) => {
                                                    let connectionInfo = getUserConnectionStatus(userID)?.result;
                                                    return { ...connectionInfo, remover: "targetUser" };
                                                });
                                                removeUsersFromConnections(connectionInfos);
                                                sendWebSocketMessage(
                                                    'remove:connections',
                                                    'connectionInfos',
                                                    connectionInfos
                                                );
                                                setIsSelecting(false);
                                                setSelectedUsers([]);
                                            }}>
                                                <p className="text-left cursor-pointer block px-4 py-2 text-md" role="menuitem" tabIndex="-1" id="menu-item-0">
                                                    Reject connections request
                                                </p>
                                            </div>
                                        }
                                    </div>
                                </button>
                            </>
                        }

                    </div>
                </div>

                {/* Search Box Section */}
                {
                    showSearchBox &&
                    <div className="mt-3 mx-auto">
                        <div className={`${activeDarkMode ? "darkModeBg2" : ''} relative flex items-center w-full h-10 rounded-lg bg-white overflow-hidden`}>
                            {/* Search Icon */}
                            <div className={`${activeDarkMode ? "darkModeBg2" : ''} grid bg-gray-200 place-items-center h-full w-12 text-gray-300`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            {/* Search Input */}
                            <div className="h-full w-full outline-none text-sm text-dark" id="search">
                                <input
                                    type="text"
                                    className={`${activeDarkMode ? "darkModeBg2" : ''} h-full w-full outline-none text-lg bg-gray-200 text-dark`}
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                            </div>
                        </div>
                    </div>
                }
            </div>

            {/* Tabs Navigation */}
            {
                !isSelecting &&
                <div className="pt-1 pb-2 flex items-center justify-between w-full">
                    {
                        !showConnectionsNotifications &&
                        <>
                            {/* Connections Tab */}
                            <div onClick={() => {
                                handleShowingSetterOfConnections(setShowAcceptedConnections);
                            }} style={{
                                borderColor: showAcceptedConnections ? "rgba(0, 135, 255, 0.5)" : 'transparent',
                            }} className="navMediaTab flex items-center justify-center p-3 w-full border-b-2 border-gray-200 flex-col cursor-pointer">
                                Connections
                            </div>

                            {/* Pending Tab */}
                            <div onClick={() => {
                                handleShowingSetterOfConnections(setShowPendingConnections);
                            }} style={{
                                borderColor: showPendingConnections ? "rgba(0, 135, 255, 0.5)" : 'transparent',
                            }} className="navMediaTab flex items-center justify-center p-3 w-full border-b-2 border-gray-200 flex-col cursor-pointer">
                                Pending
                            </div>

                            {/* Others Tab */}
                            <div onClick={() => {
                                handleShowingSetterOfConnections(setShowNonConnectionsUsers);
                            }} style={{
                                borderColor: showNonConnectionsUsers ? "rgba(0, 135, 255, 0.5)" : 'transparent',
                            }} className="navMediaTab flex items-center justify-center p-3 w-full border-b-2 border-gray-200 flex-col cursor-pointer">
                                Others
                            </div>
                        </>
                    }
                </div>
            }
            {/* top bar - end */}

            {/* user list area - start */}
            {
                ((usersDataForShowing?.length > 0 && !showConnectionsNotifications) || showAcceptedConnections) &&
                <div className="h-full w-full overflow-y-auto">
                    {
                        // show current user 
                        showAcceptedConnections &&
                        <>
                            <button className={`${activeDarkMode ? "darkModeBg2" : ''} profileTab flex items-center justify-start w-full border-b border-gray-200`} onClick={() => {
                                openeTheTab(currentUserID, "user");
                            }}>
                                <ProfileTab
                                    tabData={currentUserData}
                                    currentUserID={currentUserID}
                                    isSearching={searchTerm ? true : false}
                                />
                            </button>
                            {/* show ai assistant tab */}
                            <button className={`${activeDarkMode ? "darkModeBg2" : ''} profileTab flex items-center justify-start w-full border-b border-gray-200`} onClick={() => {
                                openeTheTab(aiAssistant?._id, "aiAssistant");
                            }}>
                                <ProfileTab
                                    tabData={aiAssistant}
                                    currentUserID={currentUserID}
                                    isSearching={searchTerm ? true : false}
                                />
                            </button>
                        </>
                    }
                    {
                        usersDataForShowing?.map((userDataByLetter, idx) => {
                            return (
                                <div key={idx}>
                                    {/* Letter separator heading */}
                                    <div
                                        style={{ color: "rgb(114, 105, 239)" }}
                                        className="text-xl font-semibold px-4 py-1 w-full"
                                    >
                                        {userDataByLetter?.letter}
                                    </div>

                                    {/* Render matching users */}
                                    {
                                        userDataByLetter?.sourceData.map((userData, userIdx) => (
                                            <div key={`${idx}-${userIdx}`} className='relative'>
                                                {/* Render each contact tab */}
                                                <ContactTab
                                                    tabData={userData}
                                                />
                                                {
                                                    // show action icon only when selecting is disabled and 
                                                    selectedUsers?.length == 0 &&
                                                    <>
                                                        {/* Quick action icon (Add, Accept, Pending, Remove) */}
                                                        <div className={`cursor-pointer absolute top-8 right-2 ${activeDarkMode ? "darkModeTextColor" : 'text-gray-600'}`} style={{ transform: "translateY(-50%)", top: "50%", right: "16px", zIndex: "999" }} onClick={() => {
                                                            if (showNonConnectionsUsers) {
                                                                let newConnectionInfo = {
                                                                    initiaterUserID: currentUserID,
                                                                    targetUserID: userData?._id,
                                                                    status: "pending",
                                                                    connectionID: generateUniqueID("CON"),
                                                                    acceptingSeenByInitiator: false
                                                                };
                                                                addNewUsersToConnections([newConnectionInfo]);
                                                                sendWebSocketMessage(
                                                                    'connections:requests',
                                                                    'connectionInfos',
                                                                    [newConnectionInfo]
                                                                ); // send to the server and then target user
                                                            };
                                                        }}>
                                                            <div className="showChildOnParentHover">
                                                                {showAcceptedConnections && <FaUserCheck className="w-6 h-6" />}
                                                                {(showPendingConnections) && <FaUserClock className="w-6 h-6" />}
                                                                {showNonConnectionsUsers && <FaUserPlus className="w-6 h-6" />}
                                                                {/* Popup action box (Accept / Reject / Remove / Cancel) */}
                                                                {
                                                                    !showNonConnectionsUsers &&
                                                                    <div className={`w-max absolute top-6 mt-3 cursor-pointer right-0 showOnHover ${activeDarkMode ? "darkModeBg3" : ''} bg-white shadow-lg py-3 px-4 z-10 rounded-md transition-all duration-300 ease-in-out transform origin-top-right border-1 border-gray-300 flex flex-col gap-y-3.5 ring-1 ring-black ring-opacity-5`}>
                                                                        <p onClick={() => {
                                                                            let connectionInfo = getUserConnectionStatus(userData?._id)?.result;
                                                                            let remover = getUserConnectionStatus(userData?._id)?.result?.targetUserID == currentUserID ? "targetUser" : "initiaterUser";
                                                                            removeUsersFromConnections([connectionInfo]);
                                                                            sendWebSocketMessage(
                                                                                "remove:connections",
                                                                                'connectionInfos',
                                                                                [{ ...connectionInfo, remover }]
                                                                            );
                                                                        }} className="w-full">
                                                                            {
                                                                                showPendingConnections && "Cancel request"
                                                                            }
                                                                            {
                                                                                showAcceptedConnections && "Remove connection"
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                }
                                                            </div>
                                                        </div>

                                                    </>
                                                }
                                            </div>
                                        ))
                                    }
                                </div>
                            );
                        })
                    }
                </div>
            }
            {
                // show empty message 
                (
                    (usersDataForShowing?.length == 0 && !showConnectionsNotifications)
                    ||
                    (connectionsNotifications()?.length == 0 && showConnectionsNotifications)
                ) &&
                <div className={`${activeDarkMode ? "darkModeTextColor" : 'text-gray-500'} flex items-center justify-center w-full h-full text-lg font-semi`}>
                    {showPendingConnections && "No pending connections"}
                    {showNonConnectionsUsers && "No users"}
                    {showConnectionsNotifications && "No connections notifications"}
                </div>
            }
            {/* show connections notifications (new requests or accepted connections) */}
            {
                (connectionsNotifications()?.length > 0 && showConnectionsNotifications) &&
                <div className="h-full w-full overflow-y-auto">
                    {
                        // show Accepted Connections , label if there unseen accepted connections
                        connectionsNotifications()?.filter((connectionInfo) =>
                            (connectionInfo?.initiaterUserID == currentUserID && connectionInfo?.status == "accepted" && !connectionInfo?.acceptingSeenByInitiator)
                        )?.length > 0 &&
                        <>
                            <div
                                style={{ color: "rgb(114, 105, 239)" }}
                                className="text-lg font-semibold px-4 py-1 w-full mb-2"
                            >
                                New Connections
                            </div>
                            {
                                connectionsNotifications()?.filter((connectionInfo) =>
                                    (connectionInfo?.initiaterUserID == currentUserID && connectionInfo?.status == "accepted" && !connectionInfo?.acceptingSeenByInitiator)
                                )?.map((connectionInfo) => {
                                    return (
                                        <button className={`${activeDarkMode ? "darkModeBg2" : ''} profileTab border-b border-gray-200 relative flex items-center justify-start w-full`} onClick={() => {
                                            openeTheTab(
                                                connectionInfo?.initiaterUserID == currentUserID ? connectionInfo?.targetUserID : connectionInfo?.initiaterUserID,
                                                "user"
                                            );
                                        }}>
                                            <ProfileTab
                                                tabData={connectionInfo?.initiaterUserID == currentUserID ? getSingleUserData(connectionInfo?.targetUserID) : getSingleUserData(connectionInfo?.initiaterUserID)}
                                                currentUserID={currentUserID}
                                                isSearching={searchTerm ? true : false}
                                            />
                                        </button>
                                    )
                                })
                            }
                        </>
                    }
                    {
                        // show Accepted Connections , label if there unseen accepted connections
                        connectionsNotifications()?.filter((connectionInfo) =>
                            (connectionInfo?.targetUserID == currentUserID && connectionInfo?.status == "pending")
                        )?.length > 0 &&
                        <>
                            <div
                                style={{ color: "rgb(114, 105, 239)" }}
                                className="text-lg font-semibold px-4 py-1 w-full my-2"
                            >
                                Invitation
                            </div>
                            {
                                connectionsNotifications()?.filter((connectionInfo) =>
                                    (connectionInfo?.targetUserID == currentUserID && connectionInfo?.status == "pending")
                                )?.map((connectionInfo, idx) => {
                                    let userData = connectionInfo?.initiaterUserID == currentUserID ? getSingleUserData(connectionInfo?.targetUserID) : getSingleUserData(connectionInfo?.initiaterUserID);
                                    return (
                                        <div key={idx} className='w-full relative'>
                                            <ContactTab
                                                tabData={userData}
                                            />
                                            {/* Quick action icon (Add, Accept, Pending, Remove) */}
                                            <div className={`absolute ${activeDarkMode ? "darkModeTextColor" : 'text-gray-600'} inline-flex items-center justify-center h-9 w-9 transition duration-500 ease-in-out  focus:outline-none showChildOnParentHover`} style={{ transform: "translateY(-50%)", top: "50%", right: "16px" }}>
                                                <FaUserClock className="w-6 h-6" />
                                                <div className={`w-max absolute top-6 mt-3 cursor-pointer right-0 showOnHover ${activeDarkMode ? "darkModeBg3" : ''} bg-white shadow-lg py-3 px-4 z-10 rounded-md transition-all duration-300 ease-in-out transform origin-top-right border-1 border-gray-300 flex flex-col gap-y-3.5 ring-1 ring-black ring-opacity-5 z-10`}>
                                                    <p onClick={() => {
                                                        let connectionInfo = getUserConnectionStatus(userData?._id)?.result;
                                                        acceptUsersConnectionsReq([connectionInfo]);
                                                        sendWebSocketMessage(
                                                            "connections:accepted",
                                                            'connectionInfos',
                                                            [connectionInfo]
                                                        );
                                                    }} className="w-full">
                                                        Accept Request
                                                    </p>
                                                    <p onClick={() => {
                                                        let connectionInfo = getUserConnectionStatus(userData?._id)?.result;
                                                        let remover = getUserConnectionStatus(userData?._id)?.result?.targetUserID == currentUserID ? "targetUser" : "initiaterUser";
                                                        removeUsersFromConnections([connectionInfo]);
                                                        sendWebSocketMessage(
                                                            "remove:connections",
                                                            'connectionInfos',
                                                            [{ ...connectionInfo, remover }]
                                                        );
                                                    }} className="w-full">
                                                        Reject request
                                                    </p>
                                                </div>
                                                {/* <div className="showChildOnParentHover">
                                                </div> */}
                                            </div>
                                        </div>
                                    )
                                })
                            }
                        </>
                    }
                </div>
            }
            {/* Toast notifications */}
            <ToastContainer />
            {/* user list area - end */}
        </div>
    )
}

export default ContactList
export { ProfileTab };