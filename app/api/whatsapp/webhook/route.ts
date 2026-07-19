import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { parseOrderText, formatCatalogue, formatCart } from "@/lib/orderParser";

// ============================================================
// GET — Meta calls this once when you set up the webhook in the
// Meta App Dashboard, to verify you control this URL.
// ============================================================
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// ============================================================
// POST — Meta calls this every time a retailer sends a WhatsApp message.
// ============================================================
export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = createServiceClient();

  try {
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];

    if (!message) {
      // Meta also sends delivery/read status callbacks — nothing to do for those.
      return NextResponse.json({ ok: true });
    }

    const fromPhone: string = message.from; // e.g. "919922011001"
    const text: string = message.text?.body?.trim() || "";

    // -------- find the retailer this message is from --------
    const { data: retailer } = await supabase
      .from("retailers")
      .select("*")
      .eq("phone", fromPhone)
      .maybeSingle();

    if (!retailer) {
      await sendWhatsAppText(
        fromPhone,
        "This number isn't registered with any distributor on Multiply.ai yet. Please contact your distributor to get added."
      );
      return NextResponse.json({ ok: true });
    }

    await supabase.from("wa_messages").insert({
      retailer_id: retailer.id,
      direction: "in",
      body: text,
      raw: message,
    });

    // -------- load / create the conversation session --------
    let { data: session } = await supabase
      .from("wa_sessions")
      .select("*")
      .eq("retailer_id", retailer.id)
      .maybeSingle();

    if (!session) {
      const { data: created } = await supabase
        .from("wa_sessions")
        .insert({ retailer_id: retailer.id, state: "idle", cart: [] })
        .select()
        .single();
      session = created;
    }

    // -------- load this distributor's catalogue --------
    const { data: products } = await supabase
      .from("products")
      .select("id, name, rate")
      .eq("distributor_id", retailer.distributor_id)
      .eq("active", true);

    const catalogue = products || [];
    const lowerText = text.toLowerCase();

    let reply = "";
    let newState = session.state;
    let newCart = session.cart as any[];

    // -------- state machine --------
    if (session.state === "confirming" && /^(yes|confirm|ok|haan)$/i.test(text)) {
      // ---- place the order ----
      const cart = session.cart as { product: { id: string; name: string; rate: number }; qty: number }[];
      const total = cart.reduce((s, l) => s + l.qty * l.product.rate, 0);

      const { data: order } = await supabase
        .from("orders")
        .insert({
          distributor_id: retailer.distributor_id,
          retailer_id: retailer.id,
          source: "whatsapp",
          status: "pending",
          total,
        })
        .select()
        .single();

      await supabase.from("order_items").insert(
        cart.map((l) => ({
          order_id: order!.id,
          product_id: l.product.id,
          product_name: l.product.name,
          qty: l.qty,
          rate: l.product.rate,
          line_total: l.qty * l.product.rate,
        }))
      );

      reply = `✅ Order received! Total ₹${total}. Your distributor will confirm shortly.\n\nOrder reference: ${order!.id.slice(0, 8).toUpperCase()}`;
      newState = "idle";
      newCart = [];
    } else if (session.state === "confirming" && /^(cancel|no)$/i.test(text)) {
      reply = "Order cancelled. Send CATALOGUE anytime to start a new order.";
      newState = "idle";
      newCart = [];
    } else if (lowerText.includes("catalogue") || lowerText.includes("menu") || lowerText === "hi" || lowerText === "hello") {
      reply = `📋 *Product Catalogue*\n${formatCatalogue(catalogue)}\n\nReply with product name + quantity to order, e.g. "Tata Salt 20, Surf Excel 10"`;
      newState = "browsing";
    } else {
      // try to parse an order out of whatever they sent
      const { matched, unmatched } = parseOrderText(text, catalogue);

      if (matched.length > 0) {
        reply = formatCart(matched);
        newState = "confirming";
        newCart = matched;
        if (unmatched.length > 0) {
          reply += `\n\n(Couldn't match: ${unmatched.join(", ")} — check spelling or reply CATALOGUE to see product names)`;
        }
      } else {
        reply = `Sorry, I couldn't understand that. Reply *CATALOGUE* to see products, or list a product + quantity, e.g. "Tata Salt 20".`;
      }
    }

    await supabase
      .from("wa_sessions")
      .update({ state: newState, cart: newCart, updated_at: new Date().toISOString() })
      .eq("retailer_id", retailer.id);

    await sendWhatsAppText(fromPhone, reply);
    await supabase.from("wa_messages").insert({
      retailer_id: retailer.id,
      direction: "out",
      body: reply,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    // Always return 200 to Meta even on internal errors, or it will retry
    // aggressively and eventually disable the webhook.
    return NextResponse.json({ ok: true });
  }
}
