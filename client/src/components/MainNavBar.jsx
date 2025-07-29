import React, { useContext } from 'react'
import { AiFillSetting } from 'react-icons/ai';
import { BiSolidChat, BiSolidContact,   BiSolidPhone } from 'react-icons/bi';
import {  BsChatLeftHeartFill, BsMoonFill, BsSunFill } from 'react-icons/bs';
import { UserContext } from '@context/UserContext';
import _ from 'lodash';
import { updateCallData } from '@api';

function MainNavBar() {
    const {
        allCallsData,
        setAllCallsData,
        allChatsData,
        allStoriesData,
        currentUserID,
        showChatBox,
        handleShowingSections,
        showRecentChatsSection,
        setShowRecentChatsSection,
        showCallsSection,
        setShowCallsSection,
        showStoriesSection,
        setShowStoriesSection,
        showContactListSection,
        setShowContactListSection,
        showSettingsSection,
        setShowSettingsSection,
        showGroupCreationPanel,
        showBroadcastCreationPanel,
        showLoading,
        activeDarkMode,
        setActiveDarkMode,
        getUnreadChats,
        getSingleUserData,
    } = useContext(UserContext);

    // Get data for the current user
    let currentUserData = getSingleUserData(currentUserID);
    // Get unique chats by customID
    let allUniqueChats = _.uniqBy(allChatsData, "customID");
    // Get unique stories by customID
    let allUniqueStories = _.uniqBy(allStoriesData, "customID");
    // Get unique calls data by customID
    let allUniqueCallsData = _.uniqBy(allCallsData, "customID");
    // Calculate unread chats for current user
    let unreadChats = getUnreadChats(currentUserID, allUniqueChats, null);
    // Filter unread stories for current user
    let unreadStories = allUniqueStories?.filter(storyInfo => storyInfo?.receiversInfo?.some(receiverInfo => receiverInfo?.receiverID == currentUserID && receiverInfo?.seenTime == null));
    // Filter unread missed call logs for current user
    let unreadCallLogs = allUniqueCallsData?.filter(call => call?.callee == currentUserID && call?.status == 'missed_call'
        && call?.seenByCallee == false);
    // Get connection notifications for current user
    let connectionsNotifications = currentUserData?.connections?.filter((connectionInfo) =>
        (connectionInfo?.targetUserID == currentUserID && connectionInfo?.status == "pending")
        ||
        (connectionInfo?.initiaterUserID == currentUserID && connectionInfo?.status == "accepted" && !connectionInfo?.acceptingSeenByInitiator)
    );
    return (
        <React.Fragment>
            {
                // Main navigation bar container with conditional dark mode and visibility classes
                <div className={`${activeDarkMode ? "darkModeBg1" : ''} text-gray-500 mainNavBar ${(!showRecentChatsSection || showChatBox) && "hideEelemnt"} z-[60] border-e border-gray-200`}>
                    {/* Container for navigation buttons with spacing */}
                    <div style={{ rowGap: "12px" }} className="flex flex-col justify-center items-center py-4 px-2">
                        {/* Chats button with tooltip and notification badge */}
                        <div className="hs-tooltip [--placement:right] inline-block relative">
                            <button onClick={() => {
                                // Open recent chats only if not already showing and group/broadcast creation panel is not open
                                if (!showRecentChatsSection && !showGroupCreationPanel && !showBroadcastCreationPanel) {
                                    handleShowingSections(setShowRecentChatsSection);
                                };
                            }}
                                data-title='Chats' type="button" className={`${showRecentChatsSection && "active"} hs-tooltip-toggle btnWithTitle inline-flex flex-col justify-center items-center gap-x-2 text-sm font-semibold rounded-full border border-transparent  focus:outline-none disabled:opacity-50 disabled:pointer-events-none `}>
                                {/* Chat icon */}
                                <BiSolidChat className='w-6 h-6' />
                                <span className='btnText text-lg mt-1 hidden'>Chats</span>
                            </button>
                            {
                                // Show notification badge if unread chats exist
                                unreadChats?.length > 0 &&
                                <span id='notificationBadge'>
                                    {
                                        // Display '99+' if unread count is above 99
                                        unreadChats?.length > 99 ?
                                            '99+'
                                            :
                                            unreadChats?.length
                                    }
                                </span>
                            }
                        </div>

                        {/* Calls button with tooltip, notification badge, and update on click */}
                        <div className="hs-tooltip [--placement:right] inline-block relative">
                            <button onClick={() => {
                                // Show calls section
                                handleShowingSections(setShowCallsSection);
                                // Mark all calls as seen by current user locally
                                setAllCallsData((prevCalls) =>
                                    prevCalls.map((call) => (
                                        call?.callee === currentUserID ? { ...call, seenByCallee: true } : call
                                    ))
                                );
                                // Prepare call data update payload for backend
                                let filterCondition = { callee: currentUserID, seenByCallee: false };
                                let updateOperation = { $set: { seenByCallee: true } };
                                let callsForUpdation = [{ filterCondition, updateOperation }];
                                // Update call data via API
                                updateCallData({ callsForUpdation })
                                    .then((response) => {
                                        console.log("Success Notification !", response)
                                    })
                                    .catch((error) => {
                                        console.error('error', error.response.status + error.response.data.message)
                                        console.log('error ', error)
                                    });

                            }} data-title='Calls' type="button"
                                className={`${showCallsSection && "active"} hs-tooltip-toggle btnWithTitle flex-col inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-full border border-transparent  focus:outline-none disabled:opacity-50 disabled:pointer-events-none `}>
                                {/* Phone icon */}
                                <BiSolidPhone className='w-6 h-6' />
                                <span className='btnText text-lg mt-1 hidden'>Calls</span>
                            </button>
                            {
                                // Show notification badge for unread call logs
                                unreadCallLogs?.length > 0 &&
                                <span id='notificationBadge'>
                                    {
                                        // Display '99+' if unread call logs exceed 99
                                        unreadCallLogs?.length > 99 ?
                                            '99+'
                                            :
                                            unreadCallLogs?.length
                                    }
                                </span>
                            }
                        </div>

                        {/* Stories button with tooltip and notification badge */}
                        <div className="hs-tooltip [--placement:right] inline-block relative">
                            <button onClick={() => {
                                // Show stories section on click
                                handleShowingSections(setShowStoriesSection);
                            }}
                                data-title='Story' type="button" className={`${showStoriesSection && "active"} hs-tooltip-toggle btnWithTitle flex-col inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-full border border-transparent focus:outline-none disabled:opacity-50 disabled:pointer-events-none `}>
                                {/* Story icon */}
                                <BsChatLeftHeartFill className='w-6 h-6' />
                                <span className='btnText text-lg mt-1 hidden'>Story</span>
                            </button>
                            {
                                // Show notification badge for unread stories
                                unreadStories?.length > 0 &&
                                <span id='notificationBadge'>
                                    {
                                        // Display '99+' if unread stories exceed 99
                                        unreadStories?.length > 99 ?
                                            '99+'
                                            :
                                            unreadStories?.length
                                    }
                                </span>
                            }
                        </div>

                        {/* Contacts button with tooltip and notification badge */}
                        <div className="hs-tooltip [--placement:right] inline-block relative">
                            <button onClick={() => {
                                // Show contact list section on click
                                handleShowingSections(setShowContactListSection);
                            }}
                                data-title='Contacts' type="button" className={`${showContactListSection && "active"} hs-tooltip-toggle btnWithTitle flex-col inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-full border border-transparent  focus:outline-none disabled:opacity-50 disabled:pointer-events-none `}>
                                {/* Contacts icon */}
                                <BiSolidContact className='w-6 h-6' />
                                <span className='btnText text-lg mt-1 hidden'>Contacts</span>
                            </button>
                            {
                                // Show notification badge for pending connection notifications
                                connectionsNotifications?.length > 0 &&
                                <span id='notificationBadge'>
                                    {
                                        // Display '99+' if pending connections exceed 99
                                        connectionsNotifications?.length > 99 ?
                                            '99+'
                                            :
                                            connectionsNotifications?.length
                                    }
                                </span>
                            }
                        </div>
                    </div>

                    {/* Settings and appearance toggle buttons container */}
                    <div style={{ rowGap: "12px" }} className="settingButtons flex flex-col justify-center items-center py-4 px-2">
                        <div className="">
                            {/* Dark mode toggle button */}
                            <button data-title='Appearance' onClick={() => {
                                // Toggle dark mode and save preference to localStorage
                                setActiveDarkMode((prevMode) => {
                                    const newMode = !prevMode;
                                    localStorage.setItem('darkMode', JSON.stringify(newMode));
                                    return newMode;
                                });
                            }} type="button" className={`darkBtn hs-tooltip-toggle btnWithTitle flex-col inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-full border border-transparent  focus:outline-none disabled:opacity-50 disabled:pointer-events-none `}>
                                {
                                    // Show sun icon if dark mode active, else moon icon
                                    activeDarkMode ?
                                        <BsSunFill className='w-6 h-6' />
                                        :
                                        <BsMoonFill className='w-5 h-5' />
                                }
                            </button>
                        </div>
                        <div className="hs-tooltip [--placement:right] inline-block">
                            {/* Settings button to show settings section */}
                            <button onClick={() => {
                                handleShowingSections(setShowSettingsSection);
                            }} data-title='Settings' type="button" className={`${showSettingsSection && "active"} hs-tooltip-toggle btnWithTitle flex-col inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-full border border-transparent  focus:outline-none disabled:opacity-50 disabled:pointer-events-none `}>
                                {/* Settings icon */}
                                <AiFillSetting className='w-7 h-7' />
                                <span className='btnText text-lg mt-1 hidden'>Settings</span>
                            </button>
                        </div>
                    </div>
                </div>
            }
        </React.Fragment>
    )
}

export default MainNavBar
