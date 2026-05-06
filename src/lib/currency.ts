// Currency helper — uses user's registration currency, NO conversion.
// Falls back to ISO code if no symbol is known.
const SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥", AUD: "A$", CAD: "C$",
  CHF: "CHF", NZD: "NZ$", INR: "₹", RUB: "₽", BRL: "R$", ZAR: "R",
  KRW: "₩", MXN: "MX$", SGD: "S$", HKD: "HK$", SEK: "kr", NOK: "kr",
  DKK: "kr", PLN: "zł", TRY: "₺", AED: "AED", SAR: "SAR", NGN: "₦",
  KES: "KSh", GHS: "GH₵", EGP: "E£", THB: "฿", IDR: "Rp", PHP: "₱",
  VND: "₫", MYR: "RM", ARS: "AR$", CLP: "CL$", COP: "CO$", PEN: "S/",
  CZK: "Kč", HUF: "Ft", RON: "lei", ILS: "₪", PKR: "₨", BDT: "৳",
};

export function currencySymbol(code?: string | null): string {
  if (!code) return "";
  const c = code.toUpperCase();
  return SYMBOLS[c] || c + " ";
}

export function formatMoney(amount: number | string | null | undefined, code?: string | null): string {
  const n = Number(amount || 0);
  return `${currencySymbol(code)}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
