import type { CSSProperties } from "react";
import { HERO_FLASH_LOGO_URL } from "../content/heroFlashLogo";

/**
 * Opening prose — edit copy here without touching layout shell (`App.tsx`).
 */
export function IntroSection() {
  const signatureStyle = {
    WebkitMaskImage: `url("${HERO_FLASH_LOGO_URL}")`,
    maskImage: `url("${HERO_FLASH_LOGO_URL}")`,
  } satisfies CSSProperties;

  return (
    <section id="intro" className="blod-section blod-section--intro">
      <div className="blod-section-inner blod-section-inner--prose">
        <p>
          A lowborn Bloodhound, Pascale, doth ascend from the mire of debt and
          nameless obscurity into the veiled courts of the Eight—only to uncover
          that blood beareth memory, the gods are but hollow falsehoods, and the
          hunger he once named ambition shall bind him to a dire choosing: to be
          wrought into an instrument of tyranny, or to stand as the wretched
          world&apos;s last and dreadful salvation.
        </p>
        <div className="blod-intro-signature-wrap">
          <div
            className="blod-intro-signature"
            style={signatureStyle}
            role="img"
            aria-label="Crimson Sleeve mark"
          />
        </div>
      </div>
    </section>
  );
}
