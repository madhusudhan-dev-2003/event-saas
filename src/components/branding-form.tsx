"use client";

import { useActionState } from "react";
import { removeSpaceBrand, updateSpaceBrand } from "@/app/actions";

export function BrandingForm({
  spaceId,
  hasLogo,
  hasFavicon,
  rev,
}: {
  spaceId: string;
  hasLogo: boolean;
  hasFavicon: boolean;
  rev: number;
}) {
  const [saveState, save, saving] = useActionState(updateSpaceBrand, {});
  const [removeState, remove, removing] = useActionState(removeSpaceBrand, {});
  const stamp = rev ? `&v=${rev}` : "";
  const logoSrc = hasLogo
    ? `/api/brand/logo?space=${encodeURIComponent(spaceId)}${stamp}`
    : "";
  const faviconSrc = hasFavicon
    ? `/api/brand/favicon?space=${encodeURIComponent(spaceId)}${stamp}`
    : "";

  return (
    <div className="branding-form">
      <p>
        Logo sits in the sidebar. Favicon sits on the browser tab. Without a
        logo, the text brand stays.
      </p>
      <div className="branding-previews">
        <div className="branding-preview">
          <span>Sidebar logo</span>
          {logoSrc ? (
            <img src={logoSrc} alt="Current space logo" />
          ) : (
            <em>Text brand in use</em>
          )}
        </div>
        <div className="branding-preview">
          <span>Favicon</span>
          {faviconSrc ? (
            <img src={faviconSrc} alt="Current favicon" />
          ) : (
            <em>Default icon</em>
          )}
        </div>
      </div>
      <form action={save} className="settings-form">
        <input type="hidden" name="spaceId" value={spaceId} />
        <fieldset>
          <label>
            Logo
            <input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" />
            <small>PNG, JPG, WEBP, SVG or GIF. Up to 1 MB.</small>
          </label>
          <label>
            Favicon
            <input name="favicon" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,.ico" />
            <small>PNG, ICO or SVG. Up to 256 KB.</small>
          </label>
        </fieldset>
        <button className="primary" disabled={saving}>
          {saving ? "Please wait" : "Save branding"}
        </button>
      </form>
      {(hasLogo || hasFavicon) && (
        <div className="branding-remove">
          {hasLogo ? (
            <form action={remove}>
              <input type="hidden" name="spaceId" value={spaceId} />
              <input type="hidden" name="kind" value="logo" />
              <button className="btn-compact" disabled={removing} type="submit">
                Remove logo
              </button>
            </form>
          ) : null}
          {hasFavicon ? (
            <form action={remove}>
              <input type="hidden" name="spaceId" value={spaceId} />
              <input type="hidden" name="kind" value="favicon" />
              <button className="btn-compact" disabled={removing} type="submit">
                Remove favicon
              </button>
            </form>
          ) : null}
        </div>
      )}
      {saveState.error || removeState.error ? (
        <p className="error" role="alert">
          {saveState.error || removeState.error}
        </p>
      ) : null}
      {saveState.success || removeState.success ? (
        <p className="notice" role="status">
          {saveState.success || removeState.success}
        </p>
      ) : null}
    </div>
  );
}
