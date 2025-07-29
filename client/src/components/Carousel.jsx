// Import necessary modules, hooks, components, and icons
import  {  useContext, useEffect } from 'react';
import { HiPencilSquare, HiMiniNoSymbol, HiBookmark, HiMiniBookmarkSlash, HiEllipsisVertical, HiMiniEye } from "react-icons/hi2";
import { UserContext } from '@context/UserContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { LuStarOff } from "react-icons/lu";
import { HiOutlineDownload, HiOutlineArrowRight } from 'react-icons/hi';
import _ from 'lodash';
import { AiFillDelete } from "react-icons/ai";
import {  getChatsOfSpecificTab } from "./ChatBox.jsx"
import { saveAs } from 'file-saver';
import moment from 'moment';
import { FaClockRotateLeft } from "react-icons/fa6";
// FontAwesome icon imports for different file types
import {
    faFileWord,
    faFileExcel,
    faFilePowerpoint,
    faFilePdf,
    faFileImage,
    faFileCode,
    faFileAlt,
    faFileArchive,
    faFileAudio,
    faFileVideo,
    faTimes,
    faStar
} from '@fortawesome/free-solid-svg-icons';

// Map file icon constants
const iconMap = {
    faFileWord: faFileWord,
    faFileExcel: faFileExcel,
    faFilePowerpoint: faFilePowerpoint,
    faFilePdf: faFilePdf,
    faFileImage: faFileImage,
    faFileCode: faFileCode,
    faFileAlt: faFileAlt,
    faFileArchive: faFileArchive,
    faFileAudio: faFileAudio,
    faFileVideo: faFileVideo,
};

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

// Component imports for audio/video players
import { AudioPlayer, VideoPlayer, TextWithEmojis } from "./index.js";

// Carousel Component definition
function Carousel() {
    // Extract values and functions from UserContext
    const {
        activeDarkMode,
        setUploadedFiles,
        setShowEditingPanel,
        setIsFileUploading,
        setFileEditingFor,
        starChat,
        keepChat,
        setShowChatForwardingPanel,
        setForwardingChats,
        deleteChats,
        makeChatUnsent,
        currentUserID,
        openedTabInfo,
        allChatsData,
        openedFileChatData,
        setOpenedFileChatData,
        setShowFileChatsInCarousel,
        getSingleUserData,
        setOpenedTabInfo,
        formatTimestamp,
        resendChat
    } = useContext(UserContext);

    // Remove duplicate chats by customID
    let allUniqueChats = _.uniqBy(allChatsData, "customID");
    // Get the current logged-in user's data
    let currentUserData = getSingleUserData(currentUserID);
    // Time formatting options for chat time display
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    // Get file chats for the currently opened tab
    let fileChatsOfOpenedTab = getChatsOfSpecificTab(allUniqueChats, openedTabInfo, currentUserID);

    // Filter file chats only
    function getFileChatsInCarousel() {
        return fileChatsOfOpenedTab?.filter((fileChatData) => fileChatData?.chatType == "file");
    };

    // Store file chats to be shown in carousel
    const fileChatsInCarousel = getFileChatsInCarousel();

    // Hide the carousel UI
    function hideCarousel() {
        setShowFileChatsInCarousel(false);
        setOpenedFileChatData(null);
    };

    // Update selected chat data when props change or data updates
    useEffect(() => {
        setOpenedFileChatData(fileChatsInCarousel?.find((fileChatData) => fileChatData?.customID == openedFileChatData?.customID)); //set the openedFileChatData
        if (fileChatsOfOpenedTab?.filter((fileChatData) => fileChatData?.chatType == "file")?.length === 0 || [null, undefined]?.includes(openedFileChatData)) {
            hideCarousel();
        };
    }, [openedFileChatData, fileChatsOfOpenedTab]);

    // Component JSX render
    return (
        <div className='fileHandler'>
            <div className={`fileHandlerInner`}>
                <div className={`flex filePreviewContainer bg-white ${activeDarkMode ? "darkModeBg2" : ''} relative text-gray-500`}>

                    {/* ===== Toolbar section ===== */}
                    <div className="toolbar">

                        {/* Close Button */}
                        <div className="closeBtn flex items-center gap-x-4">
                            <button className="hover:text-black">
                                <FontAwesomeIcon
                                    onClick={() => {
                                        hideCarousel();
                                    }}
                                    icon={faTimes} className="text-2xl" />
                            </button>
                            <div>
                                <div className="profileTabInfo flex p-0" style={{ color: getSingleUserData(openedFileChatData?.senderID)?.profileInfo?.bgColor }} onClick={() => {
                                    let tabInfo = currentUserData?.recentChatsTabs?.find(
                                        (recentChatTabInfo) => recentChatTabInfo?.tabID == openedFileChatData?.senderID
                                    );
                                    setOpenedTabInfo(
                                        tabInfo ||
                                        {
                                            tabType: "user",
                                            tabID: openedFileChatData?.senderID,
                                            recentTime: "",
                                            clearingTime: "",
                                            isArchived: false,
                                            isPinned: false,
                                            disappearingTime: "Off",
                                        }
                                    );
                                    hideCarousel();
                                }}>
                                    {
                                        openedFileChatData?.senderID === currentUserID ? `You`
                                            :
                                            <TextWithEmojis
                                                hide={true}
                                                textWidth="auto"
                                                textData={getSingleUserData(openedFileChatData?.senderID)?.profileInfo?.name}
                                                isSearching={false}
                                            />
                                    }
                                </div>
                                <p className='text-sm flex gap-x-1'>
                                    {
                                        !moment().isSame(
                                            moment(
                                                currentUserID == openedFileChatData?.senderID ? openedFileChatData?.sentTime
                                                    :
                                                    openedFileChatData?.receiversInfo?.find(receiverInfo => receiverInfo?.receiverID == currentUserID)?.deliveredTime
                                            ), 'day'
                                        ) && <>
                                            {
                                                currentUserID == openedFileChatData?.senderID ?
                                                    formatTimestamp(openedFileChatData?.sentTime)
                                                    :
                                                    formatTimestamp(
                                                        openedFileChatData?.receiversInfo?.find(receiverInfo => receiverInfo?.receiverID == currentUserID)?.deliveredTime
                                                    )
                                            }
                                        </>
                                    }
                                    <span>
                                        {
                                            currentUserID == openedFileChatData?.senderID ?
                                                new Date(openedFileChatData?.sentTime).toLocaleTimeString('en-US', timeOptions)
                                                :
                                                new Date(
                                                    openedFileChatData?.receiversInfo?.find(receiverInfo => receiverInfo?.receiverID == currentUserID)?.deliveredTime
                                                ).toLocaleTimeString('en-US', timeOptions)
                                        }
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Dropdown options */}
                        <div className="showChildOnParentHover cursor-pointer">
                            <HiEllipsisVertical className="h-8 w-8" />
                            <div className={`${activeDarkMode ? "darkModeBg1" : ''} text-gray-500 py-2 absolute origin-top-right z-10 mt-0 rounded-md bg-white shadow-lg dropDownList showOnHover transition duration-300 ease-in-out`} role="menu" aria-orientation="vertical" aria-labelledby="menu-button" tabIndex="-1" style={{ top: "55px", right: "36px" }}>
                                {/* show in chats */}

                                <div onClick={() => {
                                    hideCarousel();
                                    setTimeout(() => {
                                        document.getElementById(openedFileChatData?.customID)?.scrollIntoView({ behavior: "smooth" });
                                    }, 100); // Delay to ensure element is rendered
                                }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                                    <p className="cursor-pointer block text-md">Show in chats</p>
                                    <HiMiniEye className='w-5 h-5 ' />
                                </div>
                                <>
                                {
                            // show resend button if chat's sending is failed
                            (openedFileChatData?.isFailed && openedFileChatData?.senderID == currentUserID) && <div onClick={() => {
                                resendChat(openedFileChatData);
                            }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                                <p className="cursor-pointer block text-md">Resend</p>
                                <FaClockRotateLeft className='w-6 h-6 inline' strokeWidth={1} />
                            </div>
                        }
                                    {/* Edit button (if sender is current user and file is image) */}
                                    {
                                        (openedFileChatData?.senderID == currentUserID && openedFileChatData?.file?.fileType?.startsWith("image/")) &&
                                        <div onClick={() => {
                                            setUploadedFiles([{
                                                fileID: openedFileChatData?.customID,
                                                fileData: null,
                                                ...openedFileChatData?.file,
                                                editedFile: null,
                                                coloursDataOnImage: [],
                                                emoji: [],
                                                rejection: null,
                                                isFileReEditing: true,
                                            }]);
                                            setShowEditingPanel(true);
                                            setIsFileUploading(true);
                                            setFileEditingFor("chat");
                                            hideCarousel();
                                        }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                                            <p className="cursor-pointer block text-md">Edit</p>
                                            <HiPencilSquare className='w-5 h-5' />
                                        </div>
                                    }

                                    {/* Star / Unstar chat */}
                                    <div onClick={() => {
                                        starChat([openedFileChatData]);
                                    }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                                        <p className="cursor-pointer block text-md">
                                            {openedFileChatData?.starredByUsers.includes(currentUserID) ? "Unstar" : "Star"}
                                        </p>
                                        {
                                            openedFileChatData?.starredByUsers.includes(currentUserID) ?
                                                <LuStarOff className='w-5 h-5 ' />
                                                :
                                                <FontAwesomeIcon icon={faStar} className='' />
                                        }
                                    </div>

                                    {/* Keep / Unkeep chat */}
                                    <div onClick={() => {
                                        keepChat([openedFileChatData]);
                                    }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                                        <p className="cursor-pointer block text-md">
                                            {openedFileChatData?.keptByUsers.includes(currentUserID) ? "Unkeep" : "Keep"}
                                        </p>
                                        {openedFileChatData?.keptByUsers.includes(currentUserID) ?
                                            <HiMiniBookmarkSlash className='w-5 h-5 ' /> :
                                            <HiBookmark className='w-5 h-5 ' />}
                                    </div>

                                    {/* Save / Download file */}
                                    <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none" onClick={() => {
                                        let fileData = openedFileChatData?.file;
                                        saveAs(fileData.fileURL, fileData?.fileName);
                                    }}>
                                        <p className="cursor-pointer block text-md">Save</p>
                                        <HiOutlineDownload className='w-6 h-6 ' />
                                    </div>

                                    {/* Forward chat */}
                                    <div onClick={() => {
                                        setShowChatForwardingPanel(true);
                                        setForwardingChats([openedFileChatData]);
                                        hideCarousel();
                                    }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                                        <p className="cursor-pointer block text-md">Forward</p>
                                        <HiOutlineArrowRight className='w-6 h-6 ' />
                                    </div>
                                </>
                                {/* Delete chat */}
                                <div onClick={() => {
                                    let currentIndex = fileChatsInCarousel?.findIndex((fileInfo) => fileInfo?.customID == openedFileChatData?.customID);
                                    let filteredFiles = fileChatsInCarousel?.filter((fileInfo) => fileInfo?.customID != openedFileChatData?.customID);
                                    const newIndex = currentIndex == 0 ? 0 : currentIndex - 1;
                                    setOpenedFileChatData(filteredFiles[newIndex]);
                                    deleteChats([openedFileChatData]);
                                }} className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none">
                                    <p className="cursor-pointer block text-md">Delete</p>
                                    <AiFillDelete className='w-5 h-5 ' />
                                </div>

                                {/* Unsend chat (if within 10 minutes and not already unsent) */}
                                {
                                    (
                                        (Date.now() - new Date(openedFileChatData?.sentTime).getTime()) <= (10 * 60 * 1000) &&
                                        openedFileChatData?.chatType != "unsent"
                                    ) &&
                                    <div className="px-3 py-1.5 flex items-center justify-between cursor-pointer gap-x-6" role="none" onClick={() => {
                                        // let currentIndex = fileChatsInCarousel?.findIndex((fileInfo) => fileInfo?.customID == openedFileChatData?.customID);
                                        // let filteredFiles = fileChatsInCarousel?.filter((fileInfo) => fileInfo?.customID != openedFileChatData?.customID);
                                        // const newIndex = currentIndex == 0 ? 0 : currentIndex - 1;
                                        // setOpenedFileChatData(filteredFiles[newIndex]);
                                        let currentIndex = fileChatsInCarousel?.findIndex((fileInfo) => fileInfo?.customID == openedFileChatData?.customID);
                                        let filteredFiles = fileChatsInCarousel?.filter((fileInfo) => fileInfo?.customID != openedFileChatData?.customID);
                                        const newIndex = currentIndex == 0 ? 0 : currentIndex - 1;
                                        setOpenedFileChatData(filteredFiles[newIndex]);
                                        makeChatUnsent([{
                                            ...openedFileChatData,
                                            file: { ...openedFileChatData?.file, oldFilePublicId: openedFileChatData?.file?.publicId },
                                        }])
                                    }}>
                                        <p className="cursor-pointer block text-md">Unsent</p>
                                        <HiMiniNoSymbol className='w-5 h-5 ' />
                                    </div>
                                }
                            </div>
                        </div>
                    </div>

                    {/* ===== File preview area ===== */}
                    <div className="previewBox">
                        <div className={`${openedFileChatData?.file?.fileType?.startsWith("image/") ||
                            openedFileChatData?.file?.fileType?.startsWith("video/") ||
                            openedFileChatData?.file?.fileType?.startsWith("audio/")
                            ? '' : 'fileTypeInfo'} fileContainer ${activeDarkMode ? "darkModeBg2" : ''} w-full h-full m-auto`}>

                            {/* Display image preview */}
                            {
                                openedFileChatData?.file?.fileType?.startsWith("image/") ?
                                    <div style={{ width: `${openedFileChatData?.file?.fileWidth}px` }} className={`${sizeMap?.[openedFileChatData?.file?.fileWidth]} flex items-center justify-center h-full m-auto`}>
                                        <div className={`mainFrame relative w-full h-auto overflow-hidden`}>
                                            <img src={openedFileChatData?.file?.fileURL}
                                                alt="Uploaded"
                                                id="mainFrameImage"
                                                className="pointer-events-none w-full h-auto m-auto"
                                            />
                                        </div>
                                    </div>

                                    // Display video preview
                                    : openedFileChatData?.file?.fileType?.startsWith("video/") ?
                                        <div style={{ width: `${openedFileChatData?.file?.fileWidth}px` }} className='flex h-full m-auto'>
                                            <VideoPlayer
                                                src={openedFileChatData?.file?.fileURL}
                                                size={openedFileChatData?.file?.fileSize}
                                            />
                                        </div>

                                        // Display audio preview
                                        : openedFileChatData?.file?.fileType?.startsWith("audio/") ?
                                            <AudioPlayer
                                                fileInfo={openedFileChatData?.file}
                                                showIcon={true}
                                            />

                                            // Display icon for other file types
                                            :
                                            <div className="fileIconName flex items-center justify-between flex-col space-y-1">
                                                {
                                                    <FontAwesomeIcon icon={iconMap?.[openedFileChatData?.file?.fileIcon]} />
                                                }
                                            </div>
                            }
                        </div>
                    </div>

                    {/* ===== Bottom Thumbnail Navigation ===== */}
                    <div className={`bottomBar`}>
                        <div className="thumbnailBox mt-4 flex items-center justify-between space-x-2">
                            <div className={`thumbnailBoxInner ${fileChatsInCarousel.length > 3 ? 'rightShadow' : ''} flex items-center justify-center w-full`}>
                                <div className="uploadedImagesContainer w-full flex flex-wrap flex-col overflow-x-auto overflow-y-hidden h-full">
                                    {
                                        fileChatsInCarousel?.map((fileInfo, fileidx) => {
                                            return <div key={fileidx} style={{ border: fileInfo?.customID == openedFileChatData?.customID ? '3px solid #1DA1F2' : 'none' }} id="sendingFile" className="cursor-pointer thumbnail border border-gray-300 rounded-lg m-1 relative">
                                                <div className="w-full h-full" onClick={() => {
                                                    setOpenedFileChatData(fileInfo);
                                                }}>
                                                    {/* Thumbnail preview for image, video, or icon */}
                                                    {
                                                        fileInfo?.file?.fileType?.startsWith("image/") ?
                                                            <img style={{ borderRadius: "5px" }}
                                                                src={fileInfo?.file?.fileURL}
                                                                alt="Uploaded thumbnail"
                                                                className="pointer-events-none w-full h-full object-cover"
                                                            />
                                                            : fileInfo?.file?.fileType?.startsWith("video/") ?
                                                                <video
                                                                    style={{ borderRadius: "7px" }}
                                                                    src={fileInfo?.file?.fileURL}
                                                                    muted
                                                                    className="w-full h-full object-cover"
                                                                >
                                                                    Your browser does not support the video tag.
                                                                </video>
                                                                :
                                                                <div className="fileIconInThumbnail w-full h-full flex items-center justify-center">
                                                                    <FontAwesomeIcon icon={iconMap?.[fileInfo?.file?.fileIcon]} />
                                                                </div>
                                                    }
                                                </div>
                                            </div>
                                        })
                                    }
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}

// Export Carousel component
export default Carousel
