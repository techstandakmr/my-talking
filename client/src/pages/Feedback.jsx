import React, { useContext, useEffect, useState } from 'react'
import { UserContext } from '../context/UserContext';
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { HiUser, HiPencil } from "react-icons/hi2";
import { ProgressBar, InputBox } from "@components";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { validateComment } from "@utils/formValidators.js";
export default function FeedbackForm() {
  const {
    getSingleUserData,
    currentUserID
  } = useContext(UserContext);
  // Get the current logged-in user's data
  let currentUserData = getSingleUserData(currentUserID);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState(currentUserData?.email);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    document.title = 'Feedback - My Talking – Smart & Secure Real-Time Chat App'
  }, []);
  // Hook for programmatic navigation
  const navigate = useNavigate();
  const handleSubmit = async () => {
    if (!name || !title || !email || !comment) {
      toast.error("Please fill in all fields!");
      return;
    }
    // feedback email message
    let html = `
    <div style="max-width: 600px; margin: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif; background-color: #f7f9fc; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
    <div style="
    width: 136px; margin: auto; padding: 10px;
    display: flex; justify-content: center; align-items: center;
    ">
            <a href="https://my-talking.onrender.com" target="_blank">
            <img src="https://res.cloudinary.com/dn0hsbnpl/image/upload/v1750832972/chat_uploads/tjmw2twyqoanavs7gdcp.png" alt="App logo" style="width: 100%;"/>
            </a>
          </div>
      <div style="text-align: center;">
          <h2 style="color: #3b82f6;">New Feedback Received 📨</h2>
      </div>
      <p style="font-size: 15px; color: #444;">You've received a new feedback submission. Here are the details:</p>
      
      <div style="margin: 20px 0; padding: 15px; background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px;">
          <p style="margin: 8px 0; font-size: 15px;"><strong>Name:</strong> ${name}</p>
          <p style="margin: 8px 0; font-size: 15px;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 8px 0; font-size: 15px;"><strong>Title:</strong> ${title}</p>
          <p style="margin: 8px 0; font-size: 15px;"><strong>Comment:</strong></p>
          <p style="margin: 0; font-size: 14px; color: #555; white-space: pre-line;">${comment}</p>
      </div>

      <p style="font-size: 13px; color: #999; text-align: center; margin-top: 30px;">
          © ${new Date().getFullYear()} My Talking. All rights reserved.
      </p>
  </div>
`;
    let subject = "User feedback";
    setLoading(true);
    try {
      // Send GET request to backend to verify email using the token
      axios.post(`${import.meta.env.VITE_API_URL}api/feedback`, { to: email, subject, html }, { withCredentials: true })
        .then((response) => {
          toast.success("Feedback submitted successfully!");
          // Clear form
          setName("");
          setTitle("");
          setEmail("");
          setComment("");
          setLoading(false);
        })
        .catch((err) => {
          setLoading(false);
          toast.error("Feedback submitting failed!");
        });
    } catch (err) {
      // On error, update status to indicate failure
      setLoading(false);
      toast.error("Feedback submitting failed!");
    }
  };

  return (
    <React.Fragment>
      <ToastContainer />
      {loading && <ProgressBar
        position={'fixed'}
      />}
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
          <div className="formContainer">
            <h2 className="text-xl text-center">Send Feedback</h2>
            <div className="w-full h-full flex flex-col gap-y-4">
              <div className="w-full h-auto">
                <InputBox
                  name="name"
                  label="Name"
                  inputType="text"
                  placeholder="Enter your name"
                  value={name}
                  setValue={setName}
                  inputIcon={HiUser}
                />
              </div>
              <div className="w-full h-auto">
                <InputBox
                  name="title"
                  label="Title"
                  inputType="text"
                  placeholder="Enter a title"
                  value={title}
                  setValue={setTitle}
                  inputIcon={HiPencil}
                />
              </div>
              <div className="w-full h-auto">
                <label htmlFor="comment" className="block mb-1 text-md font-normal text-gray-600">Comment</label>
                <div className="formInputContainer">
                  <textarea
                    name="comment"
                    id="comment"
                    className="w-full p-2 text-gray-600 text-md block outline-none"
                    placeholder="Write your feedback or comment"
                    value={comment}
                    onChange={(e) => {
                      let value = e.target.value;
                      setComment(value);
                      const { isValid, error } = validateComment(value);
                      if (!isValid) {
                        setCommentError(error);
                      } else {
                        setCommentError('');
                      }
                    }}
                  />
                </div>
                {
                  commentError && <p className={`text-red-500 text-sm m-0`}>{commentError}</p>
                }
              </div>
              <div className='flex justify-center w-full'>
                <button type="submit" className="okBtn" onClick={handleSubmit}>Submit Feedback</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
