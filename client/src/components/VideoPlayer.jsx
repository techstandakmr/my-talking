import  { useRef, useState } from 'react';
import { BsFullscreen } from "react-icons/bs";
import { HiPlay, HiPause } from 'react-icons/hi2';
import { ProgressBar } from "./index.js";
const VideoPlayer = ({ src, size }) => {
    // Reference to the video element
    const videoRef = useRef(null);
    // Reference to the progress bar input element
    const progressBarRef = useRef(null);

    // State to track if video is playing or paused
    const [isPlaying, setIsPlaying] = useState(true);
    // State to track if video is muted
    const [isMuted, setIsMuted] = useState(false);
    // State to track the current playback time as a formatted string
    const [currentTime, setCurrentTime] = useState('0:00');
    // State to track the progress bar width in percentage
    const [width, setWidth] = useState(0);
    // State to track total duration of the video as a formatted string
    const [duration, setDuration] = useState('0:00');
    // State to track current volume level (0 to 1)
    const [volume, setVolume] = useState(1);
    // State to indicate if video metadata has loaded
    const [videoLoaded, setVideoLoaded] = useState(false);

    // Handler for when video metadata is loaded (duration available)
    const handleLoadedMetadata = () => {
        // Shortcut to the video DOM element
        const video = videoRef.current;
        if (video) {
            // Set duration state in formatted string
            setDuration(formatTime(video.duration));
            // Set max value of progress bar to video duration
            progressBarRef.current.max = video.duration;
            // Indicate video has loaded
            setVideoLoaded(true);
        }
    };

    // Handler to update current time and progress bar as video plays
    const handleTimeUpdate = () => {
        // Shortcut to the video DOM element
        const video = videoRef.current;
        setCurrentTime(formatTime(video.currentTime));
        // Calculate progress bar width as percentage of video played
        setWidth((video.currentTime / video.duration) * 100); // Corrected formula
        // Update progress bar input value to current time
        progressBarRef.current.value = video.currentTime;
    };

    // Handler when video is ready to play, ensure duration and progress max are set
    const handleCanPlay = () => {
        // Shortcut to the video DOM element
        const video = videoRef.current;
        if (!isNaN(video.duration)) {
            setDuration(formatTime(video.duration));
            progressBarRef.current.max = video.duration;
        }
    };

    // Function to format seconds into mm:ss or hh:mm:ss string
    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const sec = Math.floor(seconds % 60);
        // Format the duration string conditionally based on presence of hours
        if (hours == 0) {
            const formattedDuration = `${mins.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
            return formattedDuration;
        } else {
            const formattedDuration = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
            return formattedDuration;
        };
    };

    // Toggle play/pause state of the video
    const handlePlayPause = () => {
        // Shortcut to the video DOM element
        const video = videoRef.current;
        if (video.paused) {
            video.play();
            setIsPlaying(true);
        } else {
            video.pause();
            setIsPlaying(false);
        }
    };

    // Toggle mute/unmute state of the video
    const handleMute = () => {
        // Shortcut to the video DOM element
        const video = videoRef.current;
        video.muted = !video.muted;
        setIsMuted(video.muted);
    };

    // Change the video volume based on input slider change
    const handleVolumeChange = (event) => {
        // Shortcut to the video DOM element
        const video = videoRef.current;
        video.volume = event.target.value;
        setVolume(event.target.value);
    };

    // Change the video currentTime when user moves the progress bar slider
    const handleProgressChange = (event) => {
        // Shortcut to the video DOM element
        const video = videoRef.current;
        video.currentTime = event.target.value;
    };

    // Request fullscreen mode on the video element
    const handleFullscreen = () => {
        // Shortcut to the video DOM element
        const video = videoRef.current;
        if (video.requestFullscreen) {
            video.requestFullscreen();
        } else if (video.mozRequestFullScreen) {
            video.mozRequestFullScreen();
        } else if (video.webkitRequestFullscreen) {
            video.webkitRequestFullscreen();
        } else if (video.msRequestFullscreen) {
            video.msRequestFullscreen();
        }
    };

    return (
        <>
            <div className="video-container relative">
                {
                    // Show loading animation until audio is loaded
                    !videoLoaded &&
                    <ProgressBar
                        position={'absolute'}
                    />
                }
                {/* Video frame area clickable to toggle play/pause */}
                <div onClick={handlePlayPause} className="videoFrame w-full h-full relative">
                    {/* Video element with event handlers */}
                    <video
                        ref={videoRef}
                        className="video"
                        src={src}
                        onLoadedMetadata={handleLoadedMetadata}
                        onTimeUpdate={handleTimeUpdate}
                        onCanPlay={handleCanPlay}
                        autoPlay
                    ></video>
                    {/* Play/Pause button overlay shown when video is paused */}
                    <div style={{ display: !isPlaying && "flex" }} className="play-pause-btn">
                        <button className="control-btn">
                            {isPlaying ? <HiPause /> : <HiPlay />}
                        </button>
                    </div>
                </div>
                {/* Controls shown only when video is paused */}
                <div style={{ display: !isPlaying && "block" }} className="controls">
                    <div className='w-full flex items-center justify-between'>
                        <p>
                            {
                                // Show size if passed as prop
                                size &&
                                <span className="time text">{size}</span>
                            }
                        </p>
                        {/* Fullscreen toggle button */}
                        <button onClick={handleFullscreen} className="control-btn">
                            <BsFullscreen strokeWidth={2} />
                        </button>
                    </div>
                    <div className="w-full flex items-center justify-between">
                        {/* Progress bar input slider */}
                        <input
                            ref={progressBarRef}
                            type="range"
                            className="w-full mr-2"
                            min="0"
                            defaultValue="0"
                            step="0.1"
                            onChange={handleProgressChange}
                        />
                        {/* Current time or duration displayed */}
                        <span className="time">
                            {
                                isPlaying ? currentTime : duration
                            }
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default VideoPlayer;
