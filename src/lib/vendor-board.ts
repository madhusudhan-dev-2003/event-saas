import type { Plan } from "./planning";

export type ServiceItem = Plan["services"][number];
export type ServiceStatus = ServiceItem["status"];
export type VendorStatusFilter = "all" | ServiceStatus;

export const SERVICE_STATUS_FILTERS: {
  id: VendorStatusFilter;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "SHORTLISTED", label: "Shortlisting" },
  { id: "SELECTED", label: "Selected" },
  { id: "CONFIRMED", label: "Confirmed" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "PAID", label: "Paid" },
];

export function serviceStatusLabel(status: ServiceStatus) {
  if (status === "SHORTLISTED") return "Shortlisting";
  if (status === "SELECTED") return "Selected";
  if (status === "CONFIRMED") return "Confirmed";
  if (status === "DELIVERED") return "Delivered";
  return "Paid";
}

export function vendorAvailabilityLabel(
  value: ServiceItem["vendors"][number]["availability"],
) {
  if (value === "AVAILABLE") return "Available";
  if (value === "UNAVAILABLE") return "Unavailable";
  return "Ask provider";
}

export function chosenVendor(service: ServiceItem) {
  return service.vendors.find((vendor) => vendor.id === service.selectedId);
}

export function vendorTotals(services: ServiceItem[]) {
  const providers = services.reduce((n, s) => n + s.vendors.length, 0);
  const chosen = services.filter((s) => s.selectedId).length;
  const confirmed = services.filter((s) => s.status === "CONFIRMED").length;
  const quotesTotal = services.reduce((n, s) => {
    const vendor = chosenVendor(s);
    return n + (vendor?.quote || 0);
  }, 0);
  return {
    services: services.length,
    providers,
    chosen,
    confirmed,
    quotesTotal,
  };
}

export function serviceStatusCounts(services: ServiceItem[]) {
  return {
    all: services.length,
    SHORTLISTED: services.filter((s) => s.status === "SHORTLISTED").length,
    SELECTED: services.filter((s) => s.status === "SELECTED").length,
    CONFIRMED: services.filter((s) => s.status === "CONFIRMED").length,
    DELIVERED: services.filter((s) => s.status === "DELIVERED").length,
    PAID: services.filter((s) => s.status === "PAID").length,
  };
}

export function filterServices(
  services: ServiceItem[],
  query: string,
  status: VendorStatusFilter,
) {
  const q = query.trim().toLowerCase();
  return services.filter((service) => {
    const matchesQuery =
      !q ||
      service.category.toLowerCase().includes(q) ||
      service.requirements.toLowerCase().includes(q) ||
      service.vendors.some(
        (vendor) =>
          vendor.name.toLowerCase().includes(q) ||
          vendor.contact.toLowerCase().includes(q) ||
          vendor.notes.toLowerCase().includes(q),
      );
    const matchesStatus = status === "all" || service.status === status;
    return matchesQuery && matchesStatus;
  });
}

export function nextStatusAfterChoose(
  service: ServiceItem,
  vendorId: string,
): { selectedId: string; status: ServiceStatus } {
  if (service.selectedId === vendorId) {
    return { selectedId: "", status: "SHORTLISTED" };
  }
  return {
    selectedId: vendorId,
    status: service.status === "SHORTLISTED" ? "SELECTED" : service.status,
  };
}

export function serviceCategoryIcon(category: string) {
  const value = category.toLowerCase();
  if (/(cake|dessert|bakery|sweet)/.test(value)) return "cake";
  if (/(cater|food|meal|dining|menu)/.test(value)) return "catering";
  if (/(photo|video|camera)/.test(value)) return "photo";
  if (/(music|dj|entertain|band)/.test(value)) return "music";
  if (/(decor|flower|floral|balloon)/.test(value)) return "decor";
  if (/(venue|hall|location|place)/.test(value)) return "venue";
  return "store";
}
