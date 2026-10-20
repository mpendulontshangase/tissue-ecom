import { NoImageIcon } from "@/components/icons";

export function NoImage({ className = "", label = "No image" }: { className?: string; label?: string }) {
  return (
    <div className={`grid place-items-center bg-sand text-bark/70 ${className}`} role="img" aria-label={label}>
      <NoImageIcon />
    </div>
  );
}
