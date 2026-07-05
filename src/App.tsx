import { Routes, Route } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";
import HomePage from "./pages/HomePage";
import BlogList from "./pages/BlogList";
import BlogPost from "./pages/BlogPost";

const App = () => {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="blog" element={<BlogList />} />
        <Route path="blog/:slug" element={<BlogPost />} />
      </Route>
    </Routes>
  );
};

export default App;
