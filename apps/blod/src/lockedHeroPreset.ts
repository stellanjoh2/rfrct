import type { RendererSyncSource } from "@rfrct/core";
import { createDefaultHeroSync } from "./createDefaultHeroSync";

/**
 * Shipped look for visitors. In dev you tune `createDefaultHeroSync` (or the panel),
 * then paste the values here (or call createDefaultHeroSync once and commit).
 */
export const LOCKED_HERO_SYNC: RendererSyncSource = createDefaultHeroSync();
