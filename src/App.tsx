import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { flushSync } from "react-dom";
import { animateView } from "motion";
import "./lib/gsapSetup";
import RootLayout from "./layouts/RootLayout";
import HomePage from "./pages/HomePage";
import NotFound from "./pages/NotFound";
import { RenderedLocationContext, canViewTransition } from "./lib/routeTransition";
import { initSmoothScroll, scrollToY } from "./lib/smoothScroll";
import { isReducedMotion } from "./hooks/useReducedMotion";

const BlogList = lazy(() => import("./pages/BlogList"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const GraphPage = lazy(() => import("./pages/GraphPage"));

const PageLoading = () => (
  <section className="section-padding pt-10 min-h-screen">
    <div className="w-full h-full md:px-10 max-w-3xl mx-auto">
      <div className="space-y-3">
        <div className="skeleton h-5 w-16 bg-black-200 rounded" />
        <div className="skeleton h-8 w-3/4 bg-black-200 rounded" />
        <div className="skeleton h-4 w-full bg-black-200 rounded" />
        <div className="skeleton h-32 w-full bg-black-200 rounded" />
      </div>
    </div>
  </section>
);

const App = () => {
  const location = useLocation();
  const firstNav = useRef(true);
  // Content swap is deferred until inside the view transition callback so
  // the browser captures the new snapshot after React commits.
  const [rendered, setRendered] = useState(location);

  useEffect(() => {
    initSmoothScroll();
  }, []);

  useEffect(() => {
    if (firstNav.current) {
      firstNav.current = false;
      return;
    }
    if (rendered.key === location.key) return;

    const apply = () => {
      flushSync(() => setRendered(location));
      if (!location.hash) scrollToY(0, true);
    };

    if (canViewTransition && !isReducedMotion()) {
      animateView(apply);
    } else {
      apply();
    }
  }, [location, rendered.key]);

  return (
    <RenderedLocationContext.Provider value={rendered}>
      <Routes location={rendered}>
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
          <Route path="graph" element={
            <Suspense fallback={<PageLoading />}>
              <GraphPage />
            </Suspense>
          } />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </RenderedLocationContext.Provider>
  );
};

export default App;
