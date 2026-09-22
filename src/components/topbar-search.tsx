"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "@/components/icons";

function placeholderFor(path: string) {
  if (path.startsWith("/users")) return "Search people, email, or role";
  if (path.startsWith("/celebrations")) return "Search celebrations";
  if (path.startsWith("/providers")) return "Search providers";
  if (path.startsWith("/templates")) return "Search occasion starters";
  if (path.startsWith("/dashboard")) return "Search celebrations";
  if (path.startsWith("/settings") || path.startsWith("/spaces/"))
    return "Search people and roles";
  if (path.startsWith("/help")) return "Search the planning guide";
  if (path.startsWith("/account")) return "Search account sections";
  return "Search this page";
}

export function TopbarSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") || "");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setValue(searchParams.get("q") || "");
  }, [searchParams]);

  function commit(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = next.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <form
      className="topbar-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        if (timer.current) window.clearTimeout(timer.current);
        commit(value);
      }}
    >
      <Search size={15} />
      <input
        type="search"
        value={value}
        placeholder={placeholderFor(pathname)}
        aria-label="Search"
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          if (timer.current) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => commit(next), 250);
        }}
      />
    </form>
  );
}

export function usePageSearch() {
  const searchParams = useSearchParams();
  return (searchParams.get("q") || "").trim().toLowerCase();
}
