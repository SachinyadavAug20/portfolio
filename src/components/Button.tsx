interface Props {
  text: string;
  className: string;
  id?: string; // scroll to key
}
const Button = ({ text, className, id="/" }: Props) => {
  return (
    <a className={`cta-wrapper ${className ?? ""}`}>
      <div className="cta-button group">
        <div className="bg-circle" />
        <p className="text">{text}</p>
        <div className="arrow-wrapper">
          <img src="/images/arrow-down.svg" alt="arrow" />
        </div>
      </div>
    </a>
  );
};

export default Button;
