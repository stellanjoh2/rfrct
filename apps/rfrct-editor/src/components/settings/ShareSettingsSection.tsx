export type ShareSettingsSectionProps = {
  onCopySettings: () => void | Promise<void>;
  /** Controlled buffer for pasted JSON (Cmd/Ctrl+V works when the field is focused). */
  pasteDraft: string;
  onPasteDraftChange: (value: string) => void;
  /** Parses and applies JSON from the paste field. */
  onApplyPastedSettings: () => void;
};

export function ShareSettingsSection({
  onCopySettings,
  pasteDraft,
  onPasteDraftChange,
  onApplyPastedSettings,
}: ShareSettingsSectionProps) {
  return (
    <>
      <h2>Share settings</h2>
      <section>
        <p className="field-hint">
          Copy all tweakable values as JSON (no uploaded image). Paste into the box
          below (or type) and apply — useful for bug reports.
        </p>
        <div className="share-settings-row">
          <button
            type="button"
            className="mic-toggle"
            onClick={() => void onCopySettings()}
          >
            Copy settings
          </button>
        </div>
        <div className="field share-settings-paste-field">
          <label htmlFor="settings-paste-json">Paste settings JSON</label>
          <textarea
            id="settings-paste-json"
            className="share-settings-textarea"
            spellCheck={false}
            autoComplete="off"
            rows={8}
            placeholder='{"schema": "rfrct-editor-settings", ...}'
            value={pasteDraft}
            onChange={(e) => onPasteDraftChange(e.target.value)}
          />
          <button
            type="button"
            className="mic-toggle share-settings-apply-btn"
            onClick={() => onApplyPastedSettings()}
          >
            Apply pasted settings
          </button>
        </div>
      </section>
    </>
  );
}
