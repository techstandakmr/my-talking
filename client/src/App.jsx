import { Routes, Route } from "react-router-dom";
import { Home, SignupForm, LoginForm, EmailVerification, DeleteAccount, ResetPassword, ResetEmail, Feedback } from "./pages";
import UserContextProvider from "@context/UserContext.jsx";

function App() {
  return (
    // Wrap app in UserContextProvider to provide user context to all components
    <UserContextProvider>
      <>
        {/* Define routes for the app */}
        <Routes>
          {/* Home page route */}
          <Route path='/' element={<Home />} />
          <Route path='/feedback' element={<Feedback />} />
          <Route path='/auth/signup' element={<SignupForm />} />
          <Route path='/auth/login' element={<LoginForm />} />
          <Route path="/auth/verify-email" element={<EmailVerification />} />
          <Route path="/auth/delete-account" element={<DeleteAccount />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/auth/reset-email" element={<ResetEmail />} />
        </Routes>
      </>
    </UserContextProvider>
  );
}

export default App;