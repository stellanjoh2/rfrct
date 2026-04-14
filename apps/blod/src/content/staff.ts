import { publicUrl } from "../publicUrl";

/** Pool under `public/Images/` — PNG placeholders (stable names in repo). */
const STAFF_PLACEHOLDER_PORTRAITS = [
  publicUrl("Images/portrait1.png"),
  publicUrl("Images/portrait2.png"),
  publicUrl("Images/portrait3.png"),
] as const;

/** Deterministic pick so each person keeps the same placeholder across reloads. */
export function staffPlaceholderPortraitUrl(name: string): string {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return STAFF_PLACEHOLDER_PORTRAITS[(h >>> 0) % STAFF_PLACEHOLDER_PORTRAITS.length];
}

export type StaffMember = {
  name: string;
  role: string;
  bio: string;
  portraitSrc: string;
};

/** Display names: first + last only (no middle names or three-part names). */
const staffMembersBase: Omit<StaffMember, "portraitSrc">[] = [
  {
    name: "Jonathan Doe",
    role: "Creative Director",
    bio: "Placeholder: leads visual direction and narrative tone for the project.",
  },
  {
    name: "Sarah Mitchell",
    role: "Lead Environment Artist",
    bio: "Placeholder: owns world-building, mood boards, and in-engine set dressing.",
  },
  {
    name: "Marcus Chen",
    role: "Technical Director",
    bio: "Placeholder: pipeline, performance budgets, and renderer integration.",
  },
  {
    name: "Elena Vasquez",
    role: "Audio Director",
    bio: "Placeholder: score, sound design, and spatial mix for key scenes.",
  },
  {
    name: "James Okonkwo",
    role: "Narrative Designer",
    bio: "Placeholder: characters, dialogue beats, and branching story structure.",
  },
  {
    name: "Rachel Lindström",
    role: "Producer",
    bio: "Placeholder: scheduling, milestones, and coordination across disciplines.",
  },
];

export const staffMembers: StaffMember[] = staffMembersBase.map((m) => ({
  ...m,
  portraitSrc: staffPlaceholderPortraitUrl(m.name),
}));
