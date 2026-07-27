import { Helmet } from "react-helmet-async";
import { SITE_URL, SITE_NAME, OG_IMAGE, OG_IMAGE_ALT } from "./config";

interface SEOHeadProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  datePublished?: string;
  dateModified?: string;
}

const SEOHead = ({
  title,
  description,
  path = "",
  image = OG_IMAGE,
  type = "website",
  datePublished,
  dateModified,
}: SEOHeadProps) => {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const url = `${SITE_URL}${path}`;
  const imageUrl = image.startsWith("http") ? image : `${SITE_URL}${image}`;

  const jsonLd = type === "article"
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description,
        image: imageUrl,
        url,
        author: { "@type": "Person", name: SITE_NAME },
        ...(datePublished && { datePublished }),
        ...(dateModified && { dateModified }),
      }
    : null;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:alt" content={OG_IMAGE_ALT} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={OG_IMAGE_ALT} />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};

export default SEOHead;
