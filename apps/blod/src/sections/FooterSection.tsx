import {
  SiArtstation,
  SiDiscord,
  SiInstagram,
  SiSteam,
  SiX,
  SiYoutube,
} from "react-icons/si";
import type { CSSProperties } from "react";
import { publicUrl } from "../publicUrl";

/** Fixed viewport footer art — wide bitmap; CSS uses cover + bottom anchor (see `.blod-section--footer`). */
const FOOTER_BG_ART = publicUrl("Images/footer-bg.jpg");
const LOGO_SRC = publicUrl("Images/blod-logo-footer.png");
const UE_LOGO_SRC = publicUrl("Images/UE-Secondary-Logo-2023-Horizontal-White.png");

/** Replace `#` with real profile / server / hub URLs before launch. */
const FOOTER_SOCIAL = {
  discord: "#",
  instagram: "#",
  steam: "#",
  youtube: "#",
  x: "#",
  artstation: "#",
} as const;

export function FooterSection() {
  return (
    <footer
      className="blod-footer blod-section blod-section--footer blod-accent-invert"
      style={
        {
          "--blod-footer-bg-image": `url(${FOOTER_BG_ART})`,
        } as CSSProperties
      }
    >
      <div className="blod-backdrop-reveal-veil" aria-hidden>
        <img
          className="blod-backdrop-reveal-veil__blur"
          src={FOOTER_BG_ART}
          alt=""
          decoding="async"
          width={1920}
          height={1080}
        />
        <div className="blod-backdrop-reveal-veil__multiply" />
      </div>
      <div className="blod-section-inner blod-section-inner--prose blod-section-inner--footer">
        <div className="blod-footer__frame">
          <div className="blod-scroll-reveal__block blod-footer__logo-wrap">
            <img
              className="blod-footer__logo"
              src={LOGO_SRC}
              alt="Blod"
              width={364}
              height={87}
              loading="lazy"
              decoding="async"
            />
          </div>

          <nav
            className="blod-scroll-reveal__block blod-footer__social"
            aria-label="Social links"
          >
            <a
              className="blod-footer__social-link"
              href={FOOTER_SOCIAL.discord}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord"
            >
              <SiDiscord aria-hidden className="blod-footer__social-icon" />
            </a>
            <a
              className="blod-footer__social-link"
              href={FOOTER_SOCIAL.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <SiInstagram aria-hidden className="blod-footer__social-icon" />
            </a>
            <a
              className="blod-footer__social-link"
              href={FOOTER_SOCIAL.steam}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Steam"
            >
              <SiSteam aria-hidden className="blod-footer__social-icon" />
            </a>
            <a
              className="blod-footer__social-link"
              href={FOOTER_SOCIAL.youtube}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
            >
              <SiYoutube aria-hidden className="blod-footer__social-icon" />
            </a>
            <a
              className="blod-footer__social-link"
              href={FOOTER_SOCIAL.x}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X"
            >
              <SiX aria-hidden className="blod-footer__social-icon" />
            </a>
            <a
              className="blod-footer__social-link"
              href={FOOTER_SOCIAL.artstation}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="ArtStation"
            >
              <SiArtstation aria-hidden className="blod-footer__social-icon" />
            </a>
          </nav>

          <div className="blod-footer__legal">
            <p>
              © {new Date().getFullYear()} Pivot Point Games
            </p>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
              tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
              veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
              commodo consequat. Duis aute irure dolor in reprehenderit in voluptate
              velit esse cillum dolore eu fugiat nulla pariatur.
            </p>
          </div>

          <div className="blod-scroll-reveal__block blod-footer__ue-logo-wrap">
            <img
              className="blod-footer__ue-logo"
              src={UE_LOGO_SRC}
              alt="Unreal Engine"
              width={300}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
