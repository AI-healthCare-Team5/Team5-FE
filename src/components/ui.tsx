import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";

type Variant = "primary" | "outline" | "quiet" | "emergency";
const variants: Record<Variant, string> = {
  primary: "border-brand bg-brand text-white hover:bg-brand-strong",
  outline: "border-control bg-surface text-brand-strong hover:bg-brand-soft",
  quiet: "border-transparent text-brand-strong underline underline-offset-4",
  emergency: "border-emergency bg-emergency text-white hover:brightness-90",
};

function buttonClass(variant: Variant = "primary") {
  return `flex min-h-[max(44px,3.222rem)] w-full items-center justify-center gap-2 rounded-[12px] border px-4 py-3 text-center font-semibold transition-colors disabled:cursor-not-allowed disabled:border-line disabled:bg-line disabled:text-muted ${variants[variant]}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`${buttonClass(variant)} ${className}`}
      type="button"
      {...props}
    />
  );
}

export function ActionLink({
  to,
  children,
  variant = "primary",
}: {
  to: string;
  children: ReactNode;
  variant?: Variant;
}) {
  return (
    <Link className={buttonClass(variant)} to={to}>
      {children}
    </Link>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[16px] border border-line bg-surface p-4 ${className}`}
    >
      {children}
    </div>
  );
}

export function Notice({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "amber" | "emergency";
}) {
  const colors = {
    neutral: "border-line bg-brand-soft text-muted",
    amber: "border-amber-line bg-amber-soft text-amber-ink",
    emergency: "border-[#fecdca] bg-emergency-soft text-[#912018]",
  };
  return (
    <div
      className={`rounded-[12px] border p-4 text-[0.889rem] ${colors[tone]}`}
    >
      {children}
    </div>
  );
}

export function PageTitle({
  eyebrow,
  children,
  description,
}: {
  eyebrow?: string;
  children: ReactNode;
  description?: string;
}) {
  return (
    <div className="space-y-3">
      {eyebrow && (
        <p className="text-[0.833rem] font-bold text-brand-strong">{eyebrow}</p>
      )}
      <h1 className="text-[1.667rem] leading-[1.4] font-bold tracking-tight">
        {children}
      </h1>
      {description && <p className="text-muted">{description}</p>}
    </div>
  );
}

export function Progress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="space-y-2" aria-label={`질문 ${current} / ${total}`}>
      <div className="flex justify-between gap-2 text-[0.833rem]">
        <span className="font-bold text-brand-strong">
          차근차근 알려 주세요
        </span>
        <span className="text-muted">
          질문 {current} / {total}
        </span>
      </div>
      <div
        className="flex gap-1"
        role="progressbar"
        aria-label="문진 진행"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={current}
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-[6px] flex-1 rounded-full ${index < current ? "bg-brand" : "bg-line"}`}
          />
        ))}
      </div>
    </div>
  );
}

export function Chip({
  children,
  selected,
  onClick,
}: {
  children: ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-[max(44px,3rem)] rounded-[12px] border px-3 py-2 font-medium ${selected ? "border-brand bg-brand text-white" : "border-control bg-surface hover:bg-brand-soft"}`}
    >
      {children}
    </button>
  );
}

export function Disclaimer({
  children = "환자가 말한 내용을 정리한 것이며 진단이 아닙니다.",
}: {
  children?: ReactNode;
}) {
  return (
    <p className="text-[0.833rem] leading-relaxed text-muted">ⓘ {children}</p>
  );
}
