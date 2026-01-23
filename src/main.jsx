import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Import pages from the pages folder
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

// Import CSS
import "./pages/LoginPage.css";
import "./pages/RegisterPage.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<LoginPage />} /> {/* fallback */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);