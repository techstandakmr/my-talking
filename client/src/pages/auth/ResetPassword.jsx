import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiLockClosed, HiEnvelope } from "react-icons/hi2";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { UserContext } from '@context/UserContext';
import { ProgressBar, InputBox } from "@components";
import axios from 'axios';
export default function ResetPassword() {
    useEffect(() => {
        document.title = 'Reset Password - My Talking – Smart & Secure Real-Time Chat App'
    }, []);
    // Destructure values from UserContext
    const { currentUserID, sendWebSocketMessage, logoutUser, getSingleUserData } = useContext(UserContext);
    // Get current user data using user ID
    let currentUserData = getSingleUserData(currentUserID);

    // Step state to control form flow (1: email, 2: OTP, 3: new password)
    const [step, setStep] = useState(1);

    // Initialize navigate function for routing
    const navigate = useNavigate();

    // State variables for form inputs
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false); // Loading indicator for async operations
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
        axios.post(`${import.meta.env.VITE_API_URL}api/auth/send-otp-for-reset-password`, { email })
            .then((response) => {
                toast.success(response?.data?.message); // Show success toast
                setStep(2); // Move to OTP verification step
                startTimer();
                setLoading(false);
            })
            .catch((err) => {
                // Show error toast on failure
                toast.error(err.response.data.message);
            });
    };
    // Handle submitting email to send OTP
    const handleVerifyEmail = async () => {
        try {
            if (email != "") {
                // Send request to backend to send OTP for password reset
                generateOTP();
                // Set loading while deletion process runs
                setLoading(true);
            } else {
                toast.error("Please Complete the form !") // Show error if email is empty
            };
        } catch (error) {
            // Show error toast if request fails
            toast.error(error?.response?.data?.message);
        }
    };

    // Handle submitting OTP for verification
    const handleOtpSubmit = async () => {
        try {
            if (otp != '') {
                // Send request to verify OTP
                axios.post(`${import.meta.env.VITE_API_URL}api/auth/verify-otp`, { email, otp, actionType: "resetPassword" })
                    .then((response) => {
                        setStep(3); // Proceed to password reset step
                        toast.success(response?.data?.message); // Show success toast
                    })
                    .catch((err) => {
                        // Show error toast on failure
                        toast.error(err.response.data.message);
                    });
            } else {
                toast.error("Please enter otp !") // Show error if OTP is empty
            };
            // Redirect to login or home page could be handled here after success
        } catch (error) {
            // Show error toast if OTP verification fails
            toast.error(error.response.data.message);
        }
    };

    // Handle resetting the password after OTP verification
    async function handleResetPassword() {
        // Define filter condition to identify user by email or ID
        let filterCondition = { $or: [{ email: email }, { _id: currentUserID }] };
        // Define update operation to set new password
        let updateOperation = {
            $set: { password: password }
        };
        setLoading(true); // Show loading animation during request
        axios.patch(`${import.meta.env.VITE_API_URL}api/auth/reset-password`, { filterCondition, updateOperation })
            .then((response) => {
                setLoading(false); // Hide loading animation
                toast.success("Password reset successfully"); // Show success message
                setTimeout(() => {
                    logoutUser()
                }, 1000);
            })
            .catch((err) => {
                toast.error(err.response.data.message);
                setLoading(false); // hide loading animation
            });
    };

    return (
        <React.Fragment>
            {/* Toast container for notifications */}
            <ToastContainer />
            {/* Show loading animation while loading */}
            {loading && <ProgressBar
                position={'fixed'}
            />}
            <div className="accountFormPage primeryBgColor overflow-y-auto h-screen flex">
                <div className="accountFormContainer relative">
                    <div className='m-auto flex items-center justify-center' style={{
                        width: "136px",
                        margin: 'auto',
                        padding: '10px'
                    }}>
                        <img src="https://res.cloudinary.com/dn0hsbnpl/image/upload/v1750832972/chat_uploads/tjmw2twyqoanavs7gdcp.png" alt="App logo" className='w-full' onClick={() => {
                            navigate("/");
                        }} />
                    </div>
                    <div className='formContainer'>
                        <h2 className="text-xl text-center text-red-600">Reset Password</h2>
                        <div className="w-full flex flex-col gap-y-3">
                            {
                                // Step 1: Email input for OTP sending
                                step === 1 &&
                                <>
                                    <p className="text-sm text-center text-gray-600 mt-2">Please enter your email to reset your password</p>
                                    <div className="w-full h-auto">
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
                                    <div className='flex justify-center w-full'>
                                        <button type="submit" className="okBtn bg-red-600 " onClick={handleVerifyEmail}>
                                            Verify Email
                                        </button>
                                    </div>
                                </>
                            }
                            {
                                // Step 2: OTP input for verification
                                step === 2 &&
                                <>
                                    <p className="text-sm text-center text-gray-600 mt-1">Please verify otp to reset your password</p>
                                    <div className="w-full h-auto">
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
                                    <div className='flex justify-center w-full'>
                                        <button type="submit" className="okBtn bg-red-600 " onClick={handleOtpSubmit}>
                                            Enter OTP
                                        </button>
                                    </div>
                                </>
                            }
                            {
                                // Step 3: New password input to finalize reset
                                step == 3 &&
                                <>
                                    <p className="text-sm text-center text-gray-600 mt-1">Please enter new password</p>
                                    <div className="w-full h-auto">
                                        <InputBox
                                            name="password"
                                            label="New Password"
                                            inputType="password"
                                            placeholder="Enter your password"
                                            value={password}
                                            setValue={setPassword}
                                            inputIcon={HiLockClosed}
                                            
                                        />
                                    </div>
                                    <div className='flex justify-center w-full'>
                                        <button type="submit" className="okBtn bg-red-600 " onClick={handleResetPassword}>
                                            Reset Password
                                        </button>
                                    </div>
                                </>
                            }
                        </div>
                        {
                            // Show cancel button with different navigation depending on if account is deleted
                            !currentUserData?.isDeleted ?
                                <div className='flex justify-center text-center text-md mt-2'>
                                    <p className='cursor-pointer text-blue-500' onClick={() => {
                                        navigate("/")
                                    }}>Cancel and go back</p>
                                </div>
                                :
                                <div className='flex justify-center text-center text-md mt-2'>
                                    <p className='cursor-pointer text-blue-500' onClick={() => {
                                        navigate("/auth/login");
                                    }}>Cancel and go back</p>
                                </div>
                        }
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}
