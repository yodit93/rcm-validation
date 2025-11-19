// app/AuthPage.js (or whatever your root file is named, e.g., page.js)
"use client";

import { useState } from "react";
import LoginForm from "@/app/components/Login";
import RegisterForm from "@/app/components/Register";

export default function AuthPage() {
  // State to toggle between login and registration views
  const [isLoginView, setIsLoginView] = useState(true);

  // Function to switch the view
  const toggleView = () => setIsLoginView(!isLoginView);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-100 to-indigo-200">
      {/* Conditionally render the correct component and pass the toggle function */}
      {isLoginView ? (
        <LoginForm toggleView={toggleView} />
      ) : (
        <RegisterForm toggleView={toggleView} />
      )}
    </div>
  );
}