import React, { useContext, useEffect, useState } from 'react'
import { ProgressBar, InputBox } from "@components";
import { UserContext } from '@context/UserContext';
import { userLogin } from "@api"
import { ToastContainer, toast } from "react-toastify"
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import { HiEnvelope, HiLockClosed } from "react-icons/hi2";
export default function LoginForm() {
  // Destructure context variables for user ID and loading states
  const {
    setCurrentUserID,
    setShowLoading,
  } = useContext(UserContext);
  useEffect(() => {
    document.title = 'Login - My Talking – Smart & Secure Real-Time Chat App'
  }, []);
  // State variables for email, password, and loading spinner
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // loading indicator during login process

  // Initialize navigate function for routing
  const navigate = useNavigate()

  // Handle form submission for login
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate email and password are not empty
    if (email != "" && password != "") {
      setLoading(true); // show loading spinner when login starts
      setEmail(""); // clear email input
      setPassword(""); // clear password input

      const data = { email, password };

      // Call login API
      userLogin(data)
        .then((response) => {
          toast.success("Success Notification !"); // show success toast

          // Set current user ID in context
          setCurrentUserID(response?.data?.foundUser?._id);

          // Set cookie with expiration date 7 days from now
          const expireDate = new Date();
          expireDate.setDate(expireDate.getDate() + 7); // 7 days from now
          document.cookie = `currentUserID=${response?.data?.foundUser?._id}; path=/; expires=${expireDate.toUTCString()}`;

          setLoading(false); // hide local loading spinner
          setShowLoading(true); // show loading on home page until data loads

          // Navigate to home page after successful login
          navigate("/");
        })
        .catch((error) => {
          setLoading(false); // hide loading spinner on failure
          toast.error(error?.response?.data?.message) // show error toast
        })
    } else {
      // Show error if form is incomplete
      toast.error("Please Complete the form !")
    }
  }

  return (
    <React.Fragment>
      <div className="accountFormPage primeryBgColor overflow-y-auto h-screen flex">
        {
          // Show loading animation if loading is true
          loading &&
          <ProgressBar
            position={'fixed'}
          />
        }
        <div className="accountFormContainer">
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
            <h2 className="text-xl text-center text-gray-600">Sign in</h2>
            {/* Login form */}
            <form onSubmit={handleSubmit} className="w-full h-full">
              <div className="w-full h-auto">
                {/* Email input box */}
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
                {/* Password input box */}
                <InputBox
                  name="password"
                  label="Password"
                  inputType="password"
                  placeholder="Please Enter your password"
                  value={password}
                  setValue={setPassword}
                  inputIcon={HiLockClosed}

                />
              </div>
              <div className='flex justify-center w-full'>
                {/* Submit button */}
                <button type="submit" className="okBtn">Sign in</button>
              </div>
            </form>
            {/* Forgot password link */}
            <div className='flex justify-center text-center text-md text-gray-600'>
              Forgot
              <p style={{ color: "rgb(114 ,105 ,239)" }} className='ml-1 cursor-pointer' onClick={() => { navigate("/auth/reset-password") }}>Passowrd?</p>
            </div>
            {/* Signup link for users without account */}
            <div className='text-center text-md text-gray-600'>
              Don you not have an account ?
              <span style={{ color: "rgb(114 ,105 ,239)" }} className='ml-1 cursor-pointer' onClick={() => { navigate("/auth/signup") }}>Signup</span>
            </div>
          </div>
        </div>
      </div>
      {/* Toast container to show notifications */}
      <ToastContainer />
    </React.Fragment>
  )
}
