import { describe, expect, it } from "vitest";
import {
  filterServices,
  nextStatusAfterChoose,
  serviceStatusCounts,
  vendorTotals,
  type ServiceItem,
} from "./vendor-board";

function service(overrides: Partial<ServiceItem> = {}): ServiceItem {
  return {
    id: "s1",
    category: "Cake",
    requirements: "Theme design",
    selectedId: "",
    status: "SHORTLISTED",
    vendors: [],
    ...overrides,
  };
}

describe("vendor totals", () => {
  it("counts providers, chosen quotes, and confirmed bookings", () => {
    const totals = vendorTotals([
      service({
        vendors: [
          {
            id: "v1",
            name: "Sweet",
            contact: "",
            quote: 0,
            availability: "UNKNOWN",
            notes: "",
          },
          {
            id: "v2",
            name: "Bakery",
            contact: "",
            quote: 80000,
            availability: "AVAILABLE",
            notes: "",
          },
        ],
      }),
      service({
        id: "s2",
        category: "Catering",
        selectedId: "c1",
        status: "CONFIRMED",
        vendors: [
          {
            id: "c1",
            name: "Taj",
            contact: "",
            quote: 125000,
            availability: "AVAILABLE",
            notes: "",
          },
        ],
      }),
    ]);
    expect(totals.services).toBe(2);
    expect(totals.providers).toBe(3);
    expect(totals.chosen).toBe(1);
    expect(totals.confirmed).toBe(1);
    expect(totals.quotesTotal).toBe(125000);
  });
});

describe("vendor filters", () => {
  const items = [
    service(),
    service({
      id: "s2",
      category: "Photography",
      status: "CONFIRMED",
      selectedId: "p1",
      vendors: [
        {
          id: "p1",
          name: "Moments Studio",
          contact: "hi@studio.test",
          quote: 80000,
          availability: "AVAILABLE",
          notes: "",
        },
      ],
    }),
  ];

  it("searches service and provider names", () => {
    expect(
      filterServices(items, "moments", "all").map((s) => s.id),
    ).toEqual(["s2"]);
  });

  it("filters by booking status and counts chips", () => {
    expect(filterServices(items, "", "CONFIRMED")).toHaveLength(1);
    expect(serviceStatusCounts(items).SHORTLISTED).toBe(1);
    expect(serviceStatusCounts(items).CONFIRMED).toBe(1);
  });
});

describe("choose provider", () => {
  it("moves shortlist to selected without confirming", () => {
    const row = service({
      vendors: [
        {
          id: "v1",
          name: "Sweet",
          contact: "",
          quote: 100,
          availability: "UNKNOWN",
          notes: "",
        },
      ],
    });
    expect(nextStatusAfterChoose(row, "v1")).toEqual({
      selectedId: "v1",
      status: "SELECTED",
    });
  });

  it("keeps confirmed bookings when switching providers", () => {
    const row = service({
      selectedId: "a",
      status: "CONFIRMED",
      vendors: [
        {
          id: "a",
          name: "A",
          contact: "",
          quote: 1,
          availability: "AVAILABLE",
          notes: "",
        },
        {
          id: "b",
          name: "B",
          contact: "",
          quote: 2,
          availability: "AVAILABLE",
          notes: "",
        },
      ],
    });
    expect(nextStatusAfterChoose(row, "b")).toEqual({
      selectedId: "b",
      status: "CONFIRMED",
    });
  });
});
