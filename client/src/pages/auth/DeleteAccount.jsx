import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiLockClosed, HiEnvelope } from "react-icons/hi2";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { UserContext } from '@context/UserContext';
import { ProgressBar, InputBox } from "@components";
import axios from 'axios';
export default function DeleteAccount() {
    useEffect(() => {
        document.title = 'Delete Account - My Talking – Smart & Secure Real-Time Chat App'
    }, []);
    // Get current user ID, websocket function, email verification status, and user data getter from context
    const { currentUserID, sendWebSocketMessage, getSingleUserData, wbServer, logoutUser } = useContext(UserContext);
    // Get the current user's full data
    let currentUserData = getSingleUserData(currentUserID);
    // Step state to manage multi-step form (1: password verification, 2: OTP verification)
    const [step, setStep] = useState(1);
    // React Router navigation hook
    const navigate = useNavigate();
    // State for email input
    const [email, setEmail] = useState("");
    // State for password input
    const [password, setPassword] = useState("");
    // Loading state for async actions
    const [loading, setLoading] = useState(false);
    // State for OTP input
    const [otp, setOtp] = useState('');

    // timer for resend OTP
    const [timer, setTimer] = useState(0);
    const timerRef = useRef(null);
    // Start countdown from 60 seconds
    const startTimer = () => {
        setTimer(60); // you can change this to any value (e.g., 120)
    };
    // Countdown effect
    useEffect(() => {
        if (timer > 0) {
            timerRef.current = setTimeout(() => setTimer(prev => prev - 1), 1000);
        } else {
            clearTimeout(timerRef.current);
        }
        return () => clearTimeout(timerRef.current);
    }, [timer]);
    const generateOTP = async () => {
        // Send POST request to verify password
        axios.post(`${import.meta.env.VITE_API_URL}api/auth/send-otp-for-account-delete`,
            { email, password },
            { withCredentials: true }
        )
            .then((response) => {
                // Show success toast message
                toast.success(response?.data?.message);
                // Move to OTP verification step
                setStep(2);
                startTimer(); // Start OTP resend timer
                // Set loading while deletion process runs
                setLoading(false);
            })
            .catch((err) => {
                // Show error toast on failure
                toast.error(err.response.data.message);
            });
    };
    // Handle submission of email and password for verification before account deletion
    const handleVerifyAccount = async () => {
        try {
            // Check if email and password are provided
            if (email != "" && password != "") {
                generateOTP();
                // Set loading while deletion process runs
                setLoading(true);
            } else {
                // Show error toast if form incomplete
                toast.error("Please Complete the form !")
            };
        } catch (error) {
            // Show error toast if verification fails
            toast.error(error?.response?.data?.message);
        }
    };

    // Handle submission of OTP to confirm account deletion
    const handleOtpSubmit = async () => {
        try {
            // Check if OTP input is not empty
            if (otp != '') {
                // Send POST request to verify OTP for delete account action
                axios.post(`${import.meta.env.VITE_API_URL}api/auth/verify-otp`, { email, otp, actionType: "deleteAccount" })
                    .then((response) => {
                        // Notify server about user account deletion via WebSocket
                        sendWebSocketMessage("delete:user:account", "currentUserID", currentUserID);
                        // Set loading while deletion process runs
                        setLoading(true);
                    })
                    .catch((err) => {
                        // Show error toast on failure
                        toast.error(err.response.data.message);
                    });
            } else {
                // Show error toast if OTP not entered
                toast.error("Please enter otp !")
            };
            // Redirect to login or home page could be added here
        } catch (error) {
            // Show error toast if OTP verification fails
            toast.error(error.response.data.message);
        }
    };
    // Handle incoming WebSocket messages to update UI accordingly
    function handleCommingWebSocketMessage(event) {
        const webSocketMessageData = JSON.parse(event.data);

        switch (webSocketMessageData.type) {
            case 'deleted:user:account':
                setLoading(false); // Hide the loading animation
                setStep(3); //for displaying the success message
                toast.success("Your account has been deleted successfully!");
                setTimeout(() => {
                    logoutUser(); // Force logout for deleted account
                }, 2000);
                break;
        }
    }

    // Add WebSocket event listener on mount and remove on unmount
    useEffect(() => {
        wbServer.addEventListener("message", handleCommingWebSocketMessage);

        return () => {
            wbServer.removeEventListener("message", handleCommingWebSocketMessage);
        };
    }, [wbServer, handleCommingWebSocketMessage]);
    return (
        <React.Fragment>
            {/* Toast container to show success or error messages */}
            <ToastContainer />
            {/* Show loading animation if loading */}
            {loading && <ProgressBar
                position={'fixed'}
            />}
            <div className="accountFormPage primeryBgColor overflow-y-auto h-screen flex">
                <div className="accountFormContainer relative">
                    <div className='formContainer'>
                        <h2 className="text-xl text-center text-red-600">Delete Account</h2>
                        <div className="w-full flex flex-col gap-y-3">
                            {
                                step === 1 &&
                                <>
                                    {/* Instruction text for step 1 */}
                                    <p className="text-sm text-center text-gray-600 mt-1">Please enter your email and password to verify your account</p>
                                    <div className="w-full h-auto">
                                        {/* Email input field */}
                                        <InputBox
                                            name="email"
                                            label="Email"
                                            inputType="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            setValue={setEmail}
                                            inputIcon={HiEnvelope}
                                        />
                                    </div>
                                    <div className="w-full h-auto">
                                        {/* Password input field */}
                                        <InputBox
                                            name="password"
                                            label="Password"
                                            inputType="password"
                                            placeholder="Enter your password"
                                            value={password}
                                            setValue={setPassword}
                                            inputIcon={HiLockClosed}

                                        />
                                    </div>
                                    {/* Link for forgot password navigation */}
                                    <div className='flex justify-center text-center text-lg text-gray-600'>
                                        Forgot
                                        <p style={{ color: "rgb(114 ,105 ,239)" }} className='ml-1 cursor-pointer' onClick={() => { navigate("/auth/reset-password") }}>Passowrd?</p>
                                    </div>
                                    {/* Button to submit password verification */}
                                    <div className='flex justify-center w-full'>
                                        <button type="submit" className="okBtn bg-red-600 " onClick={handleVerifyAccount}>
                                            Verify Account
                                        </button>
                                    </div>
                                </>
                            }
                            {
                                step === 2 &&
                                <>
                                    {/* Instruction text for step 2 */}
                                    <p className="text-sm text-center text-gray-600 mt-1">Please verify otp to delete your account</p>
                                    <div className="w-full h-auto">
                                        {/* OTP input field */}
                                        <InputBox
                                            name="otp"
                                            label="OTP"
                                            inputType="text"
                                            placeholder="Enter your otp"
                                            value={otp}
                                            setValue={setOtp}
                                            inputIcon={HiLockClosed}

                                        />
                                    </div>
                                    {timer > 0 ? (
                                        <p className='text-gray-500'>
                                            Resend OTP in 00:{String(timer).padStart(2, '0')}
                                        </p>
                                    ) : (
                                        <button onClick={() => {
                                            generateOTP();
                                        }} className='text-gray-500'>Resend OTP</button>
                                    )}
                                    {/* Button to submit OTP and confirm deletion */}
                                    <div className='flex justify-center w-full'>
                                        <button type="submit" className="okBtn bg-red-600 " onClick={handleOtpSubmit}>
                                            Delete Account
                                        </button>
                                    </div>
                                </>
                            }
                        </div>
                        {
                            // Conditional link based on whether user is already deleted or not
                            !currentUserData?.isDeleted ?
                                <div className='flex justify-center text-center text-md mt-2'>
                                    {/* Cancel link navigates back to home */}
                                    <p className='cursor-pointer text-blue-500' onClick={() => {
                                        navigate("/")
                                    }}>Cancel and go back</p>
                                </div>
                                :
                                <div className='flex justify-center text-center text-md mt-2'>
                                    {/* Cancel link navigates back to login if account deleted */}
                                    <p className='cursor-pointer text-blue-500' onClick={() => {
                                        navigate("/auth/login")
                                    }}>Cancel and go back</p>
                                </div>
                        }
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}