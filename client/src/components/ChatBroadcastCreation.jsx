import React, { useContext, useEffect, useRef, useState } from 'react';
import { HiMiniPhoto, HiOutlineFaceSmile } from 'react-icons/hi2';
import { BsArrowLeft, BsArrowRight, BsCameraFill, BsCheck2, BsXCircle, BsFillKeyboardFill } from 'react-icons/bs';
import { BiSolidGroup } from 'react-icons/bi';
import { HiOutlineSearch } from "react-icons/hi";
import { FaCheck } from "react-icons/fa6";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen } from '@fortawesome/free-solid-svg-icons';
import _ from 'lodash';
import { UserContext } from '@context/UserContext';
import EmojiPicker from 'emoji-picker-react';
import { ToastContainer, toast } from "react-toastify";
import { AiFillDelete } from "react-icons/ai";
import {extractContentFromInputField} from "@utils";
import { ProgressBar, TextWithEmojis, ProfileTab, CameraFrame, HandleProfileImage } from './index.js';
function ChatBroadcastCreation() {
  const {
    wbServer,
    sendWebSocketMessage,
    currentUserID,
    setShowRecentChatsSection,
    handleShowingSections,
    selectedUsersForGroupOrBroadcast,
    setSelectedUsersForGroupOrBroadcast,
    getColorForName,
    getSingleUserData,
    generateUniqueID,
    showProgressBar,
    setShowProgressBar,
    activeDarkMode,
    safeParseJSON,
    handlePictureUpload,
    handleInputDirection,
    insertEmojiIntoInputField,
  } = useContext(UserContext);
  //action buttons on top bar
  let currentUserData = getSingleUserData(currentUserID);
  const [usersDataForShowing, setUsersDataForShowing] = useState(() => {
    const connectedUsers = currentUserData?.connections
      ?.map((connection) => {
        const targetUserID = connection?.initiaterUserID === currentUserID
          ? connection?.targetUserID
          : connection?.initiaterUserID;

        const alreadySelected = selectedUsersForGroupOrBroadcast?.some(
          (user) => user?._id === targetUserID
        );

        return !alreadySelected ? getSingleUserData(targetUserID) : null;
      })
      ?.filter(Boolean); // removes null or undefined
    return connectedUsers?.concat(selectedUsersForGroupOrBroadcast || []);
  })?.filter((userData) => !userData?.isDeleted); // Filter out deleted users
  const [selectedUsers, setSelectedUsers] = useState(selectedUsersForGroupOrBroadcast || []);
  const [selectingProcess, setSelectingProcess] = useState(true);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showEmojiContainer, setShowEmojiContainer] = useState(false);
  const [showProfilePicOption, setShowProfilePicOption] = useState(false); //option for profile picture like camera, gallery, and delete (for delete previous profile pic)
  const [profilePicInfo, setProfilePicInfo] = useState(null); //for change profile picture
  const [showFullProfilePic, setShowFullProfilePic] = useState(false); //for showing the profile in full screen
  const [showCameraPanel, setShowCameraPanel] = useState(false); //for camera activation
  const [showProfileEditingPanel, setShowProfileEditingPanel] = useState(false); //for showing the profile picture editing component
  useEffect(() => {
    if (profilePicInfo != null) {
      // show the rejection message when the user tries to upload an unsupported file type
      if (profilePicInfo?.rejection != null) {
        toast.error(`${profilePicInfo?.rejection?.msg}`);
        setProfilePicInfo(null);
      };
      // opend tha profile editing panel when the user captures the image
      if (profilePicInfo?.isCaptured && !profilePicInfo?.isReady) {
        setShowProfileEditingPanel(true);
      };
    };
  }, [profilePicInfo])
  async function handleSelectedUsers(userData) {
    let { _id } = userData;
    setSelectedUsers((selectedUsers) => {
      // Check if the user is already present
      const isUsersSelected = selectedUsers?.some((prevData) => prevData?._id == _id);

      if (isUsersSelected) {
        // Remove the user if already present
        return selectedUsers?.filter((prevData) => prevData?._id !== _id);
      } else {
        // Add the user if not present
        return [...selectedUsers, userData];
      }
    });
  };
  // searching handling - start
  const [showSearchBox, setShowSearchBox] = useState(false); // State to control the visibility of the search box
  const [searchTerm, setSearchTerm] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  // Handles user input for search functionality
  const handleSearch = (e) => {
    const term = e.target.value?.trim().toLowerCase(); // Trim whitespace & convert to lowercase
    setSearchTerm(e.target.value); // Update state with user input

    // If search term is empty, reset search results
    if (term === '') {
      setSearchedUsers([]);
      return;
    };
    const normalizeSpaces = (str) => str.replace(/\s+/g, ' ').trim();
    // Function to get the name and about of user
    const getTextValue = (userData, key) => {
      let values = userData?.profileInfo?.[key]; // Get the value from profileInfo
      return safeParseJSON(values) // Parse JSON string safely
        ?.map(g => g?.value) // Extract 'value' property from each object
        ?.join(' ') || ''; // Join multiple values into a single string
    };
    // Step 1: Filter users based on search term matching name or about section
    const userMatches = usersDataForShowing?.filter(userData => {
      let name = normalizeSpaces(getTextValue(userData, 'name'))?.toLowerCase();
      let about = normalizeSpaces(getTextValue(userData, 'about'))?.toLowerCase();
      let username = userData?.username?.toLowerCase();
      return (name.includes(term) || about.includes(term) || username.includes(term));
    });
    setSearchedUsers(userMatches); // Update state with matched & highlighted search results
  };
  // searching handling - end
  const inputRef = useRef(null);
  const [isTypingName, setIsTypingName] = useState(false); // State to track whether the user is typing text in the input field
  function closeBroadcastCreation() {
    handleShowingSections(setShowRecentChatsSection);
    setSelectedUsersForGroupOrBroadcast(null);
  };


  async function createNewBroadcast() {
    // Extract content from the input field
    let extractedContent = await extractContentFromInputField(inputRef);
    let broadcastName = extractedContent?.find(item => item.type === 'text')?.value?.trim();
    // Define the broadcast data to be stored in the database
    const broadcastData = {
      profileInfo: {
        name: JSON.stringify(extractedContent), // Storing name as JSON, likely to support formatting,
        profilePic: profilePicInfo?.newFileData?.fileURL || "", // URL of the profile picture
        bgColor: getColorForName(broadcastName),
        // Background color when no profile pic, based on the first letter of the broadcast name
        description: JSON.stringify([{ type: 'text', value: "Your Broadcast" }]), // Default description
      },
      profilePicInfo: profilePicInfo?.newFileData, //it is a temporary property and value to store the image data before uploading it to the server, and it has the base64 data of the image, file type, size etc.
      createdBy: currentUserID,
      members: selectedUsers?.map((userData) => userData?._id),
    };

    // Common chat data template to avoid redundancy
    const commonChatData = {
      senderID: currentUserID,
      isGroupType: false,
      toGroupID: null,
      isBroadcastType: true,
      toBroadcastID: null,
      file: null, // No file in these system messages
      receiversInfo: [],
      deletedByUsers: [],
      starredByUsers: [],
      keptByUsers: [],
      repliedToInfo: null,
      isForwarded: false
    };
    // Chat message when the broadcast is created
    const broadcastCreatingChatData = {
      ...commonChatData,
      customID: generateUniqueID("CHAT"), // Generate a unique ID for the chat message
      chatType: 'system-broadcast-creating',
      sentTime: new Date().toISOString(),
      text: null //it will be updated after broadcast creation in server side
    };

    // Chat message when members are added
    const broadcastAddingChatData = {
      ...commonChatData,
      customID: generateUniqueID("CHAT"), // Generate another unique ID for this chat
      chatType: 'system-adding-member-broadcast',
      sentTime: new Date().toISOString(),
      text: JSON.stringify([
        {
          type: 'text',
          value: `added`, // Message content indicating members added
          targetUsers: selectedUsers?.map(memberData => memberData?._id) // Target users added to broadcast
        }]),
    };

    // Manage the broadcast chat tab
    let tabInfo = {
      tabType: "broadcast",
      tabID: null,
      recentTime: broadcastAddingChatData?.sentTime, // Use the sentTime of the broadcastAddingChatData
      clearingTime: "", // No clearing time for broadcast tab at creation
      isArchived: false, // Broadcast tab are never archived by default
      isPinned: false, // Broadcast tab are never pinned by default
      disappearingTime: "Off", // Broadcast tab are never disappearing by default
    };
    // Send broadcast creation event to the server
    setShowProgressBar(true);
    sendWebSocketMessage(
      'new:broadcast',
      'newBroadcastData',
      {
        broadcastData: broadcastData,
        broadcastCreatingChatData,
        broadcastAddingChatData,
        tabInfo
      }
    );
    //adding tabInfo will be handled when broadcast is created , 
    // go to - at handleBroadcastCreateSuccess , line : 1532 in UserContext.jsx
  };
  // Handle incoming WebSocket messages to update UI accordingly
  function handleCommingWebSocketMessage(event) {
    const webSocketMessageData = JSON.parse(event.data);

    switch (webSocketMessageData.type) {
      case 'broadcast:creation:failed':
        setShowProgressBar(false);
        toast.error("Broadcast creation failed!");
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
    <>
      <div className='overlay'>
        <div style={{ backgroundColor: "rgb(245,247,251)" }} className={`${activeDarkMode ? "darkModeBg1" : ''} overlayInner relative h-full m-auto text-gray-900`}>
          {
            showProgressBar && <ProgressBar
              position={'absolute'}
            />
          }
          {/* profile picture handling - start */}
          {
            //option for profile picture like camera, gallery, and delete (for delete previous profile pic)
            showProfilePicOption &&
            <div className='overlay w-full h-full flex justify-center items-center'>
              <div style={{ borderRadius: '10px' }} className={`optionForProfileImgInner w-auto h-auto bg-indigo-100`}>
                <div className='w-full h-full flex justify-center items-center'>
                  <BsArrowLeft className='cursor-pointer myColor w-8 h-8'
                    onClick={() => {
                      setShowProfilePicOption(false);
                    }}
                  />
                </div>
                <div className='btnsContainer'>
                  <p onClick={() => {
                    setShowCameraPanel(true);
                    setShowProfilePicOption(false);
                  }} className='flex items-center justify-center flex-col'>
                    <button className='p-4 rounded-full text-white myBgColor'>
                      <BsCameraFill className='w-6 h-6' />
                    </button>
                    <span className='mt-1 text-md text-gray-600 font-semibold'>
                      Camera
                    </span>
                  </p>
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
                          setShowProfilePicOption(false); //hide the option for profile picture
                        }}
                        className='hidden'  // Hide the default file input UI
                      />
                    </label>
                    <span className='mt-1 text-md text-gray-600 font-semibold'>
                      Gallery
                    </span>
                  </p>
                  {
                    profilePicInfo &&
                    <p className='flex items-center justify-center flex-col' onClick={() => {
                      setProfilePicInfo(null);
                      setShowProfilePicOption(false);
                    }}>
                      <button className='p-4 rounded-full text-white myBgColor'>
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
            showCameraPanel && //show only if showCameraPanel is true
            <CameraFrame
              needToCapture={"image"}
              setShowCameraPanel={setShowCameraPanel}
              setCaptureImage={setProfilePicInfo} //for getting captured image
              setCaptureVideo={null} //nul as there is need of only image
            />
          }
          {
            // profile picture editing component
            showProfileEditingPanel && //show only if showProfileEditingPanel is true
            <HandleProfileImage
              profilePicInfo={profilePicInfo}
              setProfilePicInfo={setProfilePicInfo}
              setShowProfileEditingPanel={setShowProfileEditingPanel}
            />
          }
          {/* profile picture full view */}
          {
            showFullProfilePic &&
            <div className='prfoileImgContainer'>
              <div className='prfoileImgBtn flex items-center justify-between'>
                <BsArrowLeft className='cursor-pointer w-8 h-8'
                  onClick={() => {
                    setShowFullProfilePic(false);
                  }}
                />
                <FontAwesomeIcon
                  icon={faPen}
                  className="w-5 h-5 cursor-pointer"
                  onClick={() => {
                    setShowFullProfilePic(false);
                    setProfilePicInfo({ fileURL: profilePicInfo?.fileURL });
                    setShowProfileEditingPanel(true);
                  }}
                />
              </div>
              <div className='prfoileImg h-auto overflow-hidden'>
                <img src={profilePicInfo?.fileURL} alt="Uploaded" className="pointer-events-none w-full h-auto object-cover" />
              </div>
            </div>
          }
          {/* profile picture handling - end */}

          <div className='relative w-full h-full flex flex-col'>
            <React.Fragment>
              <div className="h-auto gap-x-4 h-12 w-full py-2.5 px-4">
                <div className='flex flex-row items-center justify-between py-1'>
                  <div className="flex items-center justify-center text-xl gap-x-3">
                    {
                      <React.Fragment>
                        {/* referesh all */}
                        <BsArrowLeft className='cursor-pointer w-6 h-6'
                          onClick={() => {
                            // if user moved to the name and profile updating area, hide the info area and move back the selecting area,
                            if (showInfoPanel) {
                              setShowInfoPanel(false);
                              setSelectingProcess(true);
                              setShowEmojiContainer(false)
                            } else {
                              // if user is in selecting area still now, hide this componenet
                              closeBroadcastCreation();
                            };
                          }}
                        />
                        <span className=''>
                          {
                            selectingProcess ? <>
                              {/* show selected length */}
                              {
                                selectedUsers?.length > 0 ?
                                  `${selectedUsers?.length} of ${usersDataForShowing?.length} selected` //exclude logged in user by -1
                                  : 'Select Contacts'
                              }
                            </>
                              :
                              "New Broadcast"
                          }
                        </span>
                      </React.Fragment>
                    }
                  </div>
                  {
                    // show the searching only while selecting
                    selectingProcess &&
                    <div className="flex items-center gap-1">
                      <button type="button" className="relative inline-flex items-center justify-center h-9 w-9 transition duration-500 ease-in-out focus:outline-none">
                        <HiOutlineSearch className={`${activeDarkMode ? "darkModeTextColor" : 'text-gray-600'} w-6 h-6`} onClick={() => {
                          setShowSearchBox(!showSearchBox);
                          setSearchTerm("");
                          setSearchedUsers([]);
                        }} />
                      </button>
                    </div>
                  }
                </div>
                {/* search box */}
                {
                  (showSearchBox && selectingProcess) &&
                  <div className="mt-3 max-w-md mx-auto">
                    <div className={`${activeDarkMode ? "darkModeBg2" : ''} relative flex items-center w-full h-10 rounded-lg bg-white overflow-hidden`}>
                      <div className={`${activeDarkMode ? "darkModeBg2" : ''} grid bg-gray-200 place-items-center h-full w-12 text-gray-300`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <div className="h-full w-full outline-none text-sm text-dark"
                        id="search">
                        <input
                          type="text"
                          name=""
                          id=""
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
              {/* show added users list while adding members */}
              {
                selectingProcess && selectedUsers?.length > 0 && //show only if atleast 1 user is added, and if selectingProcess is true
                <div className='addingMembers'>
                  <div className="flex flex-wrap overflow-scroll">
                    {
                      selectedUsers?.map((participantData, idx) => (
                        participantData?._id != currentUserID && //exclude logged in user (me)
                        <div key={idx} className="relative text-center">
                          <button style={{ padding: '10px', border: 'none' }} className={`relative cursor-auto tabButton w-auto relative flex flex-row items-center rounded-xl`}>
                            <div
                              style={{
                                backgroundColor: participantData?.profileInfo?.bgColor
                              }}
                              className="user_avatar_box flex items-center justify-center"
                            >
                              {
                                participantData?.profileInfo?.profilePic ? (
                                  <div className='imgContainer flex items-center justify-center text-2xl rounded-full relative'>
                                    <img
                                      className="w-full h-full rounded-full"
                                      src={`${participantData?.profileInfo?.profilePic}`}
                                      alt="Profile"
                                    />
                                  </div>
                                ) : safeParseJSON(participantData?.profileInfo?.name)?.find(item => item.type === 'text' && item?.value != '')?.value?.charAt(0)?.toUpperCase()
                              }
                            </div>
                            <button type='button' style={{ color: "white" }} className='left-0 selectingIcon absolute'
                              onClick={() => {
                                handleSelectedUsers(participantData);
                              }}>
                              <BsXCircle className='w-4 h-4' />
                            </button>
                          </button>
                          <span style={{ width: '60px', top: "-6px" }} className='relative inline-block'>
                            <TextWithEmojis
                              hide={true}
                              textWidth={`65px`}
                              textData={participantData?.profileInfo?.name}
                            />
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              }
              {/* all contact list for adding */}
              {
                selectingProcess && //show only if selectingProcess is true
                <div className="h-full overflow-scroll">
                  {
                    (searchTerm == "" ? usersDataForShowing : searchedUsers)?.length != 0
                      ?
                      (searchTerm == "" ? usersDataForShowing : searchedUsers).map((userData, idx) => (
                        currentUserID != userData?._id && //exclude logged in user (me)
                        <div key={idx} className='relative' onClick={() => {
                          handleSelectedUsers(userData);
                        }}>
                          <button className={`${activeDarkMode ? "darkModeBg1" : ''} profileTab border-b border-gray-200 flex items-center justify-start w-full`}>
                            <ProfileTab
                              tabData={userData}
                              
                              currentUserID={currentUserID}
                              isSearching={searchTerm ? true : false}
                            />
                          </button>
                          <div style={{
                            display: selectedUsers?.some((prevData) => prevData?._id == userData?._id) ? 'flex' : 'none'
                          }}
                            className="selecting flex items-center">
                            <div className='selectingIcon' style={{ padding: '4px', transform: 'translate(45px, 14px)' }}>
                              <FaCheck className='w-4 h-4' />
                            </div>
                          </div>
                        </div>
                      ))
                      :
                      <div className={`${activeDarkMode ? "darkModeTextColor" : 'text-gray-500'} flex items-center justify-center w-full h-full text-lg font-semi`}>
                        {searchTerm == "" ? "You have no connections" : "No result"}
                      </div>
                  }
                  {
                    selectedUsers?.length > 0 &&
                    <button onClick={() => {
                      setShowInfoPanel(true);
                      setSelectingProcess(false);
                    }} className='nextBtnForGroup'>
                      <BsArrowRight className='cursor-pointer w-6 h-6' />
                    </button>
                  }
                </div>
              }
              {/* show panel for new broadcast and other details */}
              {
                showInfoPanel &&
                <>
                  {
                    selectedUsers?.length > 0 &&
                    <>
                      <div className={`px-4 ${showEmojiContainer && "overflow-y-auto h-full"}`}>
                        <div className='py-4 flex items-center justify-center'>
                          <div style={{
                            //background color for user, broadcast and broadcast avatar only when they don't have any image
                            backgroundColor: "red",
                            borderColor: `${activeDarkMode ? "rgb(48,56,65)" : '#f5f7fb'}`,
                            outlineColor: `${activeDarkMode ? "rgb(75, 85, 99)" : '#e6ebf5'}`
                          }} className="largeProfileAvatar flex items-center justify-center rounded-full relative">
                            {
                              profilePicInfo != null ? (
                                <img
                                  className="w-full h-full rounded-full cursor-pointer"
                                  src={`${profilePicInfo?.fileURL}`}
                                  alt="Profile"
                                  onClick={() => {
                                    setShowFullProfilePic(true);
                                  }}
                                />
                              )
                                :
                                <BiSolidGroup className='w-10 h-10' />
                            }
                            <button className='p-2 myBgColor absolute bottom-0 right-0 rounded-full flex items-center justify-center' onClick={() => { setShowProfilePicOption(true) }}>
                              <FontAwesomeIcon icon={faPen} className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className='flex items-center justify-center gap-x-2'>
                          <div
                            ref={inputRef}
                            contentEditable="true"
                            className="inputForGroupCreation editable_div not_prevent_select input_field w-full border rounded-xl focus:outline-none focus:border-indigo-300"
                            onKeyDown={(e) => {
                              handleInputDirection(
                                e, // Pass the event object
                                inputRef, // Pass the input field reference
                                setIsTypingName,// Pass the setIsTypingName function
                                60, //limit of input, 60 for name
                                false //new line is not allowed
                              );
                            }}
                          />
                          <button onClick={() => {
                            setShowEmojiContainer(!showEmojiContainer)
                          }} className='flex items-center justify-center myColor'>
                            {
                              showEmojiContainer ?
                                <BsFillKeyboardFill className='w-8 h-8' />
                                :
                                <HiOutlineFaceSmile className='w-8 h-8' />
                            }
                          </button>
                        </div>
                        <h3 className='mt-4 mb-2 text-md font-semibold'>
                          Members : {selectedUsers?.length}
                        </h3>
                      </div>
                      <div className="h-full overflow-scroll">
                        {
                          selectedUsers?.map((participantData, idx) => (
                            participantData?._id != currentUserID &&
                            <div key={idx} className="w-full relative inline-flex items-center justify-center flex-col">
                              <button className={`${activeDarkMode ? "darkModeBg1" : ''} no profileTab border-b border-gray-200 flex items-center justify-start w-full`}>
                                <ProfileTab
                                  tabData={participantData}
                                  
                                  currentUserID={currentUserID}
                                  isSearching={searchTerm ? true : false}
                                />
                              </button>
                            </div>
                          ))
                        }
                      </div>
                    </>
                  }
                  {
                    isTypingName &&
                    <button onClick={() => {
                      createNewBroadcast()
                    }} className='nextBtnForGroup'>
                      <BsCheck2 className='cursor-pointer w-6 h-6' />
                    </button>
                  }
                </>
              }
              {/* show emoji container when need to add emoji in broadcast name */}
              {
                showEmojiContainer &&
                <div style={{ height: "300px" }} className={`absolute w-full bottom-0 px-4 bg-white overflow-y-auto`}>
                  {
                    <EmojiPicker
                      onEmojiClick={
                        emoji =>
                          insertEmojiIntoInputField(
                            {
                              emojiUrl: emoji.imageUrl,
                              emojiUnicode: emoji.emoji
                            }, //emoji info
                            inputRef, //input field reference
                          )
                      }
                      emojiStyle={"apple"}
                      lazyLoadEmojis={true}
                    />
                  }
                </div>
              }
            </React.Fragment>
          </div>
        </div>
      </div>
      {/* toast for success message and error */}
      <ToastContainer />
    </>
  )
}

export default ChatBroadcastCreation;
