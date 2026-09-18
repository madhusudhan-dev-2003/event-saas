"use client";

import { ACCESS_SECTIONS, type Permission } from "@/lib/permissions";

const IMPLIED_BY: Partial<Record<Permission, Permission>> = {
  "guests.checkin": "guests.manage",
  "budget.view": "budget.manage",
  "vendors.quotes": "vendors.manage",
  "users.invite": "users.manage",
  "schedule.manage": "events.write",
};

const INCLUDES: Partial<Record<Permission, string>> = {
  "events.write": "Includes schedule",
  "guests.manage": "Includes check-in",
  "budget.manage": "Includes viewing budget",
  "vendors.manage": "Includes quotes",
  "users.manage": "Includes invites",
};

export function AccessMatrix({
  selected,
  onToggle,
  disabled,
}: {
  selected: readonly string[];
  onToggle?: (key: Permission, enabled: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="access-matrix">
      {ACCESS_SECTIONS.map((section) => (
        <section key={section.id} className="access-module">
          <header>
            <h3>{section.title}</h3>
            <p>{section.description}</p>
          </header>
          <div className="access-options">
            {section.options.map((option) => {
              const parent = IMPLIED_BY[option.key];
              if (parent && selected.includes(parent)) return null;
              const checked = selected.includes(option.key);
              return (
                <label
                  key={option.key}
                  className={`access-option${checked ? " is-on" : ""}${disabled ? " is-locked" : ""}`}
                >
                  <input
                    type="checkbox"
                    name="permissions"
                    value={option.key}
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) =>
                      onToggle?.(option.key, event.target.checked)
                    }
                  />
                  <span>
                    <strong>{option.title}</strong>
                    <small>
                      {option.hint}
                      {INCLUDES[option.key] ? ` · ${INCLUDES[option.key]}` : ""}
                    </small>
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
