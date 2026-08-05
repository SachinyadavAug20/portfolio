import SEOHead from "../seo/SEOHead";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const NotFound = () => {
  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex" />
      </Helmet>
      <SEOHead title="Page Not Found" description="The page you are looking for does not exist." path={"/404"} />
      <section className="section-padding pt-10 min-h-screen flex-center">
        <div className="text-center">
          <p className="text-8xl font-black text-white-50/60 select-none">404</p>
          <h1 className="mt-6 text-3xl md:text-4xl font-semibold">Page not found</h1>
          <p className="mt-4 text-white-50 text-lg">
            The page you are looking for was moved, removed, or never existed.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-full border border-blue-50/40 hover:border-blue-50 hover:bg-blue-50/10 transition-colors"
          >
            &larr; Back to home
          </Link>
        </div>
      </section>
    </>
  );
};

export default NotFound;