import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../sections/Footer";
import { Toaster } from "../components/ui/sonner";

const RootLayout = () => {
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
