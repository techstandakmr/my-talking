import { useContext, useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FaCheck } from "react-icons/fa6";
import { UserContext } from '@context/UserContext';
import { ConfirmationDialog } from "./index.js";
function HandleProfileImage({ setShowProfileEditingPanel, profilePicInfo, setProfilePicInfo }) {
  // Component to handle profile image cropping and editing

  const { generateUniqueID } = useContext(UserContext);
  // Using generateUniqueID function from context to create unique file names
  // State for confirmation dialog visibility
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  // Refs to DOM elements for cropping functionality
  const croppingContainerRef = useRef(null);
  const cropBoxRef = useRef(null);
  const cropButtonRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  // Function to convert cropped image data URL to file data object
  function makeFileInfoData(croppedDataURL) {
    let fileToSend = croppedDataURL;

    // Generate a unique filename for the profile picture
    let profilePicName = profilePicInfo?.fileData?.name
      ? generateUniqueID("IMG") + profilePicInfo?.fileData.name
      : generateUniqueID("IMG") + "_captured.jpg"; // Default name if no original filename

    // Create profile picture data object to be saved or uploaded
    let profilePicData = {
      fileName: profilePicName,
      fileType: "image/jpeg",
      fileBaseData: fileToSend, // Base64 encoded image data
      fileURL: `uploads/images/${profilePicName}` // Intended storage path or URL
    };

    return profilePicData;
  };

  // Effect to setup crop box dragging and resizing behavior when profilePicInfo changes
  useEffect(() => {
    if (profilePicInfo != null) {
      // Variables to track drag and resize state and positions
      let isTouch = false, isResizing = false, diffX = 0, diffY = 0, cropBoxStartWidth, cropBoxStartHeight;

      // Get references to DOM elements for cropping
      const croppingContainer = croppingContainerRef.current;
      const cropBox = cropBoxRef.current;
      const cropButton = cropButtonRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const img = imgRef.current;
      img.crossOrigin = "anonymous";
      // Function to handle moving the crop box (dragging)
      function moving(e) {
        const mainRect = croppingContainer.getBoundingClientRect();
        const boxRect = cropBox.getBoundingClientRect();
        // Get current cursor/touch position
        const posX = isTouch ? e.touches[0].clientX : e.clientX;
        const posY = isTouch ? e.touches[0].clientY : e.clientY;

        // Calculate offset between cursor and crop box top-left corner
        diffX = posX - boxRect.left;
        diffY = posY - boxRect.top;

        // Function to update crop box position while dragging
        function dragMove(evt) {
          if (isResizing) return; // Ignore if resizing

          const moveX = isTouch ? evt.touches[0].clientX : evt.clientX;
          const moveY = isTouch ? evt.touches[0].clientY : evt.clientY;

          // Calculate new crop box position relative to container
          let aX = moveX - diffX - mainRect.left;
          let aY = moveY - diffY - mainRect.top;

          // Clamp position to container bounds
          aX = Math.max(0, Math.min(aX, mainRect.width - boxRect.width));
          aY = Math.max(0, Math.min(aY, mainRect.height - boxRect.height));

          // Reset transform and update position
          cropBox.style.transform = "none";
          cropBox.style.left = `${aX}px`;
          cropBox.style.top = `${aY}px`;

          evt.preventDefault();
        }

        // Attach drag move and end event listeners
        document.addEventListener(isTouch ? "touchmove" : "mousemove", dragMove, { passive: false });
        document.addEventListener(isTouch ? "touchend" : "mouseup", () => {
          document.removeEventListener(isTouch ? "touchmove" : "mousemove", dragMove);
        });
      }

      // Function to handle resizing the crop box
      function resizing(e) {
        const mainRect = croppingContainer.getBoundingClientRect();
        const boxRect = cropBox.getBoundingClientRect();
        const posX = isTouch ? e.touches[0].clientX : e.clientX;
        const posY = isTouch ? e.touches[0].clientY : e.clientY;

        // Starting position of pointer
        const startPosX = posX;
        const startPosY = posY;

        // Store initial crop box dimensions
        cropBoxStartWidth = cropBox.offsetWidth;
        cropBoxStartHeight = cropBox.offsetHeight;

        // Function to update crop box size while resizing
        function resizeMove(evt) {
          const currentX = isTouch ? evt.touches[0].clientX : evt.clientX;
          const currentY = isTouch ? evt.touches[0].clientY : evt.clientY;

          // Calculate change in position
          const dx = currentX - startPosX;
          const dy = currentY - startPosY;

          // Calculate new size for crop box (keeping it square)
          let newSize = Math.min(cropBoxStartWidth + dx, cropBoxStartHeight + dy);

          // Clamp size so crop box doesn't exceed container boundaries
          newSize = Math.min(newSize, mainRect.width - boxRect.left + mainRect.left, mainRect.height - boxRect.top + mainRect.top);

          // Reset transform and update size
          cropBox.style.transform = "none";
          cropBox.style.width = `${newSize}px`;
          cropBox.style.height = `${newSize}px`;

          evt.preventDefault();
        }

        // Attach resize move and end event listeners
        document.addEventListener(isTouch ? "touchmove" : "mousemove", resizeMove, { passive: false });
        document.addEventListener(isTouch ? "touchend" : "mouseup", () => {
          document.removeEventListener(isTouch ? "touchmove" : "mousemove", resizeMove);
          isResizing = false;
        });
      }

      // Event listeners for crop box dragging and resizing (mouse and touch)

      // Drag start (mouse) if not on resize handle
      cropBox.addEventListener("mousedown", (e) => {
        if (!e.target.classList.contains("resizeHandleCropBox")) {
          isTouch = false;
          moving(e);
        }
      });
      // Drag start (touch) if not on resize handle
      cropBox.addEventListener("touchstart", (e) => {
        if (!e.target.classList.contains("resizeHandleCropBox")) {
          isTouch = true;
          moving(e);
        }
      });
      // Resize start (mouse) if on resize handle
      cropBox.addEventListener("mousedown", (e) => {
        if (e.target.classList.contains("resizeHandleCropBox")) {
          isTouch = false;
          isResizing = true;
          resizing(e);
        }
      });
      // Resize start (touch) if on resize handle
      cropBox.addEventListener("touchstart", (e) => {
        if (e.target.classList.contains("resizeHandleCropBox")) {
          isTouch = true;
          isResizing = true;
          resizing(e);
        }
      });

      // Crop button click event handler
      cropButton.addEventListener("click", async () => {
        const mainRect = croppingContainer.getBoundingClientRect();
        const boxRect = cropBox.getBoundingClientRect();

        // Calculate scale factors between displayed image and natural image size
        const scaleX = img.naturalWidth / mainRect.width;
        const scaleY = img.naturalHeight / mainRect.height;

        // Calculate cropping rectangle in natural image coordinates
        const cropX = (boxRect.left - mainRect.left) * scaleX;
        const cropY = (boxRect.top - mainRect.top) * scaleY;
        const cropWidth = boxRect.width * scaleX;
        const cropHeight = boxRect.height * scaleY;

        // Check if crop box is valid (not zero sized or positioned at 0,0)
        let isReadyImage = boxRect.left !== 0 || boxRect.top !== 0 || boxRect.width !== 0 || boxRect.height !== 0;
        if (isReadyImage) {
          // Set canvas size (scaled up by 10 for better resolution)
          canvas.width = boxRect.width * 10;
          canvas.height = boxRect.height * 10;

          // Clear canvas and draw cropped image portion onto canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);

          // Convert canvas content to Base64 data URL (PNG format)
          const croppedDataURL = canvas.toDataURL("image/png");

          // Create new file data object from cropped image
          let newFileData = makeFileInfoData(croppedDataURL);

          // Update profile picture info state with new cropped data
          setProfilePicInfo((imgInfo) => ({
            ...imgInfo,
            fileURL: croppedDataURL,
            newFileData,
            isCroped: true,
            isReady: true
          }));

          // Close the profile editing panel after cropping
          setShowProfileEditingPanel(false);
        }
      });
    };
  }, [profilePicInfo]);

  // JSX to render the profile image cropping UI
  return (
    <>
      <div className='fileHandler'>
        <div className="fileHandlerInner">
          <div className="croppingSection filePreviewContainer bg-dark w-full h-full flex justify-between items-center relative">
            <div className="toolbar">
              {/* Button to close profile editing panel and reset profile picture info */}
              <button className="text-gray-500 hover:text-black" onClick={() => {
                setShowConfirmationDialog(true);
              }}>
                <FontAwesomeIcon icon={faTimes} className="text-2xl" />
              </button>
              {/* Button to confirm crop (ref attached for event) */}
              <button ref={cropButtonRef} className="cropButtonRef text-gray-500 hover:text-black">
                <FaCheck className="text-2xl" />
              </button>
            </div>
            <div className="previewBox text-gray-600 flex justify-center items-center">
              <div style={{
                width: `${profilePicInfo?.fileWidth || 350}px`
              }} ref={croppingContainerRef} className='fileContainer croppingContainer relative w-full h-auto overflow-hidden'>
                {/* Display uploaded image */}
                <img ref={imgRef} src={profilePicInfo?.fileURL} alt="Uploaded" className="pointer-events-none w-full h-auto object-cover" />
                {/* Crop box overlay with resize handles */}
                <div ref={cropBoxRef} className="cropBox">
                  <div className="resizeHandleCropBox top-left"></div>
                  <div className="resizeHandleCropBox top-right"></div>
                  <div className="resizeHandleCropBox bottom-left"></div>
                  <div className="resizeHandleCropBox bottom-right"></div>
                </div>
                {/* Hidden canvas for cropping operation */}
                <canvas ref={canvasRef} className="hideCanvas"></canvas>
              </div>
            </div>
          </div>
        </div>
        {
          // Show confirmation dialog when user wants to discard the changes
          showConfirmationDialog &&
          <ConfirmationDialog
            textMsg={"Are you sure you want to discard the changes?"}
            handleConfirmAction={() => {
              setShowConfirmationDialog(false);
              setShowProfileEditingPanel(false);
              setProfilePicInfo(null);
            }}
            setShowConfirmationDialog={setShowConfirmationDialog}
          />
        }
      </div>
    </>

  );
};

export default HandleProfileImage;
