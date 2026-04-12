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
              the rats moved with caution, as though the stones themselves
              remembered suffering. He was called Bloodhound not by title, but by
              trade—one who tracked debt, scenting coin and failure alike. His
              youth was a slow drowning in obligation, each breath borrowed, each
              step measured against what he owed. Yet there stirred within him a
              hunger he could not name, something colder than ambition, sharper
              than survival.
            </p>
            <p>
              Fortune, or some darker design, drew him upward. Through cunning
              and a willingness to stain his hands deeper than most dared,
              Pascale found himself summoned into the orbit of the Eight—those
              veiled arbiters who ruled not by crown, but by silence and
              decree. Their halls were not of gold, but of shadow and echo, and
              within them, truth did not speak plainly. It bled.
            </p>
            <p>
              It was there he first learned that blood was no mere vessel. It
              whispered. It remembered. In the crimson trails left behind by ritual
              and violence, Pascale began to see fragments not his own—lives
              long extinguished, voices buried beneath centuries of quiet
              obedience. The more he listened, the less the world held shape.
              History unraveled. The sacred became suspect.
            </p>
          </div>
          <div className="blod-story-columns__col">
            <p>
              And the gods—those distant, revered watchers—proved hollow. Their
              miracles, rehearsed. Their presence, constructed. What Pascale had
              been taught to worship revealed itself as machinery of control,
              intricate and merciless. The Eight did not serve the divine. They
              curated it.
            </p>
            <p>
              Yet with this knowing came a fracture within him. The hunger that
              had driven him upward now turned inward, gnawing at his purpose.
              Was he merely another instrument, sharpened and placed precisely
              where needed? Or could he become something else—something ruinous to
              the order that raised him?
            </p>
            <p>
              As debts fell away, a greater weight took their place. To act was
              to destroy. To refuse was to preserve a lie that bound the world in
              quiet suffering. Pascale stood at the threshold of becoming:
              either a hand that upheld tyranny, cloaked in necessity, or a force
              that would tear the veil aside, no matter the cost.
            </p>
            <p>
              And in the silence that followed his choice, the blood
              waited—watching, remembering, and ready to speak again.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
