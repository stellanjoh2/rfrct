import { BlodSectionBloodParallax } from "../BlodSectionBloodParallax";
import { BLOOD_PARALLAX_URL } from "../content/bloodParallax";
import { INTRO_SYMBOL_URL } from "../content/introSymbol";

/**
 * First text section below the hero; edit copy here without touching layout shell (`App.tsx`).
 */
export function IntroSection() {
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
          <img
            className="blod-intro-signature"
            src={INTRO_SYMBOL_URL}
            alt=""
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}
