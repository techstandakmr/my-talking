import { useContext, useEffect, useRef, useState } from 'react'
import { HiMiniVideoCameraSlash, HiOutlineVideoCamera, HiMiniChevronDown } from 'react-icons/hi2'
import { peer } from "@utils";
import { UserContext } from '../context/UserContext.jsx';
import { BiSolidChat, BiSolidMicrophone, BiSolidMicrophoneOff, BiSolidPhone } from 'react-icons/bi';
import { BsArrowLeft } from 'react-icons/bs';
import { TextWithEmojis } from "./index.js";
function VideoAndVoiceCalling() {
    const {
        wbServer,
        getSingleUserData,
        safeParseJSON,
        currentCallData,
        setCurrentCallData,
        currentUserID,
        sendWebSocketMessage,
        setAllCallsData,
        activeDarkMode,
        setOpenedTabInfo,
        setShowChatBox,
        handleShowingSections,
        setShowRecentChatsSection
    } = useContext(UserContext);
    // Get data of current user based on currentUserID
    let currentUserData = getSingleUserData(currentUserID);
    // Timer State
    const [seconds, setSeconds] = useState(0); // Track elapsed seconds
    const isRunning = useRef(false); // Track if timer is running
    const intervalRef = useRef(null); // Ref to store interval ID for timer

    // Start Timer
    const startTimer = () => {
        if (!isRunning.current) {
            isRunning.current = true; // Set timer as running
            intervalRef.current = setInterval(() => {
                setSeconds(prev => prev + 1); // Increment seconds every 1 second
            }, 1000);
        }
    };

    // Pause Timer
    const pauseTimer = () => {
        clearInterval(intervalRef.current); // Clear the timer interval
        isRunning.current = false; // Set timer as paused
    };

    // Reset Timer
    const resetTimer = () => {
        clearInterval(intervalRef.current); // Clear timer interval
        setSeconds(0); // Reset seconds to 0
        isRunning.current = false; // Set timer as not running
    };

    // Cleanup on Unmount
    // useEffect(() => {
    //     // startTimer(); // Optional: start timer on mount
    //     return () => clearInterval(intervalRef.current); // Clear interval on component unmount
    // }, []);

    // Format Time: Show HH:MM:SS only if hours exist
    const formatTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        // Format minutes and seconds with leading zeros
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(secs).padStart(2, '0');

        // Return formatted time string, including hours if > 0
        return hours > 0
            ? `${String(hours).padStart(2, '0')}:${formattedMinutes}:${formattedSeconds}`
            : `${formattedMinutes}:${formattedSeconds}`;
    };

    // const peer = useRef(new Peer()); // Peer connection reference (commented out)

    let calleeData = getSingleUserData(currentCallData?.callee); // Get callee user data
    let callerData = getSingleUserData(currentCallData?.caller); // Get caller user data

    // State to control full view for incoming or outgoing calls
    const [showFullView, setShowFullView] = useState(currentCallData?.caller == currentUserID ? true : false);

    const [viewOnSide, setViewOnSide] = useState(false);
    // When user wants to chat while keeping call controls and screen minimized on side

    const [callIncommngSmallView, setCallIncommngSmallView] = useState(true);
    // Show small view during incoming call

    const [localStream, setLocalStream] = useState(null); // Local media stream state
    const [isAudioActive, setIsAudioActive] = useState(true); // Track if audio is on/off
    const [isCameraActive, setIsCameraActive] = useState(true); // Track if camera is on/off
    const localVideoRef = useRef(null); // Reference for local video element
    const [remoteStream, setRemoteStream] = useState(null); // Remote media stream state
    const remoteVideoRef = useRef(null); // Reference for remote video element

    // Function to initialize local media streaming (audio/video)
    const initialLocalStreaming = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: currentCallData?.callType == 'voice' ? false : true, // Video only if call type not voice
        });
        localVideoRef.current.srcObject = stream; // Set stream to local video element
        setLocalStream(stream); // Store local stream in state
    };

    useEffect(() => {
        if (currentCallData != null) {
            initialLocalStreaming(); // Start local streaming on call data availability
        };
    }, []);
    // toggle screen 
    function toggleVideoScreem() {
        let smallScreen = document.getElementById("smallScreen");
        let fullScreen = document.getElementById("fullScreen");
        if (smallScreen.classList.contains("smallScreen")) {
            // Switch small screen to full screen
            smallScreen.classList.remove("smallScreen");
            smallScreen.classList.add("fullScreen");
        } else {
            smallScreen.classList.remove("fullScreen");
            smallScreen.classList.add("smallScreen");
        };
        if (fullScreen.classList.contains("fullScreen")) {
            // Switch full screen to small screen
            fullScreen.classList.remove("fullScreen");
            fullScreen.classList.add("smallScreen");
        } else {
            fullScreen.classList.add("fullScreen");
            fullScreen.classList.remove("smallScreen");
        };
    };
    // Send local media tracks to the peer connection
    const sendStreams = async () => {
        if (localStream) {
            localStream.getTracks().forEach(track => {
                const senders = peer.peer.getSenders();
                const senderExists = senders.find(sender => sender.track && sender.track.id === track.id);
                if (!senderExists) {
                    peer.peer.addTrack(track, localStream); // Add track to peer connection if not already added
                };
            });
        } else {
            //show network problem , please try again
        };
    };

    // Handle creation of answer to incoming call offer
    const makeAnswerToCaller = async (currentCallData) => {
        const ans = await peer.getAnswer(currentCallData?.offer); // Get answer SDP
        if (ans) {
            let { offer, ...callDataWithAns } = currentCallData; // Exclude offer from new call data
            // Add answer SDP, accepted status, and answer timestamp for duration calculation
            callDataWithAns = { ...callDataWithAns, ans, status: "accepted", ansTime: new Date().toISOString() };
            setCurrentCallData(prev => ({ ...prev, status: 'accepted', ansTime: new Date().toISOString() })); // Update call state
            sendWebSocketMessage('call:accepted', 'callData', callDataWithAns); // Notify remote peer call accepted
            setTimeout(() => {
                sendStreams(); // Send media tracks after short delay
                startTimer(); // Start call duration timer
            }, 1000);
        };
    };

    // Handle negotiationneeded event for renegotiation of call
    const handleNegoNeeded = async () => {
        const offer = await peer.getOffer(); // Create new offer SDP
        sendWebSocketMessage(
            'call:renegotiation',
            'callData',
            {
                ...currentCallData,
                offer,
                localPeer: currentUserID,
                remotePeer: currentUserID == currentCallData?.caller ?
                    currentCallData?.callee : currentCallData?.caller
            }
        ); // Send renegotiation offer via websocket
    };

    useEffect(() => {
        peer.peer.addEventListener("negotiationneeded", handleNegoNeeded); // Listen for negotiationneeded event
        return () => {
            peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded); // Cleanup event listener on unmount
        };
    }, [handleNegoNeeded]);

    // Handle incoming renegotiation offer from remote peer
    const handleNegoNeedIncomming = async (currentCallData) => {
        let { offer, localPeer, remotePeer } = currentCallData;
        const ans = await peer.getAnswer(offer); // Generate answer for renegotiation
        sendWebSocketMessage(
            'call:renegotiation:done',
            'callData',
            {
                ...currentCallData,
                ans,
                localPeer: remotePeer, // Swap peers
                remotePeer: localPeer
            }
        ); // Send renegotiation answer
    };

    // Handle completion of renegotiation process
    const handleNegoDone = async (currentCallData) => {
        let { ans } = currentCallData;
        await peer.setLocalDescription(ans); // Apply local description from answer
    };

    useEffect(() => {
        peer.peer.addEventListener("track", async (ev) => {
            const remoteStream = ev.streams;
            // Optionally track remote mic and camera status here
            if (remoteVideoRef.current) {
                setRemoteStream(remoteStream[0]); // Set remote stream in state
                remoteVideoRef.current.srcObject = remoteStream[0]; // Assign remote stream to video element
            };
        });
    }, []);

    // Toggle local audio track on/off
    function toggleAudio() {
        const audioTrack = localStream.getAudioTracks()[0]; // Get first audio track
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled; // Toggle enabled state
            setIsAudioActive(audioTrack.enabled); // Update UI state for audio
            sendWebSocketMessage(
                'call:toggleAudio',
                'callData',
                {
                    // ...currentCallData,
                    audioStatus: audioTrack.enabled, // Boolean audio status
                    remotePeer: currentUserID == currentCallData?.caller ?
                        currentCallData?.callee : currentCallData?.caller
                }
            ); // Notify remote peer of audio toggle
        };
    };

    // Toggle local video track on/off
    const toggleCamera = () => {
        const videoTrack = localStream.getVideoTracks()[0]; // Get first video track
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled; // Toggle enabled state
            setIsCameraActive(videoTrack.enabled); // Update UI state for video
            sendWebSocketMessage(
                'call:toggleVideo',
                'callData',
                {
                    // ...currentCallData,
                    videoStatus: videoTrack.enabled, // Boolean video status
                    remotePeer: currentUserID == currentCallData?.caller ?
                        currentCallData?.callee : currentCallData?.caller
                }
            ); // Notify remote peer of video toggle
        };
    };

    // Call control functions - start

    // Close all media tracks and clean up streams
    const closeCall = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop()); // Stop local tracks
        };
        if (remoteStream) {
            remoteStream.getTracks().forEach(track => track.stop()); // Stop remote tracks
        };
        // peer.peer.close(); // Close peer connection (commented out)
        // peer.peer = peer.createPeer(); // Reinitialize peer connection for next call (commented out)
    };

    // Calculate difference between two timestamps and format as HH:MM:SS or MM:SS
    function getTimeDifference(timestamp1, timestamp2) {
        const date1 = new Date(timestamp1);
        const date2 = new Date(timestamp2);

        let diffInSeconds = Math.abs(Math.floor((date1 - date2) / 1000));

        const hours = Math.floor(diffInSeconds / 3600);
        const minutes = Math.floor((diffInSeconds % 3600) / 60);
        const seconds = diffInSeconds % 60;

        const pad = num => String(num).padStart(2, '0');

        if (hours > 0) {
            return `${hours}:${pad(minutes)}:${pad(seconds)}`;
        } else {
            return `${pad(minutes)}:${pad(seconds)}`;
        }
    };

    // Reject an incoming call during 'calling' or 'ringing' phase from callee side
    function rejectTheCall() {
        if (currentCallData?.status == 'calling' || currentCallData?.status == 'ringing' && currentCallData?.callee == currentUserID) {
            closeCall(); // Stop streams and clean up
            let updatedCallData = {
                ...currentCallData,
                status: 'missed_call', // Mark call as missed
                ringDuration: getTimeDifference(currentCallData?.callingTime, new Date().toISOString()) // Calculate ringing duration
            };
            sendWebSocketMessage(
                'call:rejected',
                'callData',
                updatedCallData
            ); // Notify remote peer call was rejected
            setAllCallsData((prevCalls) => {
                return prevCalls?.map((callInfo) => {
                    return callInfo?.customID == updatedCallData?.customID ?
                        {
                            ...callInfo,
                            ...updatedCallData
                        }
                        :
                        callInfo;
                })
            }); // Update all calls data state with rejected call info
            setCurrentCallData(null); // Reset current call data and unmount call UI
        };
    };

    // End the call after it is accepted (from either side)
    function endTheCall() {
        if (currentCallData?.status == 'accepted') {
            let updatedCallData = {
                ...currentCallData,
                status: 'accepted',
                callDuration: getTimeDifference(currentCallData?.ansTime, new Date().toISOString()), // Calculate call duration
                ringDuration: getTimeDifference(currentCallData?.callingTime, currentCallData?.ansTime), // Calculate ring duration
                remotePeer: currentUserID == currentCallData?.caller ?
                    currentCallData?.callee : currentCallData?.caller
            };
            sendWebSocketMessage(
                'call:ended',
                'callData',
                updatedCallData
            ); // Notify remote peer that call ended
            setAllCallsData((prevCalls) => {
                return prevCalls?.map((callInfo) => {
                    return callInfo?.customID == updatedCallData?.customID ?
                        {
                            ...callInfo,
                            ...updatedCallData
                        }
                        :
                        callInfo;
                });
            }); // Update all calls data state
            setCurrentCallData(null); // Reset current call data and close UI
            closeCall(); // Stop local and remote streams
            resetTimer(); // Reset call duration timer
        };
    };
    // sendMissedCall to send the missed call to the callee if the call is not accepted or caller ended the call
    function sendMissedCall() {
        closeCall();
        let updatedCallData = {
            ...currentCallData,
            status: 'missed_call',
            ringDuration: getTimeDifference(currentCallData?.callingTime, new Date().toISOString())
        };
        sendWebSocketMessage(
            'call:missed',
            'callData',
            updatedCallData
        );
        setAllCallsData((prevCalls) => {
            return prevCalls?.map((callInfo) => {
                return callInfo?.customID == updatedCallData?.customID ?
                    {
                        ...callInfo,
                        ...updatedCallData
                    }
                    :
                    callInfo;
            })
        });
        setCurrentCallData(null); // Reset the call data, it will unmount the call component
    };
    // send missed call after 30 seconds
    useEffect(() => {
        if (
            ["calling", "ringing"].includes(currentCallData?.status) &&
            currentCallData?.caller === currentUserID
        ) {
            const timeout = setTimeout(() => {
                sendMissedCall();
            }, 29000); // 29 seconds

            return () => clearTimeout(timeout); // Cleanup if component unmounts or dependencies change
        }
    }, [currentCallData, currentUserID]);
    // reject call after 30 seconds if the call is not ended from caller due to network problem
    useEffect(() => {
        if (
            ["calling", "ringing"].includes(currentCallData?.status) &&
            currentCallData?.callee === currentUserID
        ) {
            const timeout = setTimeout(() => {
                rejectTheCall();
            }, 31000); // 31 seconds , wait one second more than the caller's missed call time

            return () => clearTimeout(timeout); // Cleanup if component unmounts or dependencies change
        }
    }, [currentCallData, currentUserID]);
    // Call control functions - end
    function handleCommingWebSocketMessage(event) {
        // Parse the incoming WebSocket message data
        const webSocketMessageData = JSON.parse(event.data);

        // Handle when the call is accepted by the callee
        async function handleCallAccepted(callData) {
            // Update current call data state with the accepted call info
            setCurrentCallData((currentCallData) => {
                return {
                    ...currentCallData,
                    ...callData
                };
            });
            // Set the local SDP description with the answer from remote peer
            await peer.setLocalDescription(callData?.ans);
            // After a delay, send local media streams and start the call timer
            setTimeout(() => {
                sendStreams();
                startTimer();
            }, 1000);
            // await sendStreams(); // This ensures that tracks are sent after the call is accepted
        };

        // Handle toggling of remote audio stream (mute/unmute)
        const handleTogglingAuio = async (callData) => {
            const audioTracks = remoteStream.getAudioTracks()[0];
            if (audioTracks) {
                // Toggle the enabled state of the first audio track
                audioTracks.enabled = callData?.audioStatus;
            };
        };

        // Handle toggling of remote video stream (on/off)
        function handleTogglingVideo(callData) {
            const videoTrack = remoteStream.getVideoTracks()[0];
            if (videoTrack) {
                // Toggle the enabled state of the first video track
                videoTrack.enabled = callData?.videoStatus;
            };
        };

        // Handle rejected call from callee to caller during ringing/calling phase
        function handleCallRejected(callData) {
            closeCall(); // Close the current call streams and reset UI
            setAllCallsData((prevCalls) => {
                // Update call list with rejected call data
                return prevCalls?.map((callInfo) => {
                    return callInfo?.customID == callData?.customID ?
                        {
                            ...callInfo,
                            ...callData
                        }
                        :
                        callInfo;
                })
            });
            setCurrentCallData(null); // Reset call data to unmount call component
        };

        // Handle call ended event after call was accepted
        function handleCallEnded(callData) {
            setAllCallsData((prevCalls) => {
                // Update call list with ended call data
                return prevCalls?.map((callInfo) => {
                    return callInfo?.customID == callData?.customID ?
                        {
                            ...callInfo,
                            ...callData
                        }
                        :
                        callInfo;
                })
            });
            closeCall(); // Close call streams and reset UI
            setCurrentCallData(null); // Reset call data to unmount call component
        };

        // Handle missed call event from caller to callee when call was not accepted or ended
        function handleCallMissed(callData) {
            setAllCallsData((prevCalls) => {
                // Update call list with missed call data
                return prevCalls?.map((callInfo) => {
                    return callInfo?.customID == callData?.customID ?
                        {
                            ...callInfo,
                            ...callData
                        }
                        :
                        callInfo;
                })
            });
            // If the missed call is the current active call, close it and reset call data
            if (callData?.customID == currentCallData?.customID) {
                closeCall();
                setCurrentCallData(null); // Reset call data to unmount call component
            };
        };

        // Switch case to handle different types of WebSocket signaling messages
        switch (webSocketMessageData.type) {
            case "callee:active":
                // When callee becomes active, set status to ringing
                setCurrentCallData((currentCallData) => {
                    return {
                        ...currentCallData,
                        status: "ringing",
                    };
                });
                break;
            case "call:accepted":
                // Handle call accepted message
                handleCallAccepted(webSocketMessageData?.callData);
                break;
            case "call:renegotiation":
                // Handle renegotiation needed message
                handleNegoNeedIncomming(webSocketMessageData?.callData);
                break;
            case "call:renegotiation:done":
                // Handle renegotiation done message
                handleNegoDone(webSocketMessageData?.callData);
                break;
            case "call:toggleAudio":
                // Handle toggling audio status
                handleTogglingAuio(webSocketMessageData?.callData);
                break;
            case "call:toggleVideo":
                // Handle toggling video status
                handleTogglingVideo(webSocketMessageData?.callData);
                break;
            case "call:rejected":
                // Handle call rejected message
                handleCallRejected(webSocketMessageData?.callData);
                break;
            case "call:ended":
                // Handle call ended message
                handleCallEnded(webSocketMessageData?.callData);
                break;
            case "call:missed":
                // Handle missed call message
                handleCallMissed(webSocketMessageData?.callData);
                break;
            default:
                // No action for unknown message types
                // console.log('not found');
                break;
        }
    };

    useEffect(() => {
        // Select the floating video element for side view
        const viewOnSideElements = document.querySelectorAll(".callingComponent .viewOnSide, .callingComponent  .smallScreen");
        const viewOnSideElement = document.querySelector(".callingComponent .viewOnSide");
        if (viewOnSideElement) {
            let isTouch = false;
            let offsetX = 0;
            let offsetY = 0;

            // Start dragging the floating video element
            function startMove(e) {
                const elementRect = viewOnSideElement.getBoundingClientRect();
                // Get starting coordinates from mouse or touch event
                const startX = isTouch ? e.touches[0].clientX : e.clientX;
                const startY = isTouch ? e.touches[0].clientY : e.clientY;

                // Calculate offset from the element top-left corner
                offsetX = startX - elementRect.left;
                offsetY = startY - elementRect.top;

                // Move handler during dragging
                function doMove(evt) {
                    // Current cursor position (touch or mouse)
                    const moveX = isTouch ? evt.touches[0].clientX : evt.clientX;
                    const moveY = isTouch ? evt.touches[0].clientY : evt.clientY;

                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;

                    // Calculate new element position with boundary clamping
                    let newLeft = moveX - offsetX;
                    let newTop = moveY - offsetY;

                    // Prevent element from moving outside viewport boundaries
                    newLeft = Math.max(0, Math.min(newLeft, viewportWidth - elementRect.width));
                    newTop = Math.max(0, Math.min(newTop, viewportHeight - elementRect.height));

                    // Update element style to new position
                    viewOnSideElement.style.position = "absolute";
                    viewOnSideElement.style.left = `${newLeft}px`;
                    viewOnSideElement.style.top = `${newTop}px`;

                    evt.preventDefault();
                }

                // Stop handler when drag ends
                function stopMove(evt) {
                    // Get release position on X axis (touch or mouse)
                    const endX = isTouch
                        ? evt.changedTouches?.[0]?.clientX
                        : evt.clientX;

                    const viewportWidth = window.innerWidth;
                    const elementWidth = viewOnSideElement.offsetWidth;

                    // Decide whether to snap to left or right side of viewport based on release position
                    const shouldSnapRight = endX > viewportWidth / 2;

                    if (shouldSnapRight) {
                        // Snap to right side
                        viewOnSideElement.style.left = `${viewportWidth - elementWidth}px`;
                    } else {
                        // Snap to left side
                        viewOnSideElement.style.left = `0px`;
                    }

                    // Remove event listeners after drag ends
                    document.removeEventListener(isTouch ? "touchmove" : "mousemove", doMove);
                    document.removeEventListener(isTouch ? "touchend" : "mouseup", stopMove);
                }

                // Add event listeners for dragging move and stop
                document.addEventListener(isTouch ? "touchmove" : "mousemove", doMove, { passive: false });
                document.addEventListener(isTouch ? "touchend" : "mouseup", stopMove);
            }

            // Mouse down handler to start drag with mouse
            const mouseDownHandler = (e) => {
                isTouch = false;
                startMove(e);
            };
            // Touch start handler to start drag with touch
            const touchStartHandler = (e) => {
                isTouch = true;
                startMove(e);
            };

            // Attach event listeners for mouse and touch drag start
            viewOnSideElement.addEventListener("mousedown", mouseDownHandler);
            viewOnSideElement.addEventListener("touchstart", touchStartHandler);

            // Cleanup event listeners on unmount or dependency change
            return () => {
                viewOnSideElement.removeEventListener("mousedown", mouseDownHandler);
                viewOnSideElement.removeEventListener("touchstart", touchStartHandler);
            };
        };
    }, [viewOnSide]);

    // Setup WebSocket message listener on component mount and cleanup on unmount
    useEffect(() => {
        wbServer.addEventListener("message", handleCommingWebSocketMessage);
        return () => {
            wbServer.removeEventListener("message", handleCommingWebSocketMessage);
        };
    }, [wbServer, handleCommingWebSocketMessage]);

    return (
        <div className={`callingComponent`}>
            {
                (currentCallData?.caller == currentUserID && currentCallData?.status != "accepted") &&
                <audio
                    autoPlay
                    src={"/tone/dial_tone.mp3"} // commented out
                    className='hidden'
                />
            }
            {
                // Show short view of incoming call by default when current user is the callee
                localStream && callIncommngSmallView && currentCallData?.callee == currentUserID &&
                <div className='callIncommngSmallView'>
                    <div className="w-full text-center mt-3">
                        <p className="text-lg flex items-center justify-center text-center">
                            <TextWithEmojis
                                hide={true}
                                textWidth={`auto`}
                                areaName={'topBarInfo'}
                                // Display the name of the other party (callee or caller depending on current user)
                                textData={(currentCallData?.caller == currentUserID ? calleeData : callerData)?.profileInfo?.name}
                            />
                        </p>
                        <p className="text-md">
                            {currentCallData?.callType} <span> calling</span>
                        </p>
                    </div>
                    <div className="controller">
                        <div className="btnWrapper">
                            {/* Accept call button */}
                            <button onClick={() => {
                                makeAnswerToCaller(currentCallData);
                                setCallIncommngSmallView(false);
                                setShowFullView(true);
                            }} style={{ transform: 'rotate(135deg)', color: 'white', backgroundColor: '#04aa6d' }}>
                                <BiSolidPhone className="w-6 h-6" />
                            </button>
                            {/* Chat button (no handler attached) */}
                            <button onClick={() => {
                                let tabInfo = currentUserData?.recentChatsTabs?.find(
                                    (recentChatTabInfo) => recentChatTabInfo?.tabID == currentCallData?.caller
                                );
                                setOpenedTabInfo(
                                    tabInfo ||
                                    {
                                        tabType: "user",
                                        tabID: currentCallData?.caller,
                                        recentTime: "",
                                        clearingTime: "",
                                        isArchived: false,
                                        isPinned: false,
                                        disappearingTime: "Off",
                                    }
                                );
                                setShowChatBox(true);
                                handleShowingSections(setShowRecentChatsSection);
                            }}><BiSolidChat className="w-8 h-8" /></button>
                            {/* Reject call button */}
                            <button onClick={rejectTheCall} style={{ transform: 'rotate(135deg)', color: 'white', backgroundColor: '#e90039' }}>
                                <BiSolidPhone className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                    <div className="w-full flex items-center justify-center">
                        {/* Button to minimize the call view to side */}
                        <HiMiniChevronDown className="rotate-180 w-7 h-7 cursor-pointer"
                            onClick={() => {
                                setCallIncommngSmallView(false);
                                setViewOnSide(true);
                            }}
                        />
                    </div>
                </div>
            }
            {/* Show full screen call view only when showFullView is true and viewOnSide is false */}
            <div style={{ display: (!viewOnSide && showFullView && localStream) ? "block" : "none" }} className={`callingScreen text-gray-500 ${activeDarkMode ? "darkModeBg2" : ''}`}>
                <div className="closeBtn">
                    {/* Button to minimize the call view to side */}
                    <BsArrowLeft onClick={() => {
                        setViewOnSide(true);
                    }} className="w-8 h-8" />
                </div>
                {/* Show second small screen video when call is accepted and type is video */}
                <div id="smallScreen" className="smallScreen" style={{ display: (currentCallData?.status == 'accepted' && currentCallData?.callType == "video") ? "block" : "none" }} onClick={() => {
                    toggleVideoScreem();
                }}>
                    {/* Remote video stream (side view) */}
                    <video
                        id="remoteStreamer"
                        autoPlay
                        ref={remoteVideoRef}
                        className='remoteStreamer w-full videoScreen'
                    />
                </div>
                <div className="callInfo">
                    <div style={{
                        backgroundColor: (currentCallData?.caller == currentUserID ? calleeData : callerData)?.profileInfo?.bgColor,
                    }}
                        className="userAvatar flex items-center justify-center text-2xl rounded-full relative"
                    >
                        {
                            // Display profile picture or first letter of name as avatar
                            (currentCallData?.caller == currentUserID ? calleeData : callerData)?.profileInfo?.profilePic ? (
                                <img
                                    className="w-full h-full rounded-full"
                                    src={`${(currentCallData?.caller == currentUserID ? calleeData : callerData)?.profileInfo?.profilePic}`}
                                    alt="Profile"
                                />
                            ) : safeParseJSON((currentCallData?.caller == currentUserID ? calleeData : callerData)?.profileInfo?.name)?.find(item => item.type === 'text')?.value?.charAt(0)?.toUpperCase()
                        }
                    </div>
                    <p className="text-3xl flex items-center justify-center text-center">
                        <TextWithEmojis
                            hide={true}
                            textWidth={`auto`}
                            areaName={'topBarInfo'}
                            // Display name with emojis support
                            textData={(currentCallData?.caller == currentUserID ? calleeData : callerData)?.profileInfo?.name}
                        />
                    </p>
                    {
                        // Show call timer if accepted, otherwise show call status or "incoming call"
                        currentCallData?.status == 'accepted' ?
                            <p className="text-xl text-center callingDuration">{formatTime(seconds)}</p>
                            :
                            <p p className="text-xl text-center">{currentCallData?.callee == currentUserID ? "incomming call" : currentCallData?.status}</p>
                    }
                    {
                        // Show busy text if callee is busy on another call
                        currentCallData?.isCalleeBusy &&
                        <p className="text-xl text-center">
                            <TextWithEmojis
                                hide={true}
                                textWidth={`auto`}
                                areaName={'topBarInfo'}
                                textData={calleeData?.profileInfo?.name}
                            />
                            <span> Busy on another call</span>
                        </p>
                    }
                </div>
                <div id="fullScreen" className={`fullScreen ${activeDarkMode ? "darkModeBg2" : ''}`} onClick={() => {
                    toggleVideoScreem();
                }}>
                    {/* Local video stream, visible only when call type is video */}
                    <video
                        id="localVideoStream"
                        autoPlay
                        muted
                        ref={localVideoRef}
                        // src={localStream} // commented out
                        className='w-full videoScreen'
                        style={{ display: currentCallData?.callType == 'video' ? "block" : "none" }}
                    />
                </div>
                <div className="controller">
                    <div className="btnWrapper">
                        {
                            // Show the answering button for the callee until the call is accepted
                            (
                                currentCallData?.callee == currentUserID &&
                                (currentCallData?.status == 'ringing' || currentCallData?.status == 'calling')) &&
                            <button style={{ transform: 'rotate(135deg)', color: 'white', backgroundColor: '#04aa6d' }}>
                                <BiSolidPhone onClick={() => {
                                    makeAnswerToCaller(currentCallData);
                                }} className="w-7 h-7" />
                            </button>
                        }
                        {
                            // Show video toggle button when caller is current user or call accepted, and call type is video
                            (currentCallData?.caller == currentUserID || currentCallData?.status == "accepted")
                            && currentCallData?.callType == "video" &&
                            <button onClick={toggleCamera}>
                                {isCameraActive ? (
                                    <HiOutlineVideoCamera className="w-6 h-6" />
                                ) : (
                                    <HiMiniVideoCameraSlash className="w-6 h-6" />
                                )}
                            </button>
                        }
                        {
                            // Show audio toggle button when caller is current user or call accepted
                            (currentCallData?.caller == currentUserID || currentCallData?.status == "accepted") &&
                            <button onClick={toggleAudio}>
                                {isAudioActive ? (
                                    <BiSolidMicrophone className="w-8 h-8" />
                                ) : (
                                    <BiSolidMicrophoneOff className="w-8 h-8" />
                                )}
                            </button>
                        }
                        {/* Hang up / reject call button */}
                        <button style={{ transform: 'rotate(135deg)', color: 'white', backgroundColor: '#e90039' }}>
                            <BiSolidPhone onClick={() => {
                                // If call not accepted yet and current user is callee, reject the call
                                if (
                                    currentCallData?.status == "calling" ||
                                    currentCallData?.status == "ringing" &&
                                    currentCallData?.callee == currentUserID
                                ) {
                                    rejectTheCall();
                                };
                                // If call is accepted, hang up the call
                                if (currentCallData?.status == "accepted") {
                                    endTheCall();
                                };
                                // If call not accepted yet and current user is caller, send missed call
                                if (
                                    currentCallData?.status == "calling" ||
                                    currentCallData?.status == "ringing" &&
                                    currentCallData?.caller == currentUserID
                                ) {
                                    sendMissedCall();
                                };
                            }} className="w-7 h-7" />
                        </button>
                    </div>
                </div>
            </div>
            {
                // Show side minimized view when viewOnSide is true
                viewOnSide &&
                <div className='viewOnSide' onClick={() => {
                    setViewOnSide(false);
                    setShowFullView(true);
                }}>
                    <div
                        style={{
                            backgroundColor: (currentCallData?.caller == currentUserID ? calleeData : callerData)?.profileInfo?.bgColor
                        }}
                        className="user_avatar_box w-18 h-18 text-xl flex items-center justify-center"
                    >
                        {
                            // Display profile picture, group icon, or first letter initial based on available data
                            (currentCallData?.caller == currentUserID ? calleeData : callerData)?.profileInfo?.profilePic ? (
                                <div className='imgContainer flex items-center justify-center text-2xl rounded-full relative'>
                                    <img
                                        className="w-full h-full rounded-full"
                                        src={`${(currentCallData?.caller == currentUserID ? calleeData : callerData)?.profileInfo?.profilePic}`}
                                        alt="Profile"
                                    />
                                </div>
                            )
                                :
                                safeParseJSON((currentCallData?.caller == currentUserID ? calleeData : callerData)?.profileInfo?.name)?.find(item => item.type === 'text')?.value?.charAt(0)?.toUpperCase()
                        }
                    </div>
                    {
                        // Show call timer if accepted, otherwise show call status or "incoming call"
                        currentCallData?.status == 'accepted' ?
                            <p className="text-sm text-center callingDuration">{formatTime(seconds)}</p>
                            :
                            <p className="text-sm text-center">{currentCallData?.callee == currentUserID ? "incomming call" : currentCallData?.status}</p>
                    }
                </div>
            }
        </div>
    )
}

export default VideoAndVoiceCalling;
