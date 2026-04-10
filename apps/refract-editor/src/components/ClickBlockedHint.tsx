import type { ReactNode } from "react";

export type ClickBlockedHintProps = {
  blocked: boolean;
  hint: string;
  onBlockedClick: (message: string) => void;
  children: ReactNode;
  /** Stretch to full width of the parent `.field` (sliders, selects, rows). */
  fullWidth?: boolean;
};

/**
 * When `blocked`, overlays a transparent layer so clicks show {@link onBlockedClick}
 * with a hint (native `disabled` controls do not receive clicks).
 */
export function ClickBlockedHint({
  blocked,
  hint,
  onBlockedClick,
  children,
  fullWidth = false,
}: ClickBlockedHintProps) {
  if (!blocked) return <>{children}</>;
  return (
    <div
      className={
        fullWidth
          ? "click-block-hint click-block-hint--field"
          : "click-block-hint"
      }
    >
      {children}
      <button
        type="button"
        className="click-block-hint-shield"
        aria-label={hint}
        title={hint}
        onClick={() => onBlockedClick(hint)}
      />
    </div>
  );
}
