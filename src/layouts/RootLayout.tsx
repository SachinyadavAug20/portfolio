import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../sections/Footer";
import { Toaster } from "../components/ui/sonner";

const RootLayout = () => {
  useEffect(() => {
    const splash = document.getElementById("splash");
    if (splash) {
      splash.classList.add("fade-out");
      setTimeout(() => splash.remove(), 550);
    }
  }, []);

  return (
    <>
      <Navbar />
      <Outlet />
      <Toaster />
      <Footer />
    </>
  );
};

export default RootLayout;
