import { useContext, useEffect, useRef, useState } from 'react';
import { BsCamera, BsXCircle } from "react-icons/bs";
import { UserContext } from '@context/UserContext';

function CameraFrame({ setShowCameraPanel, setCaptureImage }) {
    const {
        currentCallData
    } = useContext(UserContext);
    // State to manage the image camera stream
    const [cameraForImage, setCameraForImage] = useState(false);
    const imageCameraRef = useRef(null); // Reference to the image camera video element
    const [imageStream, setImageStream] = useState(null); // Holds the media stream for the image camera

    // Function to start the image camera
    const startImageCamera = async () => {
        setCameraForImage(true); // Set state to show the image camera
        try {
            // Request access to the user's webcam for image capture
            const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setImageStream(newStream); // Set the image stream
            imageCameraRef.current.srcObject = newStream; // Set the video element's source to the stream
        } catch (error) {
            console.error('Error accessing webcam:', error); // Handle any errors
        }
    };

    // Function to capture the image from the video stream
    const captureImage = async () => {
        try {
            // Create a canvas element to capture the image from the video stream
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = imageCameraRef.current.videoWidth; // Set canvas width to video width
            canvas.height = imageCameraRef.current.videoHeight; // Set canvas height to video height

            // Apply a horizontal flip to the context if needed
            context.save();
            context.scale(-1, 1); // Flip the context horizontally
            context.translate(-canvas.width, 0);

            // Draw the video image onto the canvas
            context.drawImage(imageCameraRef.current, 0, 0, canvas.width, canvas.height);

            // Restore the transformation matrix to default
            context.restore();

            // Convert the canvas to a blob (image)
            canvas.toBlob(async (blob) => {
                if (blob) {
                    // Create a preview URL for the captured image
                    const previewItemUrl = URL.createObjectURL(blob);
                    // Send the captured image data to the parent component
                    setCaptureImage((imgInfo) => ({
                        ...imgInfo,
                        fileURL: previewItemUrl,
                        fileWidth: 600,
                        isCaptured: true // Indicate that an image has been captured
                    }));
                    // Close the camera panel
                    setShowCameraPanel(false);
                    closeImageCamera(); // Close the camera after capture
                }
            }, 'image/png'); // Specify the image format as PNG
        } catch (error) {
            console.error('Error capturing image:', error); // Handle any errors
        }
    };

    // Function to close the image camera
    const closeImageCamera = () => {
        setCameraForImage(false); // Set state to hide the image camera
        if (imageStream) {
            imageStream.getTracks().forEach(track => track.stop()); // Stop the media stream
        }
        if (imageCameraRef.current) {
            imageCameraRef.current.srcObject = null; // Clear the video element's source
        }
        setImageStream(null); // Reset the image stream state
    };

    useEffect(() => {
        startImageCamera(); // Start the image camera when the component mounts
    }, []);
    // Close the camera panel  when user get or make a call
    useEffect(() => {
        if (currentCallData != null) {
            setShowCameraPanel(false); // Close the camera panel
            closeImageCamera(); // Stop the camera
        };
    }, [currentCallData]);
    return (
        <div className="cameraContainer flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
            {/* Image Camera Preview */}
            <div className="w-full h-full relative bg-black rounded-0 overflow-hidden">
                <video
                    ref={imageCameraRef}
                    autoPlay
                    id="image_Cam_Preview"
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)', display: cameraForImage ? 'block' : 'none' }} // This removes the mirroring effect
                />
            </div>
            <div className="camera_controls_container mt-4">
                {/* Image Camera Controls */}
                <div style={{ display: cameraForImage ? 'flex' : 'none' }} className="image_camera_controls mt-4 space-x-4">
                    <button
                        id="closeBtn"
                        onClick={() => {
                            setShowCameraPanel(false); // Close the camera panel
                            closeImageCamera(); // Stop the camera
                        }}
                        className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-800 flex items-center justify-center focus:outline-none transition duration-300 ease-in-out transform"
                    >
                        <BsXCircle className="w-7 h-7" />
                    </button>

                    <button
                        id="captureBtn"
                        onClick={captureImage} // Capture the image on click
                        className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-800 flex items-center justify-center focus:outline-none transition duration-300 ease-in-out transform"
                    >
                        <BsCamera className="w-7 h-7" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CameraFrame;
