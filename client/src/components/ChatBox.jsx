import React, { useContext, useEffect, useRef, useState, useMemo } from 'react'
import { UserContext } from '@context/UserContext';
import _ from "lodash";
import { HiMiniChevronDown, HiOutlineClock, HiPencilSquare, HiMiniNoSymbol, HiOutlineVideoCamera, HiMiniVideoCamera, HiBookmark, HiMiniBookmarkSlash, HiMagnifyingGlass, HiXMark, HiOutlinePhone, HiEllipsisVertical, HiOutlineInformationCircle, HiUser } from "react-icons/hi2";
import { BsCheck2, BsCheck2All, BsArrowLeft, BsX, BsReplyFill } from "react-icons/bs";
import moment from 'moment';
import { saveAs } from 'file-saver';
import { FaClockRotateLeft } from "react-icons/fa6"; import {
  AudioPlayer, ChatForwarding, MultiInputBox,
  TextWithEmojis,
  ConfirmationDialog,
  ProgressBar,
  Carousel
} from "./index.js";
import { extractContentFromInputField } from "@utils";
import { AiFillDelete } from "react-icons/ai";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ToastContainer, toast } from "react-toastify";
import { LuStarOff } from "react-icons/lu";
import {
  faFileAudio,
  faStar,
} from '@fortawesome/free-solid-svg-icons';
import { HiOutlineDownload, HiOutlineArrowRight, HiOutlineBan } from 'react-icons/hi';
import {  BiSolidCopy, BiSolidGroup, BiSolidSelectMultiple } from 'react-icons/bi';
import { IoIosTimer } from 'react-icons/io';
import { FaUserCheck, FaUserClock, FaUserPlus } from "react-icons/fa6";

// Function to get chats for the currently opened user, group, or broadcast
const getChatsOfSpecificTab = (allUniqueChats, openedTabInfo, currentUserID) => {
  // One-on-one chats for an opened user tab
  if (openedTabInfo.tabType == 'user') {
    return allUniqueChats?.filter((chatData) => {
      return (
        // Case 1: Opened user is the receiver, and the current user is the sender
        (
          chatData?.receiversInfo?.some(receiverInfo => receiverInfo?.receiverID == openedTabInfo?.tabID) &&
          currentUserID == chatData?.senderID
          && !chatData?.toBroadcastID // Exclude broadcast chats
        )
        ||
        // Case 2: Opened user is the sender, and the current user is the receiver
        (
          openedTabInfo?.tabID == chatData?.senderID &&
          chatData?.receiversInfo?.some(receiverInfo => receiverInfo?.receiverID == currentUserID)
        )
      )
        &&
        !chatData?.deletedByUsers?.includes(currentUserID) // Ensure the current user hasn't deleted the chat
        && !chatData?.isGroupType // Exclude group chats
    });
  }

  // Broadcast chats for an opened broadcast (only for sender)
  else if (openedTabInfo.tabType == 'broadcast') {
    return allUniqueChats?.filter((chatData) => {
      return (
        chatData?.isBroadcastType // Ensure it's a broadcast chat
        && chatData?.toBroadcastID === openedTabInfo?.tabID // Match the broadcast ID
        && !chatData?.deletedByUsers?.includes(currentUserID) // Ensure the current user hasn't deleted the chat
      );
    });
  }

  // Group chats for an opened group
  else if (openedTabInfo.tabType == 'group') {
    return allUniqueChats?.filter((chatData) => {
      return (
        chatData?.isGroupType // Ensure it's a group chat
        && chatData?.toGroupID === openedTabInfo?.tabID // Match the group ID
        && !chatData?.deletedByUsers?.includes(currentUserID) // Ensure the current user hasn't deleted the chat
      );
    });
  }
  // aiAssistant chats
  else if (openedTabInfo.tabType == 'aiAssistant') {
    return allUniqueChats?.filter((chatData) => {
      return (
        chatData?.aiAssistant // Ensure it's a aiAssistant chat
        && !chatData?.deletedByUsers?.includes(currentUserID) // Ensure the current user hasn't deleted the chat
      );
    });
  }
};


// FileChat component for file type chat (pdf, doc, img, video, audio)
function FileChat({ chatData }) {
  let chatFileInfo = chatData?.file || chatData?.mediaFile;
  let chatFileType = chatFileInfo?.fileType;
  let fileURL = chatFileInfo?.fileURL;

  // showIn is for showing the chat in the chat box, and in tabInfo component, where all kept and starred chats are displayed
  return (
    <>
      {
        // Check for image file type
        chatFileType?.startsWith("image/") ?
          <img
            style={{ borderRadius: '6px' }}
            className="w-full h-full bg-white"
            src={`${fileURL}`}
            alt="file"
          />
          : // Check for video file type
          chatFileType?.startsWith("video/") ?
            <div className='w-full h-full relative'>
              <video
                style={{ borderRadius: "7px" }}
                src={`${fileURL}`}
                className="w-full h-full object-cover"
              >
                Your browser does not support the video tag.
              </video>
              <div className={`videoInfo absolute w-full bottom-0 px-2`}>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-x-1.5'>
                    <HiMiniVideoCamera className='w-5 h-5' />
                    <p>
                      {chatFileInfo?.fileDuration}
                    </p>
                  </div>
                  <div className='text-md'>
                    {chatFileInfo?.fileSize}
                  </div>
                </div>
              </div>
            </div>
            : // Check for audio file type
            chatFileType?.startsWith("audio/") &&
            <AudioPlayer fileInfo={chatData?.file} showIcon={false} />
      }
    </>
  );
};

// Safe JSON parser for the text chats, or name of group, user, etc., to avoid errors if the input is not valid JSON
const safeParseJSON = (value) => {
  try {
    return JSON.parse(value) || [];
  } catch (e) {
    return [];
  }
};

// TextChat component for handling and rendering text-based messages
function TextChat({ textData }) {
  return (
    safeParseJSON(textData)?.map((part, index) => {
      // Handle emoji rendering
      if (part.type === 'emoji') {
        return <img className={`${part?.highlight ? "highlight" : ""} not_prevent_select emoji_img`} key={index} src={part?.url} alt={part?.value} />;
      }

      // Handle new line breaks
      if (part.type === 'newline') {
        return <br className="not_prevent_select" key={index} />;
      }

      // Handle text chats
      if (part.type === 'text') {
        let formattedText = part.value; // The actual text content
        let styleObj = {}; // Object to hold inline styles

        // Apply text formatting styles
        part.format?.forEach((style) => {
          if (style.includes('color:')) {
            styleObj.color = style.split(':')[1];
          }
          if (style === 'bold') styleObj.fontWeight = 'bold';
          if (style === 'italic') styleObj.fontStyle = 'italic';
          if (style === 'underline') styleObj.textDecoration = 'underline';
          if (style === 'strikethrough') styleObj.textDecoration = 'line-through';
          if (style.startsWith('align-')) styleObj.textAlign = style.split('-')[1];
        });

        // Wrap text in a span with styles
        let textElement = <span className={`${part?.highlight ? "highlight" : ""} `} style={styleObj} key={index}>{formattedText}</span>;

        // If the text is a link, wrap it in an anchor tag
        if (part.isLink) {
          textElement = (
            <a href={formattedText} target="_blank" className={`${part?.highlight ? "highlight" : ""} url-link`} key={index}>
              {formattedText}
            </a>
          );
        };
        return textElement;
      };
      return null; // Return null for unsupported types
    })
  );
};

/**
 * Formats a timestamp for use in chat UI — like user "last seen" or message time.
 * Displays in a human-friendly format like "Today at 02:15 pm", "Yesterday at 08:30 am", etc.
 */
function formatStatusTimestamp(time) {
  return moment().isSame(moment(time), 'day')
    ? `Today at ${moment(time).format('hh:mm a')}`
    : moment().subtract(1, 'days').isSame(moment(time), 'day')
      ? `Yesterday at ${moment(time).format('hh:mm a')}`
      : moment().isSame(moment(time), 'week')
        ? moment(time).format('dddd') + ` at ${moment(time).format('hh:mm a')}`
        : moment(time).format('DD MMMM YYYY') + ` at ${moment(time).format('hh:mm A')}`;
};

// chat status info component -start
function ChatStatusInfo({ chatData, getSingleUserData, activeDarkMode }) {
  return (
    <div className={`${activeDarkMode ? "darkModeBg2" : ''} right-0 chatStatusInfo text-gray-500 absolute origin-top-right z-10 mt-0 rounded-md bg-white shadow-lg chatActionDropDownList showOnHover overflow-hidden transition duration-300 ease-in-out ring-1 ring-black ring-opacity-5 showOnHover`} role="menu" aria-orientation="vertical" aria-labelledby="menu-button" tabIndex="-1">
      {/* delivered by */}
      {
        chatData?.receiversInfo?.map((receiverInfo) => {
          return (
            <div className='relative'>
              {/* Display user button with avatar and name */}
              <button className={`${activeDarkMode ? "darkModeBg2" : ''} no profileTab border-b border-gray-200 relative hover:bg-gray-100 text-gray-700 flex items-center justify-start w-full gap-x-3`}>
                {/* Avatar box with background color if no profile image */}
                <div style={{
                  // Background color for avatar fallback
                  backgroundColor: getSingleUserData(receiverInfo?.receiverID)?.profileInfo?.bgColor
                }}
                  className="user_avatar_box flex items-center justify-center text-2xl rounded-full relative">

                  {/* First letter of username as avatar fallback */}
                  <span style={{
                    color: 'white',
                    width: '30px',
                    height: '30px',
                    fontWeight: '400',
                  }} className='flex items-center justify-center'>
                    {
                      getSingleUserData(receiverInfo?.receiverID)?.username.charAt(0).toUpperCase()
                    }
                  </span>
                </div>
                {/* Viewer name and seen time */}
                <div className="ml-2 text-left w-auto">
                  {/* Name with emoji support */}
                  <p className='text-lg font-semibold flex'>
                    <TextWithEmojis
                      hide={true}
                      textWidth={`130px`}
                      textData={
                        getSingleUserData(receiverInfo?.receiverID)?.profileInfo?.name
                      }
                      isSearching={false}
                    />
                  </p>
                  {/* Time when the viewer saw the story */}
                  <p className='text-md flex gap-x-1 flex-col flex-wrap'>
                    <span>Delivered at :</span>
                    <span>
                      {
                        (receiverInfo?.status == "delivered" || receiverInfo?.status == "seen") ?
                          formatStatusTimestamp(
                            receiverInfo?.deliveredTime
                          )
                          : "--"
                      }
                    </span>
                  </p>
                  <p className='text-md flex gap-x-1 flex-col flex-wrap'>
                    <span>Seen at :</span>
                    <span>
                      {
                        receiverInfo?.status == "seen" ?
                          formatStatusTimestamp(
                            receiverInfo?.seenTime
                          ) : "--"
                      }
                    </span>
                  </p>
                </div>
              </button>
            </div>
          )
        })
      }
    </div>
  )
};
// chat status info component -end
// ProfileInfoCard component to render user/group profile info
function ProfileInfoCard({
  tabData, currentUserID, isSearching
}) {
  return (
    <React.Fragment>
      <div
        style={{
          backgroundColor: tabData?.profileInfo?.bgColor // Set background color for avatar box from profile info
        }}
        className="user_avatar_box w-20 h-20 text-3xl flex items-center justify-center"
      >
        {
          // Display profile picture if available
          tabData?.profileInfo?.profilePic ? (
            <div className='imgContainer flex items-center justify-center text-2xl rounded-full relative'>
              <img
                className="w-full h-full rounded-full"
                src={`${tabData?.profileInfo?.profilePic}`}
                alt="Profile"
              />
            </div>
          ) : tabData?.profileInfo?.description // If description exists, consider it a group and show group icon
            ? (
              <BiSolidGroup className="text-3xl text-white" />
            ) : (
              // Otherwise, show first letter of the user's name in uppercase as fallback
              safeParseJSON(tabData?.profileInfo?.name)?.find(item => item.type === 'text' && item?.value != '')?.value?.charAt(0)?.toUpperCase()
            )
        }
      </div>
      <div className={`text-center w-full profileTabInfo`}>
        <p className='flex justify-center items-center'>
          <span className='flex text-lg font-semibold'>
            {
              // Display "You" if the profile belongs to current user, else render the name with emojis
              currentUserID == tabData?._id ?
                "You"
                :
                <TextWithEmojis
                  hide={true}
                  textWidth={`120px`}
                  textData={tabData?.profileInfo?.name}
                  isSearching={isSearching}
                />
            }
          </span>
        </p>
        {
          // Show 'about' or 'description' only if profile is not deleted
          !tabData?.isDeleted &&
          <p className='text-sm'>
            <TextWithEmojis
              hide={true}
              textWidth={'120px'}
              textData={tabData?.profileInfo?.about || tabData?.profileInfo?.description}
              isSearching={isSearching}
            />
          </p>
        }
      </div>
      {
        !tabData?.isDeleted && // Show group members only if profile is not deleted
        <div className="flex wrap items-center justify-center flex-wrap" style={{ maxWidth: "210px" }}>
          {
            // Map through members and show up to first 3
            tabData?.members?.map((memberData, idx) => (
              idx <= 2 &&
              <div key={idx} className="relative text-center">
                <button style={{ padding: '10px', border: 'none' }} className={`relative cursor-auto tabButton w-auto relative flex flex-row items-center rounded-xl`}>
                  <div
                    style={{
                      backgroundColor: memberData?.profileInfo?.bgColor // Background color for member avatar
                    }}
                    className="user_avatar_box flex items-center justify-center"
                  >
                    {
                      // Show member profile picture if available
                      memberData?.profileInfo?.profilePic ? (
                        <div className='imgContainer flex items-center justify-center text-2xl rounded-full relative'>
                          <img
                            className="w-full h-full rounded-full"
                            src={`${memberData?.profileInfo?.profilePic}`}
                            alt="Profile"
                          />
                        </div>
                      ) :
                        // Otherwise show first letter of member's name in uppercase
                        safeParseJSON(memberData?.profileInfo?.name)?.find(item => item.type === 'text' && item?.value != '')?.value?.charAt(0)?.toUpperCase()
                    }
                  </div>
                </button>
                <span style={{ width: '60px', top: "-6px" }} className='relative inline-block'>
                  {
                    // Show "You" if this member is current user, else show member's name with emojis
                    memberData?._id == currentUserID ? "You" :
                      <TextWithEmojis
                        hide={true}
                        textWidth={`65px`}
                        textData={memberData?.profileInfo?.name}
                      />
                  }
                </span>
              </div>
            ))
          }
        </div>
      }
    </React.Fragment>
  )
};

// CallDataAsChat component to render call info as a chat-like entry
function CallDataAsChat({ callData, currentUserID, showMoreCallInfo }) {
  return (
    <div className='w-full flex items-center justify-between w-full' style={{ width: showMoreCallInfo ? "88%" : "100%" }}>
      {
        callData ?
          <>
            {/* Call type icon section */}
            <div className='callTypeIcon rounded-full p-2 bg-gray-200 text-gray-500'>
              <span style={{ color: '#8696a0 !important' }} className='text-sm'>
                {
                  // Show video or phone icon based on call type
                  callData?.callType == 'video' ?
                    <HiOutlineVideoCamera
                      className='w-6 h-6'
                    />
                    :
                    <HiOutlinePhone
                      className='w-6 h-6'
                    />
                }
              </span>
            </div>

            {/* Call info section */}
            <div className='callInfo text-center'>
              <div className='callType'>
                <span style={{ fontSize: '16px' }} className='font-semibold'>
                  {
                    // Show call direction or missed call status based on caller, callee, and status
                    currentUserID == callData?.caller ? 'Outgoing'
                      :
                      currentUserID == callData?.callee &&
                        (
                          callData?.status == 'missed_call'
                        )
                        ? 'Missed Call' : 'Incomming'
                  }
                </span>
              </div>
              {
                // Show additional call status info if enabled
                showMoreCallInfo &&
                <div className='callStatus'>
                  {
                    callData?.status == "accepted" &&
                    <span>Time : {callData?.callDuration}</span> // Show call duration if accepted
                  }
                  {
                    callData?.status == 'missed_call' &&
                    <span>Ring : {callData?.ringDuration}</span> // Show ring duration if missed call
                  }
                </div>
              }
            </div>
          </>
          :
          // Display message if call data is deleted or unavailable
          "Call data deleted"
      }
    </div>
  )
};
function ChatBox() {
  // Extract required data and methods from UserContext
  const {
    currentUserID,
    allChatsData,
    openedTabInfo,
    setOpenedTabInfo,
    addOrUpdateRecentTab,
    deleteChats,
    keepChat,
    starChat,
    activeDarkMode,
    getSingleUserData,
    getSingleGroupData,
    getSingleBroadcastData,
    getSingleChatData,
    getSingleCallData,
    getSingleStoryData,
    areChatsFilesReadyToSend,
    generateUniqueID,
    setShowEditingPanel,
    setUploadedFiles,
    setIsFileUploading,
    setFileEditingFor,
    sendWebSocketMessage,
    sendFileChat,
    editChatContent,
    resendChat,
    filesForSend,
    showChatForwardingPanel,
    setShowChatForwardingPanel,
    setForwardingChats,
    deleteExpiredChats,
    deleteExpiredStories,
    showProfileInfo,
    setShowProfileInfo,
    clearChatHistory,
    makeNewCall,
    getUserConnectionStatus,
    addNewUsersToConnections,
    removeUsersFromConnections,
    acceptUsersConnectionsReq,
    chatBoxRef,
    chatBoxEndRef,
    setStoryForDirectDisplay,
    setShowStoriesSection,
    setShowRecentChatsSection,
    handleShowingSections,
    showChatBox,
    setShowChatBox,
    joinGroup,
    checkLinkExpiration,
    showProgressBar,
    getUnreadChats,
    updateChatStatus,
    makeChatUnsent,
    currentCallData,
    isVoiceRecordingCancelledRef,
    isVoiceRecording,
    sendStories,
    aiAssistant,
    showFileChatsInCarousel,
    setShowFileChatsInCarousel,
    setOpenedFileChatData,
  } = useContext(UserContext);

  // Deduplicate chats and stories by customID
  let allUniqueChats = _.uniqBy(allChatsData, "customID");

  // Get the current logged-in user's data
  let currentUserData = getSingleUserData(currentUserID);

  // Get chats of the currently opened tab (user, group, or broadcast)
  let chatsOfOpenedTab = getChatsOfSpecificTab(allUniqueChats, openedTabInfo, currentUserID);
  // Fetch openedTabData based on the type of the opened tab
  let openedTabData = openedTabInfo?.tabType === 'group' ? getSingleGroupData(openedTabInfo?.tabID) :
    openedTabInfo?.tabType === 'broadcast' ? getSingleBroadcastData(openedTabInfo?.tabID) :
      openedTabInfo?.tabType === 'user' ? getSingleUserData(openedTabInfo?.tabID) : aiAssistant;
  // Local state hooks
  const [isShowCallModalBox, setIsShowCallModalBox] = useState(false); // Controls overall visibility of the call modal
  const [showCallModalBoxInner, setShowCallModalBoxInner] = useState(false); // Controls inner transition
  const [callingModalBoxFor, setCallingModalBoxFor] = useState(""); // Can be 'audio' or 'video'
  const [showSearchBox, setShowSearchBox] = useState(false); // For showing the search bar
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false); //for showing confirmation dialog
  const [unreadChats, setUnreadChats] = useState([]); //for showing unread chats label
  // State to check if input has content
  const [inputNotEmpty, setInputNotEmpty] = useState(false);
  // Ref for input field
  const inputRef = useRef(null);
  // Show call modal with a 200ms delay (for animation effect)
  function showCallModalBox() {
    setIsShowCallModalBox(true);
    setTimeout(() => {
      setShowCallModalBoxInner(true);
    }, 200);
  };

  // Hide call modal and its inner after delay
  function hideCallModalBox() {
    setShowCallModalBoxInner(false);
    setTimeout(() => {
      setIsShowCallModalBox(false);
    }, 200);
  };


  // Time formatting options for chat time display
  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
  // Manage chat reply/edit target
  const [targetChatForReplyOrEdit, setTargetChatForReplyOrEdit] = useState(null);

  // Initialize chat selection (for multi-select delete, forward, etc.)
  const [isChatSelecting, setIsChatSelecting] = useState(false); // Whether chats are currently being selected
  const holdTimeoutRef = useRef(null); // To handle long-press hold event (mobile)
  const [selectedChats, setSelectedChats] = useState([]); // List of selected chats

  // Toggle chat selection: add if not present, remove if already selected
  async function handleMoreSelectedChats(chatData) {
    setSelectedChats((selectedChats) => {
      const isChatSelected = selectedChats?.some(prevChat => prevChat?.customID === chatData?.customID);
      if (isChatSelected) {
        return selectedChats?.filter(prevChat => prevChat?.customID !== chatData?.customID);
      } else {
        return [...selectedChats, chatData];
      }
    });
  };

  // Start hold (long-press): triggers after 800ms
  const handleHoldStart = (chatData) => {
    holdTimeoutRef.current = setTimeout(() => {
      handleMoreSelectedChats(chatData);
      setIsChatSelecting(true);
    }, 800);
  };

  // Clear hold on touch/mouse end
  const handleHoldEnd = (holdTimeoutRef) => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  };
  // move to the end
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, []);
  // Sync isChatSelecting based on selectedChats array
  useEffect(() => {
    if (selectedChats?.length === 0) {
      setIsChatSelecting(false);
    } else {
      setIsChatSelecting(true);
    }
  }, [selectedChats, handleMoreSelectedChats, handleHoldStart, handleHoldEnd]);
  useEffect(() => {
    deleteExpiredChats();
    deleteExpiredStories();
  }, [showProfileInfo]);

  // Format timestamp: show time, 'Yesterday', day name, or full date based on how old it is
  function formatTimestamp(time) {
    return moment().isSame(moment(time), 'day')
      ? moment(time).format('hh:mm a')
      : moment().subtract(1, 'days').isSame(moment(time), 'day')
        ? "Yesterday"
        : moment().isSame(moment(time), 'week')
          ? moment(time).format('dddd')
          : moment(time).format('DD/MM/YYYY');
  };


  // --------------------- Searching of Chat - Start ---------------------
  const [searchTerm, setSearchTerm] = useState(''); // Holds the current search input value
  const [chatSearchedresults, setChatSearchedresults] = useState([]); // Holds search results (matched chats)

  // Function to disable/hide the search box and reset search states
  function disableSearch() {
    setShowSearchBox(false);
    setSearchTerm('');
    setChatSearchedresults([]);
  };

  // Function to extract plain text values from a JSON-like array of message objects
  const getExtractedTextValue = (textData) => {
    return safeParseJSON(textData) // Parse JSON string safely
      ?.map(g => g?.value) // Extract 'value' property from each object in the array
      ?.join(' ') || ''; // Join all values into a single string, or return empty string if null
  };

  // Utility to normalize spaces: replaces multiple spaces with a single space and trims
  const normalizeSpaces = (str) => str.replace(/\s+/g, ' ').trim();

  // Handles input change in the search field to update results
  const handleSearch = (e) => {
    const term = e.target.value.trim().toLowerCase(); // Normalize user input
    setSearchTerm(e.target.value); // Keep raw user input in state

    // Reset search results if input is empty
    if (term === '') {
      setChatSearchedresults([]);
      return;
    };

    // Helper to check if normalized text includes the normalized search term
    const isMatch = (text, term) => {
      if (!text || !term) return false;
      return normalizeSpaces(text).toLowerCase().includes(normalizeSpaces(term).toLowerCase());
    };

    // Filter chats where message text matches the search term
    const chatMatches = chatsOfOpenedTab?.filter(chatData => {
      const chatTextValue = normalizeSpaces(getExtractedTextValue(chatData?.text)).toLowerCase();
      return isMatch(chatTextValue, term);
    });

    setChatSearchedresults(chatMatches); // Update matched search results
  };
  // --------------------- Searching of Chat - End ---------------------

  // --------------------- Handle Chat Box: Read Receipts & Auto-Scroll ---------------------
  useEffect(() => {
    if (showChatBox) {
      // Get current tab info from recent chats (based on tab ID)
      // let tabInfo = currentUserData?.recentChatsTabs?.find((tab) => tab?.tabID == openedTabInfo?.tabID);
      // Check if there are unread messages in this chat
      if (getUnreadChats(currentUserID, allUniqueChats, openedTabInfo)?.length > 0) {
        setUnreadChats(getUnreadChats(currentUserID, allUniqueChats, openedTabInfo) || []);
        // Check if current user is the receiver of these messages
        let isCurrentUserReceiver = getUnreadChats(currentUserID, allUniqueChats, openedTabInfo)?.every((chatData) =>
          chatData?.receiversInfo?.some(receiverInfo => receiverInfo?.receiverID == currentUserID)
        );

        if (isCurrentUserReceiver) {
          // Update chat status to 'seen' for these messages
          updateChatStatus(
            allUniqueChats,
            {
              status: 'seen',
              seenTime: new Date().toISOString()
            },
            openedTabInfo
          );
        };

        // Smooth scroll to the first unread message after a short delay
        setTimeout(() => {
          document.getElementById(getUnreadChats(currentUserID, allUniqueChats, openedTabInfo)[0]?.customID)
            ?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      };
    };
  }, [showChatBox, openedTabInfo, allUniqueChats]);
  // Runs whenever chat box is opened or chats data updates
  // Ref to track previously opened tab for hiding UNREAD_CHATS label
  const previousTabRef = useRef();
  useEffect(() => {
    if (previousTabRef.current && previousTabRef.current.tabID !== openedTabInfo?.tabID) {
      setUnreadChats(false);
    };
    previousTabRef.current = openedTabInfo;
  }, [openedTabInfo]);
  // ChatCard component to display individual chat items in the chat list
  let ChatCard = ({
    currentUserID,
    chatData,
    showIn
  }) => {
    return <>
      <div
        // Handle click event: if selecting mode is active, mark/unmark this chat
        onClick={() => {
          if (isChatSelecting) {
            handleMoreSelectedChats(chatData);
          }
        }}
        // For mobile: start the long press timer to trigger selecting
        onTouchStart={(e) => {
          handleHoldStart(chatData);
        }}
        // For mobile: end long press and mark as selected
        onTouchEnd={(e) => {
          handleHoldEnd(holdTimeoutRef)
        }}
        // For mobile: cancel long press (if the touch is interrupted)
        onTouchCancel={(e) => {
          handleHoldEnd(holdTimeoutRef)
        }}
        className='relative'
        id={chatData?.customID}
      >
        <div
          // Align chats: left for receiver, right for sender
          className={`${chatData?.senderID !== currentUserID ? "col-start-1 col-end-8" : "col-start-6 col-end-13"}  p-2 rounded-lg`}
        >
          <div
            // Flex row: sender messages are reversed
            className={`flex items-baseline ${chatData?.senderID !== currentUserID ? "flex-row" : "justify-start flex-row-reverse"}`}
          >
            <div style={{ flexWrap: "wrap" }} className='relative'>
              <div
                // Chat bubble classes: handle arrows, shadows, and type-specific styling
                className={`${showIn} ${chatData?.senderID !== currentUserID ? "receiver chatCardLeftArrow ml-3 receiver" : "mr-3 sender chatCardRightArrow"} shadow chatCard ${(chatData?.chatType == "file" && showIn == 'chatBox') ? "fileInChatBox" : "textInChatBox"} ${chatData?.chatType == "unsent" && chatData?.chatType} `}
              >
                <div className={`w-full flex items-center ${chatData?.isGroupType ? "justify-between" : "justify-end"}`}>
                  {
                    // show sender name in chat only when the chat is of group
                    chatData?.isGroupType &&
                    <div className="font-semibold text-lg" style={{ color: getSingleUserData(chatData?.senderID)?.profileInfo?.bgColor }} onClick={() => {
                      let tabInfo = currentUserData?.recentChatsTabs?.find(
                        (recentChatTabInfo) => recentChatTabInfo?.tabID == chatData?.senderID
                      );
                      setOpenedTabInfo(
                        tabInfo ||
                        {
                          tabType: "user",
                          tabID: chatData?.senderID,
                          recentTime: "",
                          clearingTime: "",
                          isArchived: false,
                          isPinned: false,
                          disappearingTime: "Off",
                        }
                      );
                      setShowProfileInfo(false);
                      // refresh some actioms
                      disableSearch();
                      setIsChatSelecting(false);
                      setSelectedChats([]);
                    }}>
                      {
                        chatData?.senderID === currentUserID ? `You`
                          :
                          <TextWithEmojis
                            hide={true}
                            textWidth="120px"
                            textData={getSingleUserData(chatData?.senderID)?.profileInfo?.name}
                            isSearching={false}
                          />
                      }
                    </div>
                  }
                  <div className='flex'>
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
                    {/* Chat Actions Dropdown (Reply, Delete, etc.) - start*/}
                    <div className='chatActionsDropdown'>
                      <div className="ml-1 align-self-baseline relative inline-block text-left chatForAction showChildOnParentHover" onClick={() => {
                        if (chatData?.keptByUsers?.length == 0) {
                          deleteExpiredChats();
                          deleteExpiredStories();
                        };
                      }}>
                        {/* Dropdown Toggle Button */}
                        <button type="button" className="text-white" id="menu-button" ariaexpanded="true" ariahaspopup="true">
                          <HiMiniChevronDown className={`h-6 w-6 ${chatData?.senderID !== currentUserID ? "text-gray-500" : "text-white"}`} />
                        </button>

                        {/* Dropdown Menu */}
                        <div className={`${activeDarkMode ? "darkModeBg2" : ''} text-gray-500 py-2 absolute origin-top-right z-10 mt-0 rounded-md bg-white shadow-lg chatActionDropDownList showOnHover transition duration-300 ease-in-out ring-1 ring-black ring-opacity-5`} role="menu" aria-orientation="vertical" aria-labelledby="menu-button" tabIndex="-1">
                          {
                            // show resend button if chat's sending is failed
                            chatData?.isFailed && <div onClick={() => {
                              resendChat(chatData);
                            }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                              <p className="cursor-pointer block text-md">Resend</p>
                              <FaClockRotateLeft className='w-6 h-6 inline' strokeWidth={1} />
                            </div>
                          }
                          {/* Select Chat */}
                          <div onClick={() => {
                            setIsChatSelecting(true);
                            handleMoreSelectedChats(chatData);
                          }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                            <p className="cursor-pointer block text-md">Select</p>
                            <BsCheck2 className='w-6 h-6 inline' strokeWidth={1} />
                          </div>
                          {
                            chatData?.chatType != "unsent" &&
                            <>
                              {/* Reply to Chat */}
                              {
                                (
                                  openedTabInfo.tabType == "user" ||
                                  (
                                    openedTabInfo.tabType == 'group' ?
                                      (openedTabData?.admins?.includes(currentUserID) || openedTabData?.members?.includes(currentUserID)) //for group
                                      :
                                      openedTabData?.createdBy == currentUserID //for broadcast
                                  )
                                  || openedTabInfo?.tabType == "aiAssistant"
                                ) && !openedTabData?.isDeleted &&
                                <div onClick={() => {
                                  if (openedTabInfo.tabType == 'group' && openedTabData?.messagePermission != "everyone") {
                                    let tabInfo = currentUserData?.recentChatsTabs?.find(
                                      (recentChatTabInfo) => recentChatTabInfo?.tabID == chatData?.senderID
                                    );
                                    setOpenedTabInfo(
                                      tabInfo ||
                                      {
                                        tabType: "user",
                                        tabID: chatData?.senderID,
                                        recentTime: "",
                                        clearingTime: "",
                                        isArchived: false,
                                        isPinned: false,
                                        disappearingTime: "Off",
                                      }
                                    );
                                    setShowProfileInfo(false);
                                    // refresh some actioms
                                    disableSearch();
                                    setIsChatSelecting(false);
                                    setSelectedChats([]);
                                  };
                                  setTargetChatForReplyOrEdit({ data: chatData, repliedToID: chatData?.customID, repliedToType: "chat", type: "reply" });
                                }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                                  <p className="cursor-pointer block text-md">Reply</p>
                                  <BsReplyFill className='w-6 h-6 inline' strokeWidth={1} />
                                </div>
                              }
                              {/* Reply to Chat privately for grop chat */}
                              {
                                (
                                  openedTabInfo.tabType == 'group' && (openedTabData?.admins?.includes(currentUserID) || openedTabData?.members?.includes(currentUserID))
                                ) //for group
                                && !openedTabData?.isDeleted &&
                                <div onClick={() => {
                                  let tabInfo = currentUserData?.recentChatsTabs?.find(
                                    (recentChatTabInfo) => recentChatTabInfo?.tabID == chatData?.senderID
                                  );
                                  setOpenedTabInfo(
                                    tabInfo ||
                                    {
                                      tabType: "user",
                                      tabID: chatData?.senderID,
                                      recentTime: "",
                                      clearingTime: "",
                                      isArchived: false,
                                      isPinned: false,
                                      disappearingTime: "Off",
                                    }
                                  );
                                  setShowProfileInfo(false);
                                  // refresh some actioms
                                  disableSearch();
                                  setIsChatSelecting(false);
                                  setSelectedChats([]);
                                  setTargetChatForReplyOrEdit({ data: chatData, repliedToID: chatData?.customID, repliedToType: "chat", type: "reply" });
                                }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                                  <p className="cursor-pointer block text-md">Reply Privatley</p>
                                  <BsReplyFill className='w-6 h-6 inline' strokeWidth={1} />
                                </div>
                              }
                              {/* Edit Chat (Text & Image cases handled) or copy */}
                              {
                                (chatData?.senderID == currentUserID && (chatData?.chatType == "text" || chatData?.chatType == "file") && chatData?.file?.fileType?.startsWith("image/")) &&
                                <>
                                  <div onClick={() => {
                                    if (chatData?.chatType == "text") {
                                      setTargetChatForReplyOrEdit({ data: chatData, type: "edit" });
                                    } else if (chatData?.chatType == "file" && chatData?.file?.fileType?.startsWith("image/")) {
                                      // Prepare image file for editing
                                      setUploadedFiles([{
                                        fileID: chatData?.customID,
                                        fileData: null,
                                        ...chatData?.file,
                                        oldFilePublicId: chatData?.file?.publicId,
                                        editedFile: null,
                                        coloursDataOnImage: [],
                                        emoji: [],
                                        rejection: null,
                                        isFileReEditing: true,
                                      }]);
                                      setShowEditingPanel(true);
                                      setIsFileUploading(true);
                                      setFileEditingFor("chat");
                                    };
                                  }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                                    <p className="cursor-pointer block text-md">Edit</p>
                                    <HiPencilSquare className='w-5 h-5' />
                                  </div>
                                </>
                              }
                              {/* Copy Chat Content (Text) */}
                              {
                                chatData?.chatType === "text" &&
                                <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none"
                                  onClick={async () => {
                                    try {
                                      if (chatData?.chatType === "text") {
                                        // Copy parsed text
                                        const parsedText = safeParseJSON(chatData?.text);
                                        const textValues = parsedText.map(item => item.value).join(' ');
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
                              }
                              {/* Star / Unstar Chat */}
                              <div onClick={() => {
                                starChat([chatData]); // Function handles array of chats
                              }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                                <p className="cursor-pointer block text-md">
                                  {chatData?.starredByUsers.includes(currentUserID) ? "Unstar" : "Star"}
                                </p>
                                {chatData?.starredByUsers.includes(currentUserID) ?
                                  <LuStarOff className='w-5 h-5 ' /> :
                                  <FontAwesomeIcon icon={faStar} className='' />}
                              </div>

                              {/* Keep / Unkeep Chat */}
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
                              }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                                <p className="cursor-pointer block text-md">
                                  {chatData?.keptByUsers.includes(currentUserID) ? "Unkeep" : "Keep"}
                                </p>
                                {chatData?.keptByUsers.includes(currentUserID) ?
                                  <HiMiniBookmarkSlash className='w-5 h-5 ' /> :
                                  <HiBookmark className='w-5 h-5 ' />}
                              </div>
                              {/* Download Chat File */}
                              {
                                chatData?.chatType == "file" &&
                                <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none" onClick={() => {
                                  let fileData = chatData?.file;
                                  saveAs(fileData.fileURL, fileData?.fileName);
                                }}>
                                  <p className="cursor-pointer block text-md">Save</p>
                                  <HiOutlineDownload className='w-6 h-6 ' />
                                </div>
                              }
                              {/* Forward Chat */}
                              {
                                ["file", "text", "group-invitaion", "contact-share"]?.includes(chatData?.chatType) &&
                                <>
                                  <div onClick={() => {
                                    setShowChatForwardingPanel(true);
                                    setForwardingChats([chatData]);
                                    setIsChatSelecting(false);
                                    setSelectedChats([]);
                                  }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                                    <p className="cursor-pointer block text-md">Forward</p>
                                    <HiOutlineArrowRight className='w-6 h-6 ' />
                                  </div>
                                </>
                              }
                              {/* share to story */}
                              {
                                ["text", "file"]?.includes(chatData?.chatType) &&
                                // (chatData?.chatType == "text" || chatData?.file?.fileType?.startsWith("video/") || chatData?.file?.fileType?.startsWith("image/")) &&
                                <div onClick={() => {
                                  if (chatData?.chatType == "text") {
                                    let textData = safeParseJSON(chatData?.text);
                                    sendStories(
                                      [
                                        ...textData,
                                        { type: "bgInfo", bgInfo: { type: 'solid_color', background: 'rgb(250,175,168)', color: 'white' } }
                                      ], // text to be shared
                                      null, //null as it is not a file
                                      false, //it is not forwarded
                                    );
                                  };
                                  if (chatData?.chatType == "file") {
                                    sendStories(
                                      null, //it is not text,
                                      [chatData?.file], // file to be shared,
                                      true // it is forwarded
                                    );
                                  };
                                  // check if there is a voice recording
                                  if (isVoiceRecording) {
                                    setShowConfirmationDialog({ for: "stopRecording" });
                                  } else if (inputNotEmpty) {
                                    const extractedContent = extractContentFromInputField(inputRef);
                                    if (extractedContent?.length > 0) {
                                      addOrUpdateRecentTab(openedTabInfo, {
                                        draft: {
                                          ...(openedTabInfo?.draft || {}),
                                          textData: extractedContent
                                        }
                                      });
                                      setShowChatBox(false);
                                      setOpenedTabInfo(null);
                                      handleShowingSections(setShowStoriesSection);
                                    };
                                  } else {
                                    setShowChatBox(false);
                                    setOpenedTabInfo(null);
                                    handleShowingSections(setShowStoriesSection);
                                  };
                                }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                                  <p className="cursor-pointer block text-md">Share to story</p>
                                  <HiOutlineArrowRight className='w-6 h-6 ' />
                                </div>
                              }
                            </>
                          }

                          {/* Delete Chat */}
                          <div onClick={() => {
                            deleteChats([chatData]); // Function handles array of chats
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
                            <p className="cursor-pointer block text-md">Delete</p>
                            <AiFillDelete className='w-5 h-5 ' />
                          </div>

                          {/* Unsend Chat (Only within 10 minutes) */}
                          {
                            (
                              !chatData?.aiAssistant &&
                              chatData?.senderID == currentUserID &&
                              (Date.now() - new Date(chatData?.sentTime).getTime()) <= (10 * 60 * 1000) &&
                              chatData?.chatType != "unsent" //exclude self
                            ) &&
                            <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none" onClick={() => {
                              makeChatUnsent([{
                                ...chatData,
                                file: { ...chatData?.file, oldFilePublicId: chatData?.file?.publicId },
                              }])
                            }}>
                              <p className="cursor-pointer block text-md">Unsent</p>
                              <HiMiniNoSymbol className='w-5 h-5 ' />
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                    {/* Chat Actions Dropdown (Reply, Delete, etc.) - end*/}
                  </div>
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
                        return <a target="_blank" href={fullUrl} key={partIdx} className="chatAttachmentBox">
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
                                    setShowProfileInfo(false);
                                    // refresh some actioms
                                    disableSearch();
                                    setIsChatSelecting(false);
                                    setSelectedChats([]);
                                  };
                                  setTimeout(() => {
                                    document.getElementById(repliedToID)?.scrollIntoView({ behavior: "smooth" });
                                  }, 100);
                                } else {
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
                <div className={`w-full text-left ${chatData?.senderID !== currentUserID ? "text-gray-900" : "text-white"} relative z-2`}>
                  {/* --- Chat Content START --- */}
                  {
                    chatData?.chatType == "file" &&
                    <div className={`w-full h-full`} onClick={() => {
                      if (chatData?.receiversInfo?.every(receiverInfo => receiverInfo?.status != "sending")) {
                        setShowFileChatsInCarousel(true);
                        setOpenedFileChatData(chatData);
                      };
                    }}>
                      <FileChat
                        chatData={chatData}
                      />
                    </div>
                  }
                  {
                    ["unsent", "text"]?.includes(chatData?.chatType) &&
                    <span className={`textWrapper ${chatData?.text && "mr-0"} ${chatData?.chatType == "unsent" && "flex items-center gap-x-1"}`} style={{ fontSize: '16px' }}>
                      {
                        chatData?.chatType == "unsent" &&
                        <HiOutlineBan className="text-lg" />
                      }
                      <TextChat textData={chatData?.text} />
                    </span>
                  }
                  {
                    // Group invitation type
                    chatData?.chatType == "group-invitaion" &&
                    <div className="profileInfoCard mt-2 w-full flex items-center justify-center flex-col gap-y-1">
                      <ProfileInfoCard
                        tabData={{
                          ...getSingleGroupData(safeParseJSON(chatData?.text)[0]?.targetGroupID),
                          members: getSingleGroupData(safeParseJSON(chatData?.text)[0]?.targetGroupID)?.members?.map((memberID) => {
                            return getSingleUserData(memberID)
                          })
                        }}
                        currentUserID={currentUserID}
                        isSearching={false}
                      />

                      {
                        !getSingleGroupData(safeParseJSON(chatData?.text)[0]?.targetGroupID)?.isDeleted &&
                        <>
                          {
                            (
                              !getSingleGroupData(safeParseJSON(chatData?.text)[0]?.targetGroupID)?.members?.includes(currentUserID) &&
                              checkLinkExpiration(safeParseJSON(chatData?.text)[0]?.invitingTime)?.expired == false
                            ) ?
                              <div className="rounded-lg w-auto p-3 font-semi text-md text-center" style={{ backgroundColor: "rgba(38,46,53,0.2)" }}>
                                <p
                                  className="cursor-pointer w-full"
                                  onClick={() => {
                                    joinGroup(
                                      safeParseJSON(chatData?.text)[0]?.targetGroupID
                                    )
                                  }}
                                >
                                  Join Group
                                </p>
                              </div>
                              :
                              <div className="font-semi text-md text-center w-auto">
                                You are already in this group
                              </div>
                          }
                          <div className="font-semi text-md text-center w-auto">
                            {
                              checkLinkExpiration(safeParseJSON(chatData?.text)[0]?.invitingTime)?.message
                            }
                          </div>
                        </>
                      }
                    </div>
                  }
                  {
                    // Contact share type
                    chatData?.chatType == "contact-share" &&
                    <div className="profileInfoCard w-full flex items-center justify-center flex-col gap-y-2">
                      <ProfileInfoCard
                        tabData={getSingleUserData(safeParseJSON(chatData?.text)[0]?.targetUserID)}
                        currentUserID={currentUserID}
                        isSearching={false}
                      />
                      {
                        !getSingleUserData(safeParseJSON(chatData?.text)[0]?.targetUserID)?.isDeleted &&
                        <div className="rounded-lg w-auto p-3 font-semi text-md text-center" style={{ backgroundColor: "rgba(38,46,53,0.2)" }}>
                          <p
                            className="cursor-pointer w-full"
                            onClick={() => {
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
                              // refresh some actioms
                              disableSearch();
                              setIsChatSelecting(false);
                              setSelectedChats([]);
                            }}
                          >
                            Open Profile
                          </p>
                        </div>
                      }
                    </div>
                  }
                  {
                    // voice call or video call as chat
                    ["voice-call", "video-call"]?.includes(chatData?.chatType) &&
                    <CallDataAsChat
                      callData={getSingleCallData(safeParseJSON(chatData?.text)[0]?.callID)}
                      currentUserID={currentUserID}
                      showMoreCallInfo={true}
                    />
                  }
                  {/* --- Chat Content END --- */}
                </div>
                {/* --- Chat Info: Sent time, Status, Bookmark, Star --- */}
                <div className='w-full text-right opacity-60 flex items-center justify-end' style={{ position: 'relative', top: '2px' }}>
                  {
                    chatData?.isFailed && <span className="px-1 text-red-600 rounded-lg bg-white">failed</span>
                  }
                  <span>
                    {
                      chatData?.keptByUsers?.includes(currentUserID) && (
                        <HiBookmark className='w-4 h-4 text-white mr-1' />
                      )
                    }
                  </span>
                  <span style={{ fontSize: "12px" }}>
                    {
                      chatData?.starredByUsers?.includes(currentUserID) && (
                        <FontAwesomeIcon icon={faStar} />
                      )
                    }
                  </span>
                  <span className={`ml-1 ${currentUserID == chatData?.senderID ? "text-white" : "text-gray-500"}`}>
                    {
                      currentUserID == chatData?.senderID ?
                        new Date(chatData?.sentTime).toLocaleTimeString('en-US', timeOptions)
                        :
                        new Date(
                          chatData?.receiversInfo?.find(receiverInfo => receiverInfo?.receiverID == currentUserID)?.deliveredTime
                        ).toLocaleTimeString('en-US', timeOptions)
                    }
                  </span>
                  {
                    (currentUserID == chatData?.senderID && chatData?.chatType != "unsent") &&
                    <span className='ml-1'>
                      {
                        chatData?.receiversInfo?.length == 0 ?
                          <BsCheck2 className='w-5 h-5 inline' />
                          :
                          chatData?.receiversInfo?.every(receiverInfo => receiverInfo?.status == "sending") ?
                            <HiOutlineClock className='w-5 h-5 inline' />
                            :
                            chatData?.receiversInfo?.some(receiverInfo => receiverInfo?.status == "sent") ?
                              <BsCheck2 className='w-5 h-5 inline' />
                              :
                              <BsCheck2All
                                className={`${chatData?.receiversInfo?.every(receiverInfo => receiverInfo?.status == "delivered") && "delivered"} ${chatData?.receiversInfo?.every(receiverInfo => receiverInfo?.status == "seen") && "chat_seen"} w-5 h-5 inline`}
                              />
                      }
                    </span>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
        {
          // Highlight chat if it's selected
          isChatSelecting &&
          <div className={`selecting cursor-pointer absolute right-0 top-0 w-full h-full`} style={{
            backgroundColor: selectedChats?.some(selectedChat => selectedChat?.customID == chatData?.customID) ? "rgba(196, 192, 248, 0.5)" : "transparent"
          }}></div>
        }
      </div>
    </>
  };

  useEffect(() => {
    // If files are ready to send and it's a new chat (no reply/edit), send file chat directly
    if (areChatsFilesReadyToSend && targetChatForReplyOrEdit == null) {
      sendFileChat(filesForSend, openedTabInfo, null); // Passing null as there's no target chat for reply
    };

    // If files are ready and it's a reply operation, send file chat as a reply
    if (areChatsFilesReadyToSend && targetChatForReplyOrEdit?.type == "reply") {
      sendFileChat(
        filesForSend,
        openedTabInfo,
        { repliedToID: chatData?.customID, repliedToType: "chat", type: "reply" } // Provide reply details
      );
    };

    // If files are ready and it's an edit operation, update the existing chat with the new file
    if (areChatsFilesReadyToSend && targetChatForReplyOrEdit?.type == "edit") {
      editChatContent({
        ...targetChatForReplyOrEdit,
        file: filesForSend[0], // Use the first file from the filesForSend array
        oldFileURL: targetChatForReplyOrEdit?.data?.file?.fileURL // Pass the old file URL to manage replacement
      });
    };
  }, [areChatsFilesReadyToSend, targetChatForReplyOrEdit]);
  return (
    <>
      {
        // Rendering of ChatForwarding panel when showChatForwardingPanel is true
        showChatForwardingPanel &&
        <ChatForwarding />
      }

      {/* top bar area - start  */}
      {
        // Show the chats actions on the top bar of chat box while chat is selected; else render the main TopBar
        isChatSelecting ?
          <div className={`${activeDarkMode ? "darkModeBg3" : ''} border-b border-gray-200 px-4 p-2 w-full flex items-center justify-between`}>
            <div className='flex gap-x-1 items-center'>
              <BsArrowLeft className='cursor-pointer w-6 h-6' onClick={() => {
                setIsChatSelecting(false);
                setSelectedChats([]);
              }} />
              <span className="text-lg">{selectedChats?.length} Selected</span>
            </div>
            <div className='flex items-center justify-center gap-x-3'>
              <div onClick={() => {
                deleteChats(selectedChats); // Pass the selectedChats array; this function handles both single and multiple chat deletion in one request
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
                setIsChatSelecting(false);  // Exit selection mode after deletion
              }} className='cursor-pointer flex items-center gap-x-2 flex-col'>
                <AiFillDelete className='w-5 h-5' />
              </div>
              {
                // Show the keep, star, and forward buttons only for non-system chats (text or file type chats)
                selectedChats?.every((selectedChat) => selectedChat?.chatType == "text" || selectedChat?.chatType == "file") &&
                <>
                  <div onClick={() => {
                    setForwardingChats(selectedChats); // Set the selected chats for forwarding
                    setShowChatForwardingPanel(true);   // Open the forwarding panel
                    setIsChatSelecting(false);
                    setSelectedChats([]);
                  }} className='cursor-pointer flex items-center gap-x-2 flex-col'>
                    <HiOutlineArrowRight className='w-5 h-5 cursor-pointer' />
                  </div>
                </>
              }

              <div onClick={() => {
                // If all chats are selected, unselect them; else select all chats
                selectedChats?.length == chatsOfOpenedTab?.length ?
                  setSelectedChats([])
                  :
                  setSelectedChats(chatsOfOpenedTab);
              }} className='cursor-pointer flex items-center gap-x-2 flex-col'>
                <BiSolidSelectMultiple className='w-6 h-6' />
              </div>
            </div>
          </div>
          :
          // Top info bar - start
          <React.Fragment>
            {
              // Render the call confirmation modal when isShowCallModalBox is true
              isShowCallModalBox &&
              <div id="default-modal"
                style={{
                  zIndex: '999999',
                  background: 'rgba(0,0,0,0.5)',
                  height: '100%',
                  transition: "all 0.3s"
                }} className={`overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 flex justify-center items-center`}>
                <div className={`callModalBoxChildInTopBar ${showCallModalBoxInner ? 'showModalBox' : 'hideModalBox'}`}>
                  <div className={`relative text-gray-900 ${activeDarkMode ? "darkModeBg3" : 'bg-white'} rounded-lg shadow p-4`}>
                    <div style={{ paddingBottom: '36px' }} className="flex items-center justify-center">
                      <h3 className="text-center flex items-center justify-center text-xl font-semibold">
                        Are you sure to make a {callingModalBoxFor == "voice_call" ? "Voice Call" : "Video Call"}?
                      </h3>
                    </div>
                    <div style={{ columnGap: '18px' }} className="flex items-center justify-center">
                      <button style={{
                        background: '#e90039',
                        color: 'white',
                        borderRadius: '50%',
                        padding: '12px'
                      }}
                        onClick={() => {
                          hideCallModalBox(); // Close the modal without making a call
                        }}
                      >
                        <HiXMark strokeWidth='1' className="w-5 h-5" />
                      </button>
                      <button style={{
                        background: 'rgb(114, 105, 239)',
                        color: 'white',
                        borderRadius: '50%',
                        padding: '12px'
                      }} onClick={async () => {
                        hideCallModalBox(); // Close the modal first
                        if (currentCallData == null) { // Only make a new call if no call is in progress
                          makeNewCall({
                            caller: currentUserID,
                            callee: openedTabData?._id,
                            callType: callingModalBoxFor == "voice_call" ? "voice" : "video"
                          });
                        };
                      }}>
                        {
                          // Voice call button with action
                          callingModalBoxFor == "voice_call" &&
                          <HiOutlinePhone strokeWidth='2' className={`${currentCallData && "cursor-not-allowed"} w-5 h-5`} />
                        }
                        {
                          // Video call button with action
                          callingModalBoxFor == "video_call" &&
                          <HiOutlineVideoCamera strokeWidth='2' className={`${currentCallData && "cursor-not-allowed"} w-5 h-5`} />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            }
            {/* // profile info - start */}
            <div style={{ backgroundColor: 'white', borderBottom: '1px solid rgb(230,231,234)' }} className={`topBar flex sm:items-center justify-between py-2 px-4 border-gray-200 cursor-pointer w-full ${activeDarkMode ? "darkModeBg3" : ''} relative`}>

              {/* Section to open the profile info panel on click */}
              <div className="w-full relative flex items-center space-x-2">
                <button onClick={() => {
                  // if voice recording is on, ask confirmation first
                  // check if there is a voice recording
                  if (isVoiceRecording) {
                    setShowConfirmationDialog({ for: "stopRecording" });
                  } else if (inputNotEmpty) {
                    const extractedContent = extractContentFromInputField(inputRef);
                    if (extractedContent?.length > 0) {
                      addOrUpdateRecentTab(openedTabInfo, {
                        draft: {
                          ...(openedTabInfo?.draft || {}),
                          textData: extractedContent
                        }
                      });
                      setShowChatBox(false);
                      setOpenedTabInfo(null);
                      handleShowingSections(setShowRecentChatsSection);
                    };
                  } else {
                    setShowChatBox(false);
                    setOpenedTabInfo(null);
                    handleShowingSections(setShowRecentChatsSection);
                  };
                }} className='hideChatBoxButton hidden'>
                  <BsArrowLeft className='cursor-pointer w-6 h-6' />
                </button>
                {/* Profile picture or fallback avatar */}
                <div
                  style={{
                    backgroundColor: openedTabData?.profileInfo?.profilePic == "" && openedTabData?.profileInfo?.bgColor
                  }}
                  className="user_avatar_box flex items-center justify-center text-2xl rounded-full relative"
                >
                  {/* Show profile image if available */}
                  {
                    openedTabData?.profileInfo?.profilePic ? (
                      <div className='imgContainer flex items-center justify-center text-2xl rounded-full relative'>
                        <img
                          className="w-full h-full rounded-full"
                          src={`${openedTabData?.profileInfo?.profilePic}`}
                          alt="Profile"
                        />
                      </div>
                    ) : openedTabInfo?.tabType === "user" ? (
                      // Show first letter of user name if user tab
                      safeParseJSON(openedTabData?.profileInfo?.name)?.find(item => item.type === 'text')?.value?.charAt(0)?.toUpperCase()
                    ) : (
                      // Show group icon if group tab
                      <BiSolidGroup className="text-3xl text-white" />
                    )
                  }

                  {/* Disappearing timer icon if enabled */}
                  {
                    (
                      currentUserData?.recentChatsTabs?.find(
                        (recentChatTabInfo) => recentChatTabInfo?.tabID == openedTabInfo?.tabID
                      )?.disappearingTime &&
                      currentUserData?.recentChatsTabs?.find(
                        (recentChatTabInfo) => recentChatTabInfo?.tabID == openedTabInfo?.tabID
                      )?.disappearingTime != "Off"
                    ) &&
                    <div className='dissapearTimerIcon'>
                      <IoIosTimer className='w-5 h-5' />
                    </div>
                  }
                </div>

                {/* User or group name and status */}
                <div className="flex flex-col leading-tight">
                  <div className="text-md mt-1 flex items-center">
                    <span className={`font-semibold text-md flex items-center mr-1`}>
                      {
                        openedTabInfo.tabID == currentUserID ? 'You' :
                          <TextWithEmojis
                            hide={true}
                            textWidth={`auto`}
                            areaName={'topBarInfo'}
                            textData={openedTabData?.profileInfo?.name}
                          />
                      }
                    </span>
                  </div>

                  {/* Status or group members */}
                  <div className={`flex items-center text-sm`} style={{ fontSize: "12px" }}>
                    {
                      openedTabInfo.tabID != currentUserID && openedTabInfo.tabType == 'user' && openedTabData?.profileInfo?.activeStatus != '' &&
                      (openedTabData?.profileInfo?.activeStatus != 'online') &&
                      (
                        // Status formatting based on the date
                        formatStatusTimestamp(openedTabData?.profileInfo?.activeStatus)
                      )
                    }
                    {
                      openedTabInfo.tabID != currentUserID && openedTabData?.profileInfo?.activeStatus == 'online' && "Online"
                    }
                    {
                      // Show group members if not a user tab
                      openedTabInfo.tabType != 'user' &&
                      <span className={`truncate flex items-center justify-start gap-1 membersName`}>
                        {
                          openedTabData?.members?.map((member, index) => (
                            <React.Fragment key={member}>
                              {
                                member === currentUserID
                                  ? "You"
                                  :
                                  <TextWithEmojis
                                    hide={true}
                                    textWidth="60px"
                                    textData={getSingleUserData(member)?.profileInfo?.name}
                                  />
                              }
                              {index < openedTabData?.members?.length - 1 && ", "}
                            </React.Fragment>
                          ))
                        }
                      </span>
                    }
                  </div>
                </div>
              </div>

              {/* Top bar right-side icons and dropdowns */}
              <div className="w-auto inline-flex items-center justify-center gap-x-3">
                {/* Search icon and box */}
                <button type="button" className={`searchIconInTopBar inline-flex items-center justify-center rounded-lg border h-8 w-8 transition duration-500 ease-in-out text-gray-500 hover:bg-gray-300 focus:outline-none ${activeDarkMode ? "darkModeBg3" : ''}`}>
                  <HiMagnifyingGlass className='w-5 h-5' onClick={() => {
                    setShowSearchBox(!showSearchBox)
                    if (showSearchBox) {
                      disableSearch();
                    };
                  }} />
                  <p className="actionText hidden">Search</p>
                  <div className={`${showSearchBox ? "scale-100" : "scale-0"} searchContainerInChatBox ${activeDarkMode ? "darkModeBg3" : ''}`}>
                    <div style={{ height: "48px" }} className={`searchContainer relative flex items-center h-full w-full rounded-lg bg-white overflow-hidden ${activeDarkMode ? "darkModeBg1" : ''}`}>
                      <div className={`bg-gray-200 grid place-items-center h-full w-12 text-gray-400 cursor-pointer ${activeDarkMode ? "darkModeBg1" : ''}`} onClick={() => disableSearch()}>
                        <BsArrowLeft className="w-6 h-6" />
                      </div>
                      <div className={`h-full w-full outline-none text-sm bg-gray-200 text-dark`} id="search">
                        <input
                          type="text"
                          className={`h-full w-full outline-none text-lg bg-gray-200 text-dark ${activeDarkMode ? "darkModeBg1" : ''}`}
                          placeholder="Search..."
                          value={searchTerm}
                          onChange={handleSearch}
                        />
                      </div>
                    </div>
                  </div>
                </button>
                <div className='actionContainerOnTopbarInChatbox'>
                  <HiEllipsisVertical className={`${activeDarkMode ? "darkModeBg3" : ''} hidden actionShowingButton w-5 h-5 rounded-lg border h-8 w-8 transition duration-500 ease-in-out text-gray-500 hover:bg-gray-300 focus:outline-none`} />
                  <div className={`flex items-center gap-x-3 actionListOnTopbarInChatbox ${activeDarkMode ? "darkBg" : ''}`}>
                    {/* Connection / call buttons (only for user tabs except current user) */}
                    {
                      (openedTabInfo?.tabType == 'user' && openedTabInfo?.tabID != currentUserID && !openedTabData?.isDeleted) &&
                      <React.Fragment>
                        {/* Add/Manage connection button */}
                        <button onClick={() => {
                          if (getUserConnectionStatus(openedTabInfo?.tabID)?.condition == "not_exist") {
                            let newConnectionInfo = {
                              initiaterUserID: currentUserID,
                              targetUserID: openedTabInfo?.tabID,
                              status: "pending",
                              connectionID: generateUniqueID("CON"),
                              acceptingSeenByInitiator: false
                            };
                            addNewUsersToConnections([newConnectionInfo]);
                            sendWebSocketMessage('connections:requests', 'connectionInfos', [newConnectionInfo]);
                          };
                        }} type="button" className={`relative inline-flex items-center justify-center z-10 rounded-lg border h-8 w-8 transition duration-500 ease-in-out text-gray-500 hover:bg-gray-300 focus:outline-none ${activeDarkMode ? "darkModeBg3" : ''} showChildOnParentHover `}>
                          <p className="actionText hidden">Con. Acction</p>
                          {
                            getUserConnectionStatus(openedTabInfo?.tabID)?.condition == "not_exist" &&
                            <FaUserPlus className="w-5 h-5" />
                          }
                          {
                            getUserConnectionStatus(openedTabInfo?.tabID)?.condition == "pending" &&
                            <FaUserClock className="w-5 h-5" />
                          }
                          {
                            getUserConnectionStatus(openedTabInfo?.tabID)?.condition == "accepted" &&
                            <FaUserCheck className="w-5 h-5" />
                          }
                          {/* Pending connection action dropdown */}
                          {
                            // show drop down list for
                            getUserConnectionStatus(openedTabInfo?.tabID)?.condition != "not_exist" &&
                            <div className={`connectionAction w-max absolute top-10 showOnHover ${activeDarkMode ? "darkModeBg1" : ''} bg-white shadow-lg py-2 px-4 z-10 rounded-md transition-all duration-300 ease-in-out transform origin-top border-1 border-gray-300 flex flex-col gap-y-3 ring-1 ring-black ring-opacity-5`}>
                              {
                                (getUserConnectionStatus(openedTabInfo?.tabID)?.condition == "pending" &&
                                  getUserConnectionStatus(openedTabInfo?.tabID)?.result?.targetUserID == currentUserID) &&
                                <p onClick={() => {
                                  let connectionInfos = getUserConnectionStatus(openedTabInfo?.tabID)?.result;
                                  acceptUsersConnectionsReq([connectionInfos]);
                                  sendWebSocketMessage("connections:accepted", 'connectionInfos', [connectionInfos]);
                                }} className="w-full">Accept Request</p>
                              }
                              <p onClick={() => {
                                let connectionInfos = getUserConnectionStatus(openedTabInfo?.tabID)?.result;
                                let remover = getUserConnectionStatus(openedTabInfo?.tabID)?.result?.targetUserID == currentUserID ? "targetUser" : "initiaterUser";
                                removeUsersFromConnections([connectionInfos]);
                                sendWebSocketMessage("connections:removed", 'connectionInfos', [{ ...connectionInfos, remover }]);
                              }} className="w-full">
                                {
                                  (getUserConnectionStatus(openedTabInfo?.tabID)?.condition == "pending" &&
                                    getUserConnectionStatus(openedTabInfo?.tabID)?.result?.targetUserID == currentUserID) && "Reject Request"
                                }
                                {
                                  (getUserConnectionStatus(openedTabInfo?.tabID)?.condition == "pending" &&
                                    getUserConnectionStatus(openedTabInfo?.tabID)?.result?.initiaterUserID == currentUserID) && "Cancel Request"
                                }
                                {
                                  getUserConnectionStatus(openedTabInfo?.tabID)?.condition == "accepted" &&
                                  "Remove connection"
                                }
                              </p>
                            </div>
                          }
                        </button>
                        {/* Voice call button */}
                        <button onClick={() => {
                          if (getUserConnectionStatus(openedTabInfo?.tabID)?.condition == "accepted" && currentCallData == null) {
                            setCallingModalBoxFor("voice_call");
                            showCallModalBox();
                          } else {
                            console.error('User is not connected');
                          };
                        }} type="button" className={`${getUserConnectionStatus(openedTabInfo?.tabID)?.condition != "accepted" && "cursor-not-allowed"} inline-flex items-center justify-center rounded-lg border h-8 w-8 transition duration-500 ease-in-out text-gray-500 hover:bg-gray-300 focus:outline-none ${activeDarkMode ? "darkModeBg3" : ''}`}>
                          <p className="actionText hidden">Voice call</p>
                          <HiOutlinePhone className="w-5 h-5" />
                        </button>
                        {/* Video call button */}
                        <button onClick={() => {
                          if (getUserConnectionStatus(openedTabInfo?.tabID)?.condition == "accepted" && currentCallData == null) {
                            setCallingModalBoxFor("video_call");
                            showCallModalBox();
                          } else {
                            console.error('User is not connected');
                          };
                        }} type="button" className={`${getUserConnectionStatus(openedTabInfo?.tabID)?.condition != "accepted" && "cursor-not-allowed"} inline-flex items-center justify-center rounded-lg border h-8 w-8 transition duration-500 ease-in-out text-gray-500 hover:bg-gray-300 focus:outline-none ${activeDarkMode ? "darkModeBg3" : ''}`}>
                          <p className="actionText hidden">Video call</p>
                          <HiOutlineVideoCamera className="w-5 h-5" />
                        </button>
                      </React.Fragment>
                    }
                    {/* Show profile info */}
                    <button onClick={() => {
                      setShowProfileInfo(true);
                    }} type="button" className={`inline-flex items-center justify-center rounded-lg border h-8 w-8 transition duration-500 ease-in-out text-gray-500 hover:bg-gray-300 focus:outline-none ${activeDarkMode ? "darkModeBg3" : ''}`}>
                      <p className="actionText hidden">Profile info</p>
                      <HiOutlineInformationCircle className="w-5 h-5" />
                    </button>
                    {/* Clear chat history */}
                    <button onClick={() => {
                      setShowConfirmationDialog({ for: "clearChatsHistory" });
                    }} type="button" className={`inline-flex items-center justify-center rounded-lg border h-8 w-8 transition duration-500 ease-in-out text-gray-500 hover:bg-gray-300 focus:outline-none ${activeDarkMode ? "darkModeBg3" : ''}`}>
                      <p className="actionText hidden">Delete chats</p>
                      <AiFillDelete className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* // profile info - end */}

          </React.Fragment>
        // Top info bar - end
      }
      {/* top bar area - end */}

      {/* main chat box */}
      <div ref={chatBoxRef} className={`flex chatBox overflow-y-auto justify-start flex-col h-full ${activeDarkMode ? "darkModeBg3" : ''}`}>
        <div className="grid grid-cols-12 gap-y-2">
          {
            !openedTabData?.isDeleted && chatsOfOpenedTab?.length == 0 && currentUserData?.recentChatsTabs?.find((tab) => tab?.tabID == openedTabInfo?.tabID)?.clearingTime &&
            <div className='col-span-12 w-full'>
              <div className={`${activeDarkMode ? "darkModeBg1" : ''} dayName col-span-12 mx-auto`}>
                <p className={`${activeDarkMode ? "darkModeBg1" : ''}`}>{formatTimestamp(currentUserData?.recentChatsTabs?.find((tab) => tab?.tabID == openedTabInfo?.tabID)?.clearingTime)}</p>
              </div>
            </div>
          }
          {
            !openedTabData?.isDeleted && (
              currentUserData?.recentChatsTabs?.find((tab) => tab?.tabID == openedTabInfo?.tabID)?.disappearingTime &&
              currentUserData?.recentChatsTabs?.find((tab) => tab?.tabID == openedTabInfo?.tabID)?.disappearingTime != "Off"
            ) &&
            <div className={`${chatsOfOpenedTab?.length != 0 && "mt-4"} col-span-12 w-full`}>
              <div className='w-full flex items-center justify-center'>
                <div className={` ${activeDarkMode ? "darkModeBg1" : ''} systemTextInChatBox text-center flex items-center justify-center`}>
                  Messages in this chat will be automatically deleted&nbsp;
                  {` ${currentUserData?.recentChatsTabs?.find((tab) => tab?.tabID == openedTabInfo?.tabID)?.disappearingTime} `}
                  after they are sent — except if they are saved
                </div>
              </div>
            </div>
          }
          {
            // Group chats by date (Today, Yesterday, Weekday name, or full date)
            [
              ...new Set(
                (searchTerm == '' ? chatsOfOpenedTab : chatSearchedresults)
                  ?.map((chatData) => {
                    const chatTime = moment(chatData?.sentTime || chatData?.receiversInfo?.find(r => r?.receiverID == currentUserID)?.deliveredTime);
                    return moment().isSame(chatTime, 'day') ? 'Today' :
                      moment().subtract(1, 'days').isSame(chatTime, 'day') ? 'Yesterday' :
                        moment().isSame(chatTime, 'week') ? chatTime.format('dddd') :
                          chatTime.format('DD/MM/YYYY');
                  }).filter(Boolean) // Remove any empty values
              )
            ]?.map((chatDay, idx1) => (
              <div key={idx1} className='col-span-12 w-full'>
                {/* Date separator header */}
                <div className={`${activeDarkMode ? "darkModeBg1" : ''} dayName col-span-12`}>
                  <p className={`${activeDarkMode ? "darkModeBg1" : ''}`}>{chatDay}</p>
                </div>
                {/* Filter chats for the current date and render them */}
                {
                  (searchTerm == '' ? chatsOfOpenedTab : chatSearchedresults)
                    ?.map((chatData, idx2) => {
                      const chatTime = moment(chatData?.sentTime || chatData?.receiversInfo?.find(receiverInfo => receiverInfo?.receiverID == currentUserID)?.deliveredTime);
                      const isMatchingDate =
                        chatDay === chatTime.format('dddd') ||
                        chatDay === chatTime.format('DD/MM/YYYY') ||
                        (chatDay === 'Today' && moment().isSame(chatTime, 'day')) ||
                        (chatDay === 'Yesterday' && moment().subtract(1, 'days').isSame(chatTime, 'day'));

                      return isMatchingDate && (
                        <>
                          {
                            // Show "Unread Chats" label if there are unread chats
                            unreadChats?.length > 0 && unreadChats?.map((unread, idx) => {
                              return (unread?.customID == chatData?.customID && idx == 0) && (
                                <div className={`${activeDarkMode ? "darkModeBg1" : ''} mt-3 dayName col-span-12`} style={{ background: "#0087ff", margin: "20px 0px", height: "3px" }}>
                                  <p className={`${activeDarkMode ? "darkModeBg1" : ''} text-xl text-white`} style={{ background: "#0087ff" }}>Unread Chats</p>
                                </div>
                              )
                            })
                          }
                          <div key={idx2}>
                            {
                              // Render message cards (for text, file, unsent, etc.)
                              ["file", "unsent", "text", "group-invitaion", "contact-share", "voice-call", "video-call"]?.includes(chatData?.chatType) ?
                                <ChatCard
                                  chatData={chatData}
                                  currentUserID={currentUserID}
                                  showIn={'chatBox'}
                                /> :
                                // Render system messages (e.g., user blocked, group joined)
                                <div className='w-full flex items-center justify-center'>
                                  <div className={` ${activeDarkMode ? "darkModeBg1" : ''}  systemTextInChatBox text-center flex items-center justify-center`}>
                                    <TextWithEmojis
                                      hide={false}
                                      textWidth={`auto`}
                                      textData={chatData?.text}
                                      isSearching={searchTerm ? true : false}
                                    />
                                  </div>
                                </div>
                            }
                          </div>
                        </>
                      );
                    })
                }
              </div>
            ))
          }
          {
            // Show typing/recording status if any
            openedTabData?.chattingStatus &&
            <div className='chattingStatus w-max p-2'>
              <div className='chatCardLeftArrow ml-3 receiver shadow chatCard col-start-1 col-end-8 p-2 rounded-lg'>
                {
                  openedTabInfo.tabType == 'group' ?
                    <>
                      <TextWithEmojis
                        hide={true}
                        textWidth={`40px`}
                        textData={getSingleUserData(openedTabData?.chattingStatusBy)?.profileInfo?.name}
                        isSearching={searchTerm ? true : false}
                      />
                      : is {openedTabData?.chattingStatus}
                    </>
                    :
                    openedTabData?.chattingStatus
                }
              </div>
            </div>
          }
        </div>
        {/* Empty div used as scroll target */}
        <div ref={chatBoxEndRef} />
      </div>
      {
        // Show attachment preview when replying/editing a chat
        targetChatForReplyOrEdit &&
        <div className={`${activeDarkMode ? "darkModeBg1" : ''} border-b border-gray-200 chatAttachmentBox m-0 rounded-none p-2 flex items-center justify-between`}>
          <div className={`${activeDarkMode ? "darkModeBg3" : ''} w-full text-white bg-gray-400 p-2 rounded-lg ${targetChatForReplyOrEdit?.data?.chatType == "file" && "flex items-center justify-between"} truncate `}>
            <div className="font-semibold text-lg">
              {
                targetChatForReplyOrEdit?.data?.senderID == currentUserID ? "You " :
                  <TextWithEmojis
                    hide={true}
                    textWidth={`120px`}
                    textData={
                      openedTabInfo?.tabType == "aiAssistant" ? aiAssistant?.profileInfo?.name :
                        getSingleUserData(targetChatForReplyOrEdit?.data?.senderID)?.profileInfo?.name
                    }
                    isSearching={false}
                  />
              }
            </div>
            {
              // Render text preview
              targetChatForReplyOrEdit?.data?.chatType == "text" &&
              <TextWithEmojis
                hide={true}
                textWidth={`120px`}
                textData={targetChatForReplyOrEdit?.data?.text}
                isSearching={false}
              />
            }
            {/* voice call or video call as chat */}
            {
              ["voice-call", "video-call"]?.includes(targetChatForReplyOrEdit?.data?.chatType) &&
              <CallDataAsChat
                callData={getSingleCallData(safeParseJSON(targetChatForReplyOrEdit?.data?.text)[0]?.callID)}
                currentUserID={currentUserID}
                showMoreCallInfo={false}
              />
            }
            {
              // for contact sharing or group invitaion 
              ["group-invitaion", "contact-share"]?.includes(targetChatForReplyOrEdit?.data?.chatType) &&
              <div className='w-full flex items-center justify-start gap-x-2'>
                {
                  targetChatForReplyOrEdit?.data?.chatType == "contact-share" ?
                    <HiUser className="text-lg" />
                    :
                    <BiSolidGroup className="text-lg" />
                }
                <TextWithEmojis
                  hide={true}
                  textWidth={`120px`}
                  textData={
                    targetChatForReplyOrEdit?.data?.chatType == "group-invitaion" ?
                      getSingleGroupData(safeParseJSON(targetChatForReplyOrEdit?.data?.text)[0]?.targetGroupID)?.profileInfo?.name
                      :
                      getSingleUserData(safeParseJSON(targetChatForReplyOrEdit?.data?.text)[0]?.targetUserID)?.profileInfo?.name
                  }
                  isSearching={false}
                />
              </div>
            }
            {
              // Render file preview
              (targetChatForReplyOrEdit?.data?.chatType == "file") &&
              <>
                {
                  targetChatForReplyOrEdit?.data?.file?.fileType?.startsWith("audio/") ?
                    <div>
                      <FontAwesomeIcon icon={faFileAudio} className='text-lg' />
                    </div>
                    :
                    <div style={{ width: `${targetChatForReplyOrEdit?.data?.file?.fileWidth / 6}px` }}>
                      <FileChat
                        chatData={targetChatForReplyOrEdit?.data}
                      />
                    </div>
                }
              </>
            }
          </div>
          <BsX className="mx-2 w-5 h-5 bg-gray-500 rounded-full cursor-pointer text-white" onClick={() => {
            setTargetChatForReplyOrEdit(null);
          }} />
        </div>
      }
      {
        // Show message input box if it's a user tab or if the user is a group member
        //  &&
        <div className={`w-full h-auto ${(
          openedTabInfo.tabType == "user" ||
          (
            openedTabInfo.tabType == 'group' ?
              (openedTabData?.admins?.includes(currentUserID) || (openedTabData?.members?.includes(currentUserID) && openedTabData?.messagePermission == "everyone")) //for group
              :
              openedTabData?.createdBy == currentUserID //for broadcast
          )
          || openedTabInfo?.tabType == "aiAssistant"
        ) && !isChatSelecting && !openedTabData?.isDeleted ? "block" : "hidden"
          } `}>
          <MultiInputBox
            useFor={"chat"}
            inputRef={inputRef}
            showFeatures={openedTabInfo?.tabType != "aiAssistant"}
            inputNotEmpty={inputNotEmpty}
            setInputNotEmpty={setInputNotEmpty}
            targetChatForReplyOrEdit={targetChatForReplyOrEdit}
            setTargetChatForReplyOrEdit={setTargetChatForReplyOrEdit}
          />
        </div>
      }
      {
        (openedTabData?.members?.includes(currentUserID) && openedTabInfo.tabType == 'group' && !openedTabData?.admins?.includes(currentUserID) && openedTabData?.messagePermission != "everyone") &&
        <div className={`w-full p-4 bg-gray-200 ${activeDarkMode ? "darkModeBg2" : ''} text-center`}>
          Only Admin can send message
        </div>
      }
      {
        openedTabData?.isDeleted &&
        <div className={`w-full p-4 bg-gray-200 ${activeDarkMode ? "darkModeBg2" : ''} text-center`}>
          {openedTabInfo.tabType == 'user' && "Account is deleted"}
          {openedTabInfo.tabType == 'group' && "Group is deleted"}
          {openedTabInfo.tabType == 'broadcast' && "Broadcast is deleted"}
        </div>
      }
      {
        // Show a warning if the user is no longer a member of the group
        !openedTabData?.isDeleted && openedTabInfo.tabType == 'group' && !openedTabData?.members?.includes(currentUserID) &&
        <div className={`w-full p-4 bg-gray-200 ${activeDarkMode ? "darkModeBg2" : ''} text-center`}>
          You are no longer member this group
        </div>
      }
      {
        // Show progress bar while joining a group
        showProgressBar && <ProgressBar
          position={'fixed'}
        />
      }
      {
        // show file chats in carousel
        showFileChatsInCarousel &&
        <Carousel />
      }
      {
        showConfirmationDialog &&
        <ConfirmationDialog
          textMsg={`Are you sure you want to ${showConfirmationDialog?.for == "stopRecording" ? "cancel the voice recording?" : showConfirmationDialog?.for == "clearChatsHistory" ? "clear chats" : " unkeep this chat? It will be deleted right away."}`}
          handleConfirmAction={() => {
            setShowConfirmationDialog(false);
            if (showConfirmationDialog?.for == "stopRecording") {
              isVoiceRecordingCancelledRef.current = true;
              setTimeout(() => {
                setShowChatBox(false);
                setOpenedTabInfo(null);
                handleShowingSections(setShowRecentChatsSection);
              }, 1000);
            } else if (showConfirmationDialog?.for == "clearChatsHistory") {
              clearChatHistory(
                openedTabInfo,
                true //need to set clearingTime
              );
            } else {
              keepChat([showConfirmationDialog?.data]);
            };
          }}
          setShowConfirmationDialog={setShowConfirmationDialog}
        />
      }
      {/* ToastContainer for showing notifications */}
      <ToastContainer />
    </>
  )
}

export default ChatBox;
export { FileChat, TextChat, ProfileInfoCard, getChatsOfSpecificTab, CallDataAsChat, formatStatusTimestamp, ChatStatusInfo };