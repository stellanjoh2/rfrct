import { useId } from "react";
import { BlodLiquidWarpFilterDefs } from "../BlodLiquidWarpFilterDefs";
import { blodLiquidWarpFilterId, blodLiquidWarpStyle } from "../blodLiquidWarpFilterId";
import { BlodSectionBloodParallax } from "../BlodSectionBloodParallax";
import { BLOOD_PARALLAX_URL } from "../content/bloodParallax";
import { BlodLightboxGroup } from "../BlodLightboxGroup";
import { staffMembers } from "../content/staff";

function StaffMemberCard({
  portraitSrc,
  name,
  role,
}: {
  portraitSrc: string;
  name: string;
  role: string;
}) {
  const reactId = useId();
  const filterId = blodLiquidWarpFilterId(reactId);

  return (
    <figure className="blod-staff-card">
      <div className="blod-staff-card__media-frame">
        <span className="blod-img-ambilight" aria-hidden>
          <img
            className="blod-img-ambilight__img"
            src={portraitSrc}
            alt=""
            loading="lazy"
            decoding="async"
            width={1080}
            height={1440}
          />
        </span>
        <a
          className="blod-staff-card__media lg-item blod-img-hover-tint blod-img-hover-tint--liquid-warp"
          href={portraitSrc}
          style={blodLiquidWarpStyle(filterId)}
        >
          <BlodLiquidWarpFilterDefs filterId={filterId} />
          <span className="blod-img-hover-stack">
            <img
              className="blod-img-hover-stack__fx"
              src={portraitSrc}
              alt=""
              loading="lazy"
              decoding="async"
              width={1080}
              height={1440}
            />
            <img
              className="blod-img-hover-stack__clear"
              src={portraitSrc}
              alt=""
              loading="lazy"
              decoding="async"
              width={1080}
              height={1440}
            />
          </span>
        </a>
      </div>
      <figcaption className="blod-staff-card__meta">
        <span className="blod-staff-card__name">{name}</span>
        <span className="blod-staff-card__role">{role}</span>
      </figcaption>
    </figure>
  );
}

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
            <StaffMemberCard
              key={person.name}
              portraitSrc={person.portraitSrc}
              name={person.name}
              role={person.role}
            />
          ))}
        </BlodLightboxGroup>
      </div>
    </section>
  );
}
