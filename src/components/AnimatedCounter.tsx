import { useState, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { counterItems } from "../../constants";
import { fetchLiveStats } from "../lib/stats";

const CounterItem = ({
  value,
  suffix,
  text,
  url,
}: {
  value: number;
  suffix: string;
  text: string;
  url: string;
}) => {
  const [count, setCount] = useState(0);

  useGSAP(() => {
    const obj = { val: 0 };
    gsap.to(obj, {
      val: value,
      duration: 1.4,
      ease: "power2.out",
      onUpdate: () => setCount(Math.floor(obj.val)),
    });
  }, [value]);

  return (
    <a href={url}>
      <div className="bg-zinc-900 rounded-lg p-10! flex flex-col justify-center mt-2">
        <div className="counter-number text-white text-5xl font-bold mb-2">
          <span>{count}</span>
          {suffix}
        </div>
        <div className="text-white-50 text-lg">{text}</div>
      </div>
    </a>
  );
};

const AnimatedCounter = () => {
  const [items, setItems] = useState(() =>
    counterItems.map((item) =>
      item.text === "Problems Solved" || item.text === "Git Commits"
        ? { ...item, value: 0 }
        : item,
    ),
  );

  useEffect(() => {
    fetchLiveStats().then((stats) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.text === "Problems Solved") return { ...item, value: stats.leetcodeSolved };
          if (item.text === "Git Commits") return { ...item, value: stats.gitCommits };
          return item;
        }),
      );
    });
  }, []);

  return (
    <div id="counter" className="padding-x-lg xl:mt-0 mt-10">
      <div className="mx-auto grid-4-cols">
        {items.map((item) => (
          <CounterItem key={item.text} {...item} />
        ))}
      </div>
    </div>
  );
};

export default AnimatedCounter;
