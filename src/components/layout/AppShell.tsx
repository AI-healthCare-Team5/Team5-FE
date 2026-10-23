import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { DesignIcon } from "@/components/DesignIcon";

const fontSizes = [18, 22, 26] as const;
const fontLabels = ["보통", "크게", "더 크게"];
const hiddenEmergencyBarPaths = new Set([
  "/emergency",
  "/emergency-card",
  "/hospital-empty",
  "/hospital-error",
]);

function readFontSize(): number {
  try {
    const stored = Number(localStorage.getItem("jinryo-font-size"));
    return fontSizes.some((size) => size === stored) ? stored : 18;
  } catch {
    return 18;
  }
}

export function AppShell() {
  const [fontSize, setFontSize] = useState(readFontSize);
  const { pathname } = useLocation();
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    try {
      localStorage.setItem("jinryo-font-size", String(fontSize));
    } catch {
      // 저장소가 차단되어도 현재 화면에서는 선택한 글자 크기를 유지합니다.
    }
  }, [fontSize]);
  useEffect(() => {
    window.scrollTo(0, 0);
    const heading = document.querySelector<HTMLElement>("main h1");
    if (heading) {
      document.title = `${heading.textContent} · 진료한장`;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [pathname]);
  return (
    <div className="mx-auto flex min-h-dvh w-full flex-col bg-canvas md:max-w-[480px] md:border-x md:border-line md:shadow-xl">
      <a href="#main" className="sr-only focus:not-sr-only focus:p-4">
        본문 바로가기
      </a>
      <header className="flex min-h-[110px] flex-wrap items-end justify-between gap-x-2 gap-y-4 px-6 py-4">
        <Link
          to="/"
          aria-label="진료한장 처음으로"
          className="mb-[3px] flex min-h-[44px] items-center gap-[10px] text-[20px] font-bold tracking-[-0.4px]"
        >
          <img src="/favicon.svg" alt="" className="size-[36px]" />
          진료한장
        </Link>
        <fieldset className="ml-auto min-w-0">
          <legend className="mb-[2px] w-full text-right text-[15px] font-medium text-muted">
            글자 크기
          </legend>
          <div className="flex gap-[4px] rounded-[14px] bg-control-surface p-[4px]">
            {fontSizes.map((size, index) => (
              <button
                key={size}
                type="button"
                aria-label={`글자 크기 ${fontLabels[index]}`}
                aria-pressed={fontSize === size}
                onClick={() => setFontSize(size)}
                className={`h-[44px] w-[44px] rounded-[10px] font-bold ${fontSize === size ? "bg-ink text-white" : "text-ink"}`}
                style={{ fontSize: 15 + index * 4 }}
              >
                가
              </button>
            ))}
          </div>
        </fieldset>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className={`flex flex-1 flex-col gap-6 px-6 pt-4 ${pathname === "/" ? "pb-10" : "pb-8"}`}
      >
        <Outlet />
      </main>
      {!hiddenEmergencyBarPaths.has(pathname) && (
        <footer className="sticky bottom-0 z-10 mt-auto flex min-h-[69px] items-center justify-between gap-[8px] border-t border-emergency-line bg-emergency-soft px-6 py-[10px] pb-[calc(10px+env(safe-area-inset-bottom))] text-[16px] text-emergency-ink">
          <span className="font-bold">위급하면 바로 119</span>
          <a
            className="flex h-[48px] shrink-0 items-center justify-center gap-[8px] rounded-[12px] bg-emergency px-[16px] font-bold text-white"
            href="tel:119"
          >
            <DesignIcon name="phone" size={20} />
            119 전화
          </a>
        </footer>
      )}
    </div>
  );
}
