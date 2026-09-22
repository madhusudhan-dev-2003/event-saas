"use client";

import { useState } from "react";
import {
  ArrowRight,
  Plus,
  Search,
  Sparkles,
} from "@/components/icons";
import { Modal } from "@/components/modals";
import {
  planningProgress,
  type Plan,
  type PlanTask,
} from "@/lib/planning";
import {
  filterAndSortTasks,
  ownerInitials,
  uniqueTaskCategories,
  uniqueTaskOwners,
  type TaskBoardFilters,
  type TaskSort,
} from "@/lib/task-board";
import {
  TaskCategoryCell,
  TaskDueCell,
  TaskPriorityBadge,
  TaskStatusBadge,
} from "./task-badges";
import { Pencil, Trash2, UserRound } from "@/components/icons";

export function PlanTab({
  plan,
  editable,
  pending,
  members,
  suggestions,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleTask,
  onGenerateSuggestions,
  onAddSuggestion,
}: {
  plan: Plan;
  editable: boolean;
  pending: boolean;
  members: { name: string }[];
  suggestions: string[];
  onAddTask: () => void;
  onEditTask: (index: number) => void;
  onDeleteTask: (index: number) => void;
  onToggleTask: (index: number, done: boolean) => void;
  onGenerateSuggestions: () => void;
  onAddSuggestion: (suggestion: string) => void;
}) {
  const [filters, setFilters] = useState<TaskBoardFilters>({
    query: "",
    status: "all",
    priority: "all",
    category: "all",
    owner: "all",
    sort: "due",
  });
  const [aiOpen, setAiOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const previewTask =
    previewIndex !== null ? plan.tasks[previewIndex] : null;
  const progress = planningProgress(plan.tasks);
  const rows = filterAndSortTasks(plan.tasks, filters);
  const categories = uniqueTaskCategories(plan.tasks);
  const owners = [
    ...new Set([
      ...members.map((m) => m.name),
      ...uniqueTaskOwners(plan.tasks),
    ]),
  ].filter(Boolean);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference - (progress.progressPercent / 100) * circumference;

  return (
    <div className="plan-tab">
      <section className="plan-progress-card">
        <div className="plan-progress-main">
          <div className="plan-progress-ring" aria-hidden="true">
            <svg viewBox="0 0 88 88" width="88" height="88">
              <circle cx="44" cy="44" r={radius} className="plan-ring-track" />
              <circle
                cx="44"
                cy="44"
                r={radius}
                className="plan-ring-value"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <strong>{progress.progressPercent}%</strong>
          </div>
          <div className="plan-progress-copy">
            <h2>Event planning progress</h2>
            <p>
              {progress.completedTasks} of {progress.totalTasks} tasks completed
            </p>
            <div
              className="plan-progress-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.progressPercent}
              aria-label="Event planning progress"
            >
              <span style={{ width: `${progress.progressPercent}%` }} />
            </div>
          </div>
          <dl className="plan-progress-metrics">
            <div>
              <dt>Completed</dt>
              <dd>{progress.completedTasks}</dd>
            </div>
            <div>
              <dt>In progress</dt>
              <dd>{progress.inProgressTasks + progress.openTasks}</dd>
            </div>
            <div>
              <dt>Not started</dt>
              <dd>{progress.notStartedTasks}</dd>
            </div>
          </dl>
        </div>
        <aside className="plan-ai-card">
          <Sparkles size={22} strokeWidth={1.6} />
          <h3>Need help planning?</h3>
          <p>Get personalized task suggestions based on your event.</p>
          <button
            type="button"
            className="plan-ai-button"
            disabled={!editable || pending}
            onClick={() => {
              onGenerateSuggestions();
              setAiOpen(true);
            }}
          >
            Generate suggestions
            <ArrowRight size={16} />
          </button>
        </aside>
      </section>

      <section className="plan-tasks-card">
        <div className="plan-tasks-head">
          <div>
            <h2>Planning tasks</h2>
            <p>
              Break it down into simple steps and make your event stress-free.
            </p>
          </div>
          {editable && (
            <button
              type="button"
              className="btn-add"
              disabled={pending}
              onClick={onAddTask}
            >
              <Plus size={16} />
              Add task
            </button>
          )}
        </div>

        {plan.tasks.length > 0 && (
          <div className="plan-toolbar">
            <div className="plan-toolbar-search">
              <Search size={15} />
              <input
                type="search"
                placeholder="Search tasks..."
                value={filters.query}
                onChange={(e) =>
                  setFilters({ ...filters, query: e.target.value })
                }
                aria-label="Search tasks"
              />
            </div>
            <select
              value={filters.status}
              aria-label="All statuses"
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: e.target.value as TaskBoardFilters["status"],
                })
              }
            >
              <option value="all">All statuses</option>
              <option value="NOT_STARTED">Not started</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="OVERDUE">Overdue</option>
            </select>
            <select
              value={filters.priority}
              aria-label="All priorities"
              onChange={(e) =>
                setFilters({
                  ...filters,
                  priority: e.target.value as TaskBoardFilters["priority"],
                })
              }
            >
              <option value="all">All priorities</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <select
              value={filters.category}
              aria-label="All categories"
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value })
              }
            >
              <option value="all">All categories</option>
              <option value="uncategorized">Uncategorized</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={filters.owner}
              aria-label="All owners"
              onChange={(e) =>
                setFilters({ ...filters, owner: e.target.value })
              }
            >
              <option value="all">All owners</option>
              <option value="unassigned">Not set</option>
              {owners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
            <div className="plan-sort">
              <span>Sort by</span>
              <select
                value={filters.sort}
                aria-label="Sort by"
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    sort: e.target.value as TaskSort,
                  })
                }
              >
                <option value="due">Due date</option>
                <option value="priority">Priority</option>
                <option value="recent">Recently added</option>
                <option value="name">Task name</option>
              </select>
            </div>
          </div>
        )}

        {!plan.tasks.length ? (
          <div className="plan-empty">
            <h3>No planning tasks yet</h3>
            <p>
              Start with your first task or get suggestions from Utsava.
            </p>
            <div className="plan-empty-actions">
              {editable && (
                <>
                  <button type="button" className="primary" onClick={onAddTask}>
                    Add task
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    disabled={pending}
                    onClick={() => {
                      onGenerateSuggestions();
                      setAiOpen(true);
                    }}
                  >
                    Get suggestions
                  </button>
                </>
              )}
            </div>
          </div>
        ) : !rows.length ? (
          <div className="plan-empty">
            <h3>No tasks match these filters.</h3>
            <button
              type="button"
              className="secondary"
              onClick={() =>
                setFilters({
                  query: "",
                  status: "all",
                  priority: "all",
                  category: "all",
                  owner: "all",
                  sort: "due",
                })
              }
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="plan-table-wrap">
              <table className="plan-table">
                <thead>
                  <tr>
                    <th className="plan-col-check">
                      <span className="sr-only">Complete</span>
                    </th>
                    <th>Task</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Due date</th>
                    <th>Owner</th>
                    <th>Status</th>
                    {editable && <th className="plan-col-actions">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ task, index }) => (
                    <PlanningTaskRow
                      key={task.id}
                      task={task}
                      editable={editable}
                      pending={pending}
                      onOpen={() => setPreviewIndex(index)}
                      onToggle={(done) => onToggleTask(index, done)}
                      onEdit={() => onEditTask(index)}
                      onDelete={() => onDeleteTask(index)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="plan-card-list">
              {rows.map(({ task, index }) => (
                <article
                  key={`card-${task.id}`}
                  className={`plan-task-card${task.done ? " is-done" : ""}`}
                  onClick={() => setPreviewIndex(index)}
                >
                  <header>
                    <label className="plan-check">
                      <input
                        type="checkbox"
                        checked={task.done}
                        disabled={!editable || pending}
                        aria-label={`Mark ${task.title} complete`}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onToggleTask(index, e.target.checked)}
                      />
                      <span className={task.done ? "is-done" : undefined}>
                        {task.title}
                      </span>
                    </label>
                    <TaskStatusBadge task={task} />
                  </header>
                  <dl>
                    <div>
                      <dt>Priority</dt>
                      <dd>
                        <TaskPriorityBadge priority={task.priority} />
                      </dd>
                    </div>
                    <div>
                      <dt>Due</dt>
                      <dd>
                        <TaskDueCell task={task} />
                      </dd>
                    </div>
                    <div>
                      <dt>Owner</dt>
                      <dd>{task.owner.trim() || "Not set"}</dd>
                    </div>
                  </dl>
                  {editable && (
                    <div
                      className="plan-row-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="plan-icon-btn"
                        aria-label="Edit task"
                        title="Edit task"
                        onClick={() => onEditTask(index)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="plan-icon-btn is-danger"
                        aria-label="Delete task"
                        title="Delete task"
                        onClick={() => onDeleteTask(index)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <Modal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        title="Planning suggestions"
        compact
      >
        {pending && !suggestions.length ? (
          <p>Looking at your saved plan…</p>
        ) : suggestions.length ? (
          <ul className="plan-suggestion-list">
            {suggestions.map((item) => (
              <li key={item}>
                <p>{item}</p>
                {editable && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      onAddSuggestion(item);
                      setAiOpen(false);
                    }}
                  >
                    Add as task
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No suggestions yet. Generate suggestions to see ideas here.</p>
        )}
      </Modal>
      <Modal
        open={!!previewTask}
        onClose={() => setPreviewIndex(null)}
        title="Task details"
        compact
        footer={
          <div className="modal-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setPreviewIndex(null)}
            >
              Close
            </button>
            {editable && previewIndex !== null && (
              <button
                type="button"
                className="primary"
                onClick={() => {
                  const index = previewIndex;
                  setPreviewIndex(null);
                  onEditTask(index);
                }}
              >
                <Pencil size={15} />
                Edit task
              </button>
            )}
          </div>
        }
      >
        {previewTask && (
          <div className="task-preview">
            <div className="task-preview-top">
              <h3>{previewTask.title}</h3>
              <div className="task-preview-pills">
                <TaskStatusBadge task={previewTask} />
                <TaskPriorityBadge priority={previewTask.priority} />
              </div>
            </div>
            <dl className="task-preview-grid">
              <div>
                <dt>Category</dt>
                <dd>
                  <TaskCategoryCell category={previewTask.category} />
                </dd>
              </div>
              <div>
                <dt>Due date</dt>
                <dd>
                  <TaskDueCell task={previewTask} />
                </dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>
                  {previewTask.owner.trim() ? (
                    <span className="task-owner">
                      <span aria-hidden="true">
                        {ownerInitials(previewTask.owner)}
                      </span>
                      {previewTask.owner}
                    </span>
                  ) : (
                    "Not set"
                  )}
                </dd>
              </div>
              <div>
                <dt>Days before event</dt>
                <dd>
                  {previewTask.offset === null
                    ? "Not set"
                    : previewTask.offset}
                </dd>
              </div>
              <div>
                <dt>Date behavior</dt>
                <dd>
                  {previewTask.fixed
                    ? "Due date stays fixed if the event date changes"
                    : "Due date can shift with the event date"}
                </dd>
              </div>
            </dl>
            <div className="task-preview-notes">
              <span>Notes</span>
              <p>
                {previewTask.notes.trim()
                  ? previewTask.notes
                  : "No notes yet."}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function PlanningTaskRow({
  task,
  editable,
  pending,
  onOpen,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: PlanTask;
  editable: boolean;
  pending: boolean;
  onOpen: () => void;
  onToggle: (done: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <tr
      className={`plan-task-row${task.done ? " is-done" : ""}`}
      onClick={onOpen}
    >
      <td
        className="plan-col-check"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={task.done}
          disabled={!editable || pending}
          aria-label={`Mark ${task.title} complete`}
          onChange={(e) => onToggle(e.target.checked)}
        />
      </td>
      <td>
        <button type="button" className="plan-task-open">
          <span className={`plan-task-title${task.done ? " is-done" : ""}`}>
            {task.title}
          </span>
        </button>
      </td>
      <td>
        <TaskCategoryCell category={task.category} />
      </td>
      <td>
        <TaskPriorityBadge priority={task.priority} />
      </td>
      <td>
        <TaskDueCell task={task} />
      </td>
      <td>
        {task.owner.trim() ? (
          <span className="task-owner">
            <span aria-hidden="true">{ownerInitials(task.owner)}</span>
            {task.owner}
          </span>
        ) : (
          <span className="task-owner is-empty">
            <UserRound size={14} />
            Not set
          </span>
        )}
      </td>
      <td>
        <TaskStatusBadge task={task} />
      </td>
      {editable && (
        <td
          className="plan-col-actions"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="plan-row-actions">
            <button
              type="button"
              className="plan-icon-btn"
              aria-label="Edit task"
              title="Edit task"
              disabled={pending}
              onClick={onEdit}
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              className="plan-icon-btn is-danger"
              aria-label="Delete task"
              title="Delete task"
              disabled={pending}
              onClick={onDelete}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}
