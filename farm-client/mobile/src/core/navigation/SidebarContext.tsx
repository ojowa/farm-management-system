import { createContext, useContext } from 'react';

export interface SidebarContextValue {
  /** Opens the navigation sidebar drawer. */
  open: () => void;
  /** Closes the navigation sidebar drawer. */
  close: () => void;
}

const noop = () => {};

/**
 * Default is a working no-op pair so components that open the sidebar (the
 * MenuButton in screen headers) keep working when rendered outside the
 * provider — e.g. a unit test that renders a single screen in isolation.
 * The real provider lives in app/(app)/_layout.tsx, which wraps every screen.
 */
export const SidebarContext = createContext<SidebarContextValue>({
  open: noop,
  close: noop,
});

export function useSidebar(): SidebarContextValue {
  return useContext(SidebarContext);
}
