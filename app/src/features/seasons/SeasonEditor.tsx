import {
  useEffect,
  useEffectEvent,
  useRef,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";

import type { Season, SeasonStatus } from "../../lib/domain/types";
import type { SeasonInput } from "../../lib/validation/domain";

export function SeasonEditor({
  form,
  setForm,
  errors,
  editing,
  statusOptions,
  saving,
  firstInvalid,
  submit,
  close,
}: {
  form: SeasonInput;
  setForm: (value: SeasonInput) => void;
  errors: Record<string, string>;
  editing: Season | null;
  statusOptions: Record<SeasonStatus, string>;
  saving: boolean;
  firstInvalid: RefObject<HTMLInputElement | null>;
  submit: (event: FormEvent) => void;
  close: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const onClose = useEffectEvent(close);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog
      ?.querySelector<HTMLElement>("input, button, select, textarea")
      ?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && dialog) trapTab(event, dialog);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="editor-sheet compact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="season-editor-title"
      >
        <div className="editor-heading">
          <h2 id="season-editor-title">
            {editing ? "Saison bearbeiten" : "Saison anlegen"}
          </h2>
          <button
            className="icon-button"
            aria-label="Dialog schließen"
            onClick={close}
          >
            ×
          </button>
        </div>
        <form onSubmit={submit} noValidate>
          <div className="form-grid">
            <Field label="Name" error={errors.name} required wide>
              <input
                ref={errors.name ? firstInvalid : undefined}
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </Field>
            <Field label="Startdatum" error={errors.startDate} required>
              <input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm({ ...form, startDate: event.target.value })
                }
              />
            </Field>
            <Field label="Enddatum" error={errors.endDate} required>
              <input
                type="date"
                value={form.endDate}
                onChange={(event) =>
                  setForm({ ...form, endDate: event.target.value })
                }
              />
            </Field>
            <Field label="Beschreibung" error={errors.description} wide>
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </Field>
            <Field label="Hauptziel" error={errors.mainGoal} wide>
              <textarea
                rows={2}
                value={form.mainGoal}
                onChange={(event) =>
                  setForm({ ...form, mainGoal: event.target.value })
                }
              />
            </Field>
            <Field label="Status" error={errors.status}>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status: event.target.value as SeasonStatus,
                  })
                }
              >
                {Object.entries(statusOptions).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {errors.form && (
            <p className="field-error" role="alert">
              {errors.form}
            </p>
          )}
          <div className="editor-footer">
            <button type="button" className="button quiet" onClick={close}>
              Abbrechen
            </button>
            <button className="button primary" disabled={saving}>
              {saving ? "Speichert …" : "Saison speichern"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function trapTab(event: KeyboardEvent, container: HTMLElement) {
  const controls = [
    ...container.querySelectorAll<HTMLElement>(
      "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex='0']",
    ),
  ];
  const first = controls[0];
  const last = controls.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function Field({
  label,
  error,
  required,
  wide,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`field${wide ? " wide" : ""}`}>
      <span>
        {label}
        {required ? <em aria-hidden="true"> *</em> : null}
      </span>
      {children}
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
