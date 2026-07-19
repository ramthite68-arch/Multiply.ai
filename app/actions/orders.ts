"use server";

import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { revalidatePath } from "next/cache";

export async function approveOrder(orderId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: teamUser } = await supabase
    .from("team_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  const { data: order } = await supabase
    .from("orders")
    .update({ status: "approved", approved_by: teamUser?.id, approved_at: new Date().toISOString() })
    .eq("id", orderId)
    .select("*, retailers(phone, name)")
    .single();

  if (order?.retailers?.phone) {
    await sendWhatsAppText(
      order.retailers.phone,
      `✅ Your order has been approved by ${order.retailers.name ? "your distributor" : ""}. It's being processed now.`
    );
  }

  revalidatePath("/inbox");
}

export async function rejectOrder(orderId: string) {
  const supabase = createClient();

  const { data: order } = await supabase
    .from("orders")
    .update({ status: "rejected" })
    .eq("id", orderId)
    .select("*, retailers(phone)")
    .single();

  if (order?.retailers?.phone) {
    await sendWhatsAppText(
      order.retailers.phone,
      `Your recent order was not approved. Please contact your distributor for details.`
    );
  }

  revalidatePath("/inbox");
}
