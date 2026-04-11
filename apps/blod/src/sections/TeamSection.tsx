import { BlodLightboxGroup } from "../BlodLightboxGroup";
import { staffMembers } from "../content/staff";

export function TeamSection() {
  return (
    <section id="team" className="blod-section">
      <div className="blod-section-inner blod-section-inner--prose">
        <h2>Team</h2>
        <BlodLightboxGroup className="blod-staff-grid">
          {staffMembers.map((person) => (
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
                <span className="blod-staff-card__name">{person.name}</span>
                <span className="blod-staff-card__role">{person.role}</span>
                <div className="blod-staff-card__bio">{person.bio}</div>
              </figcaption>
            </figure>
          ))}
        </BlodLightboxGroup>
      </div>
    </section>
  );
}
