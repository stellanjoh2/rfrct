import type { CSSProperties } from "react";
import { BlodSectionBloodParallax } from "../BlodSectionBloodParallax";
import { BLOOD_PARALLAX_URL } from "../content/bloodParallax";
import { HERO_FLASH_LOGO_URL } from "../content/heroFlashLogo";

/**
 * First text section below the hero; edit copy here without touching layout shell (`App.tsx`).
 */
export function IntroSection() {
  const signatureStyle = {
    WebkitMaskImage: `url("${HERO_FLASH_LOGO_URL}")`,
    maskImage: `url("${HERO_FLASH_LOGO_URL}")`,
  } satisfies CSSProperties;

  return (
    <section
      id="intro"
      className="blod-section blod-section--intro blod-section--blood"
    >
      <div className="blod-section-blood-layer" aria-hidden>
        <BlodSectionBloodParallax imageSrc={BLOOD_PARALLAX_URL} side="left" />
      </div>
      <div className="blod-section-inner blod-section-inner--prose">
        <p>
          A lowborn Bloodhound, Pascale, doth ascend from the mire of debt and
          nameless obscurity into the veiled courts of the Eight—only to uncover
          that blood beareth memory, the gods are but hollow falsehoods, and the
          hunger he once named ambition shall bind him to a dire choice: to be
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
