interface Props {
  text: string;
  className: string;
  id?: string; // scroll to key
}
const Button = ({ text, className, id = "" }: Props) => {
  return (
    <button
      type="button"
      className={`cta-wrapper ${className ?? ""}`}
      onClick={() => {
        const target = document.getElementById(id);
        if (target && id) {
          const offset = window.innerHeight * 0.15;
          const top = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: top, behavior: "smooth" });
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