import type { RendererSyncSource } from "@refrct/core";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { BlodLightboxGroup } from "./BlodLightboxGroup";
import { BlodRefractHero } from "./BlodRefractHero";
import {
  createDefaultHeroSync,
  HERO_DEFAULT_IMAGE_SCALE,
} from "./createDefaultHeroSync";
import { DevBlobControls } from "./DevBlobControls";
import { BlodScrollReveal } from "./BlodScrollReveal";
import { LOCKED_HERO_SYNC } from "./lockedHeroPreset";
import { publicUrl } from "./publicUrl";
import "./App.css";

/** Fixed background for the scroll column — `public/Images/bg.png`. */
const SCROLL_BG_IMAGE = publicUrl("Images/bg.png");

/** Full-viewport blend overlay — `public/Images/b795fc5853a1f187e92fa83d5aa7c4ba.gif`. */
const SITE_BLEND_GIF = publicUrl("Images/b795fc5853a1f187e92fa83d5aa7c4ba.gif");

const GALLERY_IMG_A = publicUrl("Images/photo-1594662234267-f47effc265a4.avif");
const GALLERY_IMG_B = publicUrl("Images/photo-1487174244970-cd18784bb4a4.avif");
const GALLERY_IMG_C = publicUrl("Images/photo-1580843411760-ea295173bfd0.avif");

/** Six slots per gallery — mix sources for a less repetitive grid. */
const SCREENSHOT_GALLERY_IMAGES: readonly string[] = [
  GALLERY_IMG_A,
  GALLERY_IMG_B,
  GALLERY_IMG_C,
  GALLERY_IMG_C,
  GALLERY_IMG_A,
  GALLERY_IMG_B,
];

const CONCEPT_GALLERY_IMAGES: readonly string[] = [
  GALLERY_IMG_B,
  GALLERY_IMG_C,
  GALLERY_IMG_A,
  GALLERY_IMG_A,
  GALLERY_IMG_B,
  GALLERY_IMG_C,
];

type FaqItem = {
  question: string;
  /** Body copy uses Inter via `.blod-faq__answer` in CSS. */
  content: ReactNode;
};

const FAQ_ITEMS: readonly FaqItem[] = [
  {
    question: "What are bundles?",
    content: (
      <>
        <p>
          Bundles group the base game with add-ons—soundtrack, art book, or
          similar—at a single price when we announce them. Each listing will
          spell out exactly what is included and any regional differences.
        </p>
        <p>
          Refund and billing rules follow the store you buy from; see our{" "}
          <a className="blod-faq__link" href="#faq">
            billing policy page
          </a>{" "}
          once purchases are live.
        </p>
      </>
    ),
  },
  {
    question: "How does support work?",
    content: (
      <p>
        After launch we will publish a support hub with known issues, patches,
        and how to reach us. For now, use the contact channel listed on the main
        site for press or partnership questions.
      </p>
    ),
  },
  {
    question: "What options will I have to pay for Blod?",
    content: (
      <p>
        We plan standard and deluxe editions where it makes sense, sold through
        major PC and console storefronts. Supported payment methods will match
        each store (card, wallet, regional options)—exact tiers and prices will
        be confirmed before pre-orders open.
      </p>
    ),
  },
  {
    question: "What platforms is Blod coming to?",
    content: (
      <p>
        Target platforms and any performance tiers will be announced with the
        release roadmap. This page will list minimum and recommended specs for PC
        when we lock them.
      </p>
    ),
  },
  {
    question: "Is there a beta or early access program?",
    content: (
      <p>
        If we run a closed beta or early access, we will say how to opt in,
        what build you get, and how feedback is handled. Watch announcements
        here and on our social channels.
      </p>
    ),
  },
  {
    question: "How can I get help with accessibility or compliance questions?",
    content: (
      <p>
        We are building toward clear accessibility documentation and store
        labels. For partnership, legal, or compliance topics, use the contact
        route we publish for industry inquiries—we will expand this section as
        policies firm up.
      </p>
    ),
  },
  {
    question: "How can I keep track of spending and receipts?",
    content: (
      <p>
        Purchases and invoices live in your account on whichever storefront you
        use. We will link to each partner’s order history and refund flow from
        this FAQ when sales go live.
      </p>
    ),
  },
];

/** Default headshot until each `portraitSrc` is pointed at a file under `public/Images/`. */
const STAFF_PORTRAIT_PLACEHOLDER = publicUrl(
  "Images/premium_photo-1747851400319-a9d28293edc5.png",
);

type StaffMember = {
  name: string;
  role: string;
  bio: string;
  /** Per-member image URL (same placeholder for now — swap paths when portraits exist). */
  portraitSrc: string;
};

const STAFF: StaffMember[] = [
  {
    name: "Jonathan Michael Doe",
    role: "Creative Director",
    bio: "Placeholder: leads visual direction and narrative tone for the project.",
    portraitSrc: STAFF_PORTRAIT_PLACEHOLDER,
  },
  {
    name: "Sarah Elizabeth Mitchell",
    role: "Lead Environment Artist",
    bio: "Placeholder: owns world-building, mood boards, and in-engine set dressing.",
    portraitSrc: STAFF_PORTRAIT_PLACEHOLDER,
  },
  {
    name: "Marcus James Chen",
    role: "Technical Director",
    bio: "Placeholder: pipeline, performance budgets, and renderer integration.",
    portraitSrc: STAFF_PORTRAIT_PLACEHOLDER,
  },
  {
    name: "Elena María Vasquez",
    role: "Audio Director",
    bio: "Placeholder: score, sound design, and spatial mix for key scenes.",
    portraitSrc: STAFF_PORTRAIT_PLACEHOLDER,
  },
  {
    name: "James Obi Okonkwo",
    role: "Narrative Designer",
    bio: "Placeholder: characters, dialogue beats, and branching story structure.",
    portraitSrc: STAFF_PORTRAIT_PLACEHOLDER,
  },
  {
    name: "Rachel Annika Lindström",
    role: "Producer",
    bio: "Placeholder: scheduling, milestones, and coordination across disciplines.",
    portraitSrc: STAFF_PORTRAIT_PLACEHOLDER,
  },
];

function GalleryGrid({ images }: { images: readonly string[] }) {
  return (
    <>
      {images.map((src, i) => (
        <figure key={`${src}-${i}`} className="blod-gallery-card">
          <a
            className="blod-gallery-card__link lg-item blod-img-hover-tint"
            href={src}
          >
            <img
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              width={800}
              height={500}
            />
          </a>
        </figure>
      ))}
    </>
  );
}

export function App() {
  const [devSync, setDevSync] = useState(createDefaultHeroSync);
  const [devImageScale, setDevImageScale] = useState(HERO_DEFAULT_IMAGE_SCALE);
  const [artPanelOpen, setArtPanelOpen] = useState(true);
  const faqFirstDetailsRef = useRef<HTMLDetailsElement>(null);

  useLayoutEffect(() => {
    const el = faqFirstDetailsRef.current;
    if (el) el.open = true;
  }, []);

  const activeSync = import.meta.env.DEV ? devSync : LOCKED_HERO_SYNC;
  const heroImageScale = import.meta.env.DEV
    ? devImageScale
    : HERO_DEFAULT_IMAGE_SCALE;

  const patchDevSync = useCallback((patch: Partial<RendererSyncSource>) => {
    setDevSync((s) => {
      const next = { ...s };
      for (const key of Object.keys(patch) as (keyof RendererSyncSource)[]) {
        const v = patch[key];
        if (v !== undefined) {
          (next as Record<string, unknown>)[key as string] = v;
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyP" || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      setArtPanelOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="blod-page">
      {import.meta.env.DEV ? (
        <DevBlobControls
          sync={devSync}
          onChange={patchDevSync}
          imageScale={heroImageScale}
          onImageScaleChange={setDevImageScale}
          open={artPanelOpen}
        />
      ) : null}

      <div className="blod-hero-fixed">
        <BlodRefractHero
          syncSource={activeSync}
          imageScale={heroImageScale}
          onPatchSync={import.meta.env.DEV ? patchDevSync : undefined}
        />
      </div>

      <div className="blod-scroll">
        <div className="blod-hero-spacer" aria-hidden />
        <div
          className="blod-page-shell"
          style={
            {
              "--blod-shell-bg-image": `url(${SCROLL_BG_IMAGE})`,
            } as CSSProperties
          }
        >
          <BlodScrollReveal>
            <section id="intro" className="blod-section blod-section--intro">
              <div className="blod-section-inner blod-section-inner--prose">
                <p>
                  Sed ut perspiciatis unde omnis iste natus error sit voluptatem
                  accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae
                  ab illo inventore veritatis et quasi architecto beatae vitae dicta
                  sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit
                  aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos
                  qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui
                  dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed
                  quia non numquam eius modi tempora incidunt ut labore et dolore magnam
                  aliquam quaerat voluptatem.
                </p>
              </div>
            </section>

            <section
              id="screenshots"
              className="blod-section blod-section--gallery"
            >
              <div className="blod-section-inner blod-section-inner--prose">
                <h2>Screenshots</h2>
                <BlodLightboxGroup className="blod-gallery-grid">
                  <GalleryGrid images={SCREENSHOT_GALLERY_IMAGES} />
                </BlodLightboxGroup>
              </div>
            </section>

            <section
              id="concept-art"
              className="blod-section blod-section--gallery"
            >
              <div className="blod-section-inner blod-section-inner--prose">
                <h2>Concept art</h2>
                <BlodLightboxGroup className="blod-gallery-grid">
                  <GalleryGrid images={CONCEPT_GALLERY_IMAGES} />
                </BlodLightboxGroup>
              </div>
            </section>

            <section id="team" className="blod-section">
              <div className="blod-section-inner blod-section-inner--prose">
                <h2>Team</h2>
                <BlodLightboxGroup className="blod-staff-grid">
                  {STAFF.map((person) => (
                    <figure key={person.name} className="blod-staff-card">
                      <a
                        className="blod-staff-card__media lg-item blod-img-hover-tint"
                        href={person.portraitSrc}
                      >
                        <img
                          src={person.portraitSrc}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          width={480}
                          height={640}
                        />
                      </a>
                      <figcaption className="blod-staff-card__meta">
                        <span className="blod-staff-card__name">
                          {person.name}
                        </span>
                        <span className="blod-staff-card__role">
                          {person.role}
                        </span>
                        <div className="blod-staff-card__bio">{person.bio}</div>
                      </figcaption>
                    </figure>
                  ))}
                </BlodLightboxGroup>
              </div>
            </section>

            <section id="faq" className="blod-section blod-section--faq">
              <div className="blod-section-inner blod-section-inner--prose">
                <h2>FAQ</h2>
                <ul className="blod-faq-list">
                  {FAQ_ITEMS.map((item, index) => (
                    <li key={item.question} className="blod-faq-list__item">
                      <details
                        ref={index === 0 ? faqFirstDetailsRef : undefined}
                        className="blod-faq-item"
                      >
                        <summary className="blod-faq__question">
                          {item.question}
                        </summary>
                        <div className="blod-faq__answer-clip">
                          <div className="blod-faq__answer">{item.content}</div>
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <footer className="blod-footer">
              <div className="blod-section-inner blod-section-inner--prose">
                <p>© {new Date().getFullYear()} Blod</p>
              </div>
            </footer>
          </BlodScrollReveal>
        </div>
      </div>

      <div className="blod-site-blend-gif" aria-hidden="true">
        <div className="blod-site-blend-gif__stack">
          <div className="blod-site-blend-gif__red" />
          <img
            src={SITE_BLEND_GIF}
            alt=""
            width={1920}
            height={1080}
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}
