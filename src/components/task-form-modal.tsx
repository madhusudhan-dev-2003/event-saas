"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/modals";
import { TASK_CATEGORY_OPTIONS } from "@/lib/task-board";
import { type PlanTask, type TaskStatus } from "@/lib/planning";

export type TaskFormValues = {
  title: string;
  category: string;
  priority: PlanTask["priority"];
  owner: string;
  due: string;
  status: TaskStatus;
  notes: string;
  offset: number | null;
  fixed: boolean;
};

export function TaskFormModal({
  open,
  task,
  members,
  onClose,
  onSave,
}: {
  open: boolean;
  task: PlanTask | null;
  members: { name: string }[];
  onClose: () => void;
  onSave: (data: TaskFormValues) => void;
}) {
  const [form, setForm] = useState<TaskFormValues>({
    title: "",
    category: "",
    priority: "NORMAL",
    owner: "",
    due: "",
    status: "NOT_STARTED",
    notes: "",
    offset: -7,
    fixed: false,
  });

  useEffect(() => {
    if (!open) return;
    if (task) {
      const status = task.done
        ? "COMPLETED"
        : task.status && task.status !== "COMPLETED"
          ? task.status
          : "NOT_STARTED";
      setForm({
        title: task.title,
        category: task.category ?? "",
        priority: task.priority ?? "NORMAL",
        owner: task.owner,
        due: task.due,
        status,
        notes: task.notes ?? "",
        offset: task.offset,
        fixed: task.fixed,
      });
    } else {
      setForm({
        title: "",
        category: "",
        priority: "NORMAL",
        owner: "",
        due: "",
        status: "NOT_STARTED",
        notes: "",
        offset: -7,
        fixed: false,
      });
    }
  }, [open, task]);

  const categories = [
    ...new Set([
      ...TASK_CATEGORY_OPTIONS,
      ...(form.category ? [form.category] : []),
    ]),
  ];
  const owners = [
    ...new Set([
      ...members.map((m) => m.name).filter(Boolean),
      ...(form.owner ? [form.owner] : []),
    ]),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      compact
      wide
      title={task ? "Edit task" : "Add task"}
      footer={
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="task-form" className="primary">
            {task ? "Save task" : "Add task"}
          </button>
        </div>
      }
    >
      <form
        id="task-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title.trim()) return;
          onSave({ ...form, title: form.title.trim() });
        }}
      >
        <label>
          Task title
          <input
            value={form.title}
            maxLength={160}
            required
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <div className="field-grid field-grid-modal">
          <label>
            Category
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              value={form.priority}
              onChange={(e) =>
                setForm({
                  ...form,
                  priority: e.target.value as PlanTask["priority"],
                })
              }
            >
              <option value="HIGH">High</option>
              <option value="NORMAL">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </label>
          <label>
            Owner
            <input
              list="task-owner-options"
              value={form.owner}
              maxLength={160}
              placeholder="Not set"
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
            />
            <datalist id="task-owner-options">
              {owners.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
          <label>
            Due date
            <input
              type="date"
              value={form.due}
              onChange={(e) =>
                setForm({ ...form, due: e.target.value, fixed: true })
              }
            />
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as TaskStatus,
                })
              }
            >
              <option value="NOT_STARTED">Not started</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </label>
          <label>
            Days before event
            <input
              type="number"
              min={-730}
              max={365}
              value={form.offset ?? ""}
              title="Used when the event date moves and this task is not fixed"
              onChange={(e) =>
                setForm({
                  ...form,
                  offset:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={form.fixed}
              onChange={(e) => setForm({ ...form, fixed: e.target.checked })}
            />
            Keep due date fixed when event date changes
          </label>
        </div>
        <label>
          Notes
          <textarea
            rows={3}
            maxLength={2000}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>
      </form>
    </Modal>
  );
}
