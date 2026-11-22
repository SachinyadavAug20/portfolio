let sidebarCollapsed = false;
const listeners = new Set<(collapsed: boolean) => void>();

export function getSidebarCollapsed(): boolean {
  return sidebarCollapsed;
}

export function setSidebarCollapsed(collapsed: boolean): void {
  if (sidebarCollapsed === collapsed) return;
  sidebarCollapsed = collapsed;
  for (const fn of listeners) {
    fn(collapsed);
  }
}

export function onSidebarCollapsedChange(fn: (collapsed: boolean) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
