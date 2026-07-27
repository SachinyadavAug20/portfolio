import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";
import HomePage from "./pages/HomePage";

const BlogList = lazy(() => import("./pages/BlogList"));
const BlogPost = lazy(() => import("./pages/BlogPost"));

const PageLoading = () => (
  <section className="section-padding pt-10 min-h-screen">
    <div className="w-full h-full md:px-10 px-5 max-w-3xl mx-auto">
      <div className="space-y-3">
        <div className="h-5 w-16 bg-black-200 rounded animate-pulse" />
        <div className="h-8 w-3/4 bg-black-200 rounded animate-pulse" />
        <div className="h-4 w-full bg-black-200 rounded animate-pulse" />
        <div className="h-32 w-full bg-black-200 rounded animate-pulse mt-6" />
      </div>
    </div>
  </section>
);

const App = () => {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="blog" element={
          <Suspense fallback={<PageLoading />}>
            <BlogList />
          </Suspense>
        } />
        <Route path="blog/post/*" element={
          <Suspense fallback={<PageLoading />}>
            <BlogPost />
          </Suspense>
        } />
      </Route>
    </Routes>
  );
};

export default App;
