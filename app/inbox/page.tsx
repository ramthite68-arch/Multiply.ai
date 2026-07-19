import { createClient } from "@/lib/supabase/server";
import { approveOrder, rejectOrder } from "@/app/actions/orders";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic"; // always fetch fresh orders, no caching

export default async function InboxPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      `id, status, total, source, created_at,
       retailers ( name, area, phone, credit_limit, outstanding ),
       order_items ( product_name, qty, rate, line_total )`
    )
    .order("created_at", { ascending: false });

  return (
    <main style={{ fontFamily: "sans-serif", padding: "32px", maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Order Inbox</h1>
      <p style={{ color: "#64748B", marginBottom: 24 }}>
        Real orders placed by retailers over WhatsApp. Approve to notify the retailer — ERP push comes in the next phase.
      </p>

      {error && <p style={{ color: "red" }}>Error loading orders: {error.message}</p>}
      {orders && orders.length === 0 && (
        <p style={{ color: "#64748B" }}>
          No orders yet. Message your WhatsApp Business number from a registered retailer's phone
          to place a test order (try sending "catalogue").
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {orders?.map((o: any) => (
          <div key={o.id} style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <b style={{ fontSize: 15 }}>{o.retailers?.name}</b>
                <div style={{ fontSize: 12.5, color: "#64748B" }}>{o.retailers?.area} · {o.source}</div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: 20,
                  background: o.status === "pending" ? "#FFFBEB" : o.status === "approved" ? "#F0FDF4" : "#FEF2F2",
                  color: o.status === "pending" ? "#B45309" : o.status === "approved" ? "#15803D" : "#DC2626",
                }}
              >
                {o.status}
              </span>
            </div>

            <table style={{ width: "100%", marginTop: 12, fontSize: 13 }}>
              <tbody>
                {o.order_items?.map((it: any, i: number) => (
                  <tr key={i}>
                    <td style={{ padding: "4px 0" }}>{it.product_name}</td>
                    <td style={{ padding: "4px 0", textAlign: "right" }}>x{it.qty}</td>
                    <td style={{ padding: "4px 0", textAlign: "right" }}>₹{it.line_total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontWeight: 700 }}>
              <span>Total</span>
              <span>₹{o.total}</span>
            </div>

            {o.status === "pending" && (
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <form action={approveOrder.bind(null, o.id)}>
                  <button
                    style={{
                      background: "#2563EB",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 16px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ✓ Approve
                  </button>
                </form>
                <form action={rejectOrder.bind(null, o.id)}>
                  <button
                    style={{
                      background: "#fff",
                      border: "1px solid #E2E8F0",
                      borderRadius: 8,
                      padding: "8px 16px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ✕ Reject
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
