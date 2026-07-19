// Parses free-text retailer messages like:
//   "Tata Salt 20, Surf Excel 10"
//   "2 Fortune oil, tata salt x15"
// against the distributor's product catalogue. This is a simple, explainable
// MVP parser (substring + number matching) — swap for an LLM-based parser
// later once you have real message samples to test against.

export type Product = { id: string; name: string; rate: number };
export type ParsedLine = { product: Product; qty: number };

export function parseOrderText(text: string, catalogue: Product[]): {
  matched: ParsedLine[];
  unmatched: string[];
} {
  const matched: ParsedLine[] = [];
  const unmatched: string[] = [];

  // split on commas / newlines — each retailer usually lists one item per segment
  const segments = text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const segment of segments) {
    const numMatch = segment.match(/(\d+)/);
    const qty = numMatch ? parseInt(numMatch[1], 10) : 1;
    const nameOnly = segment.replace(/(\d+)/g, "").replace(/x/gi, "").trim().toLowerCase();

    if (!nameOnly) continue;

    const product = catalogue.find(
      (p) =>
        p.name.toLowerCase().includes(nameOnly) ||
        nameOnly.includes(p.name.toLowerCase().split(" ")[0]) // matches on first word e.g. "tata"
    );

    if (product && qty > 0) {
      matched.push({ product, qty });
    } else {
      unmatched.push(segment);
    }
  }

  return { matched, unmatched };
}

export function formatCatalogue(products: Product[]): string {
  return products
    .map((p, i) => `${i + 1}. ${p.name} — ₹${p.rate}`)
    .join("\n");
}

export function formatCart(lines: ParsedLine[]): string {
  const total = lines.reduce((s, l) => s + l.qty * l.product.rate, 0);
  const body = lines
    .map((l) => `${l.product.name} x${l.qty} = ₹${l.qty * l.product.rate}`)
    .join("\n");
  return `${body}\n\nTotal: ₹${total}\n\nReply YES to confirm this order, or CANCEL to start over.`;
}
