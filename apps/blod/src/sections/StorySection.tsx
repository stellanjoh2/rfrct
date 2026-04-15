import { BlodSectionBloodParallax } from "../BlodSectionBloodParallax";
import { BLOOD_PARALLAX_URL } from "../content/bloodParallax";

/**
 * Long-form lore copy — two-column editorial layout (stacks on narrow viewports).
 */
export function StorySection() {
  return (
    <section
      id="lore"
      lang="en"
      className="blod-section blod-section--story blod-section--blood"
    >
      <div className="blod-section-blood-layer" aria-hidden>
        <BlodSectionBloodParallax
          imageSrc={BLOOD_PARALLAX_URL}
          side="right"
          rotationDeg={20}
        />
      </div>
      <div className="blod-section-inner blod-section-inner--prose blod-section-inner--story">
        <h2>Lore</h2>
        <div className="blod-story-columns">
          <div className="blod-story-columns__col">
            <p>
              Pascale was born beneath a guttering sky, in a quarter where even
              rats moved with caution, as if the stones remembered suffering. A
              Bloodhound by trade, he tracked debt—scenting coin and failure
              alike. His youth was a slow drowning in obligation, each breath
              borrowed, each step owed. Yet within him stirred a hunger colder
              than ambition, sharper than survival.
            </p>
            <p>
              Through cunning and a willingness to stain his hands, Pascale rose
              into the orbit of the Eight—veiled arbiters who ruled by silence,
              their halls steeped in shadow where truth did not speak but bled.
            </p>
            <p>
              There he learned blood was no mere vessel; it whispered, it
              remembered, and in its trails he saw fragments not his
              own—extinguished lives and buried voices.
            </p>
          </div>
          <div className="blod-story-columns__col">
            <p>
              The more he listened, the more the world unraveled, the sacred
              turning suspect as the gods proved hollow and their miracles
              rehearsed. The Eight did not serve the divine—they curated it.
            </p>
            <p>
              With this knowing came fracture, and the hunger that drove him
              upward turned inward. Was he merely an instrument, precisely
              placed, or something ruinous to the order that raised him? As
              lesser debts fell away, a greater one took hold: to act was to
              destroy, to refuse was to preserve a lie. Pascale stood at the
              threshold, suspended between obedience and ruin, while in the
              silence the blood waited, watching and remembering.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
