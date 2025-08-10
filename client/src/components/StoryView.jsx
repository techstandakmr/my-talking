import React, { useContext, useEffect, useRef, useState } from 'react'
import { UserContext } from '@context/UserContext';
import { BiDotsVerticalRounded } from "react-icons/bi";
import { HiOutlineArrowRight, HiOutlineDownload } from 'react-icons/hi';
import { AiFillDelete } from 'react-icons/ai';
import { BsArrowLeft } from 'react-icons/bs';
import { HiEye, HiPlay, HiPause, HiPencilSquare } from 'react-icons/hi2';
import _ from 'lodash';
import { MultiInputBox, TextWithEmojis } from "./index.js";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileAudio } from '@fortawesome/free-solid-svg-icons';
import { saveAs } from 'file-saver';
import { FaClockRotateLeft } from "react-icons/fa6";
function StoryView({
  storySender,
  setStorySender,
  setShowStoryView,
  setShowProgressBar,
  setShowStoryReceivers,
  setShowTextPanelForStory,
  setTargetStoryForReplyOrEdit
}) {
  // Destructure required values and functions from UserContext
  const {
    currentUserID,
    setOpenedTabInfo,
    getSingleStoryData,
    allStoriesData,
    setAllStoriesData,
    setIsFileUploading,
    setShowEditingPanel,
    setFileEditingFor,
    deleteStories,
    setShowChatForwardingPanel,
    setForwardingChats,
    safeParseJSON,
    sendWebSocketMessage,
    setUploadedFiles,
    getSingleUserData,
    isVoiceRecording,
    deleteExpiredChats,
    deleteExpiredStories,
  } = useContext(UserContext);

  // State to check if input has content
  const [inputNotEmpty, setInputNotEmpty] = useState(false);
  // Ref for input field
  const inputRef = useRef(null);

  // Filter stories to show only relevant ones
  function filteredStories(allStoriesData, storySender, currentUserID) {
    return allStoriesData?.filter(story => {
      const receivers = story.receiversInfo;
      return (
        // If viewing own stories, return all own stories
        storySender == currentUserID ?
          story?.senderID == storySender
          :
          // If viewing someone else's stories, show only if current user is a receiver
          story?.senderID == storySender &&
          receivers?.some(receiverInfo => receiverInfo?.receiverID == currentUserID)
      );
    })
  };

  // Remove duplicate stories based on customID
  const allUniqueStoriesData = _.uniqBy(allStoriesData, "customID");

  // Get stories to show in viewer
  let storiesForView = filteredStories(allUniqueStoriesData, storySender, currentUserID);
  // State to manage "Viewed by" panel visibility
  const [showViewedByPanel, setShowViewedByPanel] = useState(false);
  // File width to size class mapping
  const sizeMap = {
    380: "square",
    640: "wide",
    440: "moderate",
    200: "tall",
    180: "miniTall",
    110: "mini2Tall",
    auto: "audio"
  };
  // Story width for progress bar
  const [width, setWidth] = useState(0);
  // Ref for video element
  const videoRef = useRef(null);

  // Pause/resume state
  const [isPaused, setIsPaused] = useState(false);

  // Ref to manage interval for story duration
  const timerRef = useRef(null);

  // Ref to track actual watch time
  const viewingTimerRef = useRef(null);

  // Accumulated viewed time
  const viewedTimeRef = useRef(0);

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
  // Hide story view and reset widths
  function hideStoryView() {
    setAllStoriesData((prevStories) =>
      prevStories.map((story) => ({
        ...story,
        width: 0,
        watching: false,
        currentStory: false,
        goingToFullView: false
        // watched: false,
      }))
    );
  }

  // Monitor changes in storiesForView and close viewer if all stories are watched
  useEffect(() => {
    let isAllWatched = storiesForView?.every((storyData) =>
      !storyData?.goingToFullView && storyData?.width == 0 && !storyData?.watching && !storyData?.currentStory
    );
    let currentStory = storiesForView?.find((story) => story?.currentStory == true);
    if (isAllWatched || storiesForView.length == 0 || [null, undefined]?.includes(getSingleStoryData(currentStory?.customID))) {
      setShowStoryView(false);
      setOpenedTabInfo(null);
      setStorySender(null);
    };
  }, [storiesForView]);

  // Convert duration string (e.g., "00:30", "01:10:25") to milliseconds
  function convertToMilliseconds(fileDuration) {
    const parts = fileDuration?.split(':')?.map(Number);
    let milliseconds = 0;

    if (parts?.length === 2) {
      const [minutes, seconds] = parts;
      milliseconds = (minutes * 60 + seconds) * 1000;
    } else if (parts?.length === 3) {
      const [hours, minutes, seconds] = parts;
      milliseconds = (hours * 3600 + minutes * 60 + seconds) * 1000;
    }

    return milliseconds;
  };

  // Mark story as watched and send update to backend
  const markStoryAsWatched = (customID) => {
    setAllStoriesData((prevStories) => {
      return prevStories.map((story) => {
        if (!story?.watched && story.customID === customID && story?.senderID != currentUserID) {
          const watchedStoryReceivers = story.receiversInfo;
          const updatedReceivers = watchedStoryReceivers?.map((receiverInfo) => {
            if (receiverInfo?.receiverID === currentUserID && receiverInfo?.seenTime == null) {
              sendWebSocketMessage(
                'update:story:watching',
                'storyData',
                {
                  customID: story?.customID,
                  senderID: story?.senderID,
                  watchedBy: currentUserID,
                  seenTime: new Date().toISOString(),
                  status: receiverInfo?.isSeenStatusAllowed ? "seen" : "not_seen",
                }
              );
              return {
                ...receiverInfo,
                seenTime: new Date().toISOString(),
              };
            }
            return receiverInfo;
          });
          return {
            ...story,
            watched: true,
            receiversInfo: updatedReceivers
          }
        };
        return story;
      })
    });
    clearInterval(viewingTimerRef.current); // Stop viewing timer after marking
  };

  // Update progress bar width
  const updateStoryWidth = (customID, width) => {
    setAllStoriesData((prev) =>
      prev.map((story) =>
        story.customID === customID ? { ...story, width } : story
      )
    );
  };

  // Move to next story or exit if last story
  const moveToNextStory = (currentIndex) => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < storiesForView.length) {
      const nextStory = storiesForView[nextIndex];
      setAllStoriesData((prev) =>
        prev.map((prevStory, idx) => {
          if (prevStory.customID == nextStory?.customID) {
            return { ...prevStory, currentStory: true };
          };
          return { ...prevStory, currentStory: false };
        })
      );
      viewedTimeRef.current = 0;
      deleteExpiredChats();
      deleteExpiredStories();
    } else {
      hideStoryView(); // No more stories, exit viewer
    }
  };

  const video = videoRef.current;

  // Track video playback and update progress
  const handleTimeUpdate = () => {
    if (!isPaused) {
      let width = (video?.currentTime / video?.duration) * 100;
      setWidth(width);
      updateStoryWidth(
        storiesForView?.find((story) => story?.currentStory == true)?.customID, width
      );
      if (width > 75) {
        markStoryAsWatched(
          storiesForView?.find((story) => story?.currentStory == true)?.customID
        )
      };
      if (width == 100) {
        moveToNextStory(
          storiesForView.findIndex((story) => story?.currentStory == true)
        )
      };
    };
  };

  // Manage story timer and viewing time tracking
  useEffect(() => {
    if (storiesForView?.length > 0) {
      let currentIndex = storiesForView.findIndex(
        (story) => story?.currentStory == true
      );

      if (currentIndex == '-1') {
        hideStoryView();
      };

      const currentStoryClone = storiesForView[currentIndex];
      const mediaInfo = currentStoryClone?.mediaFile;
      const storyType = currentStoryClone?.storyType;
      const isStoryImage = mediaInfo?.fileType?.startsWith("image/");
      const isStoryVideo = mediaInfo?.fileType?.startsWith("video/");
      const isStoryAudio = mediaInfo?.fileType?.startsWith("audio/");
      const storyDuration = isStoryImage || storyType === "text" ? 3000 : convertToMilliseconds(mediaInfo?.fileDuration);
      const minWatchTime = isStoryImage || storyType === "text" ? 2000 : storyDuration / 2;

      let width = currentStoryClone?.width || 0;
      const increment = (100 / storyDuration) * 50;
      if (!isPaused) {
        if (!isStoryVideo && !isStoryAudio) {
          videoRef.current = null;
          // Start story auto-play and progress
          timerRef.current = setInterval(() => {
            width += increment;
            if (width >= 100) {
              width = 100;
              clearInterval(timerRef.current);
              moveToNextStory(currentIndex);
            }
            updateStoryWidth(currentStoryClone.customID, width);
          }, 50);

          // Track view time
          viewingTimerRef.current = setInterval(() => {
            viewedTimeRef.current += 50;
            if (viewedTimeRef.current >= minWatchTime) {
              markStoryAsWatched(currentStoryClone.customID);
            }
          }, 50);
        };
      };

      return () => {
        clearInterval(timerRef.current);
        clearInterval(viewingTimerRef.current);
      };
    } else {
      hideStoryView();
    };
  }, [storiesForView, isPaused]);

  // Handle pause/resume on user interaction
  const handlePauseResume = () => {
    let isVideoOrAudio = storiesForView?.find((story) => story?.currentStory == true)?.mediaFile?.fileType?.startsWith("video/") ||
      storiesForView?.find((story) => story?.currentStory == true)?.mediaFile?.fileType?.startsWith("audio/");
    if (isPaused) {
      setIsPaused(false);
      if (isVideoOrAudio) {
        video?.play();
      };
    } else {
      if (isVideoOrAudio) {
        video?.pause();
      };
      setIsPaused(true);
      clearInterval(timerRef.current);
      clearInterval(viewingTimerRef.current);
    }
  };
  useEffect(() => {
    if (isVoiceRecording && !isPaused) {
      handlePauseResume();
    };
  }, [isVoiceRecording]);
  // Handle click on story thumbnail to view it
  const handleStoryClick = (index) => {
    const clickedStory = storiesForView[index];
    if (clickedStory) {
      const previousStories = storiesForView.filter((story, idx) => idx < index);
      setAllStoriesData((prev) =>
        prev.map((prevStory, idx) => {
          if (previousStories.some((prevStoryFilter) => prevStoryFilter.customID === prevStory.customID)) {
            return { ...prevStory, width: 100, watched: prevStory.watched, currentStory: false };
          };
          if (prevStory.customID == clickedStory?.customID) {
            return { ...prevStory, width: 0, watched: false, currentStory: true };
          };
          return { ...prevStory, width: 0, watched: false, currentStory: false };
        })
      );
      setShowViewedByPanel(false);
      viewedTimeRef.current = 0;
    }
  };

  // Auto-pause playback when tab becomes inactive
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState != "visible") {
        if (!isPaused) {
          setIsPaused(true);
          clearInterval(timerRef.current);
          clearInterval(viewingTimerRef.current);
        };
      };
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPaused]);


  // Handle Click for Next/Previous Story
  const handleStoryNavigation = (e) => {
    // Get DOM elements involved in preventing story navigation when clicked
    let storyControllerTop = document.querySelector(".storyControllerTop");
    let storyControllerBottom = document.querySelector(".storyControllerBottom");
    let viewedByContainer = document.querySelector('.viewedByContainer');
    let progressBar = document.querySelector('.progress-bar') || null;
    // Determine if the click is outside the excluded elements
    let toMove = !storyControllerTop?.contains(e.target) &&
      !storyControllerBottom?.contains(e.target) &&
      !viewedByContainer?.contains(e.target) &&
      !progressBar?.contains(e.target);

    if (toMove) {
      // Get current screen width and click X position
      const screenWidth = window.innerWidth;
      const clickX = e.clientX;
      if (clickX > screenWidth / 2) {
        // Move to the next story if clicked on the right half of screen
        const currentIndex = storiesForView.findIndex(
          (story) => story?.currentStory == true
        );
        if (currentIndex < storiesForView.length - 1) {
          handleStoryClick(currentIndex + 1);
        }
      } else {
        // Move to the previous story if clicked on the left half of screen
        const currentIndex = storiesForView.findIndex(
          (story) => story?.currentStory == true
        );
        if (currentIndex > 0) {
          handleStoryClick(currentIndex - 1);
        }
      }
    };
  };

  // Regular expressions to match color formats
  const hexPattern = /#([0-9a-fA-F]{6})\b/g;
  const rgbPattern = /rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/g;
  const rgbaPattern = /rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([\d.]+)\s*\)/g;

  // Component to render text-based story thumbnail
  function TextStoryThumbnail({ text }) {
    // Parse JSON safely into array of story parts
    const textDataArray = safeParseJSON(text);

    // Extract background info from story data
    let bgInfo = textDataArray?.find(item => item?.bgInfo)?.bgInfo

    return (
      <div
        className='textStoryInnerFrame overflow-y-auto w-full h-full m-auto flex items-center justify-center'
        style={{
          background: bgInfo?.type == 'solid_color'
            ? bgInfo?.background
            : `url('/uploads/Story_bg/${bgInfo?.background}') no-repeat center center/cover`,
          color: `${bgInfo?.color}`
        }}
      >
        <div className='p-2 text-xl h-auto w-full text-center break-all'>
          {
            textDataArray?.map((part, partIdx) => {
              // Render emoji parts as images
              if (part.type === 'emoji') {
                return <img className="not_prevent_select inline-block w-10 h-10" key={partIdx} src={part.url} alt={part.value} />;
              }
              // Render new lines
              else if (part.type === 'newline') {
                return <br className="not_prevent_select" key={partIdx} />;
              }
              // Render text parts with formatting
              else if (part.type === 'text') {
                const { value, format } = part;
                let formattedText = <span className='msgText' key={partIdx}>{value}</span>;

                let styleObj = {}; // Object to store inline style properties

                // Apply text formatting styles
                format?.forEach((style) => {
                  const color = style.match(hexPattern) || style.match(rgbPattern) || style.match(rgbaPattern);
                  if (color) {
                    styleObj.color = color[0]; // Set text color if detected
                  }

                  // Apply specific styles based on format type
                  switch (style) {
                    case 'bold':
                      formattedText = (
                        <b style={styleObj} key={partIdx}>
                          {formattedText}
                        </b>
                      );
                      break;
                    case 'italic':
                      formattedText = (
                        <i style={styleObj} key={partIdx}>
                          {formattedText}
                        </i>
                      );
                      break;
                    case 'underline':
                      formattedText = (
                        <u style={styleObj} key={partIdx}>
                          {formattedText}
                        </u>
                      );
                      break;
                    case 'strikethrough':
                      formattedText = (
                        <s style={styleObj} key={partIdx}>
                          {formattedText}
                        </s>
                      );
                      break;
                    case 'unordered-list':
                      formattedText = (
                        <ul key={partIdx} style={styleObj}>
                          <li>{formattedText}</li>
                        </ul>
                      );
                      break;
                    default:
                      // Handle custom style array format
                      if (style.includes('[')) {
                        const styleProps = JSON.parse(style.replace('[', '[').replace(']', ']'));
                        styleObj = {
                          color: styleProps[0],
                          fontStyle: styleProps[1],
                          textDecoration: styleProps[2],
                          fontWeight: styleProps[3],
                        };
                        formattedText = (
                          <span key={partIdx} style={styleObj}>
                            {formattedText}
                          </span>
                        );
                      }
                      break;
                  }
                });

                // If text is a link, render as anchor tag
                if (part?.isLink) {
                  formattedText = (
                    <a
                      href={value}
                      target="_blank"
                      // rel="noopener noreferrer"
                      key={partIdx}
                      className="cursor-pointer underline text-blue-600 hover:text-blue-500 decoration-2 hover:underline focus:outline-none focus:underline opacity-90"
                    >
                      {formattedText}
                    </a>
                  );
                }

                return formattedText;
              }

              // Return null if no valid type found
              return null;
            })
          }
        </div>
      </div>
    );
  };

  return (
    <React.Fragment>
      <div onClick={handleStoryNavigation} className='storyView w-full h-full'>
        <div style={{ width: '100%' }} className='relative h-full m-auto'>
          <div className="w-full h-full flex flex-col items-center relative">
            {/* Story viewer top section */}
            <div className='storyControllerTop text-white'>
              <div className='storyControllerTopInner m-auto'>
                <div className='px-0 storyLength w-full'>
                  {/* Progress bar for each story */}
                  {storiesForView?.map((story, idx) => {
                    const progressWidth = `${story?.width || 0}%`;

                    return (
                      <div
                        key={idx}
                        className="cursor-pointer relative h-full"
                        onClick={() => handleStoryClick(idx)} // Clicking on progress bar to change story
                      >
                        {/* Upper layer showing progress */}
                        <span
                          style={{
                            width: progressWidth,
                            transition: isPaused ? "none" : `width ${50}ms linear`, // Smooth transition unless paused
                          }}
                          className="upperLayer bg-blue-500 w-full h-full"
                        ></span>
                        {/* Background of progress bar */}
                        <span className="bottomLayer bg-gray-500 w-full"></span>
                      </div>
                    );
                  })}
                </div>

                {/* Top bar with user info and back button */}
                <div className='w-full flex items-center justify-between'>
                  <div style={{ paddingLeft: '8px' }} className='w-full flex items-center justify-start'>
                    {/* Back button to hide story view */}
                    <BsArrowLeft onClick={() => {
                      hideStoryView();
                    }} className='w-7 h-7 cursor-pointer text-gray-white' />

                    {/* Sender info area */}
                    <div className='relative storySenderTab w-full'>
                      <button className={`px-2 no profileTab relative hover:bg-gray-100 flex items-center w-full justify-start`}>

                        {/* User avatar */}
                        <div
                          style={{
                            backgroundColor: getSingleUserData(
                              storiesForView[storiesForView?.length - 1]?.senderID
                            )?.profileInfo?.profilePic == "" &&
                              getSingleUserData(
                                storiesForView[storiesForView?.length - 1]?.senderID
                              )?.profileInfo?.bgColor
                          }}
                          className="user_avatar_box flex items-center justify-center text-2xl rounded-full relative"
                        >
                          {
                            getSingleUserData(
                              storiesForView[storiesForView?.length - 1]?.senderID
                            )?.profileInfo?.profilePic ? (
                              <img
                                className="w-full h-full rounded-full"
                                src={`${getSingleUserData(
                                  storiesForView[storiesForView?.length - 1]?.senderID
                                )?.profileInfo?.profilePic}`}
                                alt="Profile"
                              />
                            ) : safeParseJSON(getSingleUserData(
                              storiesForView[storiesForView?.length - 1]?.senderID
                            )?.profileInfo?.name)?.find(item => item?.type === 'text')?.value?.charAt(0)?.toUpperCase()
                          }
                        </div>

                        {/* Sender name and time */}
                        <div className="ml-2 text-left w-auto">
                          <p className='text-lg font-semibold flex'>
                            {
                              storiesForView[storiesForView?.length - 1]?.senderID == currentUserID ?
                                'You' :
                                <TextWithEmojis
                                  hide={true}
                                  textWidth={`auto`}
                                  areaName={'topBarInfo'}
                                  textData={
                                    getSingleUserData(
                                      storiesForView[storiesForView?.length - 1]?.senderID
                                    )?.profileInfo?.name
                                  }
                                  isSearching={false}
                                />
                            }
                          </p>
                          <p className='text-sm'>
                            {
                              storiesForView?.find((story) => story?.currentStory == true)?.isFailed && <span className='text-red-500'>Failed</span>
                            }
                            {
                              storiesForView?.find((story) => story?.currentStory == true)?.statusForSender == 'sending' && 'sending'
                            }
                            {
                              storiesForView?.find((story) => story?.currentStory == true)?.statusForSender == 'sent' &&
                              formatStoryTime(
                                storiesForView?.find((story) => story?.currentStory == true)?.sentTime
                              )
                            }
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Pause/Play & Options button */}
                  <div className='w-auto flex items-center justify-center'>

                    {/* Pause/Resume button */}
                    <div className='w-auto pauser' onClick={handlePauseResume}>
                      {
                        isPaused ?
                          <HiPlay className='w-6 h-6 cursor-pointer' /> :
                          <HiPause className='w-6 h-6 cursor-pointer' />
                      }
                    </div>

                    {/* Story actions menu */}
                    {
                      (storiesForView?.every((story) => story?.senderID == currentUserID) || storiesForView?.every((prevStory) => prevStory?.storyType == "media")) &&
                      <div className='showStoryAction'>
                        <button type="button" className="inline-flex relative items-center justify-center h-9 w-9 transition duration-500 ease-in-out text-gray-white focus:outline-none showChildOnParentHover">
                          {/* Menu icon */}
                          <BiDotsVerticalRounded className="w-7 h-7" />

                          {/* Dropdown menu with story actions */}
                          <div style={{ top: "40px", right: "0px", transition: "0.3s", width: "170px", padding: '6px 0px' }}
                            className={`showOnHover block absolute right-0 z-10 mt-0 w-auto origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}>
                            {
                              // Show edit, delete, forward options only if all stories are sent by current user
                              storiesForView?.every((story) => story?.senderID == currentUserID) &&
                              <>
                                {/* resend button if failed */}
                                {
                                  storiesForView?.find((story) => story?.currentStory == true)?.isFailed &&
                                  <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none" onClick={() => {
                                    resendStory(storiesForView?.find((story) => story?.currentStory == true));
                                  }}>
                                    <p className="cursor-pointer text-gray-700 block text-md">Resend</p>
                                    <FaClockRotateLeft className='w-6 h-6 inline' strokeWidth={1} />
                                  </div>
                                }
                                {/* Edit story */}
                                <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none" onClick={() => {
                                  let currentStory = storiesForView?.find((story) => story?.currentStory == true);
                                  if (currentStory?.storyType == 'media') {
                                    setUploadedFiles([{
                                      fileID: currentStory?.customID,
                                      fileData: null,
                                      editedFile: null,
                                      ...currentStory?.mediaFile,
                                      sizeType: sizeMap?.[currentStory?.mediaFile?.fileWidth],
                                      oldFilePublicId: currentStory?.mediaFile?.publicId,
                                      coloursDataOnImage: [],
                                      emoji: [],
                                      rejection: null,
                                      isFileReEditing: true
                                    }]);
                                    setIsFileUploading(true);
                                    setShowEditingPanel(true);
                                    setFileEditingFor('story');
                                  } else {
                                    setShowTextPanelForStory(true);
                                  };
                                  setTargetStoryForReplyOrEdit({ data: currentStory, type: "edit" });
                                  hideStoryView();
                                }}>
                                  <p className="cursor-pointer text-gray-700 block text-md">Edit</p>
                                  <HiPencilSquare className='w-6 h-6 text-gray-400' />
                                </div>

                                {/* Forward story */}
                                <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none" onClick={() => {
                                  let currentStory = storiesForView?.find((story) => story?.currentStory == true);
                                  setShowChatForwardingPanel(true);
                                  setForwardingChats([{
                                    chatType: currentStory?.storyType == "media" ? "file" : "text",
                                    text: currentStory?.text,
                                    file: currentStory?.mediaFile
                                  }]);
                                  hideStoryView();
                                }}>
                                  <p className="cursor-pointer text-gray-700 block text-md">Forward</p>
                                  <HiOutlineArrowRight className='w-6 h-6 text-gray-400' />
                                </div>

                                {/* Delete story */}
                                {
                                  storiesForView?.find((story) => story?.currentStory == true)?.receiversInfo?.length > 0 &&
                                  <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none" onClick={() => {
                                    let currentStory = storiesForView?.find((story) => story?.currentStory == true);
                                    setShowStoryReceivers(true);
                                    setTargetStoryForReplyOrEdit({ data: currentStory, type: "delete" });
                                    hideStoryView();
                                  }}>
                                    <p className="cursor-pointer text-gray-700 block text-md">Delete for</p>
                                    <AiFillDelete className='w-5 h-5 text-gray-400' />
                                  </div>
                                }

                                {/* Delete for all */}
                                <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none" onClick={() => {
                                  let currentStory = storiesForView?.find((story) => story?.currentStory == true);
                                  deleteStories([currentStory], "all", null);
                                  setShowProgressBar(true);
                                  hideStoryView();
                                }}>
                                  <p className="cursor-pointer text-gray-700 block text-md">Delete for all</p>
                                  <AiFillDelete className='w-5 h-5 text-gray-400' />
                                </div>
                              </>
                            }

                            {/* Show download option if all stories are media */}
                            {
                              storiesForView.find((story) => story?.currentStory == true && story?.storyType == "media") &&
                              <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none" onClick={() => {
                                let fileData = storiesForView.find((story) => story?.currentStory == true && story?.storyType == "media")?.mediaFile;
                                saveAs(fileData.fileURL, fileData?.fileName);
                              }}>
                                <p className="cursor-pointer text-gray-700 block text-md">Download</p>
                                <HiOutlineDownload className='w-5 h-5 text-gray-400' />
                              </div>
                            }
                          </div>
                        </button>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Story viewer bottom section */}
            <div className='storyControllerBottom'>
              {
                // If current user is the sender, show "viewed by" icon stack
                storiesForView?.every(story => story?.senderID == currentUserID) &&
                <div onClick={() => {
                  setShowViewedByPanel(!showViewedByPanel)
                }} className="viewedByLength w-auto relative">
                  {/* Total viewers count */}
                  <div className="w-full h-full flex items-center justify-center cursor-pointer gap-x-1">
                    <HiEye className="w-7 h-7" />
                    <p className="text-lg">
                      {
                        storiesForView?.filter((story) => story?.currentStory == true)[0]
                          ?.receiversInfo
                          ?.filter((receiverID) => receiverID?.seenTime != null)?.length > 90 ?
                          "90+" :
                          storiesForView?.filter((story) => story?.currentStory == true)[0]
                            ?.receiversInfo
                            ?.filter((receiverID) => receiverID?.seenTime != null)?.length
                      }
                    </p>
                  </div>
                </div>
              }

              {
                // If current user is not sender, show reply input and emoji reaction area
                storiesForView?.every(story => story?.senderID != currentUserID) &&
                <div className='inputStoryReply flex items-end justify-center w-full h-full my-0 mx-auto rounded-lg overflow-hidden opacity-50 hover:opacity-100'>
                  {/* Text reply input box */}
                  <MultiInputBox
                    useFor={"chat"}
                    inputRef={inputRef}
                    showFeatures={true}
                    inputNotEmpty={inputNotEmpty}
                    setInputNotEmpty={setInputNotEmpty}
                    targetChatForReplyOrEdit={{
                      repliedToID: storiesForView.find((story) => story?.currentStory == true)?.customID,
                      repliedToType: "story",
                      type: "reply"
                    }}
                    setTargetChatForReplyOrEdit={setTargetStoryForReplyOrEdit}
                  />
                </div>
              }
            </div>
            {/* Story content area */}
            <div style={{ width: '100%' }} className='h-full flex items-center justify-between'>
              {
                // Check if the current story is of type 'media'
                storiesForView?.find((story) => story?.currentStory == true)?.storyType == 'media' &&
                <div style={{ width: '100%' }} className='storyInnerFrame w-full m-auto h-auto flex items-center justify-center'>
                  <>
                    {
                      // Check if the media file is an image
                      storiesForView?.find((story) => story?.currentStory == true)?.mediaFile?.fileType?.startsWith("image/") ?
                        <div style={{
                          width: `${storiesForView?.find((story) => story?.currentStory == true)?.mediaFile?.fileWidth}px`,
                          height: '100%'
                        }} className={`${sizeMap?.[storiesForView?.find((story) => story?.currentStory == true)?.mediaFile?.fileWidth]} rounded-md m-auto`}>
                          {/* Render image */}
                          <img src={`${storiesForView?.find((story) => story?.currentStory == true)?.mediaFile?.fileURL}`} alt="" className='w-full h-full rounded-md' />
                        </div>
                        :
                        // Check if the media file is a video or audio
                        (
                          storiesForView?.find((story) => story?.currentStory == true)?.mediaFile?.fileType?.startsWith("video/")
                          ||
                          storiesForView?.find((story) => story?.currentStory == true)?.mediaFile?.fileType?.startsWith("audio/")
                        ) &&
                        <div style={{
                          width: `${storiesForView?.find((story) => story?.currentStory == true)?.mediaFile?.fileWidth}px`,
                          height: '100%'
                        }} className={`${sizeMap?.[storiesForView?.find((story) => story?.currentStory == true)?.mediaFile?.fileWidth]} rounded-md m-auto`}>
                          {/* Render video with controls */}
                          <video
                            ref={videoRef}
                            src={`${storiesForView?.find((story) => story?.currentStory == true)?.mediaFile?.fileURL}`}
                            className={`w-full h-full rounded-md ${storiesForView?.find((story) => story?.currentStory == true)?.mediaFile?.fileType?.startsWith("audio/") && "hidden"} `}
                            onTimeUpdate={handleTimeUpdate}
                            autoPlay={!isPaused}
                          />
                          <div>

                          </div>
                          {
                            storiesForView?.find((story) => story?.currentStory == true)?.mediaFile?.fileType?.startsWith("audio/") &&
                            <FontAwesomeIcon icon={faFileAudio} style={{ width: "100px" }} />
                          }
                          {/* Progress bar (slider) for tracking and seeking playback */}
                          <input
                            id="progress-bar"
                            type="range"
                            min="0"
                            step="0.1"
                            defaultValue="0"
                            value={storiesForView?.find((story) => story?.currentStory == true)?.width || 0}
                            onChange={(event) => {
                              const parseDuration = (formatted) => {
                                const parts = formatted.split(':').map(Number);
                                if (parts.length === 2) {
                                  // Format MM:SS
                                  const [minutes, seconds] = parts;
                                  return minutes * 60 + seconds;
                                } else if (parts.length === 3) {
                                  // Format HH:MM:SS
                                  const [hours, minutes, seconds] = parts;
                                  return hours * 3600 + minutes * 60 + seconds;
                                }
                                return 0;
                              };
                              // Handle progress bar change
                              const currentStory = storiesForView?.find((story) => story?.currentStory == true);
                              let currentIndex = storiesForView.findIndex(
                                (story) => story?.currentStory == true
                              );
                              if (currentStory) {
                                console.log("parseFloat(event.target.value)",parseFloat(event.target.value))
                                const newProgress = parseFloat(event.target.value); // width as percentage (0–100)
                                if (videoRef.current) {
                                  const totalDurationInSeconds = parseDuration(currentStory?.mediaFile?.fileDuration);
                                  // 👇 Convert % into seconds
                                  const newCurrentTime = (newProgress / 100) * totalDurationInSeconds;
                                  videoRef.current.currentTime = newCurrentTime;
                                }
                                updateStoryWidth(currentStory.customID, newProgress);
                                if (newProgress >= 100) {
                                  moveToNextStory(currentIndex);
                                }
                              }
                            }}
                            className="w-full progress-bar"
                          />
                        </div>
                    }
                  </>
                </div>
              }

              {
                // Check if the current story is of type 'text'
                storiesForView?.find((story) => story?.currentStory == true)?.storyType == 'text' &&
                <div style={{ width: '100%' }} className='storyInnerFrame m-auto h-full flex items-center justify-center'>
                  {/* Render text story component */}
                  <TextStoryThumbnail
                    text={storiesForView?.find((story) => story?.currentStory == true)?.text}
                  />
                </div>
              }
            </div>
            {
              // Check if all stories are sent by the current user
              storiesForView?.every(story => story?.senderID == currentUserID) &&
              // Check if any receiver has seen the currently viewed story
              storiesForView?.filter((story) => story?.currentStory == true)[0]
                ?.receiversInfo?.some(receiverInfo => receiverInfo?.seenTime != null) &&
              // If both conditions are true, render the "Viewed By" panel
              <div className={`${showViewedByPanel ? 'show' : 'hide'} viewedByContainer`}>

                {/* Header of the Viewed By panel */}
                <div onClick={() => {
                  // Hide the panel on click
                  setShowViewedByPanel(false);
                }} className='cursor-pointer w-full viewedByHeader'>
                  <div className='flex items-center justify-between'>
                    <div className='text-lg'>
                      {/* Heading text with the number of viewers */}
                      Viewed by
                      {
                        " " +
                        storiesForView?.filter((story) => story?.currentStory == true)[0]
                          ?.receiversInfo
                          ?.filter((receiverID) => receiverID?.seenTime != null)?.length
                      }
                    </div>
                  </div>
                </div>
                {
                  // Map over each receiver of the current story
                  storiesForView?.filter((story) => story?.currentStory == true)[0]
                    ?.receiversInfo?.map((receiverInfo, idx) => {
                      return (
                        // Show only those who have actually viewed the story
                        receiverInfo?.seenTime != null &&
                        <div key={idx} className='viewedByList w-full h-auto bg-white p-2'>
                          <div className='relative'>
                            {/* Display user button with avatar and name */}
                            <button className={`no profileTab relative hover:bg-gray-100 text-gray-700 flex items-center justify-start w-full`}>

                              {/* Avatar box with background color if no profile image */}
                              <div
                                style={{
                                  // Background color for avatar fallback
                                  backgroundColor: getSingleUserData(
                                    receiverInfo?.receiverID
                                  )?.profileInfo?.bgColor
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
                                    textWidth={`auto`}
                                    areaName={'topBarInfo'}
                                    textData={
                                      getSingleUserData(receiverInfo?.receiverID)?.profileInfo?.name
                                    }
                                    isSearching={false}
                                  />
                                </p>
                                {/* Time when the viewer saw the story */}
                                <p className='text-md'>
                                  {
                                    formatStoryTime(
                                      receiverInfo?.seenTime
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
              </div>
            }
          </div>
        </div>
      </div >
    </React.Fragment >
  )
}

export default StoryView;
