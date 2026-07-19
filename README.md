# Multiply.ai — MVP (Phase 1: WhatsApp Ordering + Order Inbox)

Ye pehla *real* slice hai — prototype nahi. Retailer WhatsApp pe order karta hai,
order actual database mein save hota hai, tum Order Inbox mein login karke
approve/reject karte ho, aur retailer ko WhatsApp pe reply automatically jaata hai.

**Scope of this phase:** WhatsApp ordering + Order Inbox only. ERP sync, invoices,
collections, campaigns — wo prototype mein already dikh chuke hain, real backend
next phases mein add karenge (bata dena jab ready ho).

---

## 1. Supabase setup (10 min)

1. [supabase.com](https://supabase.com) → New Project (naam: `multiply-ai`)
2. Project ban jaaye, phir **SQL Editor** → New query → `supabase/schema.sql` ka
   pura content paste karo → Run.
   - Ye tables banayega + RLS (row level security) set karega + ek test
     distributor/retailer/product seed karega.
3. **Project Settings → API** se ye 3 values copy karo:
   - `Project URL` → `.env.local` mein `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ ye secret hai, kabhi
     frontend code mein use mat karna — sirf webhook use karta hai)

### Apna login user banao
1. **Authentication → Users → Add user** → apna email/password daalo.
2. **SQL Editor** mein run karo (apna email daal ke, aur seed distributor ID use
   karke jo schema.sql mein hai):
   ```sql
   insert into team_users (auth_user_id, distributor_id, name, role)
   values (
     (select id from auth.users where email = 'your@email.com'),
     '00000000-0000-0000-0000-000000000001',
     'Rajesh Sharma',
     'owner'
   );
   ```

---

## 2. WhatsApp Business API setup (20-30 min — ye sabse zyada time lega)

1. [developers.facebook.com](https://developers.facebook.com) → apna account →
   **My Apps → Create App → Business** type choose karo.
2. App ke andar **Add Product → WhatsApp → Set up**.
3. Meta ek **test phone number** free deta hai shuru mein (baad mein apna real
   business number verify kar sakte ho — WhatsApp Business Platform ke through).
4. **API Setup** tab mein milega:
   - `Temporary access token` → `.env.local` mein `WHATSAPP_ACCESS_TOKEN`
     (ye 24 hr mein expire hota hai — testing ke baad **System User token**
     banana permanent access ke liye, Meta Business Settings mein)
   - `Phone number ID` → `.env.local` mein `WHATSAPP_PHONE_NUMBER_ID`
     — same value Supabase `distributors.wa_phone_number_id` column mein bhi
     update kar dena
5. `.env.local` mein `WHATSAPP_VERIFY_TOKEN` ke liye koi bhi random string bana
   lo (e.g. `multiply-verify-2026`) — same value webhook setup ke time Meta
   dashboard mein bhi daalni hai.
6. **Test number se apna personal WhatsApp add karo** (Meta test numbers sirf
   verified recipient list ko hi message bhej sakte hain — "To" numbers add
   karne ka option API Setup page pe hi milega).

---

## 3. Deploy (Vercel — 5 min)

1. Is folder ko GitHub repo bana ke push karo.
2. [vercel.com](https://vercel.com) → New Project → apna repo import karo.
3. Environment Variables mein `.env.example` ki saari keys add karo (apni
   real values ke saath).
4. Deploy. Tumhe ek URL milega jaisे `https://multiply-ai-xyz.vercel.app`

### Webhook connect karo
1. Meta App Dashboard → WhatsApp → Configuration → **Webhook**
2. Callback URL: `https://your-vercel-url.vercel.app/api/whatsapp/webhook`
3. Verify token: wahi jo `.env.local` mein `WHATSAPP_VERIFY_TOKEN` rakha tha
4. **Verify and Save** → agar match hua toh green tick milega
5. **Webhook fields** mein `messages` subscribe karo

---

## 4. Test karo

1. Apne test retailer number (jo verified recipient list mein add kiya) se,
   apne WhatsApp Business number pe "Hi" bhejo
2. Catalogue reply aana chahiye
3. Reply karo: `Tata Salt 20, Surf Excel 10`
4. Cart + total reply aayega, "YES" bolo
5. Order confirm ho jaayega — ab `https://your-vercel-url.vercel.app/inbox`
   pe login karke wo order pending mein dikhna chahiye
6. Approve dabao — retailer ko WhatsApp pe confirmation reply jaana chahiye

Agar kuch atka toh Supabase → Table Editor → `wa_messages` table check karo,
har inbound/outbound message log hoti hai — debugging ke liye sabse pehle
yahi dekhna.

---

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your real values
npm run dev
```

Local dev mein webhook test karne ke liye [ngrok](https://ngrok.com) use karo
(`ngrok http 3000`) aur us URL ko Meta webhook mein daalo, jab tak
production deploy nahi karte.

---

## What's real vs what's still prototype-only

| Feature | Status |
|---|---|
| Retailer WhatsApp ordering (catalogue → cart → confirm) | ✅ Real |
| Order Inbox (approve/reject, live DB) | ✅ Real |
| WhatsApp confirmation to retailer on approve/reject | ✅ Real |
| ERP sync (Marg) | ⏳ Prototype only — needs Marg API access |
| Invoice generation + WhatsApp delivery | ⏳ Prototype only |
| Collections / payment reminders | ⏳ Prototype only |
| Communication Centre broadcasts | ⏳ Prototype only (needs WhatsApp template message approval from Meta for outbound marketing messages) |
| Multi-distributor support | ⏳ MVP is hardcoded to one distributor via `DEFAULT_DISTRIBUTOR_ID` |

Next phase jo bhi chahiye ho — bata dena, usi structure pe build karte jayenge.
