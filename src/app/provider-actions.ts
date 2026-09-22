"use server";
import { z } from "zod";
import { requireUser, limit } from "@/lib/auth";
import { db } from "@/lib/db";
import { token, hashToken } from "@/lib/security";
import { planSchema } from "@/lib/planning";
import { can } from "@/lib/permissions";
import { getEventMembershipAccess } from "@/lib/space-roles";
import { revalidatePath } from "next/cache";
type State = { error?: string; success?: string; path?: string };
export async function saveProvider(_: State, form: FormData): Promise<State> {
  const user = await requireUser();
  try {
    const input = z
      .object({
        name: z.string().trim().min(1).max(120),
        category: z.string().trim().min(1).max(80),
        location: z.string().trim().max(160),
        description: z.string().trim().max(2000),
        contact: z.string().trim().max(254),
      })
      .parse(Object.fromEntries(form));
    const published = form.get("published") === "on";
    const profile = await db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { emailVerifiedAt: true },
    });
    if (published && !profile.emailVerifiedAt)
      return {
        error:
          "Verify your account email before publishing a provider profile.",
      };
    await db.provider.upsert({
      where: { userId: user.id },
      create: { ...input, userId: user.id, published },
      update: { ...input, published },
    });
    revalidatePath("/providers");
    revalidatePath("/providers/profile");
    revalidatePath("/account");
    return {
      success: published
        ? "Provider profile published."
        : "Provider profile saved privately.",
    };
  } catch {
    return { error: "Check your profile fields and try again." };
  }
}

export async function addDirectoryVendor(
  _: State,
  form: FormData,
): Promise<State> {
  const user = await requireUser();
  try {
    const eventId = z.string().min(1).parse(form.get("eventId"));
    const serviceId = z.string().min(1).parse(form.get("serviceId"));
    const providerId = z.string().min(1).parse(form.get("providerId"));
    const access = await getEventMembershipAccess(eventId, user.id);
    if (!access || !can(access.permissions, "vendors.manage"))
      return {
        error: "You do not have access to add providers to this celebration.",
      };
    const provider = await db.provider.findFirst({
      where: { id: providerId, published: true },
    });
    if (!provider) return { error: "This listing is no longer published." };
    const event = await db.event.findFirst({ where: { id: eventId } });
    if (!event)
      return { error: "You do not have access to this celebration." };
    const plan = planSchema.parse(event.plan);
    const service = plan.services.find((item) => item.id === serviceId);
    if (!service)
      return { error: "This service is no longer on the celebration." };
    if (service.vendors.length >= 30)
      return {
        error: "This service already has the maximum number of providers.",
      };
    if (
      service.vendors.some(
        (vendor) => vendor.name.toLowerCase() === provider.name.toLowerCase(),
      )
    )
      return { error: "This provider is already on that service." };
    service.vendors.push({
      id: crypto.randomUUID(),
      name: provider.name,
      contact: provider.contact,
      quote: 0,
      availability: "UNKNOWN",
      notes: provider.description,
    });
    const saved = await db.event.updateMany({
      where: { id: eventId, version: event.version },
      data: { plan, version: { increment: 1 } },
    });
    if (!saved.count)
      return { error: "This celebration changed. Reload and try again." };
    revalidatePath(`/events/${eventId}`);
    return {
      success: `${provider.name} was added to ${service.category}.`,
    };
  } catch {
    return { error: "Choose a celebration and service, then try again." };
  }
}
export async function requestQuote(_: State, form: FormData): Promise<State> {
  const user = await requireUser();
  try {
    const eventId = z.string().min(1).parse(form.get("eventId"));
    const serviceId = z.string().min(1).parse(form.get("serviceId"));
    const providerName = z
      .string()
      .trim()
      .min(1)
      .max(120)
      .parse(form.get("providerName"));
    const brief = z.string().trim().min(1).max(2000).parse(form.get("brief"));
    const access = await getEventMembershipAccess(eventId, user.id);
    if (!access || !can(access.permissions, "vendors.manage"))
      return {
        error: "You do not have access to request quotes for this event.",
      };
    const event = await db.event.findFirst({ where: { id: eventId } });
    if (!event)
      return {
        error: "You do not have access to request quotes for this event.",
      };
    const plan = planSchema.parse(event.plan);
    const service = plan.services.find((s) => s.id === serviceId);
    if (!service)
      return {
        error: "This service is no longer available. Reload the event.",
      };
    const raw = token();
    await db.serviceRequest.create({
      data: {
        eventId,
        serviceId,
        providerName,
        category: service.category,
        brief,
        currency: plan.currency,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    });
    revalidatePath(`/events/${eventId}/quotes`);
    return {
      path: `/quote/${raw}`,
      success:
        "Private quote link created. Only the brief you wrote is shared. Send the link directly to this provider.",
    };
  } catch {
    return {
      error:
        "Complete the provider name and a brief of up to 2,000 characters.",
    };
  }
}
export async function replyQuote(_: State, form: FormData): Promise<State> {
  try {
    const raw = z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(form.get("token"));
    await limit(`quote:${hashToken(raw)}`, 10);
    const version = z.coerce.number().int().min(0).parse(form.get("version"));
    const quote = z.coerce
      .number()
      .min(0)
      .max(10000000)
      .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001)
      .parse(form.get("quote"));
    const availability = z
      .enum(["AVAILABLE", "UNAVAILABLE"])
      .parse(form.get("availability"));
    const reply = z.string().trim().max(2000).parse(form.get("reply"));
    const result = await db.serviceRequest.updateMany({
      where: {
        tokenHash: hashToken(raw),
        version,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        importedAt: null,
      },
      data: {
        quote: Math.round(quote * 100),
        availability,
        reply,
        version: { increment: 1 },
      },
    });
    if (!result.count)
      return {
        error:
          "This quote was updated, imported or expired. Reload before trying again.",
      };
    revalidatePath(`/quote/${raw}`);
    return {
      success:
        "Quote saved. This is a proposal; the organizer has not confirmed a booking.",
    };
  } catch {
    return { error: "Enter a valid quote amount and availability." };
  }
}
export async function manageQuote(_: State, form: FormData): Promise<State> {
  const user = await requireUser();
  try {
    const id = z.string().min(1).parse(form.get("id"));
    const action = z.enum(["import", "revoke"]).parse(form.get("action"));
    const eventId = await db.$transaction(async (tx) => {
      const request = await tx.serviceRequest.findFirst({
        where: {
          id,
          event: {
            space: {
              members: {
                some: { userId: user.id },
              },
            },
          },
        },
        include: { event: true },
      });
      if (!request) throw new Error("Access denied");
      const access = await getEventMembershipAccess(request.eventId, user.id);
      if (!access || !can(access.permissions, "vendors.manage"))
        throw new Error("Access denied");
      if (action === "revoke") {
        await tx.serviceRequest.update({
          where: { id },
          data: { revokedAt: new Date() },
        });
        return request.eventId;
      }
      if (request.revokedAt || request.importedAt || request.quote === null)
        throw new Error("Quote unavailable");
      const plan = planSchema.parse(request.event.plan);
      if (plan.currency !== request.currency)
        throw new Error("Currency changed");
      const service = plan.services.find((s) => s.id === request.serviceId);
      if (!service || service.vendors.length >= 30)
        throw new Error("Service unavailable");
      const claimed = await tx.serviceRequest.updateMany({
        where: {
          id,
          version: request.version,
          importedAt: null,
          revokedAt: null,
        },
        data: { importedAt: new Date(), version: { increment: 1 } },
      });
      if (!claimed.count) throw new Error("Quote changed");
      service.vendors.push({
        id: `quote-${request.id}`,
        name: request.providerName,
        contact: "",
        quote: request.quote,
        availability: request.availability as
          "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN",
        notes: request.reply,
      });
      const saved = await tx.event.updateMany({
        where: { id: request.eventId, version: request.event.version },
        data: { plan, version: { increment: 1 } },
      });
      if (!saved.count) throw new Error("Event changed");
      return request.eventId;
    });
    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/events/${eventId}/quotes`);
    return {
      success:
        action === "revoke"
          ? "Provider link revoked."
          : "Quote added to comparison. No provider was selected or booked.",
    };
  } catch {
    return {
      error:
        "This quote or event changed, is unavailable, or uses another currency. Reload and review before trying again.",
    };
  }
}
