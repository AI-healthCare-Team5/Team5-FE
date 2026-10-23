import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";
import { DesignIcon } from "@/components/DesignIcon";

type Variant = "primary" | "outline" | "quiet" | "emergency" | "neutral";
const variants: Record<Variant, string> = {
  primary: "border-brand bg-brand text-white hover:bg-brand-strong",
  outline: "border-brand bg-surface text-brand-strong hover:bg-brand-soft",
  quiet: "border-transparent text-brand-strong underline underline-offset-4",
  emergency: "border-emergency bg-emergency text-white hover:brightness-90",
  neutral: "border-control bg-surface text-notice-ink hover:bg-notice",
};

function buttonClass(variant: Variant = "primary") {
  return `flex ${variant === "primary" ? "min-h-[max(44px,3.4rem)]" : "min-h-[max(44px,3.2rem)]"} w-full items-center justify-center gap-[10px] rounded-[18px] border-2 px-5 py-3 text-center font-bold transition-colors disabled:cursor-not-allowed disabled:border-line disabled:bg-line disabled:text-muted ${variants[variant]}`;
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
      className={`rounded-[20px] border border-line bg-surface p-5 ${className}`}
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
    neutral: "border-notice bg-notice text-notice-ink",
    amber: "border-amber-line bg-amber-soft text-amber-ink",
    emergency: "border-emergency-line bg-emergency-soft text-emergency-ink",
  };
  return (
    <div
      className={`rounded-[14px] border px-4 py-[14px] text-[0.889rem] ${colors[tone]}`}
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
        <p className="text-[0.889rem] font-bold text-brand-strong">{eyebrow}</p>
      )}
      <h1 className="text-[1.667rem] leading-[1.35] font-bold tracking-[-0.02em]">
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
      <div className="flex justify-between gap-2 text-[0.889rem]">
        <span className="font-bold text-brand-strong">기본 정보</span>
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
      className={`min-h-[max(44px,3.2rem)] rounded-[16px] border-2 border-brand px-3 py-2 font-bold ${selected ? "bg-brand text-white" : "bg-surface text-brand-strong hover:bg-brand-soft"}`}
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
    <p className="flex items-start gap-[10px] text-[0.889rem] leading-[1.5] text-muted">
      <DesignIcon name="info" size={20} />
      <span>{children}</span>
    </p>
  );
}
