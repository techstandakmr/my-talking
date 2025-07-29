import _ from 'lodash'
import React, { useContext, useEffect, useRef, useState } from 'react'
import { BsArrowLeft, BsArrowRight, BsCalendar2DateFill } from 'react-icons/bs';
import { BiSolidFilterAlt, BiSolidChat, BiSolidSelectMultiple } from 'react-icons/bi';
import { HiOutlinePhone, HiOutlineVideoCamera } from 'react-icons/hi2';
import { UserContext } from '@context/UserContext';
import { ToastContainer, toast } from "react-toastify";
import moment from 'moment';
import { AiFillDelete } from 'react-icons/ai';
import { FaCheck } from "react-icons/fa6";
import { TextWithEmojis } from "./index.js";
import { updateCallData } from '@api';
function CallsList() {

    const {
        allCallsData,
        setAllCallsData,
        setOpenedTabInfo,
        setShowChatBox,
        getSingleUserData,
        currentUserID,
        safeParseJSON,
        activeDarkMode,
        setShowRecentChatsSection,
        handleShowingSections,
        currentCallData,
        makeNewCall
    } = useContext(UserContext);

    // Remove duplicate calls based on customID and exclude deleted ones for the current user
    let allUniqueCallsData = _.uniqBy(allCallsData, "customID")?.filter((callData) => !callData?.deletedByUsers?.includes(currentUserID));

    // Get the current logged-in user's data
    let currentUserData = getSingleUserData(currentUserID);

    const [openedUser, setOpenedUser] = useState(null); // To open call data of a specific user

    // Format the calling time into readable string (Today, Yesterday, Weekday, or full date)
    function formattedTime(callingTime) {
        return moment().isSame(moment(callingTime), 'day')
            ? `Today, ${moment(callingTime).format('hh:mm a')}`
            : moment().subtract(1, 'days').isSame(moment(callingTime), 'day')
                ? `Yestarday, ${moment(callingTime).format('hh:mm a')}`
                : moment().isSame(moment(callingTime), 'week')
                    ? moment(callingTime).format('dddd') + `, ${moment(callingTime).format('hh:mm a')}`
                    : moment(callingTime).format('DD MMMM YYYY') + `, ${moment(callingTime).format('hh:mm A')}`
    };

    // --- Call tab selection (Multi-select with long-press) ---

    const [isCallTabSelecting, setIsCallTabSelecting] = useState(false); // Whether multi-select is active
    const holdTimeoutRef = useRef(null); // Timeout reference for long press detection
    const [selectedCallTabs, setSelectedCallTabs] = useState([]); // Array of selected call tabs

    // Toggle call selection on long press
    async function handleCallTabSelecting(callInfo) {
        setSelectedCallTabs((selectedCallTabs) => {
            if (selectedCallTabs.some((selectedCallTab) => selectedCallTab?.customID == callInfo?.customID)) {
                // Deselect if already selected
                return selectedCallTabs.filter((selectedCallTab) => selectedCallTab?.customID != callInfo?.customID);
            } else {
                // Select if not already selected
                return [...selectedCallTabs, callInfo];
            }
        });
    };

    // Start timer to detect long press (500ms)
    const handleHoldStart = (callInfo) => {
        holdTimeoutRef.current = setTimeout(() => {
            handleCallTabSelecting(callInfo);
            setIsCallTabSelecting(true);
        }, 500); // Trigger after 500ms hold
    };

    // Cancel long press timer on release
    const handleHoldEnd = () => {
        if (holdTimeoutRef.current) {
            clearTimeout(holdTimeoutRef.current);
            holdTimeoutRef.current = null;
        };
    };

    // Auto-disable selecting mode if no calls are selected
    useEffect(() => {
        if (selectedCallTabs.length == 0) {
            setIsCallTabSelecting(false);
        } else {
            setIsCallTabSelecting(true);
        };
    }, [selectedCallTabs, handleCallTabSelecting, handleHoldStart, handleHoldEnd]);

    // --- Deleting selected calls ---

    async function deleteCallsData(selectedCallData) {
        // Optimistically update client-side UI
        setAllCallsData((prevCallsData) =>
            prevCallsData?.map((prevCallData) => {
                let isDeletedByMe = prevCallData?.deletedByUsers?.includes(currentUserID);
                if (selectedCallData.some((callData) => callData.customID === prevCallData.customID) && !isDeletedByMe) {
                    return {
                        ...prevCallData,
                        deletedByUsers: [...(prevCallData.deletedByUsers || []), currentUserID] // Mark as deleted
                    };
                }
                return prevCallData;
            })
        );

        // Create deletion query for backend update
        let callsDeletionArray = selectedCallData?.map((callData) => ({
            filterCondition: {
                customID: callData.customID,
                deletedByUsers: { $ne: currentUserID }
            },
            updateOperation: {
                $addToSet: { deletedByUsers: currentUserID }
            }
        }));

        // Reset UI selections
        setOpenedUser(null);
        setIsCallTabSelecting(false);
        setSelectedCallTabs([]);

        // Send update to server
        updateCallData({ callsForUpdation: callsDeletionArray })
            .then((response) => {
                console.log("Success Notification !", response);
            })
            .catch((error) => {
                console.error('error', error.response.status + error.response.data.message)
                console.log('error ', error)
            });
    };

    // --- Get user data from call (caller/callee) ---

    function callTabUserData(call) {
        return getSingleUserData(currentUserID == call?.caller ? call?.callee : call?.caller);
    };

    // --- Group calls by date (Today, Yesterday, weekday, etc.) ---

    function callsDataByDate(allUniqueCallsData) {
        return [
            ...new Set(
                (
                    openedUser == null ?
                        allUniqueCallsData
                        :
                        allUniqueCallsData.filter(call => call?.callee == openedUser || call?.caller == openedUser)
                )?.reverse()?.map((call) => (
                        moment().isSame(moment(call?.callingTime), 'day')
                            ? `Today`
                            : moment().subtract(1, 'days').isSame(moment(call?.callingTime), 'day')
                                ? `Yestarday`
                                : moment().isSame(moment(call?.callingTime), 'week')
                                    ? moment(call?.callingTime).format('dddd')
                                    : moment(call?.callingTime).format('DD/MM/YYYY')
                    ))
                    .filter(item => item.trim() !== '')
            )
        ]?.map((callsDate) => {
            return {
                callsDate,
                callsData: allUniqueCallsData.filter((call) => {
                    return (
                        (callsDate === 'Today' && moment().isSame(moment(call?.callingTime), 'day')) ||
                        (callsDate === 'Yestarday' && moment().subtract(1, 'days').isSame(moment(call?.callingTime), 'day')) ||
                        callsDate == moment(call?.callingTime).format('dddd') ||
                        callsDate == moment(call?.callingTime).format('DD/MM/YYYY')
                    );
                })
            };
        });
    };
    console.log("AAAAAAA", callsDataByDate(allUniqueCallsData));
    // --- Calls data of opened user - start --- 
    function OpenedUserCalls() {
        return (
            callsDataByDate(allUniqueCallsData)?.map((callsByDate, idx1) => (
                <div key={idx1}>
                    {/* Date heading for grouped call data (e.g., Today, Yesterday, Monday, etc.) */}
                    <h3 style={{
                        padding: '8px 16px',
                        fontWeight: 500,
                        fontSize: '16px'
                    }}>{callsByDate?.callsDate}</h3>

                    {/* Rendering each call under the specific date group */}
                    {
                        callsByDate?.callsData?.map((call, idx2) => (
                            <div className={`${activeDarkMode ? "darkModeBg2" : ''} relative border-b border-gray-200`} key={idx2}>
                                {/* Call tab button (click to open / hold to select) */}
                                <button onClick={() => {
                                    if (isCallTabSelecting) {
                                        // If selection mode is active, toggle this call's selection
                                        handleCallTabSelecting(call);
                                    };
                                }}
                                    onTouchStart={() => {
                                        // For mobile: start long press timer
                                        handleHoldStart(call)
                                    }}
                                    onTouchEnd={() => {
                                        // For mobile: cancel long press on touch end
                                        handleHoldEnd()
                                    }}
                                    onTouchCancel={() => {
                                        // For mobile: also cancel on unexpected touch cancel
                                        handleHoldEnd()
                                    }}
                                    className={`relative flex items-center justify-start w-full`}
                                >
                                    {/* Avatar/icon area showing call direction */}
                                    <div className="user_avatar_box flex items-center justify-center text-2xl rounded-full relative">
                                        {
                                            currentUserID == call?.caller ?
                                                // Outgoing call icon
                                                <BsArrowRight className='w-6 h-6 outgoing_call' />
                                                :
                                                // Incoming or missed call icon
                                                <BsArrowLeft
                                                    className={` ${call?.status == "missed_call" ? "missed_call" : "incomming_call"} w-6 h-6`}
                                                />
                                        }
                                    </div>

                                    {/* <!-- Profile tab information section --> */}
                                    <div className="ml-1.5 text-left w-full profileTabInfo flex items-start justify-between" style={{ maxWidth: '85%', padding: "10px 0px" }}>

                                        {/* <!-- Left side: user name and message preview --> */}
                                        <div className="w-auto">
                                            {/* Call type label */}
                                            <p className="text-lg font-semibold flex">
                                                {
                                                    currentUserID == call?.caller ? 'Outgoing'
                                                        :
                                                        (call?.status == 'missed_call')
                                                            ? 'Missed Call' : 'Incomming'
                                                }
                                            </p>

                                            {/* <!-- Message preview with seen icon --> */}
                                            <div className="mt-0.5 text-sm w-full flex">
                                                <span className="mr-1" style={{
                                                    fontSize: '16px',
                                                }}>
                                                    {
                                                        call?.callType == 'video' ?
                                                            // Video call icon
                                                            <HiOutlineVideoCamera className='w-6 h-6' />
                                                            :
                                                            // Audio call icon
                                                            <HiOutlinePhone className='w-6 h-6' />
                                                    }
                                                </span>
                                                {/* Call time */}
                                                {moment(call?.callingTime).format('hh:mm a')}
                                            </div>
                                        </div>

                                        {/* <!-- Right side: time and icons --> */}
                                        <div className="w-auto">
                                            <p style={{ marginRight: "8px" }}>
                                                <span className="text-sm text-gray-500">
                                                    {
                                                        // If missed call by the caller
                                                        (
                                                            currentUserID == call?.caller && call?.status == 'missed_call'
                                                        )
                                                        &&
                                                        'Not Answered'
                                                    }
                                                </span>
                                                <span className="ml-1 text-sm text-gray-400 flex flex-col">
                                                    {
                                                        // If call was accepted, show duration
                                                        call?.status == "accepted" &&
                                                        <span>Duration - {call?.callDuration}</span>
                                                    }
                                                    <span>Ring - {call?.ringDuration}</span>
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </button>
                                {/* Selecting tick icon if the call is selected */}
                                <div style={{
                                    display: selectedCallTabs.some((selectedCallTab) => selectedCallTab?.customID == call?.customID) ? 'flex' : 'none'
                                }}
                                    className="selecting flex items-center justify-between"
                                    onClick={() => {
                                        // Toggle selection on icon click
                                        handleCallTabSelecting(call);
                                    }}
                                >
                                    <div className='selectingIcon'>
                                        <FaCheck className='w-4 h-4' />
                                    </div>
                                </div>
                            </div>
                        ))
                    }
                </div>
            ))
        )
    };
    // --- Calls data of opened user - end ---

    const [dateRange, setDateRange] = useState(null); // State to store selected date range for filtering

    // --------------------- Searching functionality - start ---------------------
    const [advanceFiltering, setAdvanceFiltering] = useState(false); // State to enable/disable advanced search mode
    const [searchTerm, setSearchTerm] = useState(''); // State to store the current search input text
    const [searchedCalls, setSearchedCalls] = useState([]); // State to store filtered/search result calls

    // Function to handle user input and apply search filter
    const handleSearch = (e) => {
        const term = e.target.value?.trim().toLowerCase(); // Normalize input: trim whitespace and convert to lowercase
        setSearchTerm(e.target.value); // Keep raw input for display

        // If input is empty, reset filters and exit search mode
        if (term === '') {
            setAdvanceFiltering(false);
            setSearchedCalls([]);
            return;
        }

        // Utility to remove extra spaces from strings
        const normalizeSpaces = (str) => str.replace(/\s+/g, ' ').trim();

        // Function to extract searchable text (like name) from user's profile
        const getTextValue = (text) => {
            return safeParseJSON(text)
                ?.map(g => g?.value)
                ?.join(' ') || ''; // Handle multi-segment names
        };

        // Filter the call list where the name includes the search term
        const userMatches = allUniqueCallsData?.filter(call => {
            let userName = normalizeSpaces(getTextValue(callTabUserData(call)?.profileInfo?.name))?.toLowerCase();
            return (userName.includes(term));
        })?.map(call => {
            // Enhance the matched calls with the name field for display
            return {
                ...call,
                tabName: callTabUserData(call)?.profileInfo?.name
            };
        });

        setSearchedCalls(userMatches); // Save the search results
    };
    // --------------------- Searching functionality - end ---------------------

    // --------------------- Filter calls by selected date range ---------------------
    function filterCalls(dateRangeData) {
        let result = allUniqueCallsData.filter(call => {
            // Skip call if it was deleted by the current user
            if (call.deletedByUsers?.includes(currentUserID)) return false;

            // Parse start and end dates from the selected range
            const start = new Date(dateRangeData.from);
            const end = new Date(dateRangeData.to);

            // Parse the call time and check if it lies within the selected range
            const callingTime = new Date(call.callingTime);
            if (callingTime >= start && callingTime <= end) {
                return true;
            }
            return false;
        })?.map(call => {
            // Add display name to the call object
            return {
                ...call,
                tabName: callTabUserData(call)?.profileInfo?.name
            };
        });

        console.log("result", result); // Debug: log the filtered result

        // Update state only if there are matching results
        if (result?.length > 0) {
            setSearchedCalls(result);
        };
    };
    return (
        <>
            {/* ToastContainer for showing notifications */}
            <ToastContainer />
            <div className="callList pb-11 w-full h-full overflow-hidden flex flex-col">
                {/* Top bar of the Calls section */}
                <div className={`${activeDarkMode ? "darkModeBg2" : ''} border-b border-gray-200 text-gray-600 h-auto gap-x-4 h-12 w-full `}>
                    <div className={`${activeDarkMode ? "darkModeBg2" : ''} h-auto gap-x-4 h-12 w-full p-4`}>

                        {/* Header with back button, title or selected count */}
                        <div className='flex flex-row items-center justify-between'>
                            <div className="flex items-center justify-center gap-x-2 text-xl font-semibold">
                                {/* Back button: Go back to recent chats or close selected user */}
                                <button onClick={() => {
                                    if (openedUser == null) {
                                        handleShowingSections(setShowRecentChatsSection);
                                    } else {
                                        setOpenedUser(null);
                                        setIsCallTabSelecting(false);
                                        setSelectedCallTabs([]);
                                    };
                                }} className=''>
                                    <BsArrowLeft className='cursor-pointer w-6 h-6' />
                                </button>
                                {
                                    isCallTabSelecting ?
                                        <span className='font-sm'>
                                            {selectedCallTabs.length} Selected
                                        </span>
                                        :
                                        'Calls'
                                }
                            </div>

                            {/* Right-side action buttons */}
                            <div className="flex items-center gap-1 relative">

                                {/* If call tab selecting is active: show select all and delete */}
                                <div style={{ display: isCallTabSelecting ? 'flex' : 'none' }} className='gap-2'>
                                    <button type='button' >
                                        <BiSolidSelectMultiple onClick={() => {
                                            let targetCallsTabs = openedUser == null ? allUniqueCallsData : allUniqueCallsData.filter(call => call?.callee == openedUser || call?.caller == openedUser)
                                            if (targetCallsTabs?.length == selectedCallTabs?.length) {
                                                setSelectedCallTabs([]);
                                                setIsCallTabSelecting(false);
                                            } else {
                                                setSelectedCallTabs(targetCallsTabs);
                                            };
                                        }} className='w-6 h-6' />
                                    </button>
                                    <button type='button' >
                                        <AiFillDelete className='w-6 h-6' onClick={() => {
                                            deleteCallsData(selectedCallTabs);
                                        }} />
                                    </button>
                                </div>

                                {/* If call tab selecting is NOT active: show filter options */}
                                <div style={{ display: !isCallTabSelecting ? 'flex' : 'none' }} className='gap-2'>
                                    <button type='button' className={`${activeDarkMode ? "darkModeBg2" : ''}  relative showChildOnParentHover`}>
                                        <BiSolidFilterAlt className='w-6 h-6' />

                                        {/* Dropdown for filter by date */}
                                        <div style={{ top: "40px", right: "0px", transition: "0.3s", width: "170px", padding: '6px 0px' }} className={`showOnHover ${activeDarkMode ? "darkModeBg1" : ''} block absolute right-0 z-10 mt-0 w-auto origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}>

                                            {/* From Date Picker */}
                                            <div className="relative">
                                                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
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

                                            {/* "To" label */}
                                            <span className='text-center cursor-pointer block px-4 py-2 text-md'>To</span>

                                            {/* To Date Picker */}
                                            <div className="relative">
                                                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
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
                                                    className={`${activeDarkMode ? "darkModeBg1" : ''} text-white bg-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5`}
                                                    placeholder="Select date end"
                                                />
                                            </div>

                                            {/* Apply Filter */}
                                            <span
                                                onClick={() => {
                                                    setSearchedCalls([]);
                                                    if (!dateRange?.from || !dateRange?.to) {
                                                        toast.error('Please select both start and end dates');
                                                        return;
                                                    }

                                                    const dateRangeData = {
                                                        from: dateRange.from,
                                                        to: dateRange.to
                                                    };
                                                    filterCalls(dateRangeData);
                                                    setAdvanceFiltering(true);
                                                }}
                                                className="text-center cursor-pointer block px-4 py-2 text-md"
                                            >
                                                Apply
                                            </span>

                                            {/* Refresh Filters */}
                                            <span
                                                onClick={() => {
                                                    setSearchedCalls([]);
                                                    setAdvanceFiltering(false);
                                                    setSearchTerm('');
                                                }}
                                                className="text-center cursor-pointer block px-4 py-2 text-md"
                                            >
                                                Refresh
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Search Bar: hidden when tab selecting or user is opened */}
                        <div style={{ display: (isCallTabSelecting || openedUser) ? 'none' : 'block' }} className="mt-3 mx-auto">
                            <div className={`${activeDarkMode ? "darkModeBg1" : ''} relative flex items-center w-full h-10 rounded-lg bg-white overflow-hidden`}>

                                {/* Search Icon */}
                                <div className={`${activeDarkMode ? "darkModeBg1" : ''} grid bg-gray-200 place-items-center h-full w-12 `}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>

                                {/* Search Input */}
                                <div className="h-full w-full outline-none text-sm text-dark" id="search">
                                    <input
                                        type="text"
                                        className={`${activeDarkMode ? "darkModeBg1" : ''} h-full w-full outline-none text-lg bg-gray-200 text-dark`}
                                        placeholder="Search..."
                                        value={searchTerm}
                                        onChange={handleSearch}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {
                    // Check if no user is opened
                    openedUser == null ?
                        <div className="w-full h-full">
                            {
                                // Check if there are calls to display after filtering/searching
                                (callsDataByDate(
                                    (searchTerm == '' && !advanceFiltering) ?
                                        allUniqueCallsData
                                        :
                                        searchedCalls
                                )?.length != 0) ?
                                    <div className={`flex flex-col w-full h-full ${openedUser == null && "overflow-y-auto"}`}>
                                        <React.Fragment>
                                            {
                                                // Show all calls data grouped by date when no user is opened
                                                openedUser == null &&
                                                callsDataByDate(
                                                    (searchTerm == '' && !advanceFiltering) ?
                                                        allUniqueCallsData
                                                        :
                                                        searchedCalls
                                                )?.map((callsByDate, idx1) => {
                                                    return (
                                                        <div key={idx1}>
                                                            {/* Display the date of the call group */}
                                                            <h3 style={{
                                                                padding: '8px 16px',
                                                                fontWeight: 500,
                                                                fontSize: '16px'
                                                            }}>{callsByDate?.callsDate}</h3>
                                                            {
                                                                // Format each call with a proper tab name
                                                                callsByDate?.callsData?.map((callInfo) => {
                                                                    return {
                                                                        ...callInfo,
                                                                        tabName: callInfo?.tabName ? callInfo?.tabName : callTabUserData(callInfo)?.profileInfo?.name // Generate tabName if not present
                                                                    }
                                                                })?.map((call, idx2) => {
                                                                    return (
                                                                        // Each call tab
                                                                        <div className={`${activeDarkMode ? "darkModeBg2" : ''} relative profileTab border-b border-gray-200`}>
                                                                            <button
                                                                                key={idx2}
                                                                                className={`relative flex items-center justify-start w-full`}
                                                                                onClick={() => {
                                                                                    if (!isCallTabSelecting) {
                                                                                        // Open the chat with the user if not selecting tabs
                                                                                        if (currentUserID == call?.caller) {
                                                                                            setOpenedUser(call?.callee)
                                                                                        } else {
                                                                                            setOpenedUser(call?.caller)
                                                                                        }
                                                                                    } else {
                                                                                        // Select tab for multi-select mode
                                                                                        handleCallTabSelecting(call);
                                                                                    }
                                                                                }}
                                                                                // Handle long press for mobile
                                                                                onTouchStart={() => {
                                                                                    handleHoldStart(call)
                                                                                }}
                                                                                onTouchEnd={() => {
                                                                                    handleHoldEnd()
                                                                                }}
                                                                                onTouchCancel={() => {
                                                                                    handleHoldEnd()
                                                                                }}
                                                                            >
                                                                                <div
                                                                                    style={{
                                                                                        backgroundColor: callTabUserData(call)?.profileInfo?.bgColor
                                                                                    }}
                                                                                    className="user_avatar_box flex items-center justify-center"
                                                                                >
                                                                                    {
                                                                                        // If profile pic exists, show it; otherwise show initial
                                                                                        callTabUserData(call)?.profileInfo?.profilePic ? (
                                                                                            <div className='imgContainer flex items-center justify-center text-2xl rounded-full relative'>
                                                                                                <img
                                                                                                    className="w-full h-full rounded-full"
                                                                                                    src={`${callTabUserData(call)?.profileInfo?.profilePic}`}
                                                                                                    alt="Profile"
                                                                                                />
                                                                                            </div>
                                                                                        ) : safeParseJSON(callTabUserData(call)?.profileInfo?.name)?.find(item => item.type === 'text')?.value?.charAt(0)?.toUpperCase()
                                                                                    }
                                                                                </div>
                                                                                <div className={`text-left w-full profileTabInfo`} style={{ transform: "translateX(10px)", width: "88%" }}>
                                                                                    <div className="flex items-center justify-between flex-wrap pr-2">
                                                                                        <div>
                                                                                            {/* Display call tab name */}
                                                                                            <span style={{ fontSize: '16px' }} className='font-semibold flex w-full'>
                                                                                                <TextWithEmojis
                                                                                                    hide={true}
                                                                                                    textData={call?.tabName}
                                                                                                    textWidth={`auto`}
                                                                                                    areaName={'tabInfo'}
                                                                                                />
                                                                                            </span>
                                                                                            {/* Call type icon + time */}
                                                                                            <p className='mt-0 text-sm w-full flex' style={{ alignItems: "center" }}>
                                                                                                <span className='msgArea flex items-center justify-center' style={{ overflow: "visible" }}>
                                                                                                    <span style={{ fontSize: '16px' }}>
                                                                                                        {
                                                                                                            currentUserID == call?.caller ?
                                                                                                                // Outgoing call arrow
                                                                                                                <BsArrowRight className='w-6 h-6 outgoing_call' />
                                                                                                                :
                                                                                                                // Incoming or missed call arrow
                                                                                                                <BsArrowLeft
                                                                                                                    className={` ${call?.status == "missed_call" ? "missed_call" : "incomming_call"} w-6 h-6`}
                                                                                                                />
                                                                                                        }
                                                                                                    </span>
                                                                                                    {/* Display call time */}
                                                                                                    <span className={`ml-2 ${activeDarkMode ? "darkModeTextColor" : 'text-gray-600'}`}>
                                                                                                        {
                                                                                                            formattedTime(call?.callingTime)
                                                                                                        }
                                                                                                    </span>
                                                                                                </span>
                                                                                            </p>
                                                                                        </div>
                                                                                        {/* Call type icon (video or audio) */}
                                                                                        <p>
                                                                                            <span className={`text-sm ${activeDarkMode ? "text-white" : "text-gray-600"}`}>
                                                                                                {
                                                                                                    call?.callType == 'video' ?
                                                                                                        <HiOutlineVideoCamera
                                                                                                            className='w-6 h-6'
                                                                                                        />
                                                                                                        :
                                                                                                        <HiOutlinePhone
                                                                                                            className='w-6 h-6'
                                                                                                        />
                                                                                                }
                                                                                            </span>
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            </button>
                                                                            {/* Icon for call tab selection (multi-select mode) */}
                                                                            <div style={{
                                                                                display: selectedCallTabs.some((selectedCallTab) => selectedCallTab?.customID == call?.customID) ? 'flex' : 'none'
                                                                            }}
                                                                                className="selecting flex items-center justify-between"
                                                                                onClick={() => {
                                                                                    handleCallTabSelecting(call);
                                                                                }}
                                                                            >
                                                                                <div className='selectingIcon'>
                                                                                    <FaCheck className='w-4 h-4' />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })
                                                            }
                                                        </div>
                                                    )
                                                })
                                                // End of all calls list rendering
                                            }
                                        </React.Fragment>
                                    </div>
                                    :
                                    // Show "No Data" if no calls found
                                    <div className='text-lg flex justify-center items-center text-center h-full w-full'>
                                        No Data
                                    </div>
                            }
                        </div>
                        :
                        // calls data datewise of opened user - start
                        openedUser &&
                        <>
                            {/* Header section showing opened user's profile info and action buttons */}
                            <div className="allCallsInfo">
                                {/* Button containing user's avatar, name, about, and action icons */}
                                <button className={`callDataBtn profileTab border-b border-gray-200 ${activeDarkMode ? "darkModeBg1" : ''} relative hover:bg-gray-100 flex items-center justify-start w-full`}>

                                    {/* User avatar box with profile color or initial/DP */}
                                    <div
                                        style={{
                                            backgroundColor: getSingleUserData(openedUser)?.profileInfo?.bgColor
                                        }}
                                        className="user_avatar_box flex items-center justify-center"
                                    >
                                        {
                                            // If profile picture exists, show image, otherwise show first character of name
                                            getSingleUserData(openedUser)?.profileInfo?.profilePic ? (
                                                <div className='imgContainer flex items-center justify-center text-2xl rounded-full relative'>
                                                    <img
                                                        className="w-full h-full rounded-full"
                                                        src={`${getSingleUserData(openedUser)?.profileInfo?.profilePic}`}
                                                        alt="Profile"
                                                    />
                                                </div>
                                            ) : safeParseJSON(
                                                getSingleUserData(openedUser)?.profileInfo?.name)?.find(item => item.type === 'text')?.value?.charAt(0)?.toUpperCase()
                                        }
                                    </div>

                                    {/* User name and about info */}
                                    <div className={`text-left w-full profileTabInfo`} style={{ transform: "translateX(10px)", width: "88%" }}>
                                        <div className="flex items-center justify-between flex-wrap pr-2" >
                                            <div className="flex flex-col">
                                                {/* User name */}
                                                <span style={{ fontSize: '16px' }} className='font-semibold flex w-full'>
                                                    <TextWithEmojis
                                                        hide={true}
                                                        textData={
                                                            getSingleUserData(
                                                                openedUser
                                                            )?.profileInfo?.name
                                                        }
                                                        textWidth={`auto`}
                                                        areaName={'tabInfo'}
                                                    />
                                                </span>

                                                {/* User about/bio info */}
                                                <TextWithEmojis
                                                    hide={true}
                                                    textData={
                                                        getSingleUserData(
                                                            openedUser
                                                        )?.profileInfo?.about
                                                    }
                                                    textWidth={`auto`}
                                                    areaName={'tabInfo'}
                                                />
                                            </div>

                                            {/* Chat, video call, and voice call icons */}
                                            <p>
                                                <span className={`flex text-sm gap-x-2 ${activeDarkMode ? "text-white" : "text-gray-600"}`}>
                                                    <button>
                                                        {/* Open chat box with user */}
                                                        <BiSolidChat
                                                            onClick={() => {
                                                                setShowChatBox(true);
                                                                const existingTab = currentUserData?.recentChatsTabs?.find(tab => tab?.tabID === openedUser);
                                                                setOpenedTabInfo(
                                                                    existingTab
                                                                    || {
                                                                        tabType: "user",
                                                                        tabID: openedUser,
                                                                        recentTime: new Date().toISOString(), // Use the current time as recentTime
                                                                        clearingTime: "", // clearingTime initially empty
                                                                        isArchived: false,
                                                                        isPinned: false,
                                                                        disappearingTime: "Off"
                                                                    }
                                                                ); // Set opened tab info
                                                                handleShowingSections(setShowRecentChatsSection);
                                                            }}
                                                            className='w-6 h-6'
                                                        />
                                                    </button>
                                                    {
                                                        // Show call icons only if user is not deleted
                                                        !getSingleUserData(openedUser)?.isDeleted &&
                                                        <>
                                                            <button>
                                                                {/* Initiate video call */}
                                                                <HiOutlineVideoCamera
                                                                    onClick={() => {
                                                                        if (currentCallData == null) { // If not on call, make new video call
                                                                            makeNewCall({
                                                                                caller: currentUserID,
                                                                                callee: openedUser,
                                                                                callType: "video"
                                                                            });
                                                                        } else {
                                                                            toast.error('You are on a call already');
                                                                        };
                                                                    }}
                                                                    className='w-6 h-6'
                                                                />
                                                            </button>
                                                            <button>
                                                                {/* Initiate voice call */}
                                                                <HiOutlinePhone
                                                                    onClick={() => {
                                                                        if (currentCallData == null) { // If not on call, make new voice call
                                                                            makeNewCall({
                                                                                caller: currentUserID,
                                                                                callee: openedUser,
                                                                                callType: "voice"
                                                                            });
                                                                        } else {
                                                                            toast.error('You are on a call already');
                                                                        };
                                                                    }}
                                                                    className='w-6 h-6'
                                                                />
                                                            </button>
                                                        </>
                                                    }
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {/* Call logs of the opened user displayed below the header */}
                            <div className='flex flex-col w-full h-full overflow-y-auto'>
                                <OpenedUserCalls />
                            </div>
                        </>
                    // calls data datewise of opened user - end
                }
            </div>
        </>
    )
}
export default CallsList;