import React, { useContext, useEffect } from 'react'
import { UserContext } from '../context/UserContext';
import _ from "lodash";
import "../css/home.style.css";
import "../css/responsive.css";
import {
  CallsList,
  ChatBox,
  ContactList,
  GroupCreation,
  ChatBroadcastCreation,
  MainNavBar,
  RecentChats,
  VideoAndVoiceCalling,
  ProfileInfo,
  HandleFile,
  Stories,
  ProgressBar,
  Setting
} from "@components";

export default function Home() {
  // Destructure state and functions from UserContext
  const {
    showLoading,
    showProfileInfo,
    showChatBox,
    setShowChatBox,
    showContactListSection,
    showRecentChatsSection,
    showCallsSection,
    showStoriesSection,
    showSettingsSection,
    showBroadcastCreationPanel,
    showGroupCreationPanel,
    currentCallData,
    activeDarkMode,
    showEditingPanel,
    fileEditingFor,
    setOpenedTabInfo,
    chatBoxRef,
    getSingleUserData,
    currentUserID,
    handleFileUpload,
    openedTabInfo,
    getSingleGroupData,
    getSingleBroadcastData,
    aiAssistant,
    uploadedFiles,
    checkUserLoggedIn
  } = useContext(UserContext);
  useEffect(() => {
    checkUserLoggedIn();
    document.title = 'My Talking – Smart & Secure Real-Time Chat App'
  }, []);
  // Get the current logged-in user's data
  let currentUserData = getSingleUserData(currentUserID);
  // Fetch openedTabData based on the type of the opened tab
  let openedTabData = openedTabInfo?.tabType === 'group' ? getSingleGroupData(openedTabInfo?.tabID) :
    openedTabInfo?.tabType === 'broadcast' ? getSingleBroadcastData(openedTabInfo?.tabID) :
      openedTabInfo?.tabType === 'user' ? getSingleUserData(openedTabInfo?.tabID) : aiAssistant;

  // Function to handle hover and click events for dropdown positioning
  useEffect(() => {
    let showChildOnParentHoverElements = document.querySelectorAll(".showChildOnParentHover");
    if (showChildOnParentHoverElements) {
      showChildOnParentHoverElements?.forEach
    };
    // Function to find the parent .showChildOnParentHover element from event target
    const findParent = (el) => {
      while (el && el !== document) {
        if (el.classList?.contains("showChildOnParentHover")) return el;
        el = el.parentElement;
      }
      return null;
    };

    // Handler for hover and click
    const handleDropdownPositioning = (event) => {
      const dopdownButton = findParent(event.target);
      if (!parent) return;
      if (dopdownButton?.querySelector(".showOnHover")) {
        const dropdown = dopdownButton.querySelector(".showOnHover");
        const dropdownRect = dropdown.getBoundingClientRect();
        const dropdownHeight = dropdown.offsetHeight;
        dropdown.classList.remove("drop-up", "drop-down");

        if ((dropdownRect.top + dropdownHeight) > window.innerHeight) {
          let spaceBelow = window.innerHeight - (dropdownRect.top + dropdownHeight);
          dropdown.style.top = `${spaceBelow - 66}px`;
        };
      };
    };

    // Attach global listeners
    document.addEventListener("mouseenter", handleDropdownPositioning, true); // use capture phase
    // document.addEventListener("click", handleDropdownPositioning, true);

    // Cleanup on unmount
    return () => {
      document.removeEventListener("mouseenter", handleDropdownPositioning, true);
      // document.removeEventListener("click", handleDropdownPositioning, true);
    };
  }, []);

  // drop zone functionality
  const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const findParent = (el) => {
    while (el && el !== document) {
      if (el.classList?.contains("dropZone")) return el;
      el = el.parentElement;
    }
    return null;
  };
  const highlightDropZone = (e) => {
    let dropZone = document.querySelectorAll(".dropZone");
    dropZone?.forEach((dropZone) => dropZone.classList.remove("dropZoneHighlight"));
    if (findParent(e.target)) {
      findParent(e.target).classList.add("dropZoneHighlight");
    };
  };
  const handleDrop = (e) => {
    preventDefaults(e);
    let dropZone = document.querySelectorAll(".dropZone");
    dropZone?.forEach((dropZone) => dropZone.classList.remove("dropZoneHighlight"));
    const dt = e.dataTransfer;
    const files = dt.files;
    // take action only when the user dropped in drop zone
    // there are three drop zone:
    // 1- profile tab (in recent chats)
    // 2- chat box
    // 3- file editing panel
    if (findParent(e.target)) {
      if (!showEditingPanel) {
        if (findParent(e.target)?.classList?.contains("profileTab")) {
          let tabID = findParent(e.target)?.id;
          let tabInfo = currentUserData?.recentChatsTabs?.find(
            (recentChatTabInfo) => recentChatTabInfo?.tabID == tabID
          );
          setOpenedTabInfo(tabInfo);
          if (!showChatBox) {
            setShowChatBox(true);
          };
        };
        handleFileUpload(
          files,
          "chat"
        );
      } else {
        handleFileUpload(
          files,
          fileEditingFor
        );
      };
    };
  };
  useEffect(() => {
    // Get all drafts from recent chat tabs
    let draftData = currentUserData?.recentChatsTabs?.map(tab => tab.draft);

    // Determine if user has unsaved files or draft messages
    let isNeedToAsk = uploadedFiles?.length > 0 || draftData?.some(d => !!d);

    if (isNeedToAsk) {
      let allowUnload = false;

      // Handler to warn the user when attempting to leave/refresh the page
      const beforeUnloadHandler = (e) => {
        if (!allowUnload) {
          e.preventDefault();         // Prevent the default unload
          e.returnValue = '';         // Required for showing the browser prompt
        }
      };

      // Handler to intercept F5 or Ctrl+R and show a custom confirmation
      const keydownHandler = (e) => {
        if (e.key === "F5" || (e.ctrlKey && e.key === "r")) {
          e.preventDefault(); // Prevent the browser's refresh behavior
          if (confirm("Do you really want to refresh the page?")) {
            allowUnload = true;      // Allow the unload action
            location.reload();       // Manually reload the page
          }
        }
      };

      // Register event listeners
      window.addEventListener("beforeunload", beforeUnloadHandler);
      window.addEventListener("keydown", keydownHandler);

      // Cleanup on unmount or when dependencies change
      return () => {
        window.removeEventListener("beforeunload", beforeUnloadHandler);
        window.removeEventListener("keydown", keydownHandler);
      };
    }
  }, [currentUserData, uploadedFiles]);


  return (
    <React.Fragment>
      {
        // Show loading animation while loading
        !showLoading ?
          <div className="flex h-screen antialiased text-gray-800" style={{ maxWidth: "1600px", margin: 'auto' }}
            onDragEnter={preventDefaults}
            onDragOver={(e) => {
              preventDefaults(e);
              highlightDropZone(e)
            }}
            onDragLeave={preventDefaults}
            onDrop={handleDrop}
          >
            <div className="flex flex-row h-full w-full overflow-hidden">
              {/* Sidebar and interaction panel */}
              <div className={`interactionPanel overflow-x-hidden ${activeDarkMode ? "darkModeBg2" : ''}  ${showChatBox ? "hideEelemnt" : ""} flex`}>
                {/* Main navigation bar */}
                <MainNavBar />
                <div className={`${activeDarkMode ? "darkModeBg2" : ''} w-full h-full interactionPanelInner overflow-y-auto`}>
                  {/* Conditional rendering of various sections based on context flags */}
                  {
                    showRecentChatsSection &&
                    <RecentChats />
                  }
                  {
                    showCallsSection &&
                    <CallsList />
                  }
                  {
                    showContactListSection &&
                    <ContactList />
                  }
                  {
                    showGroupCreationPanel &&
                    <GroupCreation />
                  }
                  {
                    showBroadcastCreationPanel &&
                    <ChatBroadcastCreation />
                  }
                  {
                    showStoriesSection && <Stories />
                  }
                  {
                    showSettingsSection &&
                    <Setting />
                  }
                </div>
              </div>
              {/* HandleFile editing panel */}
              {
                showEditingPanel &&
                <HandleFile />
              }
              {/* Main chat and waiting area */}
              {
                <React.Fragment>
                  {/* Chat box visible when showChatBox is true */}
                  <div style={{ display: showChatBox ? "flex" : "none" }} className={`chatBoxContainer flex-auto flex-shrink-0 h-full`}>
                    <div className={`${activeDarkMode ? "darkModeBg3" : ''} w-full flex flex-col h-full overflow-x-auto relative chatBoxWrapper ${!openedTabData?.isDeleted && openedTabInfo?.tabType != "aiAssistant" && 'dropZone'}`}>
                      {
                        showChatBox &&
                        //  ChatBox component with ref 
                        <ChatBox
                          chatBoxRef={chatBoxRef}
                        />
                      }
                    </div>
                    {/* Profile info panel shown alongside chat */}
                    {
                      showProfileInfo &&
                      <ProfileInfo />
                    }
                  </div>
                  {/* Waiting area shown when no chat is selected */}
                  <div style={{ display: !showChatBox ? "flex" : "none" }} className={`${activeDarkMode ? "darkModeBg3" : ''} waitingArea items-center justify-center bg-white-100 text-gray-500 p-4 w-full flex-col`}>
                    <div className='mx-auto flex items-center justify-center' style={{
                      width: "200px",
                      padding: '10px'
                    }}>
                      <img src="https://res.cloudinary.com/dn0hsbnpl/image/upload/v1750832972/chat_uploads/tjmw2twyqoanavs7gdcp.png" alt="App logo" className='w-full' />
                    </div>
                    <h3 className={`flex justify-center items-center text-3xl`} style={{ width: '100%' }}>
                      <span className={`ml-2`}>Start to chatting.</span>
                    </h3>
                  </div>
                </React.Fragment>
              }
            </div>
            {/* Video or voice call component shown if there is an active call */}
            {
              currentCallData != null &&
              <VideoAndVoiceCalling />
            }
          </div>
          :
          // Show loading animation component while loading is true
          <ProgressBar
            position={'fixed'}
          />
      }
    </React.Fragment >
  )
}
