import React, { useState, useContext, useRef  } from 'react';
import { HiPlay, HiPause } from 'react-icons/hi2';
import { ProgressBar } from "./index.js";
import { UserContext } from '@context/UserContext';
const AudioPlayer = ({ fileInfo, showIcon })=>{
    // Reference to the video element
    const audioRef = useRef(null);
    // Reference to the progress bar input element
    const progressBarRef = useRef(null);
    const { activeDarkMode } = useContext(UserContext);
    // State to track if audio is currently playing
    const [isPlaying, setIsPlaying] = useState(false);
    // State to store the total duration of the audio
    const [duration, setDuration] = useState('0:00');
    // State to track current playback time
    const [currentTime, setCurrentTime] = useState('0:00');
    // State to manage loading status (optional, currently not fully used)
    const [audioLoaded, setAudioLoaded] = useState(false);
    // Helper function: Convert time in seconds to formatted string
    function formatTime(seconds) {
        if (isNaN(seconds)) return "00:00";
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const sec = Math.floor(seconds % 60);
        if (hours == 0) {
            // Format as MM:SS
            return `${mins.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        } else {
            // Format as HH:MM:SS
            return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        }
    };
    // Once metadata is loaded, set duration and max value for progress bar
    function handleLoadedMetadata() {
        // Shortcut to the audio DOM element
        const audio = audioRef.current;
        if (audio) {
            // If duration is Infinity, fall back to provided file duration
            let duration = audio.duration == Infinity ? fileInfo?.fileDuration : audio?.duration;
            progressBarRef.current.max = duration; // Set maximum value for progress bar

            // Format duration differently for local uploaded files
            let formattedDuration = fileInfo?.fileDuration || formatTime(duration);

            setDuration(formattedDuration); // Set duration state
            setAudioLoaded(true); // Mark audio as loaded
        };
    };
    // Update the progress bar and current time display as audio plays
    function handleTimeUpdate() {
        // Shortcut to the audio DOM element
        const audio = audioRef.current;
        if (audio) {
            progressBarRef.current.value = audio.currentTime; // Update slider value
            setCurrentTime(formatTime(audio.currentTime)); // Update displayed time
        };
    };
    // Play or pause the audio when the button is clicked
    function handlePlayPause() {
        // Shortcut to the audio DOM element
        const audio = audioRef.current;
        if (audio) {
            if (audio.paused) {
                audio.play(); // Play audio
                setIsPlaying(true); // Update state
            } else {
                audio.pause(); // Pause audio
                setIsPlaying(false); // Update state
            }
        };
    };
    return (
        <React.Fragment>
            <div className={`audio-player ${activeDarkMode && "darkModeBg3"} relative ${!showIcon && "w-full"} relative`}>
                {
                    // Show loading animation until audio is loaded
                    (!audioLoaded && showIcon) &&
                    <ProgressBar
                        position={'absolute'}
                    />
                }
                <div className={`flex flex-col justify-end w-full h-full p-2 rounded-lg`}
                    style={{
                        ...(showIcon && { background: `url('/BG/Audio_bg.jpg') no-repeat center center/cover` })
                    }}
                >
                    {/* <img src="../../../public/BG/Audio_bg.jpg" className='w-full' alt="" /> */}
                    <div className='flex items-center justify-center w-full'>
                        {/* HTML5 audio element with dynamic source */}
                        <audio
                            ref={audioRef}
                            src={fileInfo?.fileURL}
                            className="w-full"
                            onLoadedMetadata={handleLoadedMetadata}
                            onTimeUpdate={handleTimeUpdate}
                        ></audio>

                        {/* Button to toggle between play and pause */}
                        <button onClick={handlePlayPause} id="play-pause" className="play-pause-btn">
                            {isPlaying ? <HiPause /> : <HiPlay />}
                        </button>

                        {/* Progress bar (slider) for tracking and seeking playback */}
                        <input
                            ref={progressBarRef}
                            id="progress-bar"
                            type="range"
                            min="0"
                            step="0.1"
                            defaultValue="0"
                            className="w-full progress-bar"
                            onChange={(e) => {
                                const audio = audioRef.current;
                                if (audio) {
                                    audio.currentTime = e.target.value; // Update current time based on slider value
                                    setCurrentTime(formatTime(e.target.value)); // Update displayed time
                                }
                            }}
                        />
                    </div>

                    {/* Display file size and current time or duration */}
                    <div className='flex items-center justify-between w-full gap-x-0.5'>
                        <div>
                            {
                                fileInfo?.fileSize &&
                                <span className="time text">{fileInfo?.fileSize}</span>
                            }
                        </div>
                        <div>
                            {/* Hidden duration span and current playback time */}
                            <span className='duration hidden'>{duration}</span>
                            <span id="current-time" className="time text">
                                {
                                    isPlaying ? currentTime : duration
                                }
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
};

export default AudioPlayer;