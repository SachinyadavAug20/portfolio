import { scrollToY } from "../lib/smoothScroll";
import { useMagnetic } from "../hooks/useMagnetic";

interface Props {
  text: string;
  className: string;
  id?: string; // scroll to key
}
const Button = ({ text, className, id = "" }: Props) => {
  const magneticRef = useMagnetic<HTMLButtonElement>();
  return (
    <button
      ref={magneticRef}
      type="button"
      className={`cta-wrapper ${className ?? ""}`}
      onClick={() => {
        const target = document.getElementById(id);
        if (target && id) {
          const offset = 72;
          const top = target.getBoundingClientRect().top + window.scrollY - offset;
          scrollToY(top);
        }
      }}
    >
      <div className="cta-button group">
        <div className="bg-circle" />
        <p className="text">{text}</p>
        <div className="arrow-wrapper">
          <img src="/images/arrow-down.svg" alt="arrow" />
        </div>
      </div>
    </button>
  );
};

export default Button;