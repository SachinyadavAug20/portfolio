import { Link } from "react-router-dom";
import { socialImg } from "../../constants";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="flex flex-col justify-center items-center md:items-start">
          <Link to="/blog" className="py-2 -my-1 px-1 -mx-1 active:opacity-70 transition-opacity">
            Visit my blog
          </Link>
        </div>
        <div className="socials">
          {socialImg.map(({ link, imgPath, imgPathLight, name }) => (
            <a href={link} className="icon target" target="_blank" rel="noreferrer" key={link}>
              <img src={imgPath} alt={name} className="hidden dark:block" loading="lazy" decoding="async" />
              <img src={imgPathLight} alt={name} className="dark:hidden" loading="lazy" decoding="async" />
            </a>
          ))}
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-center md:text-end">
            © {new Date().getFullYear()} Sachin Yadav | SachinYadavApr20. All
            rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
