import { createContext, useContext } from "react";
import type { Location } from "react-router-dom";

export const canViewTransition =
  typeof document !== "undefined" &&
  typeof document.startViewTransition === "function";

/** The location whose content is currently mounted (may lag the router
 * location by one view transition). Provided by App around <Routes>. */
export const RenderedLocationContext = createContext<Location | null>(null);

export function useRenderedLocation(): Location | null {
  return useContext(RenderedLocationContext);
}
