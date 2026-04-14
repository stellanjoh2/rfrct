import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { publicUrl } from "./publicUrl";

const LOGO_SRC = publicUrl("Images/blod-logo-footer.png");

/** Steam wishlist URL — replace with the store page when ready (footer Steam icon uses the same placeholder). */
const WISHLIST_HREF = "#";

const NAV_LINKS = [
  { label: "Lore", href: "#lore" },
  { label: "Media", href: "#trailer" },
  { label: "Team", href: "#team" },
  { label: "FAQ", href: "#faq" },
] as const;

/** Hide bar when near the top of the page (hero). */
const SCROLL_TOP_HIDE_PX = 64;
/** Ignore sub-pixel jitter when detecting direction. */
const SCROLL_DIRECTION_THRESHOLD_PX = 2;
/** Show bar when this close to the document bottom (footer / end of page). */
const BOTTOM_NAV_REVEAL_PX = 120;

export function BlodStickyHeader() {
  const [visible, setVisible] = useState(false);
  const lastScrollYRef = useRef(0);

  const update = useCallback(() => {
    const y = window.scrollY ?? document.documentElement.scrollTop;
    const last = lastScrollYRef.current;
    const delta = y - last;

    const doc = document.documentElement;
    const viewH = window.innerHeight;
    const docH = doc.scrollHeight;
    const distanceFromBottom = docH - y - viewH;
    const nearBottom =
      y > SCROLL_TOP_HIDE_PX && distanceFromBottom <= BOTTOM_NAV_REVEAL_PX;

    if (y <= SCROLL_TOP_HIDE_PX) {
      setVisible(false);
    } else if (nearBottom) {
      setVisible(true);
    } else if (delta < -SCROLL_DIRECTION_THRESHOLD_PX) {
      setVisible(true);
    } else if (delta > SCROLL_DIRECTION_THRESHOLD_PX) {
      setVisible(false);
    }

    lastScrollYRef.current = y;
  }, []);

  useEffect(() => {
    lastScrollYRef.current =
      window.scrollY ?? document.documentElement.scrollTop;
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const opaqueEnoughToInteract = visible;

  const innerPointerStyle = {
    pointerEvents: opaqueEnoughToInteract ? "auto" : "none",
  } satisfies CSSProperties;

  return (
    <header
      className="blod-sticky-header"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden={opaqueEnoughToInteract ? undefined : true}
    >
      <div className="blod-sticky-header__inner" style={innerPointerStyle}>
        <a
          className="blod-sticky-header__logo-link"
          href="#blod-hero-spacer"
          tabIndex={opaqueEnoughToInteract ? undefined : -1}
          aria-label="Blod — back to top"
        >
          <img
            className="blod-sticky-header__logo"
            src={LOGO_SRC}
            alt=""
            width={364}
            height={87}
            decoding="async"
          />
        </a>
        <nav className="blod-sticky-header__nav" aria-label="Page sections">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={href}
              className="blod-sticky-header__nav-link"
              href={href}
              tabIndex={opaqueEnoughToInteract ? undefined : -1}
            >
              {label}
            </a>
          ))}
        </nav>
        <a
          className="blod-sticky-header__cta"
          href={WISHLIST_HREF}
          tabIndex={opaqueEnoughToInteract ? undefined : -1}
        >
          WISHLIST NOW
        </a>
      </div>
    </header>
  );
}
