import type { ReactNode } from "react";
export type ScreenIconName =
  | "mic"
  | "shield"
  | "lock"
  | "write"
  | "mic-white"
  | "mic-off"
  | "write-white"
  | "mic-blue"
  | "pin"
  | "navigation"
  | "pin-white"
  | "retry-white"
  | "document"
  | "warning"
  | "check"
  | "warning-large"
  | "card-white"
  | "record"
  | "trash"
  | "kakao"
  | "error"
  | "warning-amber";
export function ScreenIcon({
  name,
  size = 26,
}: {
  name: ScreenIconName;
  size?: number;
}) {
  return (
    <img
      src={`/images/screens/${name}.svg`}
      alt=""
      width={size}
      height={size}
      className="shrink-0"
    />
  );
}
export function Illustration({
  children,
  amber = false,
}: {
  children: ReactNode;
  amber?: boolean;
}) {
  return (
    <span
      className={`grid size-[96px] shrink-0 place-items-center rounded-full ${amber ? "bg-amber-disc" : "bg-brand-soft"}`}
    >
      {children}
    </span>
  );
}
export function IconList({
  items,
}: {
  items: readonly { icon: ScreenIconName; text: string }[];
}) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map(({ icon, text }) => (
        <li key={text} className="flex items-start gap-[14px]">
          <ScreenIcon name={icon} />
          <span className="min-w-0">{text}</span>
        </li>
      ))}
    </ul>
  );
}
export function NumberedSteps({ items }: { items: readonly string[] }) {
  return (
    <ol className="flex flex-col gap-[14px]">
      {items.map((text, index) => (
        <li key={text} className="flex items-start gap-[14px]">
          <span
            aria-hidden="true"
            className="grid size-[32px] shrink-0 place-items-center rounded-full bg-ink text-[16px] font-bold text-white"
          >
            {index + 1}
          </span>
          <span className="min-w-0">{text}</span>
        </li>
      ))}
    </ol>
  );
}
export function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-[72px] shrink-0 animate-spin rounded-full border-[6px] border-brand-ring border-t-brand motion-reduce:animate-none"
    />
  );
}
