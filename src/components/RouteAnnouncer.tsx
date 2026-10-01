import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Screen-reader support for client-side navigation:
 *  - announces the new document title (set by SEOHead after each route's
 *    data settles) through a polite live region;
 *  - moves focus to the page's main heading (or <main>) on each route change,
 *    so VoiceOver/TalkBack reading starts at the new content. ScrollToTop
 *    already handles the scroll position, hence preventScroll.
 */
export default function RouteAnnouncer() {
  const { pathname } = useLocation();
  const [message, setMessage] = useState("");
  const first = useRef(true);

  useEffect(() => {
    const titleEl = document.querySelector("title");
    if (!titleEl) return;
    const observer = new MutationObserver(() => setMessage(document.title));
    observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const id = window.setTimeout(() => {
      const target = (document.querySelector("main h1") ?? document.getElementById("main")) as HTMLElement | null;
      if (!target) return;
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
