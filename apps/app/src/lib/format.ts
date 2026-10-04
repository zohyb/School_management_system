// Normalize a Pakistani phone number (03xx...) to international format and
// build a wa.me deep link with prefilled text. Returns null when unusable.
export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  if (!phone) return null;
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = "92" + p.slice(1);
  if (p.length < 10) return null;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}
