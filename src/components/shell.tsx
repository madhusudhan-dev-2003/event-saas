import { Suspense } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CircleHelp,
  Flower2,
  LayoutDashboard,
  Plus,
  Settings2,
  Sparkles,
  Store,
  Users,
} from "@/components/icons";
import { logout } from "@/app/actions";
import { SpaceSwitcher } from "@/components/space-switcher";
import { TopbarSearch } from "@/components/topbar-search";
import { BrandFavicon } from "@/components/brand-favicon";
import { getSpaceBrandMeta } from "@/lib/brand";

function spaceHref(path: string, spaceId?: string) {
  if (!spaceId) return path;
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}space=${spaceId}`;
}

export async function Shell({
  children,
  user,
  spaces = [],
  spaceId = "",
  active = "dashboard",
  saveStatus,
  title,
  description,
}: {
  children: React.ReactNode;
  user?: { name: string };
  spaces?: { id: string; name: string; kind: string }[];
  spaceId?: string;
  active?: string;
  saveStatus?: "idle" | "saving" | "saved" | "error";
  title?: string;
  description?: string;
}) {
  const usersHref = spaceId ? `/users?space=${spaceId}` : "/spaces/new";
  const settingsHref = spaceId ? `/settings?space=${spaceId}` : "/spaces/new";
  const brand = spaceId ? await getSpaceBrandMeta(spaceId) : null;

  return (
    <div className="app-shell">
      {spaceId ? (
        <BrandFavicon
          spaceId={spaceId}
          hasFavicon={Boolean(brand?.hasFavicon)}
          rev={brand?.rev || 0}
        />
      ) : null}
      <aside className="sidebar">
        <Link
          href={spaceHref("/dashboard", spaceId)}
          className={brand?.hasLogo ? "brand has-logo" : "brand"}
        >
          {brand?.hasLogo ? (
            <img
              className="brand-logo"
              src={`/api/brand/logo?space=${encodeURIComponent(spaceId)}&v=${brand.rev}`}
              alt="Space logo"
            />
          ) : (
            <>
              <Flower2 size={32} strokeWidth={1.3} />
              utsava<span>CELEBRATE TOGETHER</span>
            </>
          )}
        </Link>

        <div className="sidebar-scroll">
          <SpaceSwitcher spaces={spaces} spaceId={spaceId} />
          <nav className="main-nav">
            <Link
              className={active === "dashboard" ? "active" : ""}
              href={spaceHref("/dashboard", spaceId)}
            >
              <LayoutDashboard size={19} />
              Dashboard
            </Link>
            <Link
              className={active === "celebrations" ? "active" : ""}
              href={spaceHref("/celebrations", spaceId)}
            >
              <Sparkles size={19} />
              Celebrations
            </Link>
            <Link
              className={active === "users" ? "active" : ""}
              href={usersHref}
            >
              <Users size={19} />
              Users
            </Link>
            <Link
              className={active === "templates" ? "active" : ""}
              href={spaceHref("/templates", spaceId)}
            >
              <CalendarDays size={19} />
              Occasion starters
            </Link>
            <Link
              href={settingsHref}
              className={active === "settings" ? "active" : ""}
            >
              <Settings2 size={19} />
              Settings
            </Link>
            <Link
              className={active === "providers" ? "active" : ""}
              href={spaceHref("/providers", spaceId)}
            >
              <Store size={19} />
              Provider directory
            </Link>
          </nav>
          <Link
            href={spaceHref("/help", spaceId)}
            className={`sidebar-help${active === "help" ? " active" : ""}`}
          >
            <CircleHelp size={18} /> Planning guide
          </Link>
        </div>

        <div className="sidebar-bottom">
          {user ? (
            <div className="user-card">
              <span className="avatar">{user.name.charAt(0)}</span>
              <div>
                <Link href={spaceHref("/account", spaceId)}>
                  <strong>{user.name}</strong>
                </Link>
                <form action={logout}>
                  <button type="submit" className="text-button">
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <Link href="/login" className="primary sidebar-signin">
              Sign in to start
            </Link>
          )}
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="topbar-title">
            {title ? <h1>{title}</h1> : <span />}
            {description ? <p>{description}</p> : null}
            {saveStatus === "saving" && (
              <span className="save-indicator">Saving...</span>
            )}
            {saveStatus === "saved" && (
              <span className="save-indicator is-saved">Saved</span>
            )}
            {saveStatus === "error" && (
              <span className="save-indicator is-error">Save failed</span>
            )}
          </div>
          <Suspense fallback={<div className="topbar-search" />}>
            <TopbarSearch />
          </Suspense>
          <Link href={spaceHref("/new", spaceId)} className="btn-add">
            <Plus size={16} /> New event
          </Link>
        </header>
        <main>{children}</main>
        <footer>
          Made for moments that matter.{" "}
          <span>Utsava | Your people brought together</span>
        </footer>
      </div>
    </div>
  );
}
