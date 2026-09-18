"use client";

import { useTransition } from "react";
import { deleteEvent } from "@/app/actions";
import { useRouter } from "next/navigation";
import { ArrowRight, Trash2 } from "@/components/icons";

export function DeleteEventButton({
  id,
  name,
  variant = "label",
}: {
  id: string;
  name: string;
  variant?: "label" | "icon" | "row";
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const onDelete = () => {
    if (
      !confirm(`Remove "${name}" from this space? This cannot be undone.`)
    )
      return;
    start(async () => {
      const result = await deleteEvent({ id });
      if (result.path) router.push(result.path);
      else router.refresh();
    });
  };

  if (variant === "row") {
    return (
      <button
        type="button"
        className="settings-quick-btn is-danger"
        disabled={pending}
        onClick={onDelete}
      >
        <Trash2 size={16} />
        {pending ? "Removing..." : "Delete this event"}
        <ArrowRight size={16} />
      </button>
    );
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        className="icon-btn icon-btn-danger"
        disabled={pending}
        aria-label={pending ? `Removing ${name}` : `Delete ${name}`}
        title="Delete"
        onClick={onDelete}
      >
        <Trash2 size={15} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn-compact btn-compact-danger event-delete-btn"
      disabled={pending}
      onClick={onDelete}
    >
      {pending ? "Removing..." : "Delete"}
    </button>
  );
}
