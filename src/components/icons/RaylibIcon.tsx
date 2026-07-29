import type { SVGProps } from "react";

const RaylibIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect width="48" height="48" rx="10" fill="#1a1a2e" />
    <path
      d="M12 14h10c5 0 9 4 9 9s-4 9-9 9h-4v-6h3c1.7 0 3-1.3 3-3s-1.3-3-3-3h-9v16h-3V14h3z"
      fill="#f5c842"
    />
    <path
      d="M28 14h8.5c4 0 7.5 3 7.5 8s-3.5 9-7.5 9H30l-2 2h-4l4-19z"
      fill="#e8e8e8"
    />
  </svg>
);

export default RaylibIcon;
