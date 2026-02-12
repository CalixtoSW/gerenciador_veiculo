export function normalizeDecimalInput(value, decimals = 3) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  text = text.replace(",", ".");
  text = text.replace(/[^0-9.]/g, "");
  const parts = text.split(".");
  const whole = parts[0] ?? "";
  const fraction = parts[1] ?? "";
  const trimmedFraction = fraction.slice(0, decimals);
  if (parts.length > 1) {
    return `${whole}.${trimmedFraction}`;
  }
  return whole;
}

export function formatDecimal(value, decimals = 3, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  const numberValue = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (Number.isNaN(numberValue)) return fallback;
  return numberValue.toFixed(decimals);
}

export function formatDecimalInput(value, decimals = 3) {
  if (value === null || value === undefined || value === "") return "";
  const numberValue = Number(String(value).replace(",", "."));
  if (Number.isNaN(numberValue)) return "";
  return numberValue.toFixed(decimals);
}

export function formatCurrencyBR(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  const numberValue = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (Number.isNaN(numberValue)) return fallback;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
    .format(numberValue)
    .replace(/\u00A0/g, " ");
}
