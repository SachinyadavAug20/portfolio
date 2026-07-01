import { logoIconsList } from "../../constants";

interface Props {
  Icon: any;
  name: string;
  link: string;
}
const LogoIcon = ({ Icon, name, link }: Props) => {
  return (
    <a href={link}>
      <div className="flex-none flex-center marquee-item">
        <Icon className="h-12 w-12" alt={name} />
        <p className="px-2">{name}</p>
      </div>
    </a>
  );
};

const LogoSection = () => {
  return (
    <div className="md:my-20 my-10 relative">
      <div className="gradient-edge" />
      <div className="marquee h-52">
        <div className="marquee-box md:gap-12 gap-5">
          {logoIconsList.map(({ Icon, name, link }) => (
            <LogoIcon key={name} Icon={Icon} name={name} link={link} />
          ))}
          {logoIconsList.map(({ Icon, name, link }) => (
            <LogoIcon key={name} Icon={Icon} name={name} link={link} />
          ))}
        </div>
      </div>
      <div className="gradient-edge" />
    </div>
  );
};

export default LogoSection;
