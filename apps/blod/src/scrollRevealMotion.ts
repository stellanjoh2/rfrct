/** Shared GSAP scroll-reveal motion — keep in sync across `BlodScrollReveal` and hero mount reveal. */

export const SCROLL_TRIGGER_START = "top 78%";

export const BODY_LINE_DURATION = 1.12;
export const BODY_LINE_STAGGER = 0.145;
export const INTRO_LINE_SLOW_FACTOR = 1.25;

export const BLOCK_REVEAL_DURATION = 1.32;
export const BLOCK_REVEAL_STAGGER = 0.15;

/** Full-bleed still / trailer / footer: blurred plate crossfades to sharp art beneath. */
export const BACKDROP_BLUR_PLATE_DURATION = 1.45;

/** Brand red multiply overlay — fades out so the real image reads through. */
export const BACKDROP_RED_MULTIPLY_DURATION = 2;

export const LINE_REVEAL_BLUR_PX = 14;
export const BLOCK_REVEAL_BLUR_PX = 14;

/** Initial vertical offset for line splits (SplitType). */
export const LINE_REVEAL_Y_INITIAL = "0.9em";

/** Initial vertical offset for block targets (figures, headings, trailer, etc.). */
export const BLOCK_REVEAL_Y_INITIAL = "2.2rem";
