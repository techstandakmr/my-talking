# 💬 My Talking

**My Talking** is a real-time, full-featured communication platform built using the MERN stack, WebRTC, and WebSocket. It supports secure user authentication, private and group messaging, media sharing, AI chat assistant, advanced privacy settings, dark mode, and much more.

🌐 **Live App**: [https://my-talking.onrender.com](https://my-talking.onrender.com)

---

## 🚀 Technologies Used

- **Frontend**: React.js + Tailwind CSS  
- **Backend**: Node.js + Express.js  
- **Database**: MongoDB  
- **Real-Time Communication**: WebRTC + `ws` (WebSocket)  
- **Email System**: Nodemailer (Gmail SMTP or Mailtrap)  
- **Authentication**: JWT (Token-based login)  
- **UI**: Fully responsive design (mobile, tablet, desktop)

---

## 🔐 User Account Features

### Create Account
- Email verification via OTP  
- Success confirmation email after verification

### Login
- JWT-based token login  
- Sends login alert email for each attempt

### Reset Email
1. Verify with old email & password  
2. Send OTP to old email  
3. Verify OTP and change email  
4. Send confirmation email

### Reset Password
1. Verify with old email  
2. Send OTP to email  
3. Verify OTP and change password  
4. Send confirmation email

### Delete Account
1. Verify with email & password  
2. Send OTP to email  
3. Verify OTP and delete account  
4. Send confirmation email

### Update Profile
- Update `name`, `about`, and `avatar`

---

## 💬 Messaging & Communication Features

### 📩 Chat System (User, Group, Broadcast)

- One-to-one, group, and broadcast chats  
- Text and media file sharing (images, videos, audio)  
- Actions: **edit**, **delete**, **unsend**, **reply**  
- Additional: **forward**, **star**, **keep (saved)**, **disappearing timer**  
- Share user/group/broadcast info as cards  
- Supports **auto-draft** for text and files  
- Voice message recording

---

## 👥 Group System

- Create, update, and delete groups  
- Add/remove members  
- Promote/demote admins  
- Exit group  
- Update group info  
- Control who can send messages  
- **Invitation card** for users who have restricted group add permissions

---

## 📢 Broadcast System

- Create and delete broadcast lists  
- Update broadcast info  
- Send messages to multiple users privately

---

## 📖 Story Feature

- Add, edit, and delete stories  
- Text and media support  
- Story delivery & view status  
- Reply to stories  
- Dark mode supported

---

## 📞 Call System

- Voice calling  
- Video calling  
- View call logs  
- Search and filter call history

---

## 🌗 Theme Mode

- Full **Dark Mode** and **Light Mode** support across the app  
- Saves user's theme preference automatically

---

## 🚫 User Blocking

- Block any user to prevent them from messaging or seeing your profile  
- Unblock users anytime from settings or profile

---

## 🧑‍💻 AI Assistant

- Text-based AI assistant (via [GroqCloud](https://groq.com))  
- Helps with productivity, questions, and entertainment

---

## 🔐 Advanced Privacy Settings

Each privacy setting supports:  
`public`, `connection`, `private`, `included`, `excluded`

- About visibility  
- Avatar visibility  
- Chat delivery & seen status  
- Story visibility & seen status  
- Active status (last seen)  
- Group adding permission

---

## 🔍 Smart Search & Filter

### Chats
- Search messages in any chat  
- Auto-draft search support

### Recent Chats
- Search by `name`, `message`, `sender`, `receiver`  
- Filter by `date`, `archived`, `recent`, `unseen`

### Calls
- Search and filter by `caller`, `callee`, and `date`

### Stories
- Search by sender

---

## 👤 Developer Info

- **Author**: Abdul Kareem  
- **GitHub**: [github.com/techstandakmr](https://github.com/techstandakmr)  
- **LinkedIn**: [linkedin.com/in/abdulkareem-tech](https://linkedin.com/in/abdulkareem-tech)  
- **Email**: [infostndmaketech@gmail.com](mailto:infostndmaketech@gmail.com)

---

## 📌 Future Enhancements

- Message reactions  
- Export chats/media  
- Multi-language support
