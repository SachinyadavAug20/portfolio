import { counterItems } from "../../constants";

const AnimatedCounter = () => {
  return (
    <div id="counter" className="padding-x-lg xl:mt-0 mt-32!">
      <div className="mx-auto grid-cols-4 ">
        {counterItems.map((item) => (
          <div
            key={item.text}
            className="bg-zinc-900 rounded-lg p-10! flex flex-col justify-center mt-10"
          >
            <div className="counter-number text-white text-5xl font-bold mb-2">
              0 {item.suffix}
            </div>
            <div className="text-white-50 text-lg">{item.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnimatedCounter;
