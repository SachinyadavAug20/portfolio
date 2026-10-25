import { scrollToY } from "../lib/smoothScroll";
import { useMagnetic } from "../hooks/useMagnetic";

interface Props {
  text: string;
  className?: string;
  id?: string; // scroll to key
  href?: string;
  target?: string;
  rel?: string;
  arrowImg?: string;
  arrowAlt?: string;
}

const Button = ({
  text,
  className = "",
  id = "",
  href,
  target,
  rel,
  arrowImg = "/images/arrow-down.svg",
  arrowAlt = "arrow",
}: Props) => {
  const buttonMagneticRef = useMagnetic<HTMLButtonElement>();
  const anchorMagneticRef = useMagnetic<HTMLAnchorElement>();

  const content = (
    <div className="cta-button group">
      <div className="bg-circle" />
      <p className="text">{text}</p>
      <div className="arrow-wrapper">
        <img src={arrowImg} alt={arrowAlt} />
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        ref={anchorMagneticRef}
        href={href}
        target={target ?? "_blank"}
        rel={rel ?? "noreferrer"}
        className={`cta-wrapper ${className}`}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={buttonMagneticRef}
      type="button"
      className={`cta-wrapper ${className}`}
      onClick={() => {
        const targetEl = document.getElementById(id);
        if (targetEl && id) {
          const offset = 72;
          const top =
            targetEl.getBoundingClientRect().top + window.scrollY - offset;
          scrollToY(top);
        }
      }}
    >
      {content}
    </button>
  );
};

export default Button;