import React, { useState, useContext, useEffect } from 'react';
import { UserContext } from '@context/UserContext';
import { userSignup } from "@api"
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import { HiEnvelope, HiLockClosed, HiUser } from "react-icons/hi2";
import { ProgressBar, InputBox } from "@components";
import { nanoid } from 'nanoid';
export default function SignupForm() {
  useEffect(() => {
    document.title = 'Signup - My Talking – Smart & Secure Real-Time Chat App'
  }, []);
  // Get context values and functions from UserContext
  const {
    getColorForName,
    logoutUser,
  } = useContext(UserContext);

  // Hook for navigation
  const navigate = useNavigate();

  // State variables for user input and loading states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // loading state for signup process
  const [isNeedToVerify, setIsNeedToVerify] = useState(false); // state to show verification message

  // Handle form submit event
  const handleSubmit = (e) => {
    e.preventDefault();
    logoutUser() // Ensure user is logged out before signup

    // Check if all fields are filled
    if (name != "" && email != "" && password != "") {
      setLoading(true); // show loading spinner

      // Prepare new user data for signup API
      const newUserData = {
        username: name.toLowerCase().replace(/\s+/g, "") + nanoid(6), // Generate simple username without spaces
        profileInfo: {
          // Store name as JSON to support emojis or complex formats later
          name: JSON.stringify([{ type: 'text', value: name }]),
          profilePic: "", // Default empty profile picture
          bgColor: getColorForName(name), // Assign background color based on name
          about: JSON.stringify([{ type: 'text', value: `I am ${name}, chato app user` }]) // Default about text
        },
        password: password, // Password to be hashed server-side (not plain text)
        email: email,
        // others data will be adjusted in server side
      };

      // Clear input fields after form submission
      setEmail("");
      setName("");
      setPassword("");

      // Call userSignup API with newUserData
      userSignup({ newUserData })
        .then((response) => {
          // If verification needed, update state to show verification message
          if (response?.data?.isNeedToVerify) {
            setIsNeedToVerify(true);
          };
          setLoading(false); // hide loading spinner after success
        })
        .catch((error) => {
          setLoading(false); // hide loading spinner on error
          toast.error(error?.response?.data?.message) // show error toast
        })
    } else {
      // Show error toast if form is incomplete
      toast.error("Please Complete the form !")
    }
  };

  // Render component UI
  return (
    <React.Fragment>
      {/* Toast container for notifications */}
      < ToastContainer />
      {
        // Show loading animation if loading state is true
        loading &&
        <ProgressBar
          position={'fixed'}
        />
      }
      {
        // If verification not needed, show signup form
        !isNeedToVerify ?
          <div className="accountFormPage primeryBgColor overflow-y-auto h-screen flex">
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
                <h2 className="text-xl text-center text-gray-600">Sign up</h2>
                <form onSubmit={handleSubmit} className="w-full h-full">
                  <div className="w-full h-auto">
                    <InputBox
                      name="name"
                      label="Name"
                      inputType="text"
                      placeholder="Enter your name"
                      value={name}
                      setValue={setName}
                      inputIcon={HiUser} // Icon for name input field
                      
                    />
                  </div>
                  <div className="w-full h-auto">
                    <InputBox
                      name="email"
                      label="Email"
                      inputType="email"
                      placeholder="Enter your email"
                      value={email}
                      setValue={setEmail}
                      inputIcon={HiEnvelope} // Icon for email input field
                      
                    />
                  </div>
                  <div className="w-full h-auto">
                    <InputBox
                      name="password"
                      label="Password"
                      inputType="password"
                      placeholder="Please Enter your password"
                      value={password}
                      setValue={setPassword}
                      inputIcon={HiLockClosed} // Icon for password input field
                      
                    />
                  </div>
                  <div className='flex justify-center w-full'>
                    <button type="submit" className="okBtn">Signup</button> {/* Submit button */}
                  </div>
                </form>
                <div className='text-center text-md text-gray-600'>
                  Do you have already an account?
                  <span style={{ color: "rgb(114 ,105 ,239)" }} className='ml-1 cursor-pointer' onClick={() => { navigate("/auth/login"); }}>
                    Sign in {/* Navigate to login page */}
                  </span>
                </div>
              </div>
            </div>
          </div>
          :
          // If verification needed, show verification message
          <div className='accountFormPage primeryBgColor overflow-y-auto h-screen flex'>
            <div className="accountFormContainer">
              <div className='formContainer'>
                <h2 style={{ color: "#3b82f6" }} className="text-center">Check Your Inbox 📬</h2>
                <p style={{ color: "#444", fontSize: "16px" }} className="text-center">
                  We've sent a verification link to your email.
                </p>
                <p style={{ color: "#555", fontSize: "14px" }} className="text-center">
                  Please open your inbox and click on the verification link to activate your account.
                </p>
                <p style={{ color: "#999", fontSize: "13px", marginTop: "20px" }} className="text-center">
                  Didn’t receive the email? Check your spam folder or try again later.
                </p>
              </div>
            </div>
          </div>
      }
    </React.Fragment>
  )
}
