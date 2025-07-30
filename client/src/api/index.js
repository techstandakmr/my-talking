// Importing axios for making HTTP requests
import axios from "axios";

// Creating an axios instance with baseURL and credentials enabled
const API = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}api`,  // Base URL for all API endpoints
    withCredentials: true // Sends cookies with requests
});
// Main server URL (can be used for accessing static resources or outside API base path)
const mainUrl = `${import.meta.env.VITE_API_URL}`;

// ==========================
//        User APIs
// ==========================

// Registers a new user
const userSignup = async (data) => await API.post("/auth/userSignup", data);

// Logs in an existing user
const userLogin = async (data) => await API.post("/auth/userLogin", data);

// Fetches profile data of the logged-in user
const userProfile = async () => await API.get("/auth/userProfile");

// Logs out the current user
const userLogout = async () => await API.post(`/auth/userLogout`);

// Fetches data of all users
const fetchUsersData = async () => await API.get(`/fetchAllUsers`);

// Updates user data (e.g. name, avatar, etc.)
const updateUserData = async (data) => await API.patch(`/updateUserData`, data);

// ==========================
//        Chat APIs
// ==========================

// Creates a new chat (user-to-user or group)
const createChat = async (data) => await API.post(`/createChat`, data);

// Fetches all chat data related to the user
const fetchChatsData = async () => await API.get(`/fetchAllChats`);

// Updates existing chat data (e.g. name, members, etc.)
const updateChatData = async (data) => await API.patch(`/updateChatData`, data);

// ==========================
//       Story APIs
// ==========================

// Fetches all active stories of users
const fetchStoriesData = async () => await API.get("/fetchStoriesData");

// ==========================
//        Call APIs
// ==========================

// Updates call details (e.g. status, duration)
const updateCallData = async (data) => await API.patch("/updateCallData", data);

// Fetches call history or logs
const fetchCallsData = async () => await API.get("/fetchCallsData");

// ==========================
//       Group APIs
// ==========================

// Fetches data of all group chats
const fetchGroupsData = async (data) => await API.get("/fetchGroupsData");

// ==========================
//   Chat Broadcast APIs
// ==========================

// Updates existing broadcast details
const updateChatBroadcast = async (data) => await API.patch("/updateChatBroadcast", data);

// Fetches all chat broadcasts
const fetchChatBroadcastsData = async (data) => await API.get("/fetchChatBroadcastsData");

// ==========================
//      Exporting APIs
// ==========================

export {
    // User-related exports
    mainUrl,
    userSignup,
    userLogin,
    userLogout,
    userProfile,
    fetchUsersData,
    updateUserData,

    // Chat-related exports
    createChat,
    fetchChatsData,
    updateChatData,

    // Story-related export
    fetchStoriesData,

    // Call-related exports
    updateCallData,
    fetchCallsData,

    // Group-related exports
    fetchGroupsData,

    // Chat broadcast-related exports
    updateChatBroadcast,
    fetchChatBroadcastsData
};