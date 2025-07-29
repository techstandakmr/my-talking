import { useContext, useEffect,  useState, } from 'react'
import { UserContext } from '@context/UserContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from "react-toastify";
export default function EmailVerification() {
    useEffect(() => {
        document.title = 'Email Verification - My Talking – Smart & Secure Real-Time Chat App'
    }, []);
    // State to track verification status message
    const [status, setStatus] = useState("Verifying...");
    // Access isEmailVerifying ref from context to indicate verification in progress
    const { isEmailVerifying } = useContext(UserContext);
    // Hook for programmatic navigation
    const navigate = useNavigate();

    useEffect(() => {
        // Mark email verification process as active
        isEmailVerifying.current = true;
        // Async function to verify email token from URL
        const verify = async () => {
            // Extract token parameter from URL query string
            const token = new URLSearchParams(window.location.search).get("token");
            try {
                // Send GET request to backend to verify email using the token
                axios.get(`${import.meta.env.VITE_API_URL}api/auth/verify-email-create-user?token=${token}`)
                    .then((response) => {
                        // Update status to indicate success
                        setStatus("verified");
                        // Mark verification process as finished
                        isEmailVerifying.current = false;
                    })
                    .catch((err) => {
                        setStatus("failed");
                        isEmailVerifying.current = false;
                        // Show error toast on failure
                        toast.error(err?.response?.data?.message || err?.response?.message);
                    });
            } catch (error) {
                // On error, update status to indicate failure
                setStatus("failed");
            }
        };
        // Call the verification function on component mount
        verify();
    }, []);

    return (
        <>
            {/* Toast container to show success or error messages */}
            <ToastContainer />
            <div className='accountFormPage primeryBgColor overflow-y-auto h-screen flex'>
                <div className="accountFormContainer">
                    <div className='formContainer'>
                        {
                            // Show "Verifying..." message while processing
                            status == "Verifying..." ?
                                <p style={{ color: "#999" }} className="text-center">
                                    {status}
                                </p>
                                :
                                <>
                                    {/* Show success or failure message based on status */}
                                    <p className={`text-center ${status === "verified" ? "text-green-500" : "text-red-500"}`}>
                                        {status === "verified" ? "Email verified successfully!" : "Verification failed or link expired."}
                                    </p>
                                    {
                                        // Show clickable "Please login" text on successful verification
                                        status === "verified" &&
                                        <h2 style={{ color: "#3b82f6", }} className="text-center cursor-pointer" onClick={() => {
                                            navigate("/auth/login") //navigate to the login page
                                        }}>Now you can login</h2>
                                    }
                                    {
                                        // Show clickable "Please signup again" text on failed verification
                                        status === "failed" &&
                                        <h2 style={{ color: "#3b82f6", }} className="text-center cursor-pointer" onClick={() => {
                                            navigate("/auth/signup") //navigate to the signup page
                                        }}>Please try again</h2>
                                    }
                                </>
                        }
                    </div>
                </div>
            </div>
        </>
    );
};
