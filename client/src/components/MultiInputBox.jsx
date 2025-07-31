import { useContext, useEffect, useRef, useState } from 'react'
import { UserContext } from '@context/UserContext';
import _ from "lodash";
import { HiOutlineFaceSmile, HiMiniChevronDown, HiClipboardDocumentList } from "react-icons/hi2";
import { BsSend } from "react-icons/bs";
import { BiBold, BiItalic, BiStrikethrough, BiListUl, BiFontColor, BiUnderline, BiSolidVideos } from "react-icons/bi";
import { AiFillAudio } from "react-icons/ai";
import EmojiPicker from 'emoji-picker-react';
import VoiceRecorder from './VoiceRecorder';
import { extractContentFromInputField } from "@utils";

// Component to handle input box for chat/story posting
function MultiInputBox({
    inputRef,
    inputNotEmpty,
    showFeatures,
    setInputNotEmpty,
    useFor, // Indicates whether used for 'story' or 'chat'
    targetChatForReplyOrEdit, // Holds the chat to reply or edit
    setTargetChatForReplyOrEdit // Function to reset the reply/edit chat
}) {
    // Destructuring context values and functions
    const {
        handleInputDirection,
        insertEmojiIntoInputField,
        handleFileUpload,
        activeDarkMode,
        sendTextChat,
        editChatContent,
        openedTabInfo,
        showChatBox,
        setOpenedTabInfo,
        printTextIn_InputField,
        getSingleGroupData,
        getSingleBroadcastData,
        getSingleUserData,
        sendWebSocketMessage,
        currentUserID,
        addOrUpdateRecentTab,
        setUploadedFiles,
        setShowEditingPanel,
        setIsFileUploading,
        setFileEditingFor,
        isVoiceRecording,
        setIsVoiceRecording,
        currentCallData,
        aiAssistant
    } = useContext(UserContext);
    let currentUserData = getSingleUserData(currentUserID); // Current logged-in user data
    // Fetch openedTabData based on the type of the opened tab
    let openedTabData = openedTabInfo?.tabType === 'group' ? getSingleGroupData(openedTabInfo?.tabID) :
        openedTabInfo?.tabType === 'broadcast' ? getSingleBroadcastData(openedTabInfo?.tabID) :
            openedTabInfo?.tabType === 'user' ? getSingleUserData(openedTabInfo?.tabID) : aiAssistant;
    // State for toggling emoji panel
    const [showEmojiContainer, setShowEmojiContainer] = useState(false);
    const [showInputActions, setShowInputActions] = useState(false);
    // Effect to add text formatting button events
    useEffect(() => {
        const inputField = inputRef.current;
        const formatText = (command, value = null) => {
            document.execCommand(command, false, value);
            inputField.focus();
        };
        const handleButtonClick = (e) => {
            const command = e.currentTarget.id;
            formatText(command);
        };
        // Bind format buttons
        document.querySelectorAll('.format').forEach(button => {
            button.addEventListener('click', handleButtonClick);
        });
        // Cleanup on unmount
        return () => {
            document.querySelectorAll('.format').forEach(button => {
                button.removeEventListener('click', handleButtonClick);
            });
        };
    }, []);

    // Function to show typing/recording status
    function sendChatingAction(chattingStatus) {
        sendWebSocketMessage(
            'user:chatting:indicator',
            'actionInfo',
            {
                initiatorUserID: currentUserID,
                targetUserIDs: openedTabInfo?.tabType == "user" ? [openedTabData?._id] :
                    openedTabData?.members?.filter((memberID) => memberID != currentUserID),
                chattingStatus,
                toGroupID: openedTabInfo?.tabType == "group" ? openedTabInfo?.tabID : null,
            }
        );
    };

    const clearTextDraft = (openedTabInfo) => {
        if (!inputNotEmpty) {
            let draftData = {
                ...(openedTabInfo?.draft || {}),
                textData: ""
            };
            // update only when the tab exist in recent tabs
            let isTabExists = currentUserData?.recentChatsTabs?.some(
                (recentChatTabInfo) => recentChatTabInfo?.tabID === openedTabInfo?.tabID
            );
            if (isTabExists) {
                addOrUpdateRecentTab(openedTabInfo, {
                    draft: draftData
                });
            };
            setOpenedTabInfo({ ...openedTabInfo, draft: draftData });
        };
    };
    // Effect for sending "typing..." status
    useEffect(() => {
        if (openedTabInfo?.tabType != "aiAssistant") {
            if (!inputNotEmpty) {
                sendChatingAction("");
            } else {
                if (openedTabInfo?.tabID == currentUserID) return;
                sendChatingAction("typing...");
            };
        };
    }, [inputNotEmpty]);

    // Effect for sending "voice recording..." status
    useEffect(() => {
        if (!isVoiceRecording) {
            sendChatingAction("");
        } else {
            sendChatingAction("voice recording...");
        };
    }, [isVoiceRecording]);

    // Effect to print text in input field when editing
    useEffect(() => {
        if (targetChatForReplyOrEdit?.type == "edit") {
            printTextIn_InputField(inputRef, targetChatForReplyOrEdit?.data?.text);
        };
        // Clear input field if nothing is being edited/replied
        if (targetChatForReplyOrEdit == null && !openedTabData?.isDeleted) {
            inputRef.current.innerHTML = "";
            setInputNotEmpty(false);
        };
    }, [targetChatForReplyOrEdit]);

    // Ref to track previously opened tab for saving draft
    const previousTabRef = useRef();
    useEffect(() => {
        if (openedTabInfo?.draft?.textData?.length > 0) {
            setTimeout(() => {
                printTextIn_InputField(inputRef, openedTabInfo?.draft?.textData);
                setInputNotEmpty(true);
            }, 200)
        };
        if (
            (previousTabRef.current && previousTabRef.current?.tabID !== openedTabInfo?.tabID && inputNotEmpty && !isVoiceRecording)
            ||
            !showChatBox
        ) {
            const extractedContent = extractContentFromInputField(inputRef);
            inputRef.current.innerHTML = "";
            setInputNotEmpty(false);
            if (extractedContent?.length > 0) {
                addOrUpdateRecentTab(previousTabRef.current, {
                    draft: {
                        ...(previousTabRef.current?.draft || {}),
                        textData: extractedContent
                    }
                });
            };
        };
        previousTabRef.current = openedTabInfo;
    }, [openedTabInfo, showChatBox]);

    // Effect to hide emoji container when clicking outside
    useEffect(() => {
        document.addEventListener('click', function (event) {
            if (document.querySelector('.emojiesInChatTypingArea')) {
                let inputForChat = document.querySelector('.inputForChat');
                let showEmojiTabBtn = document.querySelector('.showEmojiTabBtn');
                let emojiesInChatTypingArea = document.querySelector('.emojiesInChatTypingArea');
                let hideEmojiesTab = !showEmojiTabBtn?.contains(event.target) &&
                    !emojiesInChatTypingArea?.contains(event.target) &&
                    !inputForChat?.contains(event.target);
                if (hideEmojiesTab) {
                    setShowEmojiContainer(false);
                }
            };
        });
    }, []);

    // Group all section togglers to hide others when one is active
    let allShowingSetter = [setShowEmojiContainer, setShowInputActions];
    function handleShowingSections(activeSetter) {
        allShowingSetter.forEach(setState => setState(false));
        activeSetter(true);
    };

    // Component JSX
    return (
        <div className={`multiInputBoxContainer w-full`}>
            {
                // Show emoji container if true
                showEmojiContainer &&
                <div className={`emojiesInChatTypingArea w-full p-4 pt-0 bg-white shadow-lg rounded-lg`}>
                    <div className="pt-2 w-full flex items-center justify-center text-gray-500">
                        <HiMiniChevronDown onClick={() => {
                            setShowEmojiContainer(false);
                        }} className='w-7 h-7 cursor-pointer' />
                    </div>
                    {
                        <EmojiPicker
                            onEmojiClick={
                                emoji =>
                                    insertEmojiIntoInputField(
                                        {
                                            emojiUrl: emoji.imageUrl,
                                            emojiUnicode: emoji.emoji
                                        },
                                        inputRef,
                                        setInputNotEmpty
                                    )
                            }
                            emojiStyle={"apple"}
                            lazyLoadEmojis={true}
                        />
                    }
                </div>
            }

            {
                isVoiceRecording ?
                    <VoiceRecorder />
                    :
                    // {/* Main input section */}
                    <div className={`multiInputBox relative flex flex-row items-end w-full ${activeDarkMode ? "darkModeBg1" : ''}  text-gray-600`}>
                        {
                            showFeatures &&
                            <>
                                <div className="w-full flex items-center justify-center hidden inputActionBtn">
                                    <HiMiniChevronDown onClick={() => {
                                        handleShowingSections(setShowInputActions)
                                        setShowInputActions(!showInputActions)
                                    }} className={`w-7 h-7 cursor-pointer ${showInputActions ? "rotate-180" : ""}`} />
                                </div>
                                <div className={`gap-x-2 w-auto p-3 relative items-center  ${showInputActions ? "show" : "hide"} inputActionContainer`}>

                                    {/* Show draft button if available */}
                                    {
                                        (openedTabInfo?.draft?.fileData) &&
                                        <button className={`inline-flex items-center justify-center  showChildOnParentHover`}>
                                            <HiClipboardDocumentList className="w-8 h-8" />
                                            <div className={`p-4 flex absolute left-4 bottom-16 z-10 mt-0 w-auto origin-bottom-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none shadow-lg transition duration-300 ease-in-out ${activeDarkMode ? "darkModeBg1" : ''} showOnHover flex flex-col gap-y-2`} style={{ top: "-60px" }}>
                                                {
                                                    openedTabInfo?.draft?.fileData &&
                                                    <button id="italic" className="flex items-center justify-between w-auto gap-x-4" type="button" onClick={() => {
                                                        setUploadedFiles(openedTabInfo?.draft?.fileData);
                                                        setShowEditingPanel(true);
                                                        setIsFileUploading(true);
                                                        setFileEditingFor("chat");
                                                    }}>
                                                        <span>File Draft</span>
                                                        <BiSolidVideos className="w-6 h-6" />
                                                    </button>
                                                }
                                            </div>
                                        </button>
                                    }

                                    {/* Emoji Picker Button */}
                                    <button
                                        className={`showEmojiTabBtn inline-flex items-center justify-center `}
                                        onClick={(e) => {
                                            handleShowingSections(setShowEmojiContainer)
                                            setShowEmojiContainer(!showEmojiContainer)
                                        }}
                                    >
                                        <HiOutlineFaceSmile className="w-9 h-9" />
                                    </button>

                                    {/* File upload button */}
                                    <button id="hs-dropup" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Dropdown">
                                        <label className={`w-full h-full cursor-pointer`}>
                                            <BiSolidVideos className='w-7 h-7' />
                                            <input
                                                type='file'
                                                className='hidden'
                                                multiple
                                                onChange={(e) => {
                                                    handleFileUpload(e.target.files, useFor);
                                                    e.target.value = "";
                                                }}
                                            />
                                        </label>
                                    </button>

                                    {/* Text formatting buttons */}
                                    <button className={`inline-flex items-center justify-center  showChildOnParentHover`}>
                                        <BiFontColor className="w-10 h-10" />
                                        <div className={`p-4 flex absolute left-28 bottom-16 z-10 mt-0 w-auto origin-bottom-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none shadow-lg transition duration-300 ease-in-out ${activeDarkMode ? "darkModeBg1" : ''} showOnHover`} style={{ top: "-60px" }}>
                                            <button id="bold" className="option-button format" type="button">
                                                <BiBold className="w-6 h-6" />
                                            </button>
                                            <button id="italic" className="option-button format" type="button">
                                                <BiItalic className="w-6 h-6" />
                                            </button>
                                            <button id="strikethrough" className="option-button format" type="button">
                                                <BiStrikethrough className="w-6 h-6" />
                                            </button>
                                            <button id="underline" className="option-button format" type="button">
                                                <BiUnderline className="w-6 h-6" />
                                            </button>
                                            <button id="insertUnorderedList" className="option-button format" type="button">
                                                <BiListUl className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </button>

                                    {/* Voice message icon */}
                                    {
                                        !inputNotEmpty &&
                                        <button
                                            className={`${currentCallData && "cursor-not-allowed"} inline-flex items-center justify-center  showChildOnParentHover`}
                                            type='button'>
                                            <AiFillAudio
                                                style={{ display: isVoiceRecording ? 'none' : 'block' }}
                                                onClick={() => {
                                                    if (!openedTabData?.isDeleted && currentCallData == null) {
                                                        setIsVoiceRecording(true);
                                                    };
                                                }}
                                                className="w-8 h-8"
                                            />
                                        </button>
                                    }
                                </div>
                            </>
                        }

                        {/* Main input area and send button */}
                        <div className={`w-full py-3 mainInput_sendBtn flex items-end`}>
                            <div
                                ref={inputRef}
                                contentEditable="true"
                                className={`inputForChat editable_div not_prevent_select input_field w-full border rounded-xl focus:outline-none focus:border-indigo-300 ${activeDarkMode ? "darkModeBg1" : ''} text-gray-800`}
                                onKeyDown={(e) => {
                                    handleInputDirection(
                                        e,
                                        inputRef,
                                        setInputNotEmpty,
                                        'no',
                                        true
                                    );
                                    clearTextDraft(openedTabInfo)
                                }}
                                onInput={(e) => {
                                    handleInputDirection(
                                        e,
                                        inputRef,
                                        setInputNotEmpty,
                                        'no',
                                        true
                                    );
                                }}
                            />
                            {
                                inputNotEmpty &&
                                <div className='py-2.5 px-3'>
                                    <BsSend
                                        style={{ transform: "rotate(45deg)", right: "3px", color: "#7269ef" }}
                                        className="w-6 h-6 relative cursor-pointer"
                                        onClick={async () => {
                                            const extractedContent = await extractContentFromInputField(inputRef);
                                            if (extractedContent?.length > 0) {
                                                if (targetChatForReplyOrEdit == null) {
                                                    sendTextChat(openedTabInfo, "text", extractedContent, null);
                                                };
                                                if (targetChatForReplyOrEdit?.type == "reply") {
                                                    sendTextChat(openedTabInfo, "text", extractedContent, targetChatForReplyOrEdit);
                                                };
                                                if (targetChatForReplyOrEdit?.type == "edit") {
                                                    editChatContent({ ...targetChatForReplyOrEdit?.data, text: JSON.stringify(extractedContent) });
                                                };
                                                inputRef.current.innerHTML = "";
                                                setInputNotEmpty(false);
                                                setTargetChatForReplyOrEdit(null);
                                                // scrollChatBoxToBottom('smooth');
                                            };
                                        }}
                                    />
                                </div>
                            }
                        </div>
                    </div>
            }
        </div>
    )
}

export default MultiInputBox;
