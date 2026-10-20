type Social = { href: string; label: string; path: string };

const icons: Record<string, string> = {
  Facebook:
    "M14 8h2V5h-2c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.2l.8-3H13V9c0-.6.4-1 1-1Z",
  Instagram:
    "M8 4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Zm8 2H8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Zm-4 2.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5Zm0 2A1.5 1.5 0 1 0 13.5 12 1.5 1.5 0 0 0 12 10.5ZM17 7.2a.8.8 0 1 1-.8.8.8.8 0 0 1 .8-.8Z",
  TikTok:
    "M14 5c.4 2.2 1.7 3.6 3.8 3.8v2.2c-1.3 0-2.5-.4-3.6-1.1v5.4A5.3 5.3 0 1 1 9 10.1v2.3a3 3 0 1 0 2.2 2.9V5H14Z",
  WhatsApp:
    "M12 4.5A7.5 7.5 0 0 0 5.1 15.3L4.5 19.5l4.3-.6A7.5 7.5 0 1 0 12 4.5Zm3.8 10.6c-.2.5-1 .9-1.4 1-.4.1-.8.1-1.3-.1-.3-.1-.7-.2-1.2-.5-2.1-1-3.5-3.2-3.6-3.4-.1-.2-.9-1.2-.9-2.3s.6-1.6.8-1.8.4-.3.6-.3h.4c.1 0 .3 0 .4.4.2.5.6 1.6.6 1.7.1.1 0 .3-.1.4l-.3.4c-.1.1-.2.2-.1.4.1.2.6 1 1.3 1.6.9.8 1.6 1 1.8 1.1.2.1.3.1.4-.1l.5-.6c.1-.2.3-.1.5-.1h.3c.2.1.7.3.8.5.1.1.1.6 0 1.1Z",
  X: "M6 6.5h2.4l3.1 4.2 3.4-4.2H18l-4.7 5.6L18.2 18h-2.4l-3.4-4.5L8.6 18H6.2l5-6.1L6 6.5Z",
};

export function SocialLinks({
  facebookUrl,
  instagramUrl,
  tiktokUrl,
  whatsappUrl,
  xUrl,
  tone = "foam",
}: {
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  whatsappUrl: string;
  xUrl: string;
  tone?: "foam" | "ink";
}) {
  const links: Social[] = [
    ["Facebook", facebookUrl],
    ["Instagram", instagramUrl],
    ["TikTok", tiktokUrl],
    ["WhatsApp", whatsappUrl],
    ["X", xUrl],
  ]
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, href]) => ({ label, href, path: icons[label] ?? "" }));

  if (links.length === 0) return null;

  const color = tone === "foam" ? "border-foam/30 text-foam hover:bg-white/10" : "border-line text-ink hover:bg-sand";

  return (
    <ul className="flex flex-wrap gap-2">
      {links.map((link) => (
        <li key={link.label}>
          <a
            href={link.href}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border ${color}`}
            aria-label={link.label}
            target="_blank"
            rel="noreferrer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d={link.path} fill="currentColor" />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
