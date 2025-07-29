import { useContext, useEffect, useRef, useState } from 'react'
import { BiXCircle, BiPauseCircle, BiStopCircle, BiPlayCircle } from "react-icons/bi";
import { UserContext } from '@context/UserContext';
import { HiClipboardDocumentList } from "react-icons/hi2";
function VoiceRecorder() {
    const {
        generateUniqueID,
        setShowEditingPanel,
        setUploadedFiles,
        setIsFileUploading,
        setFileEditingFor,
        showEditingPanel,
        showFileChatsInCarousel,
        showProfileInfo,
        currentCallData,
        openedTabInfo,
        addOrUpdateRecentTab,
        activeDarkMode,
        isVoiceRecordingCancelledRef,
        isVoiceRecording,
        setIsVoiceRecording,
        handleShowingSections,
        setShowRecentChatsSection
    } = useContext(UserContext);

    // Ref to store MediaRecorder instance
    const mediaRecorderRef = useRef(null);
    // State for MediaRecorder to control pause/resume
    const [voiceMediaRecorder, setVoiceMediaRecorder] = useState(null);
    // State to track if recording is paused
    const [isVoiceRecordingPaused, setIsVoiceRecordingPaused] = useState(false);
    // State to store interval ID for timer
    const [voiceTimerInterval, setVoiceTimerInterval] = useState(null);
    // State to store elapsed recording time in milliseconds
    const [voiceElapsedTime, setVoiceElapsedTime] = useState(0);
    // Ref to check if recorded audio should be sent and saved as draft (default send)
    const isFileToSent = useRef(true);
    // Ref to store previous tab info to detect tab changes
    const previousTabRef = useRef();
    // Maximum recording duration of 10 minutes in milliseconds
    const MAX_DURATION_MS = 10 * 60 * 1000;

    // Function to asynchronously get audio duration from Blob
    async function getAudioDuration(blob) {
        return new Promise((resolve, reject) => {
            const audio = document.createElement('audio');
            audio.src = URL.createObjectURL(blob);
            audio.preload = 'metadata';
            audio.onloadedmetadata = () => {
                // Handle infinite duration bug
                if (audio.duration === Infinity) {
                    audio.currentTime = 1e101;
                    audio.ontimeupdate = () => {
                        audio.ontimeupdate = null;
                        resolve(audio.duration);
                        audio.currentTime = 0;
                        audio.remove();
                    };
                } else {
                    resolve(audio.duration);
                    audio.remove();
                }
            };
            audio.onerror = (e) => {
                reject(new Error('Failed to load audio metadata'));
            };
        });
    };

    // Function to start voice recording
    async function startVoiceRecording() {
        resetVoiceRecTimer() // Reset timer before starting
        try {
            // Request audio stream from user microphone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Create MediaRecorder with webm audio format
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            setVoiceMediaRecorder(mediaRecorder);

            // On recording start event
            mediaRecorder.onstart = () => {
                setIsVoiceRecording(true); // Set recording state to true
                startVoiceRecTimer(); // Start the timer
            };

            // Array to hold audio data chunks
            const chunks = [];
            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunks.push(event.data); // Collect audio data chunks
                }
            };

            // On recording stop event
            mediaRecorder.onstop = async () => {
                // Create Blob from recorded chunks
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                // Generate playback URL from Blob
                const audioURL = URL.createObjectURL(audioBlob);

                // If recording was cancelled by user, reset flag and do nothing
                if (isVoiceRecordingCancelledRef.current) {
                    isVoiceRecordingCancelledRef.current = false; // reset cancellation flag
                    return;
                }

                if (audioBlob.size > 0) {
                    try {
                        // Get actual duration of recorded audio
                        const duration = await getAudioDuration(audioBlob);

                        // Prepare file metadata object for upload or draft
                        let prepareFileData = {
                            fileID: generateUniqueID("FILE"),
                            fileType: audioBlob.type,
                            fileName: `${Date.now()}-voice.webm`,
                            fileData: audioBlob,
                            fileSize: audioBlob.size,
                            fileDuration: duration,
                            fileURL: audioURL,
                            editedFile: null,
                            coloursDataOnImage: [],
                            emoji: [],
                            rejection: null,
                        };

                        // If file is to be saved as draft (e.g. during call), update recent tab draft
                        if (!isFileToSent.current) {
                            await addOrUpdateRecentTab(
                                openedTabInfo,
                                {
                                    draft: {
                                        ...(openedTabInfo?.draft || {}),
                                        fileData: [prepareFileData]
                                    }
                                }
                            );
                        } else {
                            // Otherwise, set file to be uploaded and show editing panel
                            setUploadedFiles([prepareFileData]);
                            setShowEditingPanel(true);
                            setIsFileUploading(true);
                            setFileEditingFor("chat");
                            handleShowingSections(setShowRecentChatsSection);
                        };

                        // Stop and reset recording timer
                        resetVoiceRecTimer();
                        setIsVoiceRecording(false);
                    } catch (err) {
                        console.error("Error detecting audio duration:", err);
                    }
                } else {
                    console.error('Recorded Blob is empty or corrupted');
                };

                // Stop all tracks of the media stream to release microphone
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
            };

            // Start recording
            mediaRecorder.start();
        } catch (error) {
            console.error('Error accessing microphone:', error);
        }
    };

    // Automatically start recording on component mount
    useEffect(() => {
        startVoiceRecording()
    }, []);

    // Function to handle stopping and cleanup when closing recorder
    function handleClose() {
        // Stop recording if currently recording or paused
        if (mediaRecorderRef.current?.state === "recording" || mediaRecorderRef.current?.state === "paused") {
            mediaRecorderRef.current.stop();
        }

        // Stop all microphone tracks
        if (mediaRecorderRef.current?.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }

        // Stop and reset timer and states
        stopVoiceRecTimer();
        resetVoiceRecTimer();
        setIsVoiceRecording(false);
        setIsVoiceRecordingPaused(false);
        setVoiceMediaRecorder(null);
        setVoiceTimerInterval(null);
        // setVoiceElapsedTime(0); // commented out reset elapsed time
    };

    // Function to stop voice recording manually
    function stopVoiceRecording() {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            // setIsVoiceRecording(false); // left commented for handling in onstop event
        }
        // Stop timer interval
        stopVoiceRecTimer();
    };

    // Function to toggle pause and resume of recording
    function togglePauseResumeVoiceRecording() {
        if (voiceMediaRecorder) {
            if (isVoiceRecordingPaused) {
                voiceMediaRecorder.resume();
                startVoiceRecTimer(); // Resume timer when recording resumes
            } else {
                voiceMediaRecorder.pause();
                stopVoiceRecTimer(); // Pause timer when recording pauses
            }
            setIsVoiceRecordingPaused(!isVoiceRecordingPaused);
        }
    };

    // Function to stop the recording timer interval
    function stopVoiceRecTimer() {
        if (voiceTimerInterval) {
            clearInterval(voiceTimerInterval); // Clear the interval timer
            setVoiceTimerInterval(null);
        }
    };

    // Function to reset the timer (currently commented out)
    function resetVoiceRecTimer() {
        // setVoiceElapsedTime(0);
        // document.getElementById('voice_rec_timer_display').textContent = "00:00";
    };

    // Function to start the timer and update elapsed time every second
    function startVoiceRecTimer() {
        const startTime = Date.now() - voiceElapsedTime;

        const interval = setInterval(() => {
            const currentTime = Date.now() - startTime;
            setVoiceElapsedTime(currentTime);

            // Auto-stop recording after max duration (10 minutes)
            if (currentTime >= MAX_DURATION_MS) {
                stopVoiceRecording();
                clearInterval(interval);
                return;
            }

            // Update timer display element with minutes and seconds
            const minutes = String(Math.floor(currentTime / 60000)).padStart(2, '0');
            const seconds = String(Math.floor((currentTime % 60000) / 1000)).padStart(2, '0');
            document.getElementById('voice_rec_timer_display').textContent = `${minutes}:${seconds}`;
        }, 1000);

        setVoiceTimerInterval(interval);
    };

    // Effect to stop recording automatically when a call is active
    useEffect(() => {
        if (currentCallData != null) {
            stopVoiceRecording();
            isFileToSent.current = false; // Set flag to save recording as draft
        };
    }, [currentCallData]);

    // Effect to pause recording automatically when media carousel r profile info is opened
    useEffect(() => {
        if (showEditingPanel || showFileChatsInCarousel || showProfileInfo) {
            if (voiceMediaRecorder) {
                if (!isVoiceRecordingPaused) {
                    voiceMediaRecorder.pause();
                    stopVoiceRecTimer(); // Pause timer when recording pauses
                    setIsVoiceRecordingPaused(true);
                }
            }
        };
    }, [showEditingPanel,showFileChatsInCarousel,showProfileInfo]);
    // Effect to save draft and stop recording on tab switch
    useEffect(() => {
        // If previous tab exists and is different from current tab, stop recording and save draft
        if (previousTabRef.current && previousTabRef.current.tabID !== openedTabInfo?.tabID) {
            stopVoiceRecording();
            isFileToSent.current = false; // Save draft instead of sending
        };
        // Update previousTabRef to current opened tab info
        previousTabRef.current = openedTabInfo;
    }, [openedTabInfo]);

    return (
        <div className={`${!isVoiceRecording ? 'hidden' : 'flex'} items-center justify-center voiceRecorder w-full p-4 ${activeDarkMode ? "darkModeBg1" : ""} text-gray-300`}>
            <p>
                <button className="px-1 flex items-center justify-center rounded-xl flex-shrink-0">
                    {/* Cancel recording button */}
                    <HiClipboardDocumentList className="w-8 h-8" onClick={() => {
                        stopVoiceRecording();
                        isFileToSent.current = false; // Save draft instead of sending
                    }} />
                </button>
            </p>
            <p>
                <button className="px-1 flex items-center justify-center rounded-xl flex-shrink-0">
                    {/* Cancel recording button */}
                    <BiXCircle className="w-9 h-9" onClick={() => {
                        // cancellation flag and close recorder if triggered
                        isVoiceRecordingCancelledRef.current = true; // Set cancellation flag
                        handleClose();
                    }} />
                </button>
            </p>
            <p style={{ display: isVoiceRecording ? 'flex' : 'none' }} className="rec_timer">
                {/* Recording indicator blinking dot */}
                <span style={{ visibility: isVoiceRecordingPaused ? 'hidden' : 'visible', top: '-2px' }} className="voice_rec_indicator rec_indicator"></span>
                {/* Timer display for recording duration */}
                <span style={{ position: 'relative', top: '-4px' }} id="voice_rec_timer_display">00:00</span>
            </p>
            <p>
                <button type="button" onClick={stopVoiceRecording} className="px-1 flex items-center justify-center rounded-xl flex-shrink-0">
                    {/* Stop recording button */}
                    <BiStopCircle className="text-red-500 w-9 h-9" />
                </button>
            </p>
            <p>
                <button onClick={togglePauseResumeVoiceRecording} type="button" className="flex items-center justify-center rounded-xl px-1 flex-shrink-0">
                    {/* Pause/Resume toggle button */}
                    {
                        !isVoiceRecordingPaused ?
                            <BiPauseCircle className="w-9 h-9" />
                            :
                            <BiPlayCircle className="w-9 h-9" />
                    }
                </button>
            </p>
        </div>
    )
}

export default VoiceRecorder;
