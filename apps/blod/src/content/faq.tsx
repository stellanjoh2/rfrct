import type { ReactNode } from "react";

export type FaqItem = {
  question: string;
  /** Body copy uses Inter via `.blod-faq__answer` in CSS. */
  content: ReactNode;
};

export const faqItems: readonly FaqItem[] = [
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
        this Faq when sales go live.
      </p>
    ),
  },
];
