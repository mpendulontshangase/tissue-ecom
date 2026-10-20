export function shopMark(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
  }
  const compact = name.replace(/[^a-z0-9]/gi, "");
  return (compact.slice(0, 2) || "S").toUpperCase();
}
