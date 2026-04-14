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
              the rats moved with caution, as if the stones remembered suffering.
              He was called Bloodhound by trade—one who tracked debt, scenting
              coin and failure alike. His youth was a slow drowning in obligation,
              each breath borrowed, each step weighed against what he owed. Yet
              within him stirred a hunger he could not name, colder than
              ambition, sharper than survival.
            </p>
            <p>
              Through cunning and a willingness to stain his hands deeper than
              most, Pascale rose into the orbit of the Eight—veiled arbiters who
              ruled not by crown, but by silence and decree. Their halls were not
              of gold, but of shadow, where truth did not speak—it bled.
            </p>
            <p>
              There he learned blood was no mere vessel. It whispered. It
              remembered. In its trails, Pascale saw fragments not his
              own—lives extinguished, voices buried beneath centuries. The more
              he listened, the more the world unraveled. The sacred became
              suspect.
            </p>
          </div>
          <div className="blod-story-columns__col">
            <p>
              The gods proved hollow. Their miracles rehearsed, their presence
              constructed. The Eight did not serve the divine—they curated it.
            </p>
            <p>
              With this knowing came fracture. The hunger that drove him upward
              turned inward. Was he merely another instrument, precisely placed?
              Or could he become something ruinous to the order that raised him?
            </p>
            <p>
              As lesser debts fell away, a greater one took hold. To act was to
              destroy. To refuse was to preserve a lie. Pascale stood at the
              threshold—either uphold tyranny cloaked in necessity, or tear the
              veil aside, whatever the cost.
            </p>
            <p>
              And in the silence that followed, the blood waited—watching,
              remembering, ready to speak again.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
