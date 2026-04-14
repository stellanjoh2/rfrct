import type { ReactNode } from "react";

/** Non-breaking space — keeps short phrases (e.g. early access, opt in) from splitting */
const NBSP = "\u00A0";
/** Non-breaking hyphen — “pre-orders” won’t break as “pre-” / “orders” */
const NBHY = "\u2011";

export type FaqItem = {
  question: string;
  /** Answer body copy: Bellefair + large type via `.blod-faq__answer` in CSS (questions stay Vintokeys). */
  content: ReactNode;
};

export const faqItems: readonly FaqItem[] = [
  {
    question: "What are bundles?",
    content: (
      <p>
        Bundles combine the base game with add-ons (soundtrack, art book, or
        similar) at one price when we announce them. Each listing will spell out
        what is included and any regional differences. Refund and billing rules
        follow the store you buy from. See our{" "}
        <a className="blod-faq__link" href="#faq">
          billing policy page
        </a>{" "}
        once purchases are live.
      </p>
    ),
  },
  {
    question: "How does support work?",
    content: (
      <p>
        After launch we will publish a support hub with known issues, patches,
        and how to reach us. For now, use the contact channel on the main site
        for press or partnership questions.
      </p>
    ),
  },
  {
    question: "What options will I have to pay for Blod?",
    content: (
      <p>
        We plan standard and deluxe editions where it makes sense, sold through
        major PC and console storefronts. Payment methods will match each store
        (card, wallet, regional options). Exact tiers and prices will be
        confirmed before pre{NBHY}orders open.
      </p>
    ),
  },
  {
    question: "What platforms is Blod coming to?",
    content: (
      <p>
        Target platforms and performance tiers will be announced with the
        release roadmap. This page will list minimum and recommended PC specs
        when we lock them.
      </p>
    ),
  },
  {
    question: "Is there a beta or early access program?",
    content: (
      <p>
        If we run a closed beta or early{NBSP}access, we will explain how to
        opt{NBSP}in, what build you get, and how feedback is handled. Watch
        announcements here and on our social channels.
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
