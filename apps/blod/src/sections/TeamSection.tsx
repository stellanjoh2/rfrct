import { BlodSectionBloodParallax } from "../BlodSectionBloodParallax";
import { BLOOD_PARALLAX_URL } from "../content/bloodParallax";
import { BlodLightboxGroup } from "../BlodLightboxGroup";
import { staffMembers } from "../content/staff";

export function TeamSection() {
  return (
    <section id="team" className="blod-section blod-section--blood">
      <div className="blod-section-blood-layer" aria-hidden>
        <BlodSectionBloodParallax imageSrc={BLOOD_PARALLAX_URL} side="left" />
      </div>
      <div className="blod-section-inner blod-section-inner--prose">
        <h2>Team</h2>
        <BlodLightboxGroup className="blod-staff-grid">
          {staffMembers.map((person) => (
            <figure key={person.name} className="blod-staff-card">
              <div className="blod-staff-card__media-frame">
                <span className="blod-img-ambilight" aria-hidden>
                  <img
                    className="blod-img-ambilight__img"
                    src={person.portraitSrc}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={1080}
                    height={1440}
                  />
                </span>
                <a
                  className="blod-staff-card__media lg-item blod-img-hover-tint"
                  href={person.portraitSrc}
                >
                  <img
                    src={person.portraitSrc}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={1080}
                    height={1440}
                  />
                </a>
              </div>
              <figcaption className="blod-staff-card__meta">
                <span className="blod-staff-card__name">{person.name}</span>
                <span className="blod-staff-card__role">{person.role}</span>
              </figcaption>
            </figure>
          ))}
        </BlodLightboxGroup>
      </div>
    </section>
  );
}
