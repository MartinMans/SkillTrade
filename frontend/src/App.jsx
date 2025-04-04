import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar";
import HomePage from "./components/HomePage";
import Dashboard from "./components/Dashboard";

function App() {
  const location = useLocation();
  const showNavbar = location.pathname !== '/dashboard';

  return (
    <div>
      {showNavbar && <NavBar />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </div>
  );
}

export default App;
