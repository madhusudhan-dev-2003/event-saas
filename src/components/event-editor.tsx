"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "@/components/icons";
import { useRouter } from "next/navigation";
import { saveEvent, reuseEvent, suggest } from "@/app/actions";
import {
  Plan,
  applyTaskStatus,
  dateChanges,
  modules,
  nextActions,
  syncTaskCompletion,
} from "@/lib/planning";
import { suggestionToTaskTitle } from "@/lib/task-board";
import { ConfirmDialog, Modal } from "./modals";
import {
  EventDetailHeader,
  EventDetailsModal,
} from "./event-detail-header";
import { EventTabs } from "./event-tabs";
import { OverviewTab } from "./overview-tab";
import { PlanTab } from "./plan-tab";
import { GuestsTab } from "./guests-tab";
import { BudgetTab } from "./budget-tab";
import { VendorsTab } from "./vendors-tab";
import { SettingsTab } from "./settings-tab";
import { TaskFormModal, type TaskFormValues } from "./task-form-modal";

type Guest = {
  id: string;
  household: string;
  maxGuests: number;
  attending: number;
  response: string;
  dietary: string;
  contact: string;
  notes: string;
  side: string;
  checkedIn: boolean;
  revoked: boolean;
};
const uid = () => crypto.randomUUID();
const NOT_SET = "Not set";

function taskPriorityLabel(priority: Plan["tasks"][number]["priority"]) {
  if (priority === "LOW") return "Low";
  if (priority === "HIGH") return "High";
  return "Medium";
}

type BudgetFormData = {
  category: string;
  planned: number;
  committed: number;
  paid: number;
  notes: string;
  vendor: string;
  priority: Plan["budget"][number]["priority"];
  dueDate: string;
};

type ServiceFormData = {
  category: string;
  requirements: string;
  selectedId: string;
  status: Plan["services"][number]["status"];
};

type VendorFormData = {
  name: string;
  contact: string;
  quote: number;
  availability: Plan["services"][number]["vendors"][number]["availability"];
  notes: string;
};

type FunctionFormData = {
  name: string;
  date: string;
  time: string;
  venue: string;
  notes: string;
};

type FoodFormData = {
  dish: string;
  owner: string;
  dietary: string;
  servings: number;
};

type PreparationFormData = {
  participant: string;
  service: "Tailoring" | "Jewellery" | "Makeup";
  units: "in" | "cm";
  details: string;
  fitting: string;
  delivery: string;
};

export function EventEditor({
  id,
  initialName,
  initialPlan,
  initialVersion,
  spaceId,
  spaceName,
  templateKey,
  editable,
  canDelete,
  canManageGuests,
  canCheckinGuests,
  canViewBudget,
  canManageBudget,
  canManageVendors,
  canQuotesVendors,
  canBrowseProviders,
  members,
  guests,
}: {
  id: string;
  initialName: string;
  initialPlan: Plan;
  initialVersion: number;
  spaceId: string;
  spaceName: string;
  templateKey: string;
  editable: boolean;
  canDelete: boolean;
  canManageGuests: boolean;
  canCheckinGuests: boolean;
  canViewBudget: boolean;
  canManageBudget: boolean;
  canManageVendors: boolean;
  canQuotesVendors: boolean;
  canBrowseProviders: boolean;
  members: { name: string }[];
  guests: Guest[];
}) {
  const [name, setName] = useState(initialName);
  const [plan, setPlan] = useState(initialPlan);
  const [version, setVersion] = useState(initialVersion);
  const [tab, setTab] = useState("Overview");
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [prompt, setPrompt] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [proposedDate, setProposedDate] = useState<string | null>(null);
  const [reuseKey] = useState(uid);
  const router = useRouter();
  const tabs = [
    "Overview",
    "Plan",
    "Guests",
    "Budget",
    "Vendors",
    ...(plan.modules.includes("functions") ||
    plan.modules.includes("rehearsals")
      ? ["Schedule"]
      : []),
    ...(plan.modules.includes("food") ? ["Food"] : []),
    ...(plan.modules.includes("preparation") ? ["Preparation"] : []),
    "Settings",
  ];

  const [taskModal, setTaskModal] = useState<{
    open: boolean;
    index: number | null;
  }>({ open: false, index: null });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [budgetModal, setBudgetModal] = useState<{
    open: boolean;
    index: number | null;
  }>({ open: false, index: null });
  const [serviceModal, setServiceModal] = useState<{
    open: boolean;
    index: number | null;
  }>({ open: false, index: null });
  const [functionModal, setFunctionModal] = useState<{
    open: boolean;
    index: number | null;
  }>({ open: false, index: null });
  const [foodModal, setFoodModal] = useState<{
    open: boolean;
    index: number | null;
  }>({ open: false, index: null });
  const [preparationModal, setPreparationModal] = useState<{
    open: boolean;
    index: number | null;
  }>({ open: false, index: null });
  const [vendorModal, setVendorModal] = useState<{
    open: boolean;
    serviceIndex: number;
    vendorIndex: number | null;
  }>({ open: false, serviceIndex: -1, vendorIndex: null });
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    action: () => void;
  } | null>(null);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const latestRef = useRef({ plan, name, version });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function askConfirm(opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    action: () => void;
  }) {
    setConfirm(opts);
  }

  function update(next: Plan) {
    setPlan(next);
    setDirty(true);
    setMessage("");
    setError("");
    setSaveStatus("idle");
  }

  function run(
    fn: () => Promise<{
      error?: string;
      success?: string;
      path?: string;
      version?: number;
      suggestions?: string[];
    }>,
  ) {
    setError("");
    startTransition(async () => {
      try {
        const result = await fn();
        if (result.error) {
          setError(
            /changed|Reload/.test(result.error)
              ? "This celebration was updated elsewhere. Reload to get the latest version."
              : result.error,
          );
          setSaveStatus("error");
        }
        if (result.success) setMessage(result.success);
        if (result.version !== undefined) {
          setVersion(result.version);
          setDirty(false);
          setSaveStatus("saved");
        }
        if (result.path) router.push(result.path);
        if (result.suggestions) setSuggestions(result.suggestions);
      } catch {
        setError(
          "We couldn't complete this action. Your edits are still here.",
        );
      }
    });
  }

  useEffect(() => {
    latestRef.current = { plan, name, version };
  }, [plan, name, version]);

  useEffect(() => {
    if (
      (!editable && !canManageBudget && !canManageVendors) ||
      !dirty ||
      proposedDate !== null
    )
      return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      startTransition(async () => {
        setSaveStatus("saving");
        const current = latestRef.current;
        try {
          const result = await saveEvent({
            id,
            name: current.name,
            version: current.version,
            plan: current.plan,
          });
          if (result.error) {
            setError(
              /changed|Reload/.test(result.error)
                ? "This celebration was updated elsewhere. Reload to get the latest version."
                : result.error,
            );
            setSaveStatus("error");
            return;
          }
          if (result.version !== undefined) {
            setVersion(result.version);
            setDirty(false);
            setSaveStatus("saved");
            setMessage("");
          }
        } catch {
          setSaveStatus("error");
          setError("Could not auto-save. Your edits are still here.");
        }
      });
    }, 700);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [dirty, editable, canManageBudget, canManageVendors, plan, name, proposedDate, id]);

  useEffect(() => {
    if (saveStatus !== "saved" && saveStatus !== "error") return;
    const hide = window.setTimeout(() => setSaveStatus("idle"), 3000);
    return () => window.clearTimeout(hide);
  }, [saveStatus]);

  useEffect(() => {
    const blocked =
      dirty || saveStatus === "saving" || saveStatus === "error";
    const unload = (e: BeforeUnloadEvent) => {
      if (blocked) e.preventDefault();
    };
    const click = (e: MouseEvent) => {
      const a =
        e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!blocked || !a || e.ctrlKey || e.metaKey) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveHref(href);
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, saveStatus]);

  function exportPlan() {
    const blob = new Blob(
      [JSON.stringify({ name, templateVersion: 1, plan }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "celebration-plan.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Task Modal Handlers
  const handleSaveTask = (data: TaskFormValues) => {
    const next = applyTaskStatus(
      {
        id: taskModal.index === null ? uid() : plan.tasks[taskModal.index].id,
        title: data.title,
        done: data.status === "COMPLETED",
        owner: data.owner,
        due: data.due,
        fixed: data.fixed,
        offset: data.offset ?? -7,
        category: data.category,
        priority: data.priority,
        notes: data.notes,
        status: data.status,
      },
      data.status,
    );
    if (taskModal.index === null) {
      update({
        ...plan,
        tasks: [...plan.tasks, next],
      });
    } else {
      update({
        ...plan,
        tasks: plan.tasks.map((t, i) =>
          i === taskModal.index ? { ...t, ...next, id: t.id } : t,
        ),
      });
    }
    setTaskModal({ open: false, index: null });
  };

  const handleDeleteTask = (index: number) => {
    const title = plan.tasks[index]?.title || "This task";
    askConfirm({
      title: "Delete task?",
      message: `"${title}" will be removed from this event.`,
      confirmLabel: "Delete task",
      danger: true,
      action: () =>
        update({
          ...plan,
          tasks: plan.tasks.filter((_, i) => i !== index),
        }),
    });
  };

  // Budget Modal Handlers
  const toMinorUnits = (value: number) =>
    Math.max(0, Math.round((Number.isFinite(value) ? value : 0) * 100));

  const handleSaveBudget = (data: BudgetFormData) => {
    const nextItem = {
      category: data.category.trim(),
      planned: toMinorUnits(data.planned),
      committed: toMinorUnits(data.committed),
      paid: toMinorUnits(data.paid),
      notes: data.notes,
      vendor: data.vendor,
      priority: data.priority,
      dueDate: data.dueDate,
    };
    if (budgetModal.index === null) {
      update({
        ...plan,
        budget: [
          ...plan.budget,
          {
            id: uid(),
            ...nextItem,
          },
        ],
      });
    } else {
      update({
        ...plan,
        budget: plan.budget.map((b, i) =>
          i === budgetModal.index ? { ...b, ...nextItem } : b,
        ),
      });
    }
    setBudgetModal({ open: false, index: null });
  };

  const handleDeleteBudget = (index: number) => {
    askConfirm({
      title: "Remove budget category",
      message: "Amounts recorded for this category will be removed from the plan.",
      confirmLabel: "Remove",
      danger: true,
      action: () =>
        update({
          ...plan,
          budget: plan.budget.filter((_, i) => i !== index),
        }),
    });
  };

  // Service Modal Handlers
  const handleSaveService = (data: ServiceFormData) => {
    if (serviceModal.index === null) {
      update({
        ...plan,
        services: [
          ...plan.services,
          {
            id: uid(),
            category: data.category.trim(),
            requirements: data.requirements,
            selectedId: "",
            status: "SHORTLISTED",
            vendors: [],
          },
        ],
      });
    } else {
      update({
        ...plan,
        services: plan.services.map((s, i) =>
          i === serviceModal.index
            ? {
                ...s,
                category: data.category.trim(),
                requirements: data.requirements,
                selectedId: data.selectedId,
                status:
                  data.selectedId || data.status === "SHORTLISTED"
                    ? data.status
                    : "SHORTLISTED",
              }
            : s
        ),
      });
    }
    setServiceModal({ open: false, index: null });
  };

  const handleDeleteService = (index: number) => {
    askConfirm({
      title: "Remove this service",
      message: "Provider options and booking status for this service will be cleared.",
      confirmLabel: "Remove",
      danger: true,
      action: () =>
        update({
          ...plan,
          services: plan.services.filter((_, i) => i !== index),
        }),
    });
  };

  const handleSaveVendor = (data: VendorFormData) => {
    const { serviceIndex, vendorIndex } = vendorModal;
    if (serviceIndex < 0) return;
    const service = plan.services[serviceIndex];
    if (!service) return;
    const vendorPayload = {
      id: vendorIndex === null ? uid() : service.vendors[vendorIndex].id,
      name: data.name,
      contact: data.contact,
      quote: Math.max(0, Math.round((Number.isFinite(data.quote) ? data.quote : 0) * 100)),
      availability: data.availability,
      notes: data.notes,
    };
    update({
      ...plan,
      services: plan.services.map((s, i) => {
        if (i !== serviceIndex) return s;
        if (vendorIndex === null) {
          return { ...s, vendors: [...s.vendors, vendorPayload] };
        }
        return {
          ...s,
          vendors: s.vendors.map((v, j) =>
            j === vendorIndex ? { ...v, ...vendorPayload } : v,
          ),
        };
      }),
    });
    setVendorModal({ open: false, serviceIndex: -1, vendorIndex: null });
  };

  const handleDeleteVendor = (serviceIndex: number, vendorIndex: number) => {
    askConfirm({
      title: "Remove provider",
      message: "This provider will be removed from the comparison list.",
      confirmLabel: "Remove",
      danger: true,
      action: () => {
        const service = plan.services[serviceIndex];
        if (!service) return;
        const removed = service.vendors[vendorIndex];
        update({
          ...plan,
          services: plan.services.map((s, i) =>
            i === serviceIndex
              ? {
                  ...s,
                  vendors: s.vendors.filter((_, j) => j !== vendorIndex),
                  selectedId:
                    s.selectedId === removed?.id ? "" : s.selectedId,
                  status:
                    s.selectedId === removed?.id ? "SHORTLISTED" : s.status,
                }
              : s,
          ),
        });
      },
    });
  };

  // Function Modal Handlers
  const handleSaveFunction = (data: FunctionFormData) => {
    if (functionModal.index === null) {
      update({
        ...plan,
        functions: [
          ...plan.functions,
          {
            id: uid(),
            name: data.name,
            date: data.date,
            time: data.time,
            venue: data.venue,
            notes: data.notes,
          },
        ],
      });
    } else {
      update({
        ...plan,
        functions: plan.functions.map((f, i) =>
          i === functionModal.index ? { ...f, ...data } : f
        ),
      });
    }
    setFunctionModal({ open: false, index: null });
  };

  const handleDeleteFunction = (index: number) => {
    askConfirm({
      title: "Remove from schedule",
      message: "This function or rehearsal will be removed from the timeline.",
      confirmLabel: "Remove",
      danger: true,
      action: () =>
        update({
          ...plan,
          functions: plan.functions.filter((_, i) => i !== index),
        }),
    });
  };

  // Food Modal Handlers
  const handleSaveFood = (data: FoodFormData) => {
    if (foodModal.index === null) {
      update({
        ...plan,
        food: [
          ...plan.food,
          {
            id: uid(),
            dish: data.dish,
            owner: data.owner,
            dietary: data.dietary,
            servings: data.servings,
          },
        ],
      });
    } else {
      update({
        ...plan,
        food: plan.food.map((f, i) =>
          i === foodModal.index ? { ...f, ...data } : f
        ),
      });
    }
    setFoodModal({ open: false, index: null });
  };

  const handleDeleteFood = (index: number) => {
    askConfirm({
      title: "Remove this dish",
      message: "This dish will be removed from the food list.",
      confirmLabel: "Remove",
      danger: true,
      action: () =>
        update({
          ...plan,
          food: plan.food.filter((_, i) => i !== index),
        }),
    });
  };

  // Preparation Modal Handlers
  const handleSavePreparation = (data: PreparationFormData) => {
    if (preparationModal.index === null) {
      update({
        ...plan,
        preparation: [
          ...plan.preparation,
          {
            id: uid(),
            participant: data.participant,
            service: data.service,
            units: data.units,
            details: data.details,
            fitting: data.fitting,
            delivery: data.delivery,
          },
        ],
      });
    } else {
      update({
        ...plan,
        preparation: plan.preparation.map((p, i) =>
          i === preparationModal.index ? { ...p, ...data } : p
        ),
      });
    }
    setPreparationModal({ open: false, index: null });
  };

  const handleDeletePreparation = (index: number) => {
    askConfirm({
      title: "Remove preparation sheet",
      message: "Fitting and design details for this participant will be removed.",
      confirmLabel: "Remove",
      danger: true,
      action: () =>
        update({
          ...plan,
          preparation: plan.preparation.filter((_, i) => i !== index),
        }),
    });
  };

  return (
    <>
      <EventDetailHeader
        eventId={id}
        name={name}
        plan={plan}
        spaceId={spaceId}
        templateKey={templateKey}
        editable={editable}
        canDelete={canDelete}
        saveStatus={saveStatus}
        pending={pending}
        dirty={dirty}
        onOpenDetails={() => setDetailsOpen(true)}
        onReuse={() => run(() => reuseEvent(id, reuseKey))}
        onExport={exportPlan}
      />
      <EventTabs tabs={tabs} active={tab} onChange={setTab} />
      {!editable &&
        tab !== "Guests" &&
        tab !== "Budget" &&
        tab !== "Vendors" &&
        tab !== "Settings" && (
        <p className="notice">
          You can view this space. Ask an owner if you need to make changes.
        </p>
      )}
      {tab === "Overview" && (
        <OverviewTab
          plan={plan}
          guests={guests}
          name={name}
          editable={editable}
          pending={pending}
          dirty={dirty}
          canViewBudget={canViewBudget}
          prompt={prompt}
          suggestions={suggestions}
          onPromptChange={setPrompt}
          onSuggest={() => run(() => suggest({ eventId: id, prompt }))}
          onOpenTab={setTab}
          onOpenDetails={() => setDetailsOpen(true)}
        />
      )}
      {tab === "Plan" && (
        <PlanTab
          plan={plan}
          editable={editable}
          pending={pending}
          members={members}
          suggestions={suggestions}
          onAddTask={() => setTaskModal({ open: true, index: null })}
          onEditTask={(index) => setTaskModal({ open: true, index })}
          onDeleteTask={handleDeleteTask}
          onToggleTask={(index, done) =>
            update({
              ...plan,
              tasks: plan.tasks.map((t, i) =>
                i === index ? syncTaskCompletion(t, done) : t,
              ),
            })
          }
          onGenerateSuggestions={() => {
            setSuggestions([]);
            run(() =>
              suggest({
                eventId: id,
                prompt:
                  nextActions(plan)[0]?.prompt ||
                  "Help me choose the next three preparations",
              }),
            );
          }}
          onAddSuggestion={(suggestion) =>
            update({
              ...plan,
              tasks: [
                ...plan.tasks,
                applyTaskStatus(
                  {
                    id: uid(),
                    title: suggestionToTaskTitle(suggestion),
                    done: false,
                    owner: "",
                    due: "",
                    offset: -7,
                    fixed: false,
                    category: "",
                    priority: "NORMAL",
                    notes: suggestion,
                    status: "NOT_STARTED",
                  },
                  "NOT_STARTED",
                ),
              ],
            })
          }
        />
      )}
      <fieldset disabled={!editable || pending}>
        {tab === "Schedule" && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Every moment, in its place.</h2>
                <p>
                  Plan functions, rehearsals and the event-day running order.
                  Times are local to the venue.
                </p>
              </div>
            </div>
            <div className="list-toolbar">
              <div className="list-toolbar-left" />
              {editable && (
                <button
                  type="button"
                  className="btn-add"
                  onClick={() => setFunctionModal({ open: true, index: null })}
                >
                  <Plus size={16} />
                  Add function
                </button>
              )}
            </div>
            {!plan.functions.length ? (
              <p className="empty-inline">
                Add your first function or rehearsal.
              </p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Function / Rehearsal</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Venue</th>
                      {editable && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {plan.functions.map((f, i) => (
                      <tr key={f.id}>
                        <td>{f.name}</td>
                        <td>{f.date || NOT_SET}</td>
                        <td>{f.time || NOT_SET}</td>
                        <td>{f.venue || NOT_SET}</td>
                        {editable && (
                          <td>
                            <div className="cell-actions">
                              <button
                                type="button"
                                className="act-edit"
                                onClick={() =>
                                  setFunctionModal({ open: true, index: i })
                                }
                              >
                                <Pencil size={14} /> Edit
                              </button>
                              <button
                                type="button"
                                className="act-delete"
                                onClick={() => handleDeleteFunction(i)}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
        {tab === "Food" && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Good food, shared effort.</h2>
              </div>
            </div>
            <div className="list-toolbar">
              <div className="list-toolbar-left" />
              {editable && (
                <button
                  type="button"
                  className="btn-add"
                  onClick={() => setFoodModal({ open: true, index: null })}
                >
                  <Plus size={16} />
                  Add a dish
                </button>
              )}
            </div>
            {!plan.food.length ? (
              <p className="empty-inline">Add your first dish.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Dish</th>
                      <th>Person bringing dish</th>
                      <th>Dietary details</th>
                      <th>Servings</th>
                      {editable && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {plan.food.map((f, i) => (
                      <tr key={f.id}>
                        <td>{f.dish}</td>
                        <td>{f.owner || NOT_SET}</td>
                        <td>{f.dietary || NOT_SET}</td>
                        <td>{f.servings}</td>
                        {editable && (
                          <td>
                            <div className="cell-actions">
                              <button
                                type="button"
                                className="act-edit"
                                onClick={() =>
                                  setFoodModal({ open: true, index: i })
                                }
                              >
                                <Pencil size={14} /> Edit
                              </button>
                              <button
                                type="button"
                                className="act-delete"
                                onClick={() => handleDeleteFood(i)}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
        {tab === "Preparation" && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>The details that make it yours.</h2>
                <p>
                  Preparation notes are visible to this space&apos;s members.
                  Keep sensitive measurements out until restricted participant
                  sharing is configured.
                </p>
              </div>
            </div>
            <div className="list-toolbar">
              <div className="list-toolbar-left" />
              {editable && (
                <button
                  type="button"
                  className="btn-add"
                  onClick={() =>
                    setPreparationModal({ open: true, index: null })
                  }
                >
                  <Plus size={16} />
                  Add preparation sheet
                </button>
              )}
            </div>
            {!plan.preparation.length ? (
              <p className="empty-inline">Add your first preparation sheet.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Participant</th>
                      <th>Service</th>
                      <th>Fitting</th>
                      <th>Delivery</th>
                      {editable && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {plan.preparation.map((p, i) => (
                      <tr key={p.id}>
                        <td>{p.participant}</td>
                        <td>{p.service}</td>
                        <td>{p.fitting || NOT_SET}</td>
                        <td>{p.delivery || NOT_SET}</td>
                        {editable && (
                          <td>
                            <div className="cell-actions">
                              <button
                                type="button"
                                className="act-edit"
                                onClick={() =>
                                  setPreparationModal({
                                    open: true,
                                    index: i,
                                  })
                                }
                              >
                                <Pencil size={14} /> Edit
                              </button>
                              <button
                                type="button"
                                className="act-delete"
                                onClick={() => handleDeletePreparation(i)}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </fieldset>
      {tab === "Guests" && (
        <GuestsTab
          eventId={id}
          guests={guests}
          canManage={canManageGuests}
          canCheckin={canCheckinGuests}
        />
      )}
      {tab === "Budget" &&
        (canViewBudget ? (
          <BudgetTab
            plan={plan}
            canManage={canManageBudget}
            pending={pending}
            onAdd={() => setBudgetModal({ open: true, index: null })}
            onEdit={(index) => setBudgetModal({ open: true, index })}
            onDelete={handleDeleteBudget}
            onCurrencyChange={(currency) => update({ ...plan, currency })}
          />
        ) : (
          <p className="notice">
            You can view this celebration, but budget figures are hidden for
            your role.
          </p>
        ))}
      {tab === "Vendors" && (
        <VendorsTab
          eventId={id}
          plan={plan}
          pending={pending}
          canManage={canManageVendors}
          canQuotes={canQuotesVendors}
          canBrowseProviders={canBrowseProviders}
          onAddService={() => setServiceModal({ open: true, index: null })}
          onEditService={(index) => setServiceModal({ open: true, index })}
          onDeleteService={handleDeleteService}
          onAddProvider={(serviceIndex) =>
            setVendorModal({ open: true, serviceIndex, vendorIndex: null })
          }
          onEditProvider={(serviceIndex, vendorIndex) =>
            setVendorModal({ open: true, serviceIndex, vendorIndex })
          }
          onDeleteProvider={handleDeleteVendor}
          onPatchService={(index, patch) =>
            update({
              ...plan,
              services: plan.services.map((s, i) =>
                i === index ? { ...s, ...patch } : s,
              ),
            })
          }
        />
      )}
      {tab === "Settings" && (
        <SettingsTab
          eventId={id}
          name={name}
          plan={plan}
          spaceId={spaceId}
          spaceName={spaceName}
          templateKey={templateKey}
          proposedDate={proposedDate}
          editable={editable}
          canDelete={canDelete}
          pending={pending}
          dirty={dirty}
          saveStatus={saveStatus}
          onNameChange={(next) => {
            setName(next);
            setDirty(true);
            setMessage("");
            setError("");
            setSaveStatus("idle");
          }}
          onUpdate={update}
          onCurrencyChange={(currency) => {
            if (currency === plan.currency) return;
            if (plan.budget.some((b) => b.planned || b.committed || b.paid)) {
              askConfirm({
                title: "Change currency label",
                message:
                  "Existing amounts will not be converted. Only the currency label changes.",
                confirmLabel: "Change currency",
                action: () => update({ ...plan, currency }),
              });
              return;
            }
            update({ ...plan, currency });
          }}
          onProposeDate={setProposedDate}
          onApplyDate={() => {
            if (proposedDate === null) return;
            const changes = dateChanges(plan, proposedDate);
            update({
              ...plan,
              date: proposedDate,
              tasks: plan.tasks.map((t) => ({
                ...t,
                due: changes.find((c) => c.id === t.id)?.after ?? t.due,
              })),
            });
            setProposedDate(null);
          }}
          onApplyDateOnly={() => {
            if (proposedDate === null) return;
            update({ ...plan, date: proposedDate });
            setProposedDate(null);
          }}
          onCancelDate={() => setProposedDate(null)}
          onReuse={() => run(() => reuseEvent(id, reuseKey))}
          onExport={exportPlan}
          onOpenGuests={() => setTab("Guests")}
        />
      )}
      {error && (
        <p role="alert" className="error">
          {error}
          {error.includes("updated elsewhere") && (
            <>
              {" "}
              <button
                type="button"
                className="text-button"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
            </>
          )}
        </p>
      )}
      {message && saveStatus !== "saved" && (
        <p role="status" className="notice">
          {message}
        </p>
      )}

      <TaskFormModal
        open={taskModal.open}
        task={taskModal.index !== null ? plan.tasks[taskModal.index] : null}
        members={members}
        onClose={() => setTaskModal({ open: false, index: null })}
        onSave={handleSaveTask}
      />
      <EventDetailsModal
        open={detailsOpen}
        name={name}
        plan={plan}
        onClose={() => setDetailsOpen(false)}
        onSave={({
          name: nextName,
          date,
          location,
          status,
          notes,
          applyDeadlines,
        }) => {
          setName(nextName);
          const changes = applyDeadlines ? dateChanges(plan, date) : [];
          update({
            ...plan,
            date,
            location,
            status,
            notes,
            tasks: applyDeadlines
              ? plan.tasks.map((t) => ({
                  ...t,
                  due: changes.find((c) => c.id === t.id)?.after ?? t.due,
                }))
              : plan.tasks,
          });
          setDetailsOpen(false);
        }}
      />

      {/* Budget Modal */}
      <BudgetModal
        open={budgetModal.open && canManageBudget}
        budget={
          budgetModal.index !== null ? plan.budget[budgetModal.index] : null
        }
        currency={plan.currency}
        onClose={() => setBudgetModal({ open: false, index: null })}
        onSave={handleSaveBudget}
      />

      {/* Service Modal */}
      <ServiceModal
        open={serviceModal.open && canManageVendors}
        service={
          serviceModal.index !== null
            ? plan.services[serviceModal.index]
            : null
        }
        onClose={() => setServiceModal({ open: false, index: null })}
        onSave={handleSaveService}
      />

      {/* Function Modal */}
      <FunctionModal
        open={functionModal.open}
        func={
          functionModal.index !== null
            ? plan.functions[functionModal.index]
            : null
        }
        onClose={() => setFunctionModal({ open: false, index: null })}
        onSave={handleSaveFunction}
      />

      {/* Food Modal */}
      <FoodModal
        open={foodModal.open}
        food={foodModal.index !== null ? plan.food[foodModal.index] : null}
        onClose={() => setFoodModal({ open: false, index: null })}
        onSave={handleSaveFood}
      />

      {/* Preparation Modal */}
      <PreparationModal
        open={preparationModal.open}
        preparation={
          preparationModal.index !== null
            ? plan.preparation[preparationModal.index]
            : null
        }
        onClose={() => setPreparationModal({ open: false, index: null })}
        onSave={handleSavePreparation}
      />

      <VendorProviderModal
        open={vendorModal.open && canManageVendors}
        vendor={
          vendorModal.vendorIndex !== null &&
          vendorModal.serviceIndex >= 0
            ? plan.services[vendorModal.serviceIndex]?.vendors[
                vendorModal.vendorIndex
              ] ?? null
            : null
        }
        currency={plan.currency}
        onClose={() =>
          setVendorModal({ open: false, serviceIndex: -1, vendorIndex: null })
        }
        onSave={handleSaveVendor}
      />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const action = confirm?.action;
          setConfirm(null);
          action?.();
        }}
      />

      <ConfirmDialog
        open={!!leaveHref}
        title="Leave without saving"
        message="A save is still in progress or failed. Leave anyway and risk losing recent edits?"
        confirmLabel="Leave"
        cancelLabel="Stay"
        danger
        onCancel={() => setLeaveHref(null)}
        onConfirm={() => {
          const href = leaveHref;
          setLeaveHref(null);
          if (href) router.push(href);
        }}
      />
    </>
  );
}

// Budget Modal Component
function BudgetModal({
  open,
  budget,
  currency,
  onClose,
  onSave,
}: {
  open: boolean;
  budget: Plan["budget"][number] | null;
  currency: string;
  onClose: () => void;
  onSave: (data: BudgetFormData) => void;
}) {
  const [formData, setFormData] = useState<BudgetFormData>({
    category: "",
    planned: 0,
    committed: 0,
    paid: 0,
    notes: "",
    vendor: "",
    priority: "NORMAL",
    dueDate: "",
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    setFormError("");
    if (budget) {
      setFormData({
        category: budget.category,
        planned: budget.planned / 100,
        committed: budget.committed / 100,
        paid: budget.paid / 100,
        notes: budget.notes ?? "",
        vendor: budget.vendor ?? "",
        priority: budget.priority ?? "NORMAL",
        dueDate: budget.dueDate ?? "",
      });
    } else {
      setFormData({
        category: "",
        planned: 0,
        committed: 0,
        paid: 0,
        notes: "",
        vendor: "",
        priority: "NORMAL",
        dueDate: "",
      });
    }
  }, [budget, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category.trim()) {
      setFormError("Enter a category name.");
      return;
    }
    if (
      !Number.isFinite(formData.planned) ||
      !Number.isFinite(formData.committed) ||
      !Number.isFinite(formData.paid) ||
      formData.planned < 0 ||
      formData.committed < 0 ||
      formData.paid < 0
    ) {
      setFormError("Amounts cannot be negative.");
      return;
    }
    onSave({ ...formData, category: formData.category.trim() });
  };

  const warnings = [
    formData.paid > formData.committed
      ? "Paid is higher than committed."
      : "",
    formData.committed > formData.planned
      ? "Committed is higher than planned."
      : "",
  ].filter(Boolean);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={budget ? "Edit Budget Category" : "Add Budget Category"}
      wide
    >
      <form onSubmit={handleSubmit}>
        <div className="field-grid field-grid-modal">
          <label>
            Category
            <input
              value={formData.category}
              maxLength={160}
              required
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
            />
          </label>
          <label>
            Priority
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  priority: e.target
                    .value as BudgetFormData["priority"],
                })
              }
            >
              <option value="HIGH">High</option>
              <option value="NORMAL">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </label>
          <label>
            Vendor / payee
            <input
              value={formData.vendor}
              maxLength={160}
              placeholder="Optional"
              onChange={(e) =>
                setFormData({ ...formData, vendor: e.target.value })
              }
            />
          </label>
          <label>
            Due date
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData({ ...formData, dueDate: e.target.value })
              }
            />
          </label>
          <label>
            Planned ({currency})
            <input
              type="number"
              min={0}
              step="0.01"
              value={formData.planned}
              onChange={(e) =>
                setFormData({ ...formData, planned: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Committed ({currency})
            <input
              type="number"
              min={0}
              step="0.01"
              value={formData.committed}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  committed: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            Paid ({currency})
            <input
              type="number"
              min={0}
              step="0.01"
              value={formData.paid}
              onChange={(e) =>
                setFormData({ ...formData, paid: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <label>
          Notes
          <textarea
            value={formData.notes}
            maxLength={2000}
            rows={2}
            placeholder="Deposit terms, invoice numbers, reminders..."
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
          />
        </label>
        {formError && (
          <p role="alert" className="error">
            {formError}
          </p>
        )}
        {warnings.map((warning) => (
          <p key={warning} role="status" className="notice">
            {warning}
          </p>
        ))}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
            {budget ? "Update" : "Add"} Category
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ServiceModal({
  open,
  service,
  onClose,
  onSave,
}: {
  open: boolean;
  service: Plan["services"][number] | null;
  onClose: () => void;
  onSave: (data: ServiceFormData) => void;
}) {
  const [formData, setFormData] = useState<ServiceFormData>({
    category: "",
    requirements: "",
    selectedId: "",
    status: "SHORTLISTED",
  });

  useEffect(() => {
    if (!open) return;
    if (service) {
      setFormData({
        category: service.category,
        requirements: service.requirements,
        selectedId: service.selectedId,
        status: service.status,
      });
    } else {
      setFormData({
        category: "",
        requirements: "",
        selectedId: "",
        status: "SHORTLISTED",
      });
    }
  }, [service, open]);

  const [formError, setFormError] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      compact
      title={service ? "Edit service" : "Add service"}
      footer={
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="service-form"
            className="primary"
          >
            {service ? "Save service" : "Add service"}
          </button>
        </div>
      }
    >
      <form
        id="service-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!formData.category.trim()) {
            setFormError("Enter a service name.");
            return;
          }
          setFormError("");
          onSave(formData);
        }}
      >
        <label>
          Service name
          <input
            value={formData.category}
            maxLength={160}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
          />
        </label>
        <label>
          Requirements
          <textarea
            className="form-notes"
            rows={2}
            value={formData.requirements}
            maxLength={2000}
            placeholder="Menu coverage deliverables setup time"
            onChange={(e) =>
              setFormData({ ...formData, requirements: e.target.value })
            }
          />
        </label>
        {service && (
          <>
            <label>
              Chosen provider
              <select
                value={formData.selectedId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setFormData({
                    ...formData,
                    selectedId,
                    status: selectedId
                      ? formData.status === "SHORTLISTED"
                        ? "SELECTED"
                        : formData.status
                      : "SHORTLISTED",
                  });
                }}
              >
                <option value="">Not chosen</option>
                {service.vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Booking status
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target
                      .value as ServiceFormData["status"],
                  })
                }
              >
                <option value="SHORTLISTED">Shortlisting</option>
                <option disabled={!formData.selectedId} value="SELECTED">
                  Selected
                </option>
                <option disabled={!formData.selectedId} value="CONFIRMED">
                  Confirmed
                </option>
                <option disabled={!formData.selectedId} value="DELIVERED">
                  Delivered
                </option>
                <option disabled={!formData.selectedId} value="PAID">
                  Paid
                </option>
              </select>
            </label>
          </>
        )}
        {formError && (
          <p role="alert" className="error">
            {formError}
          </p>
        )}
      </form>
    </Modal>
  );
}

function FunctionModal({
  open,
  func,
  onClose,
  onSave,
}: {
  open: boolean;
  func: Plan["functions"][number] | null;
  onClose: () => void;
  onSave: (data: FunctionFormData) => void;
}) {
  const [formData, setFormData] = useState<FunctionFormData>({
    name: "",
    date: "",
    time: "",
    venue: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    if (func) {
      setFormData({
        name: func.name,
        date: func.date,
        time: func.time,
        venue: func.venue,
        notes: func.notes,
      });
    } else {
      setFormData({ name: "", date: "", time: "", venue: "", notes: "" });
    }
  }, [func, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) onSave(formData);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={func ? "Edit Function" : "Add Function"}
    >
      <form onSubmit={handleSubmit}>
        <div className="field-grid">
          <label>
            Function or rehearsal
            <input
              value={formData.name}
              required
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
            />
          </label>
          <label>
            Time
            <input
              type="time"
              value={formData.time}
              onChange={(e) =>
                setFormData({ ...formData, time: e.target.value })
              }
            />
          </label>
          <label>
            Venue
            <input
              value={formData.venue}
              onChange={(e) =>
                setFormData({ ...formData, venue: e.target.value })
              }
            />
          </label>
        </div>
        <label>
          Schedule details
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
            {func ? "Update" : "Add"} Function
          </button>
        </div>
      </form>
    </Modal>
  );
}

function FoodModal({
  open,
  food,
  onClose,
  onSave,
}: {
  open: boolean;
  food: Plan["food"][number] | null;
  onClose: () => void;
  onSave: (data: FoodFormData) => void;
}) {
  const [formData, setFormData] = useState<FoodFormData>({
    dish: "",
    owner: "",
    dietary: "",
    servings: 0,
  });

  useEffect(() => {
    if (!open) return;
    if (food) {
      setFormData({
        dish: food.dish,
        owner: food.owner,
        dietary: food.dietary,
        servings: food.servings,
      });
    } else {
      setFormData({ dish: "", owner: "", dietary: "", servings: 0 });
    }
  }, [food, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.dish.trim()) onSave(formData);
  };

  return (
    <Modal open={open} onClose={onClose} title={food ? "Edit Dish" : "Add Dish"}>
      <form onSubmit={handleSubmit}>
        <div className="field-grid">
          <label>
            Dish
            <input
              value={formData.dish}
              required
              onChange={(e) =>
                setFormData({ ...formData, dish: e.target.value })
              }
            />
          </label>
          <label>
            Person bringing dish
            <input
              value={formData.owner}
              onChange={(e) =>
                setFormData({ ...formData, owner: e.target.value })
              }
            />
          </label>
          <label>
            Dietary details
            <input
              value={formData.dietary}
              onChange={(e) =>
                setFormData({ ...formData, dietary: e.target.value })
              }
            />
          </label>
          <label>
            Servings
            <input
              type="number"
              min={0}
              max={10000}
              value={formData.servings}
              onChange={(e) =>
                setFormData({ ...formData, servings: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
            {food ? "Update" : "Add"} Dish
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PreparationModal({
  open,
  preparation,
  onClose,
  onSave,
}: {
  open: boolean;
  preparation: Plan["preparation"][number] | null;
  onClose: () => void;
  onSave: (data: PreparationFormData) => void;
}) {
  const [formData, setFormData] = useState<PreparationFormData>({
    participant: "",
    service: "Tailoring",
    units: "in",
    details: "",
    fitting: "",
    delivery: "",
  });

  useEffect(() => {
    if (!open) return;
    if (preparation) {
      setFormData({
        participant: preparation.participant,
        service: preparation.service,
        units: preparation.units,
        details: preparation.details,
        fitting: preparation.fitting,
        delivery: preparation.delivery,
      });
    } else {
      setFormData({
        participant: "",
        service: "Tailoring",
        units: "in",
        details: "",
        fitting: "",
        delivery: "",
      });
    }
  }, [preparation, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.participant.trim()) onSave(formData);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={preparation ? "Edit Preparation" : "Add Preparation Sheet"}
    >
      <form onSubmit={handleSubmit}>
        <div className="field-grid">
          <label>
            Participant
            <input
              value={formData.participant}
              required
              onChange={(e) =>
                setFormData({ ...formData, participant: e.target.value })
              }
            />
          </label>
          <label>
            Service
            <select
              value={formData.service}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  service: e.target.value as PreparationFormData["service"],
                })
              }
            >
              <option>Tailoring</option>
              <option>Jewellery</option>
              <option>Makeup</option>
            </select>
          </label>
          <label>
            Measurement units
            <select
              value={formData.units}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  units: e.target.value as PreparationFormData["units"],
                })
              }
            >
              <option value="in">Inches</option>
              <option value="cm">Centimeters</option>
            </select>
          </label>
        </div>
        <label>
          Design and coordination details
          <textarea
            value={formData.details}
            maxLength={2000}
            onChange={(e) =>
              setFormData({ ...formData, details: e.target.value })
            }
          />
        </label>
        <div className="field-grid">
          <label>
            Fitting / appointment
            <input
              type="date"
              value={formData.fitting}
              onChange={(e) =>
                setFormData({ ...formData, fitting: e.target.value })
              }
            />
          </label>
          <label>
            Delivery / collection
            <input
              type="date"
              value={formData.delivery}
              onChange={(e) =>
                setFormData({ ...formData, delivery: e.target.value })
              }
            />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
            {preparation ? "Update" : "Add"} Sheet
          </button>
        </div>
      </form>
    </Modal>
  );
}

function VendorProviderModal({
  open,
  vendor,
  currency,
  onClose,
  onSave,
}: {
  open: boolean;
  vendor: Plan["services"][number]["vendors"][number] | null;
  currency: string;
  onClose: () => void;
  onSave: (data: VendorFormData) => void;
}) {
  const [formData, setFormData] = useState<VendorFormData>({
    name: "",
    contact: "",
    quote: 0,
    availability: "UNKNOWN",
    notes: "",
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    setFormError("");
    if (vendor) {
      setFormData({
        name: vendor.name,
        contact: vendor.contact,
        quote: vendor.quote / 100,
        availability: vendor.availability,
        notes: vendor.notes,
      });
    } else {
      setFormData({
        name: "",
        contact: "",
        quote: 0,
        availability: "UNKNOWN",
        notes: "",
      });
    }
  }, [vendor, open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      compact
      wide
      title={vendor ? "Edit provider" : "Add provider"}
      footer={
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="vendor-provider-form" className="primary">
            {vendor ? "Save provider" : "Add provider"}
          </button>
        </div>
      }
    >
      <form
        id="vendor-provider-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!formData.name.trim()) {
            setFormError("Enter a provider name.");
            return;
          }
          onSave({ ...formData, name: formData.name.trim() });
        }}
      >
        <div className="field-grid field-grid-modal">
          <label>
            Provider name
            <input
              value={formData.name}
              maxLength={160}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </label>
          <label>
            Contact
            <input
              value={formData.contact}
              maxLength={160}
              onChange={(e) =>
                setFormData({ ...formData, contact: e.target.value })
              }
            />
          </label>
          <label>
            Quote {currency}
            <input
              type="number"
              min={0}
              step="0.01"
              value={formData.quote}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  quote: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            Availability
            <select
              value={formData.availability}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  availability: e.target
                    .value as VendorFormData["availability"],
                })
              }
            >
              <option value="UNKNOWN">Ask provider</option>
              <option value="AVAILABLE">Available</option>
              <option value="UNAVAILABLE">Unavailable</option>
            </select>
          </label>
        </div>
        <label>
          Notes
          <textarea
            className="form-notes"
            rows={2}
            value={formData.notes}
            maxLength={2000}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
          />
        </label>
        {formError && (
          <p role="alert" className="error">
            {formError}
          </p>
        )}
      </form>
    </Modal>
  );
}
