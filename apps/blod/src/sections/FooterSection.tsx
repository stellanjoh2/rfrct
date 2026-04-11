import { publicUrl } from "../publicUrl";

const LOGO_SRC = publicUrl("Images/blod-logo-footer.png");

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

        <div className="blod-footer__legal">
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
            minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip
            ex ea commodo consequat. Duis aute irure dolor in reprehenderit in
            voluptate velit esse cillum dolore eu fugiat nulla pariatur.
          </p>
          <p>
            Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
            officia deserunt mollit anim id est laborum. Integer posuere erat a
            ante venenatis dapibus posuere velit aliquet. Vestibulum id ligula porta
            felis euismod semper. Nulla vitae elit libero, a pharetra augue. Aenean
            lacinia bibendum nulla sed consectetur.
          </p>
          <p>
            Curabitur blandit tempus porttitor. Fusce dapibus, tellus ac cursus
            commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit
            amet risus. Donec sed odio dui. Cras mattis consectetur purus sit amet
            fermentum. Maecenas faucibus mollis interdum.
          </p>
          <p className="blod-footer__copyright">
            © {new Date().getFullYear()} Blod. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
