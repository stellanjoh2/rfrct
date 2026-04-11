import { publicUrl } from "../publicUrl";

/** Default headshot until each portrait points at a real file under `public/Images/`. */
export const staffPortraitPlaceholderUrl = publicUrl(
  "Images/premium_photo-1747851400319-a9d28293edc5.png",
);

export type StaffMember = {
  name: string;
  role: string;
  bio: string;
  portraitSrc: string;
};

export const staffMembers: StaffMember[] = [
  {
    name: "Jonathan Michael Doe",
    role: "Creative Director",
    bio: "Placeholder: leads visual direction and narrative tone for the project.",
    portraitSrc: staffPortraitPlaceholderUrl,
  },
  {
    name: "Sarah Elizabeth Mitchell",
    role: "Lead Environment Artist",
    bio: "Placeholder: owns world-building, mood boards, and in-engine set dressing.",
    portraitSrc: staffPortraitPlaceholderUrl,
  },
  {
    name: "Marcus James Chen",
    role: "Technical Director",
    bio: "Placeholder: pipeline, performance budgets, and renderer integration.",
    portraitSrc: staffPortraitPlaceholderUrl,
  },
  {
    name: "Elena María Vasquez",
    role: "Audio Director",
    bio: "Placeholder: score, sound design, and spatial mix for key scenes.",
    portraitSrc: staffPortraitPlaceholderUrl,
  },
  {
    name: "James Obi Okonkwo",
    role: "Narrative Designer",
    bio: "Placeholder: characters, dialogue beats, and branching story structure.",
    portraitSrc: staffPortraitPlaceholderUrl,
  },
  {
    name: "Rachel Annika Lindström",
    role: "Producer",
    bio: "Placeholder: scheduling, milestones, and coordination across disciplines.",
    portraitSrc: staffPortraitPlaceholderUrl,
  },
];
