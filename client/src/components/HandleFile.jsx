import { useContext, useState, useEffect } from 'react';
import { FaCheck, FaClockRotateLeft } from "react-icons/fa6";
import { BsSend, BsX, BsPlus } from "react-icons/bs";
import { HiClipboardDocumentList } from "react-icons/hi2";
import EmojiPicker from 'emoji-picker-react';
import { UserContext } from '@context/UserContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ToastContainer, toast } from "react-toastify";
import _ from 'lodash';
import { AudioPlayer, VideoPlayer, ProgressBar, ConfirmationDialog } from "./index.js";
import {
    faFileImage,
    faFileAlt,
    faFileAudio,
    faFileVideo,
    faPen,
    faSmile,
    faTimes
} from '@fortawesome/free-solid-svg-icons';
function File() {
    // Import necessary dependencies from UserContext
    const {
        openedTabInfo,
        showChatBox,
        setOpenedTabInfo,
        generateUniqueID,
        handleFileUpload,
        isFileUploading,
        setIsFileUploading,
        uploadedFiles,
        setUploadedFiles,
        fileEditingFor,
        fileReEditing,
        areChatsFilesReadyToSend,
        setAreChatsFilesReadyToSend,
        setAreMediaStoriesReadyToSend,
        hideFileEditingPanel,
        setFilesForSend,
        activeDarkMode,
        addOrUpdateRecentTab
    } = useContext(UserContext);
    // State to track the current file being edited
    const [currentFile, setCurrentFile] = useState(null);

    // Format time in HH:MM:SS or MM:SS
    const formatTime = (seconds) => {
        if (isNaN(seconds)) return "00:00";
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const sec = Math.floor(seconds % 60);


        return hours > 0
            ? `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
            : `${mins.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    // Determine icon based on file type/extension
    function fileIcon(fileType) {
        switch (true) {
            case fileType?.startsWith('audio/'):
                return "faFileAudio";
            case fileType?.startsWith('video/'):
                return "faFileVideo";
            case fileType?.startsWith('image/'):
                return "faFileImage";
            default:
                return "faFileAlt"; // Default icon
        }
    };

    // Convert file size to readable string
    function formatFileSize(bytes) {
        const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        let i = 0;
        while (bytes >= 1024 && i < units.length - 1) {
            bytes /= 1024;
            i++;
        }
        return bytes.toFixed(2) + ' ' + units[i];
    };

    // Image size presets (for PCs) , and all sizes hanlded according to the screen sizepx
    const sizes = {
        square: 380,
        wide: 640,
        moderate: 440,
        tall: 200,
        miniTall: 180,
        mini2Tall: 110
    };

    // Calculate height based on new width keeping aspect ratio
    function calculateReductions(originalWidth, originalHeight, newWidth) {
        // const newHeight = (originalHeight * newWidth) / originalWidth;
        const newHeight = (originalHeight / originalWidth) * newWidth;
        return newHeight; // Return new height
    };

    // Get width based on aspect ratio
    function getNewWidth(width, height) {
        let newWidth, sizeType;
        if (width === height) {
            newWidth = sizes.square;
            sizeType = "square";
        } else if (width > height * 1.75) {
            newWidth = sizes.wide;
            sizeType = "wide";
        } else if (width > height) {
            newWidth = sizes.moderate;
            sizeType = "moderate";
        } else if (height > width * 3.5) {
            newWidth = sizes.mini2Tall;
            sizeType = "mini2Tall";
        } else if (height > width * 3) {
            newWidth = sizes.miniTall;
            sizeType = "miniTall";
        } else {
            newWidth = sizes.tall;
            sizeType = "tall";
        }

        return { newWidth, sizeType };
    };

    // Update uploaded file with calculated info
    function updateUploadedFileData(fileID, updatedData) {
        // update current width of image
        const mainFrame = document.querySelector(".mainFrame");
        const displayedImageWidth = mainFrame?.clientWidth;
        updatedData = {
            ...updatedData,
            ...(displayedImageWidth ? { fileWidth: displayedImageWidth } : {}),
        };
        if (currentFile != null && currentFile.fileID === fileID) {
            setCurrentFile((fileInfo) => ({ ...fileInfo, ...updatedData }));
        };

        setUploadedFiles((files) =>
            files.map((fileInfo) =>
                fileInfo.fileID === fileID
                    ? { ...fileInfo, ...updatedData }
                    : fileInfo
            )
        );
    }

    // Read dimensions & metadata and prepare file for editing
    function prepareFilesForEditing() {
        uploadedFiles?.forEach((fileInfo) => {
            const fileID = fileInfo?.fileID;
            const fileRejection = fileInfo?.rejection;

            if (!fileRejection) {
                const editedFile = fileInfo?.editedFile;
                let fileURL = fileInfo?.fileURL;
                const isImage = fileInfo.fileType?.startsWith("image/");
                const isVideo = fileInfo.fileType?.startsWith("video/");
                const isAudio = fileInfo.fileType?.startsWith("audio/");
                if (isImage) {
                    const img = new Image();
                    img.src = editedFile ? editedFile : fileURL;
                    img.onload = () => {
                        let { width, height } = img;

                        updateUploadedFileData(fileID, {
                            fileWidth: getNewWidth(width, height).newWidth,
                            fileHeight: calculateReductions(width, height, getNewWidth(width, height).newWidth),
                            sizeType: getNewWidth(width, height).sizeType,
                            orgWidth: width,
                            orgHeight: height,
                            fileIcon: fileIcon(fileInfo?.fileType),
                            formattedFileSize: formatFileSize(fileInfo?.fileSize),
                        });

                        allFilesReadyForEditing();
                    };
                } else if (isVideo) {
                    const video = document.createElement("video");
                    video.src = fileURL;
                    video.onloadedmetadata = () => {
                        const { videoWidth: width, videoHeight: height, duration } = video;

                        updateUploadedFileData(fileID, {
                            fileWidth: getNewWidth(width, height).newWidth,
                            fileHeight: calculateReductions(width, height, getNewWidth(width, height).newWidth),
                            sizeType: getNewWidth(width, height).sizeType,
                            orgWidth: width,
                            orgHeight: height,
                            fileDuration: formatTime(duration),
                            fileIcon: fileIcon(fileInfo?.fileType),
                            formattedFileSize: formatFileSize(fileInfo?.fileSize),
                        });

                        allFilesReadyForEditing();
                    };
                } else if (isAudio) {
                    const audio = document.createElement('audio');
                    audio.src = fileURL;
                    audio.preload = 'metadata';
                    audio.onloadedmetadata = () => {
                        const { duration } = audio;
                        updateUploadedFileData(fileID, {
                            fileWidth: 'auto',
                            fileHeight: 'auto',
                            sizeType: 'audio',
                            orgWidth: 'auto',
                            orgHeight: 'auto',
                            fileDuration: formatTime(fileInfo?.fileDuration || duration),
                            fileIcon: fileIcon(fileInfo?.fileType),
                            formattedFileSize: formatFileSize(fileInfo?.fileSize),
                        });
                        allFilesReadyForEditing();
                    };
                } else {
                    updateUploadedFileData(fileID, { fileWidth: `auto` });
                    allFilesReadyForEditing();
                }
            } else {
                // remove file if it was rejected
                setUploadedFiles((prevFiles) => prevFiles?.filter((fileInfo) => fileInfo?.fileID !== fileID));
            }
        });
    }

    // Check if all files are ready after upload
    function allFilesReadyForEditing() {
        const allReadyToEditing = uploadedFiles?.every((fileInfo) =>
            fileInfo?.fileWidth !== null && fileInfo?.fileURL !== null
        );
        if (allReadyToEditing) {
            if (!currentFile) {
                setCurrentFile(uploadedFiles[0]); // Default to first file
            }
            setIsFileUploading(false);
        }
    };

    useEffect(() => {
        if (isFileUploading) {
            if (uploadedFiles?.every((fileInfo) => fileInfo?.isDraft)) {
                if (!currentFile) {
                    setCurrentFile(uploadedFiles[0]);
                }
                setIsFileUploading(false);
            } else {
                prepareFilesForEditing();
            };
        };

        if (uploadedFiles?.length === 0) {
            setTimeout(() => {
                hideFileEditingPanel();
            }, 300);
        }
    }, [uploadedFiles, isFileUploading]);

    // State for confirmation dialog visibility
    const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);

    // emojis handling - start

    // State to toggle emoji container visibility
    const [showEmojiesContainer, setShowEmojiesContainer] = useState(false);

    // Function to add an emoji to the current file
    function addEmoji(emojiUrl) {
        setCurrentFile((fileInfo) => {
            let fileID = fileInfo?.fileID;
            let fileEmoji = fileInfo?.emoji || []; // Ensure it's an array, even if undefined

            // Create a new emoji object with default properties
            let newEmojis = [
                ...fileEmoji,
                {
                    emojiID: generateUniqueID("EMOJI"), // Generate unique ID for emoji
                    emojiURL: emojiUrl,
                    top: 10, // Default position from top
                    left: 10, // Default position from left
                    width: 42, // Default width
                    rotate: 0 // Default rotation
                }
            ];

            // Update emoji array in uploaded files
            setUploadedFiles((files) =>
                files.map((file) =>
                    file?.fileID === fileID
                        ? {
                            ...file,
                            emoji: newEmojis // Updated emoji array
                        }
                        : file // Keep other files unchanged
                )
            );

            // Return updated file info with emojis
            return {
                ...fileInfo,
                emoji: newEmojis
            };
        });
    };

    // Function to handle emoji positioning, resizing, and rotation
    function handleEmojisPosition() {
        const mainFrame = document.querySelector(".mainFrame"); // Container element
        const emojiBox = document.querySelectorAll(".emojiBox"); // All emoji boxes
        let mainFrameImage = document.getElementById("mainFrameImage"); // Target image

        emojiBox.forEach((emojiBox) => {
            let emojiID = emojiBox.getAttribute("id"); // Get emoji ID from element
            let removeEmoji = emojiBox.querySelector(".removeEmoji"); // Remove button
            let rotaterEmoji = emojiBox.querySelector(".rotaterEmoji"); // Rotate button

            // Remove emoji on click
            removeEmoji.addEventListener("click", (event) => {
                let removeEmojiID = event.target.getAttribute("id");
                updateUploadedFileData(
                    currentFile?.fileID,
                    {
                        emoji: currentFile.emoji.filter((emoji) => emoji.emojiID !== removeEmojiID)
                    }
                );
            });

            // Helper function to update specific emoji data (position, rotation, etc.)
            function updateEmoji_InfoInData(emojiID, updatingData) {
                updateUploadedFileData(
                    currentFile?.fileID,
                    {
                        emoji: currentFile.emoji.map((emojiInfo) => {
                            if (emojiInfo?.emojiID == emojiID) {
                                return {
                                    ...emojiInfo,
                                    ...updatingData
                                }
                            };
                            return emojiInfo;
                        })
                    }
                );
            };

            // Handle emoji rotation with touchmove
            rotaterEmoji.addEventListener("touchmove", (e) => {
                let rotaterEmojiParent = rotaterEmoji.parentElement;

                e.preventDefault(); // Prevent default scrolling

                // Get center coordinates of the emoji box
                const rect = rotaterEmojiParent.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                // Get current touch coordinates
                const touch = e.touches[0];
                const touchX = touch.clientX;
                const touchY = touch.clientY;

                // Calculate angle based on center and touch point
                const angle = Math.atan2(touchY - centerY, touchX - centerX) * (180 / Math.PI);

                // Apply rotation using transform
                rotaterEmojiParent.style.transform = `rotate(${angle}deg)`;

                // Update emoji rotation in state
                updateEmoji_InfoInData(emojiID, { rotate: angle });
            });

            let isTouch = false,
                isResizing = false,
                diffX = 0,
                diffY = 0,
                emojiBoxStartWidth,
                emojiBoxStartHeight;

            function moving(e) {
                const mainRect = mainFrame.getBoundingClientRect(); // Get bounding of main frame
                const boxRect = emojiBox.getBoundingClientRect(); // Get bounding of emoji box
                const posX = isTouch ? e.touches[0].clientX : e.clientX;
                const posY = isTouch ? e.touches[0].clientY : e.clientY;

                // diffX and diffY already set during mousedown or touchstart

                // Handle drag movement
                function dragMove(evt) {
                    if (isResizing) return; // Skip if resizing

                    const moveX = isTouch ? evt.touches[0].clientX : evt.clientX;
                    const moveY = isTouch ? evt.touches[0].clientY : evt.clientY;

                    let aX = moveX - diffX - mainRect.left;
                    let aY = moveY - diffY - mainRect.top;

                    // Clamp movement inside mainFrame bounds
                    aX = Math.max(0, Math.min(aX, mainRect.width - boxRect.width));
                    aY = Math.max(0, Math.min(aY, mainRect.height - boxRect.height));

                    evt.preventDefault(); // Prevent touch scrolling
                    updateEmoji_InfoInData(emojiID, { top: aY, left: aX }); // Update emoji position
                }

                // Event bindings as before
                if (isTouch) {
                    document.addEventListener("touchmove", dragMove, { passive: false });
                    document.addEventListener("touchend", () => {
                        document.removeEventListener("touchmove", dragMove);
                    });
                } else {
                    document.addEventListener("mousemove", dragMove);
                    document.addEventListener("mouseup", () => {
                        document.removeEventListener("mousemove", dragMove);
                    });
                }
            }

            // Function to handle resizing of emoji
            function resizing(e) {
                const mainRect = mainFrame.getBoundingClientRect(); // Main frame bounds
                const boxRect = emojiBox.getBoundingClientRect(); // Emoji box bounds
                const posX = isTouch ? e.touches[0].clientX : e.clientX;
                const posY = isTouch ? e.touches[0].clientY : e.clientY;

                const startPosX = posX;
                const startPosY = posY;

                emojiBoxStartWidth = emojiBox.offsetWidth;
                emojiBoxStartHeight = emojiBox.offsetHeight;

                // Handle resize movement
                function resizeMove(evt) {
                    const currentX = isTouch ? evt.touches[0].clientX : evt.clientX;
                    const currentY = isTouch ? evt.touches[0].clientY : evt.clientY;

                    const dx = currentX - startPosX;
                    const dy = currentY - startPosY;

                    let newWidth = emojiBoxStartWidth + dx;
                    let newHeight = emojiBoxStartHeight + dy;

                    // Clamp width and height to not exceed main frame bounds
                    newWidth = Math.min(
                        newWidth,
                        mainRect.width - boxRect.left + mainRect.left
                    );
                    newHeight = Math.min(
                        newHeight,
                        mainRect.height - boxRect.top + mainRect.top
                    );

                    // Apply new dimensions to emoji box
                    emojiBox.style.width = `${newWidth}px`;
                    emojiBox.style.height = `${newHeight}px`;

                    evt.preventDefault(); // Prevent touch scrolling

                    // Update emoji size in state
                    updateEmoji_InfoInData(emojiID, { width: newWidth });
                }

                // Bind resize event listeners for touch or mouse
                if (isTouch) {
                    document.addEventListener("touchmove", resizeMove, {
                        passive: false,
                    });
                    document.addEventListener("touchend", () => {
                        document.removeEventListener("touchmove", resizeMove);
                        isResizing = false;
                    });
                } else {
                    document.addEventListener("mousemove", resizeMove);
                    document.addEventListener("mouseup", () => {
                        document.removeEventListener("mousemove", resizeMove);
                        isResizing = false;
                    });
                }
            }

            // Event listeners for emoji drag/move
            emojiBox?.addEventListener("mousedown", (e) => {
                if (!e.target.classList.contains("resizeHandleEmojiBox") &&
                    !e.target.classList.contains("rotaterEmoji") &&
                    !e.target.classList.contains("removeEmoji")) {
                    const boxRect = emojiBox.getBoundingClientRect();
                    const posX = e.touches[0].clientX;
                    const posY = e.touches[0].clientY;

                    diffX = posX - boxRect.left;
                    diffY = posY - boxRect.top;
                    isTouch = false;
                    moving(e); // Trigger movement
                }
            });
            emojiBox?.addEventListener("touchstart", (e) => {
                if (
                    !e.target.classList.contains("resizeHandleEmojiBox") &&
                    !e.target.classList.contains("rotaterEmoji") &&
                    !e.target.classList.contains("removeEmoji")
                ) {
                    isTouch = true;

                    const boxRect = emojiBox.getBoundingClientRect();
                    const posX = e.touches[0].clientX;
                    const posY = e.touches[0].clientY;

                    diffX = posX - boxRect.left;
                    diffY = posY - boxRect.top;

                    moving(e); // Call moving AFTER calculating diffX/diffY
                }
            });

            // Event listeners for emoji resize
            emojiBox?.addEventListener("mousedown", (e) => {
                if (e.target.classList.contains("resizeHandleEmojiBox")) {
                    isTouch = false;
                    isResizing = true;
                    resizing(e); // Trigger resizing
                }
            });
            emojiBox?.addEventListener("touchstart", (e) => {
                if (e.target.classList.contains("resizeHandleEmojiBox")) {
                    isTouch = true;
                    isResizing = true;
                    resizing(e); // Trigger resizing
                }
            });
        });
    };

    // Initialize emoji interactions when emoji list changes
    useEffect(() => {
        if (currentFile?.emoji?.length > 0) {
            handleEmojisPosition(); // Setup emoji events
        };
    }, [currentFile?.emoji]);

    // emojis handling - end

    // color drawing handling - start
    // State management for color drawing functionality
    const [isDrewColor, setIsDrewColor] = useState(false); // Tracks if any drawing has been made
    const [currentColorForDrawing, setCurrentColorForDrawing] = useState("#ff0000"); // Default drawing color
    const [showColorsData, setShowColorsData] = useState(false); // Controls visibility of the color selection panel
    const [isColorDrawingActive, setIsColorDrawingActive] = useState(false); // Tracks whether color drawing mode is active
    const [drawnPositions, setDrawnPositions] = useState([]); // Stores drawing positions and actions

    // Predefined color palette for drawing
    const colorsData = [
        // Reds
        "#FF0000", "#FF6347", "#FF4500", "#DC143C", "#B22222", "#8B0000", "#E9967A", "#FA8072", "#F08080",
        // Pinks
        "#FFC0CB", "#FF69B4", "#FF1493", "#DB7093", "#C71585", "#FFB6C1", "#FF9E9E", "#FFD1DC", "#FF5E78",
        // Oranges
        "#FFA500", "#FF8C00", "#FF7F50", "#FF4500", "#FF6347", "#FFAA33", "#FFDD44", "#FF6F00", "#FFA07A",
        // Yellows
        "#FFFF00", "#FFD700", "#FFA500", "#F0E68C", "#EEE8AA", "#FFFACD", "#FAFAD2", "#FFE4B5", "#FFEBCD",
        // Greens
        "#008000", "#32CD32", "#00FF00", "#98FB98", "#7FFF00", "#006400", "#ADFF2F", "#9ACD32", "#3CB371", "#8FBC8F",
        "#228B22", "#2E8B57", "#6B8E23", "#556B2F", "#66CDAA", "#7FFFD4", "#20B2AA",
        // Blues
        "#0000FF", "#1E90FF", "#00BFFF", "#87CEEB", "#4682B4", "#5F9EA0", "#6495ED", "#4169E1", "#00008B", "#000080",
        "#191970", "#7B68EE", "#6A5ACD", "#8A2BE2", "#5D8AA8", "#468499", "#ADD8E6", "#4682B4",
        // Purples
        "#800080", "#8A2BE2", "#9400D3", "#9932CC", "#BA55D3", "#DA70D6", "#D8BFD8", "#EE82EE", "#FF00FF", "#FF77FF",
        "#DDA0DD", "#FFBBFF", "#E6E6FA", "#9400D3", "#C71585",
        // Browns
        "#A52A2A", "#8B4513", "#D2691E", "#F4A460", "#DEB887", "#FFE4C4", "#D2B48C", "#BC8F8F", "#8B0000", "#CD853F",
        "#B8860B", "#DAA520", "#B87333", "#A0785A", "#6F4E37", "#7B3F00",
        // Grays and Neutrals
        "#000000", "#696969", "#808080", "#A9A9A9", "#C0C0C0", "#D3D3D3", "#E0E0E0", "#F5F5F5", "#FFFFFF", "#B0C4DE",
        "#778899", "#708090", "#2F4F4F", "#1C1C1C", "#363636",
        // Additional color categories omitted for brevity...
    ];

    // Clears the drawing canvas by removing all drawn positions and resetting the canvas
    function clearColorDrawingCanvas() {
        setDrawnPositions([]); // Reset drawn positions
        let colorCanvasElement = document.querySelector(".mainFrame canvas"); // Select the canvas element
        let colorCanvasElementCtx = colorCanvasElement.getContext("2d"); // Get the canvas 2D context
        colorCanvasElementCtx.clearRect(0, 0, colorCanvasElement.width, colorCanvasElement.height); // Clear the canvas area
    };


    // Redraws existing color strokes on the canvas from stored data
    function drawExistingColours(currentFile) {
        let colorCanvasElement = document.querySelector(".mainFrame canvas"); // Select the canvas element
        let colorCanvasElementCtx = colorCanvasElement.getContext("2d"); // Get 2D drawing context
        colorCanvasElementCtx.clearRect(0, 0, colorCanvasElement.width, colorCanvasElement.height); // Clear canvas

        colorCanvasElement.width = currentFile?.fileWidth; // Set canvas width
        colorCanvasElement.height = currentFile?.fileHeight; // Set canvas height

        let lastX = 0;
        let lastY = 0;

        currentFile?.coloursDataOnImage.forEach((pos) => {
            if (pos.action === "start") {
                // Start a new drawing path
                [lastX, lastY] = [pos.x, pos.y];
            } else if (pos.action === "draw") {
                // Continue drawing line
                colorCanvasElementCtx.strokeStyle = pos.color;
                colorCanvasElementCtx.lineWidth = 5;
                colorCanvasElementCtx.lineCap = "round";
                colorCanvasElementCtx.lineJoin = "round";
                colorCanvasElementCtx.beginPath();
                colorCanvasElementCtx.moveTo(lastX, lastY);
                colorCanvasElementCtx.lineTo(pos.x, pos.y);
                colorCanvasElementCtx.stroke();
                [lastX, lastY] = [pos.x, pos.y];
            } else if (pos.action === "stop") {
                // Finish the path
                colorCanvasElementCtx.closePath();
            }
        });
    };
    // Effect to track file colour drawing state
    useEffect(() => {
        if (currentFile?.fileType?.startsWith("image/") && currentFile?.isDraft) {
            if (currentFile?.coloursDataOnImage.length > 0) {
                drawExistingColours(currentFile);
            };
        };
    }, [currentFile?.isDraft]);
    // Handles the color drawing functionality on the image
    function colorDrawingOnImage(currentFile) {
        const colorCanvasElement = document.querySelector(".mainFrame canvas"); // Get the canvas element
        const colorCanvasElementCtx = colorCanvasElement.getContext("2d"); // Get 2D drawing context
        const coloursBtns = document.querySelectorAll(".colorsDataContainer span"); // Get color selection buttons

        // Set canvas width and height based on file dimensions
        colorCanvasElement.width = currentFile?.fileWidth;
        colorCanvasElement.height = currentFile?.fileHeight;

        let currentColorForDrawing = "#ff0000"; // Default drawing color
        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;

        // Update current color from button click
        coloursBtns.forEach((btn) => {
            btn.addEventListener("click", (e) => {
                currentColorForDrawing = e.target.getAttribute("color");
            });
        });

        // Helper: Get scaled coordinates
        const getScaledCoordinates = (e) => {
            const rect = colorCanvasElement.getBoundingClientRect();
            const scaleX = colorCanvasElement.width / rect.width;
            const scaleY = colorCanvasElement.height / rect.height;

            const clientX = e.clientX ?? e.touches[0].clientX;
            const clientY = e.clientY ?? e.touches[0].clientY;

            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY,
            };
        };

        // Start drawing
        const startDrawing = (x, y) => {
            isDrawing = true;
            [lastX, lastY] = [x, y];
            setDrawnPositions((prev) => [...prev, { action: "start", x, y, color: currentColorForDrawing }]);
        };

        // Draw
        const draw = (x, y) => {
            if (!isDrawing) return;

            setIsDrewColor(true);
            colorCanvasElementCtx.strokeStyle = currentColorForDrawing;
            colorCanvasElementCtx.lineWidth = 5;
            colorCanvasElementCtx.lineCap = "round";
            colorCanvasElementCtx.lineJoin = "round";

            colorCanvasElementCtx.beginPath();
            colorCanvasElementCtx.moveTo(lastX, lastY);
            colorCanvasElementCtx.lineTo(x, y);
            colorCanvasElementCtx.stroke();

            setDrawnPositions((prev) => [...prev, { action: "draw", x, y, color: currentColorForDrawing }]);
            [lastX, lastY] = [x, y];
        };

        // Stop drawing
        const stopDrawing = () => {
            if (isDrawing) {
                setDrawnPositions((prev) => [...prev, { action: "stop" }]);
            }
            isDrawing = false;
        };

        // Redraw if already drawn
        if (currentFile?.coloursDataOnImage.length > 0) {
            drawExistingColours(currentFile);
            return;
        }

        // Mouse events
        colorCanvasElement.addEventListener("mousedown", (e) => {
            const { x, y } = getScaledCoordinates(e);
            startDrawing(x, y);
        });

        colorCanvasElement.addEventListener("mousemove", (e) => {
            const { x, y } = getScaledCoordinates(e);
            draw(x, y);
        });

        colorCanvasElement.addEventListener("mouseup", stopDrawing);
        colorCanvasElement.addEventListener("mouseout", stopDrawing);

        // Touch events
        colorCanvasElement.addEventListener("touchstart", (e) => {
            const { x, y } = getScaledCoordinates(e);
            startDrawing(x, y);
        });

        colorCanvasElement.addEventListener("touchmove", (e) => {
            const { x, y } = getScaledCoordinates(e);
            draw(x, y);
            e.preventDefault(); // Prevent scroll while drawing
        });

        colorCanvasElement.addEventListener("touchend", stopDrawing);
        colorCanvasElement.addEventListener("touchcancel", stopDrawing);
    };
    // React effect to trigger drawing setup when drawing mode is active
    useEffect(() => {
        if (isColorDrawingActive && currentFile) {
            colorDrawingOnImage(currentFile); // Initialize drawing
        }
    }, [isColorDrawingActive, currentFile]);
    // color drawing handling - end


    // Mapping file type icons to corresponding FontAwesome icons
    const iconMap = {
        faFileImage: faFileImage,
        faFileAudio: faFileAudio,
        faFileVideo: faFileVideo,
    };

    // Function to prepare the files to be sent
    async function prepareFilesToSending() {
        // Process each uploaded file asynchronously
        const filePromises = uploadedFiles?.map(async (file) => {
            // Convert file to Base64 string if not already edited
            const base64File = file?.editedFile || await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result); // Resolve with Base64 result
                reader.onerror = reject; // Reject on error
                reader.readAsDataURL(file?.fileData); // Read file as data URL
            });

            // Generate unique file name
            let fileName = generateUniqueID("FILE") + file?.fileName;

            // Construct file data object
            let fileData = {
                fileName: fileName,
                fileURL: file?.editedFile || file?.fileURL,
                fileType: file?.fileType,
                fileSize: file?.formattedFileSize || file?.fileSize,
                fileIcon: file?.fileIcon,
                fileDuration: file?.fileDuration,
                fileBaseData: base64File,
                fileWidth: file?.fileWidth?.toString(),
                fileHeight: file?.fileHeight?.toString(),
                fileOrgWidth: file?.orgWidth?.toString(),
                fileOrgHeight: file?.orgHeight?.toString(),
                isEdited: file?.isFileReEditing || false,
                oldFilePublicId: file?.oldFilePublicId
            };
            return fileData;
        });

        // Wait for all file processing promises to resolve
        const resolvedFileChats = await Promise.all(filePromises);

        // Set files ready for sending
        setFilesForSend(resolvedFileChats);

        // Set flags based on context (chat/story)
        if (fileEditingFor == "chat") {
            setAreChatsFilesReadyToSend(true);
        };
        if (fileEditingFor == "story") {
            setAreMediaStoriesReadyToSend(true);
        };
    };

    // State to track whether file editing has occurred
    const [filesEditingStatus, setFilesEditingStatus] = useState(false);

    // Function to track status and trigger sending once files are ready
    function trackFileSendingStatus() {
        // Check if every file is ready to send
        const allReadyToSend = uploadedFiles?.every((fileInfo) => fileInfo?.readyToSend == true);

        // If all files are ready, call the sending function
        if (allReadyToSend) {
            prepareFilesToSending();
        };
    };

    // Effect to track file status and trigger tracking on updates
    useEffect(() => {
        if (filesEditingStatus) {
            trackFileSendingStatus();
        };
    }, [uploadedFiles, filesEditingStatus]);

    // Function to apply drawings and emojis to images
    function applyDrawingsAndEmojis() {
        setFilesEditingStatus(true); // Mark editing as started

        uploadedFiles?.map((file) => {
            const fileID = file?.fileID;
            const isImage = file?.fileType?.startsWith("image/");
            const fileEmojis = file?.emoji;
            const drawingData = file?.coloursDataOnImage;

            // Process only if file is image and has drawing or emoji
            if (isImage && (fileEmojis?.length > 0 || drawingData?.length > 0)) {
                const imageElement = new Image();
                const originalFileURL = file?.fileURL;
                const editedFile = file?.editedFile;

                imageElement.crossOrigin = "anonymous";
                imageElement.src = editedFile == null ? originalFileURL : editedFile;

                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                imageElement.onload = async () => {
                    const naturalWidth = imageElement.naturalWidth;
                    const naturalHeight = imageElement.naturalHeight;

                    canvas.width = naturalWidth;
                    canvas.height = naturalHeight;

                    // Draw original image
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(imageElement, 0, 0, naturalWidth, naturalHeight);

                    const scaleFactor = canvas.width / file?.fileWidth; // Calculate scale

                    // Draw user drawings on canvas
                    let lastX = 0, lastY = 0;
                    drawingData.forEach((pos) => {
                        if (pos.action === "start") {
                            [lastX, lastY] = [pos.x, pos.y];
                        } else if (pos.action === "draw") {
                            ctx.strokeStyle = pos.color;
                            ctx.lineWidth = 5 * scaleFactor;
                            ctx.lineCap = "round";
                            ctx.lineJoin = "round";

                            ctx.beginPath();
                            ctx.moveTo(lastX * scaleFactor, lastY * scaleFactor);
                            ctx.lineTo(pos.x * scaleFactor, pos.y * scaleFactor);
                            ctx.stroke();

                            [lastX, lastY] = [pos.x, pos.y];
                        } else if (pos.action === "stop") {
                            ctx.closePath();
                        }
                    });

                    // If there are emojis to draw
                    if (fileEmojis?.length > 0) {
                        let loadedEmojis = 0;
                        const totalEmojis = fileEmojis.length;

                        fileEmojis.map((emojiInfo, index) => {
                            let { left, top, width, rotate, emojiURL } = emojiInfo;
                            const emojiImage = new Image();
                            emojiImage.crossOrigin = "anonymous";
                            emojiImage.src = emojiURL;

                            emojiImage.onload = () => {
                                try {

                                    const adjustedLeft = left * scaleFactor;
                                    const adjustedTop = top * scaleFactor;
                                    const adjustedWidth = width * scaleFactor;

                                    ctx.save();
                                    ctx.translate(adjustedLeft + adjustedWidth / 2, adjustedTop + adjustedWidth / 2);
                                    ctx.rotate((rotate * Math.PI) / 180);
                                    ctx.drawImage(
                                        emojiImage,
                                        -adjustedWidth / 2,
                                        -adjustedWidth / 2,
                                        adjustedWidth,
                                        adjustedWidth
                                    );
                                    ctx.restore();

                                    loadedEmojis++;

                                    // Finalize image when all emojis are drawn
                                    if (loadedEmojis === totalEmojis) {
                                        generateFinalImageURL();
                                    }
                                } catch (drawError) {
                                    console.error(`Error drawing emoji ${index}:`, drawError);
                                }
                            };

                            emojiImage.onerror = () => {
                                console.error(`Failed to load emoji: ${emojiURL}`);
                                loadedEmojis++;

                                // Proceed even if some emojis fail
                                if (loadedEmojis === totalEmojis) {
                                    generateFinalImageURL();
                                }
                            };
                        });
                    } else {
                        // No emojis, finalize immediately
                        generateFinalImageURL();
                    };

                    // Generate final edited image
                    function generateFinalImageURL() {
                        try {
                            const processedImage = canvas.toDataURL("image/png"); // Convert canvas to Base64
                            updateUploadedFileData(fileID, {
                                editedFile: processedImage,
                                emoji: [],
                                readyToSend: true
                            });
                            trackFileSendingStatus(); // Continue sending logic
                        } catch (error) {
                            console.error("Error generating image: ", error);
                            trackFileSendingStatus();
                        }
                    }
                };

                // Trigger onload manually if image is cached
                if (imageElement.complete) {
                    imageElement.onload();
                }
            } else {
                // Not an editable image, mark as ready to send
                updateUploadedFileData(fileID, { readyToSend: true });
                trackFileSendingStatus();
            }
        });
    };

    // Returning the file handler component
    return (
        <div className='fileHandler'>
            {
                // Show loading animation if files are uploading or chat files are ready to be sent
                (isFileUploading || areChatsFilesReadyToSend) ?
                    <ProgressBar
                        position={'absolute'}
                    /> // Display the loading animation component
                    :
                    // Main wrapper for file editing panel, conditionally shown if file is not uploading
                    <div className={`${isFileUploading ? "none" : "flex"} fileHandlerInner`}>

                        {/* Show all editing tools, and its panel */}
                        <div className={`flex filePreviewContainer ${activeDarkMode ? "darkModeBg2" : ''} bg-white relative text-gray-500`}>

                            {/* Toolbar Section */}
                            <div className="toolbar">

                                {/* Close and Save to Draft Buttons */}
                                <div className="closeBtn flex items-center gap-x-6">

                                    {/* Close Button */}
                                    <button type="button" data-title="Close" className="btnWithTitle  cursor-pointer w-6 h-6" >
                                        <FontAwesomeIcon
                                            onClick={() => {
                                                if (isColorDrawingActive) {
                                                    setIsColorDrawingActive(false);
                                                    setDrawnPositions([]);
                                                };
                                                if (!isColorDrawingActive) {
                                                    // Show confirmation dialog to hide the main editing panel
                                                    setShowConfirmationDialog(true);
                                                };
                                            }}
                                            icon={faTimes} className="text-2xl" />
                                    </button>

                                    {/* Save to Draft Button */}
                                    {/* only fo chat box */}
                                    {
                                        (showChatBox && openedTabInfo) &&
                                        <button type="button" data-title="Save to draft" className="btnWithTitle  cursor-pointer w-6 h-6" >
                                            <HiClipboardDocumentList
                                                onClick={async () => {
                                                    // Mark uploaded files as draft
                                                    let markedAsDraft = uploadedFiles?.map((fileInfo) => ({ ...fileInfo, isDraft: true }));
                                                    if (markedAsDraft?.every((fileInfo) => fileInfo?.isDraft)) {
                                                        let fileDraftData = {
                                                            ...(openedTabInfo?.draft || {}),
                                                            fileData: markedAsDraft
                                                        };
                                                        // Save draft info to recent tabs
                                                        await addOrUpdateRecentTab(openedTabInfo, { draft: fileDraftData });
                                                        setOpenedTabInfo({ ...openedTabInfo, draft: fileDraftData });
                                                        hideFileEditingPanel(); // Hide panel after saving
                                                    };
                                                }}
                                                className="h-7 w-7" />
                                        </button>
                                    }
                                </div>

                                {/* Conditional display of editing tools only for image files */}
                                {
                                    currentFile?.fileType?.startsWith("image/") && (

                                        <div className="toolsBtn">

                                            {
                                                (!isColorDrawingActive) &&
                                                <>
                                                    {/* Refresh (Reset) Button */}
                                                    <button type="button" data-title="Refresh" className="btnWithTitle  cursor-pointer w-6 h-6" >
                                                        <FaClockRotateLeft onClick={() => {
                                                            setDrawnPositions([]);
                                                            setIsColorDrawingActive(false);
                                                            setIsFileUploading(true);
                                                            updateUploadedFileData(
                                                                currentFile?.fileID,
                                                                {
                                                                    editedFile: null,
                                                                    emoji: [],
                                                                    coloursDataOnImage: []
                                                                }
                                                            );
                                                            clearColorDrawingCanvas();
                                                            setIsColorDrawingActive(false);
                                                            setIsDrewColor(false);
                                                        }} className='cursor-pointer w-6 h-6' />
                                                    </button>

                                                    {/* Emoji Button */}
                                                    <button type="button" data-title="Emojis" style={{ color: showEmojiesContainer && '#0087ff' }} className={` btnWithTitle cursor-pointer w-6 h-6`} >
                                                        <FontAwesomeIcon onClick={() => {
                                                            setShowEmojiesContainer(!showEmojiesContainer);
                                                            setIsColorDrawingActive(false);
                                                        }} icon={faSmile} className="text-2xl cursor-pointer" />
                                                    </button>
                                                </>
                                            }

                                            {
                                                isColorDrawingActive &&
                                                <>
                                                    {/* Clear Color Drawing */}
                                                    <button type="button" data-title="Clear" className="btnWithTitle  cursor-pointer w-6 h-6" >
                                                        <FaClockRotateLeft onClick={() => {
                                                            updateUploadedFileData(
                                                                currentFile?.fileID,
                                                                { coloursDataOnImage: [] }
                                                            );
                                                            setCurrentColorForDrawing("#ff0000");
                                                            clearColorDrawingCanvas();
                                                        }} className='cursor-pointer w-6 h-6' />
                                                    </button>

                                                    {/* Color Picker Button */}
                                                    <button type="button" data-title="Colors" className="flex items-center justify-center relative  btnWithTitle cursor-pointer w-6 h-6">
                                                        <span className="w-full h-full block rounded-md"
                                                            style={{ backgroundColor: currentColorForDrawing }}
                                                            onClick={() => {
                                                                setShowColorsData(!showColorsData);
                                                            }}></span>

                                                        {/* Dropdown to select a color */}
                                                        <div className={`${showColorsData ? "show" : "hide"} colorsDataContainer rounded-md ${activeDarkMode ? "darkModeBg2" : ''} bg-white shadow-lg overflow-y-scroll`}>
                                                            {
                                                                colorsData.map((color, index) => {
                                                                    return (
                                                                        <span key={index} color={color} className="w-7 h-7 block rounded-md"
                                                                            style={{ backgroundColor: color }}
                                                                            onClick={() => {
                                                                                setCurrentColorForDrawing(color);
                                                                                setShowColorsData(false);
                                                                            }}></span>
                                                                    )
                                                                })
                                                            }
                                                        </div>
                                                    </button>
                                                </>
                                            }

                                            {/* Enable Color Drawing */}
                                            {
                                                (!isColorDrawingActive) &&
                                                <button type="button" data-title="Color" className="relative  btnWithTitle cursor-pointer w-5 h-5" >
                                                    <FontAwesomeIcon onClick={() => {
                                                        setShowEmojiesContainer(false);
                                                        setIsColorDrawingActive(true);
                                                    }} icon={faPen} className="text-2xl cursor-pointer" />
                                                </button>
                                            }

                                            {/* Done Drawing Button */}
                                            {
                                                (isColorDrawingActive) &&
                                                <button type="button" data-title="Done" className=" btnWithTitle cursor-pointer w-6 h-6">
                                                    <FaCheck onClick={() => {
                                                        if (isColorDrawingActive) {
                                                            if (isDrewColor) {
                                                                updateUploadedFileData(
                                                                    currentFile?.fileID,
                                                                    {
                                                                        coloursDataOnImage: drawnPositions
                                                                    }
                                                                );
                                                                setDrawnPositions([]);
                                                            };
                                                            setIsColorDrawingActive(false);
                                                            setIsDrewColor(false);
                                                        };
                                                    }} className='cursor-pointer w-6 h-6' />
                                                </button>
                                            }

                                        </div>
                                    )
                                }
                            </div>

                            {/* File Preview Area */}
                            <div className="previewBox">
                                {
                                    // Display different preview based on file type
                                    <div className={`${currentFile?.fileType?.startsWith("image/") ||
                                        currentFile?.fileType?.startsWith("video/") ||
                                        currentFile?.fileType?.startsWith("audio/")
                                        ? '' : 'fileTypeInfo'} fileContainer w-full h-full m-auto`}>
                                        {
                                            // Preview for image files
                                            currentFile?.fileType?.startsWith("image/") ?
                                                <div className={` flex items-center justify-center h-full m-auto`}>

                                                    {/* Image editing canvas and emoji overlays */}
                                                    <div style={{ touchAction: "none", width: `${currentFile?.fileWidth}px` }} className={`${currentFile?.sizeType} ${isColorDrawingActive && 'cursor-crosshair'} mainFrame relative w-full h-auto overflow-hidden`}>
                                                        <img src={
                                                            currentFile?.editedFile == null ?
                                                                currentFile?.fileURL
                                                                :
                                                                currentFile?.editedFile
                                                        }
                                                            alt="Uploaded"
                                                            id="mainFrameImage"
                                                            className="pointer-events-none w-full h-auto m-auto"
                                                        />

                                                        {/* Emoji overlays on the image */}
                                                        {
                                                            currentFile?.emoji?.map((emoji_info) => {
                                                                return <div style={{
                                                                    top: `${emoji_info?.top}px`,
                                                                    left: `${emoji_info?.left}px`,
                                                                    width: `${emoji_info?.width}px`,
                                                                    minWidth: `30px`,
                                                                    transform: `rotate(${emoji_info?.rotate}deg)`
                                                                }} key={`${emoji_info?.emojiID}`}
                                                                    id={`${emoji_info?.emojiID}`}
                                                                    tabIndex={0} // Makes div focusable
                                                                    className={`emojiBox`}>

                                                                    {/* Emoji Image */}
                                                                    <img className="inline-block w-full h-full emoji_image" src={`${emoji_info?.emojiURL}`} alt="" />

                                                                    {/* Emoji resizing and control handles */}
                                                                    <div className={`resizeHandleEmojiBox top-left`}></div>
                                                                    <div className={`resizeHandleEmojiBox top-right`}></div>
                                                                    <div className={`resizeHandleEmojiBox bottom-left`}></div>
                                                                    <div className={`resizeHandleEmojiBox bottom-right`}></div>
                                                                    <span className={`rotaterEmoji`}>↻</span>
                                                                    <span id={`${emoji_info?.emojiID}`} className={`removeEmoji`}>×</span>
                                                                </div>
                                                            })
                                                        }

                                                        {/* Drawing canvas on top of image */}
                                                        <canvas id={currentFile?.fileID} className={`${!isColorDrawingActive && 'pointer-events-none'} h-full absolute top-0 left-0 bottom-0 right-0`}
                                                            style={{
                                                                touchAction: "none",
                                                                imageRendering: "pixelated"
                                                            }}
                                                        ></canvas>
                                                    </div>
                                                </div>

                                                // Preview for video files
                                                : currentFile?.fileType?.startsWith("video/") ?
                                                    <div style={{ width: `${currentFile?.fileWidth}px` }} className={`flex h-full m-auto ${currentFile?.sizeType}`}>
                                                        <VideoPlayer
                                                            src={currentFile?.fileURL}
                                                            size={formatFileSize(currentFile?.fileSize)}
                                                        />
                                                    </div>

                                                    // Preview for audio files
                                                    : currentFile?.fileType?.startsWith("audio/") &&
                                                    <AudioPlayer fileInfo={{
                                                        ...currentFile,
                                                        fileSize: formatFileSize(currentFile?.fileSize),
                                                    }}
                                                        showIcon={true}
                                                    />
                                        }
                                    </div>
                                }
                            </div>
                            {
                                (!isColorDrawingActive) &&
                                <div className={`bottomBar`}>
                                    {/* Bottom bar appears only when color drawing is not active */}

                                    {/* Thumbnail & Send Button section */}
                                    {/* Displays uploaded file previews and Send button */}
                                    <div className="thumbnailBox mt-1 flex items-center justify-between space-x-2">

                                        {/* Container for uploaded file thumbnails with possible right shadow if more than 3 files */}
                                        <div className={`thumbnailBoxInner ${uploadedFiles?.length > 3 ? 'rightShadow' : ''}`}>

                                            {/* Container for uploaded images/thumbnails */}
                                            {/* Uses vertical scrolling to display multiple thumbnails in column layout */}
                                            <div className="uploadedImagesContainer w-full flex flex-wrap flex-col overflow-x-auto overflow-y-hidden h-full">

                                                {
                                                    uploadedFiles?.map((file, fileidx) => {
                                                        return (
                                                            // Individual thumbnail wrapper with border if currently selected
                                                            <div key={fileidx} style={{ border: currentFile?.fileID == file?.fileID ? '3px solid #1DA1F2' : 'none' }} id="sendingFile" className="cursor-pointer thumbnail border border-gray-300 rounded-lg m-1 relative">

                                                                {/* Clickable thumbnail that sets current file and redraws colors if needed */}
                                                                <div className="w-full h-full" onClick={() => {
                                                                    setCurrentFile(file);
                                                                    if (file.fileType?.startsWith("image/")) {
                                                                        if (file?.coloursDataOnImage.length > 0) {
                                                                            drawExistingColours(file);
                                                                        } else {
                                                                            let colorCanvasElement = document.querySelector(".mainFrame canvas");
                                                                            let colorCanvasElementCtx = colorCanvasElement.getContext("2d");
                                                                            colorCanvasElementCtx.clearRect(0, 0, colorCanvasElement.width, colorCanvasElement.height);
                                                                        };
                                                                    };
                                                                }}>

                                                                    {
                                                                        // Render image thumbnail
                                                                        file.fileType?.startsWith("image/") ?
                                                                            <img style={{ borderRadius: "5px" }}
                                                                                src={
                                                                                    file?.editedFile == null ?
                                                                                        file?.fileURL
                                                                                        :
                                                                                        file?.editedFile
                                                                                }
                                                                                alt="Uploaded thumbnail"
                                                                                className="pointer-events-none w-full h-full object-cover"
                                                                            />
                                                                            :
                                                                            // Render video thumbnail
                                                                            file.fileType?.startsWith("video/") ?
                                                                                <video
                                                                                    style={{ borderRadius: "7px" }}
                                                                                    src={file?.fileURL}
                                                                                    muted
                                                                                    className="w-full h-full object-cover"
                                                                                >
                                                                                    Your browser does not support the video tag.
                                                                                </video>
                                                                                :
                                                                                // Render generic file icon if not image or video
                                                                                <div className="fileIconInThumbnail w-full h-full flex items-center justify-center">
                                                                                    <FontAwesomeIcon icon={iconMap?.[fileIcon(file?.fileType)]} />
                                                                                </div>
                                                                    }
                                                                </div>

                                                                {/* File remove (X) button */}
                                                                <span className="fileRemover">
                                                                    <BsX onClick={(e) => {
                                                                        setUploadedFiles((prevFiles) => {
                                                                            // Filter out the file being removed
                                                                            let filteredFiles = prevFiles.filter((fileInfo) => fileInfo?.fileID != file?.fileID);

                                                                            // If removed file is the current one, show the previous or next file
                                                                            if (filteredFiles.length > 0 && file?.fileID == currentFile?.fileID) {
                                                                                const newIndex = fileidx == 0 ? 0 : fileidx - 1;
                                                                                setCurrentFile(filteredFiles[newIndex]);
                                                                            }

                                                                            // Return updated list of files
                                                                            return filteredFiles;
                                                                        });
                                                                    }} className="w-5 h-5" />
                                                                </span>
                                                            </div>
                                                        )
                                                    })
                                                }
                                            </div>
                                        </div>
                                    </div>

                                    {/* Button section with Add File and Send */}
                                    <div className="thumbnailBox mt-1 flex items-center justify-between space-x-2">

                                        {
                                            // Show Add File button only when not re-editing
                                            !fileReEditing &&
                                            <label type='button' className="flex items-center justify-center rounded-lg text-2xl hover:bg-gray-200 cursor-pointer" href="#">
                                                <BsPlus className="w-8 h-8" />
                                                <input
                                                    type="file"
                                                    className="hidden" // Hide native file input
                                                    multiple
                                                    accept="image/*,video/*" // Accept only image and video files
                                                    onChange={(e) => {
                                                        handleFileUpload(
                                                            e.target.files, // Pass input event
                                                            fileEditingFor // Context: chat file upload
                                                        );
                                                        e.target.value = ""; // Reset input for next selection
                                                    }}
                                                />
                                            </label>
                                        }
                                        {
                                            // Show Send button only if all files are re-editing or have changes
                                            (
                                                uploadedFiles?.every((fileInfo) => fileInfo?.isFileReEditing) ?
                                                    uploadedFiles?.some((fileInfo) => fileInfo?.emoji?.length > 0 ||
                                                        fileInfo?.coloursDataOnImage?.length > 0)
                                                    : true
                                            ) && <BsSend
                                                style={{ transform: "rotate(45deg)", right: "3px", color: "#7269ef" }}
                                                className="w-6 h-6 relative cursor-pointer"
                                                onClick={async () => {
                                                    // Check if any file has drawings or emojis
                                                    let isNeedToApplyDrawingOrEmoji = uploadedFiles?.some((fileInfo) =>
                                                        fileInfo?.emoji?.length > 0 ||
                                                        fileInfo?.coloursDataOnImage?.length > 0
                                                    );

                                                    // Apply drawings/emojis or prepare files for sending
                                                    if (isNeedToApplyDrawingOrEmoji) {
                                                        applyDrawingsAndEmojis();
                                                    } else {
                                                        prepareFilesToSending();
                                                    };
                                                }}
                                            />
                                        }
                                    </div>
                                </div>
                            }
                        </div>
                        {/* show emoji picker when it is needed */}
                        <div className={`${showEmojiesContainer ? 'show' : 'hide'} emojiesInTypingOnImage w-full p-4 ${activeDarkMode ? "darkModeBg2" : ''} bg-white shadow-lg rounded-lg w-96`}>
                            <EmojiPicker
                                onEmojiClick={emoji => addEmoji(emoji.imageUrl)}
                                emojiStyle={"apple"}
                            />
                        </div>
                    </div>
            }
            <ToastContainer />
            {
                // Show confirmation dialog when user wants to discard the changes
                showConfirmationDialog &&
                <ConfirmationDialog
                    textMsg={"Are you sure you want to discard the changes?"}
                    handleConfirmAction={() => {
                        setShowConfirmationDialog(false);
                        hideFileEditingPanel();
                        let fileDraftCleaning = {
                            ...(openedTabInfo?.draft || {}),
                            fileData: null
                        };
                        addOrUpdateRecentTab(
                            openedTabInfo,
                            {
                                draft: fileDraftCleaning
                            }
                        );
                        setOpenedTabInfo({ ...openedTabInfo, draft: fileDraftCleaning });
                    }}
                    setShowConfirmationDialog={setShowConfirmationDialog}
                />
            }
        </div>
    );
}

export default File;
