import {
  SiArtstation,
  SiDiscord,
  SiInstagram,
  SiSteam,
  SiX,
  SiYoutube,
} from "react-icons/si";
import { publicUrl } from "../publicUrl";

const LOGO_SRC = publicUrl("Images/blod-logo-footer.png");

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
    <footer className="blod-footer">
      <div className="blod-section-inner blod-section-inner--prose blod-footer__inner">
        <div className="blod-scroll-reveal__block blod-footer__logo-wrap">
          <img
            className="blod-footer__logo"
            src={LOGO_SRC}
            alt="Blod"
            width={500}
            height={281}
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
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
            tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
            veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
            commodo consequat. Duis aute irure dolor in reprehenderit in voluptate
            velit esse cillum dolore eu fugiat nulla pariatur.
          </p>
          <p className="blod-footer__copyright">
            © {new Date().getFullYear()} Pivot Point Games
          </p>
        </div>
      </div>
    </footer>
  );
}
