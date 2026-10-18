const technologyStack = ["React", "Vite", "TypeScript", "Tailwind CSS"];

export function HomePage() {
  return (
    <main className="min-h-svh bg-canvas px-4 py-6 text-ink sm:px-6 sm:py-10">
      <section className="page-container flex min-h-[calc(100svh-3rem)] max-w-5xl flex-col justify-between rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:min-h-[calc(100svh-5rem)] sm:p-12">
        <header className="flex items-center justify-between gap-4">
          <a
            aria-label="진료한장 홈"
            className="inline-flex items-center gap-3 font-semibold"
            href="/"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-brand text-lg text-white">
              진
            </span>
            <span>진료한장</span>
          </a>
          <span className="text-sm text-slate-500">프론트엔드 시작 화면</span>
        </header>

        <div className="max-w-2xl py-16">
          <p className="mb-5 inline-flex rounded-full bg-brand/10 px-3 py-1.5 text-sm font-medium text-brand-strong">
            프로젝트 기본 구성이 준비됐습니다.
          </p>
          <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-5xl">
            진료한장 프론트엔드
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            이 화면은 초기 설정 확인용 시작점입니다. 핵심 화면과 동작은 프로젝트
            요구사항에 맞춰 추가하면 됩니다.
          </p>
          <ul aria-label="기술 구성" className="mt-8 flex flex-wrap gap-2">
            {technologyStack.map((technology) => (
              <li
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
                key={technology}
              >
                {technology}
              </li>
            ))}
          </ul>
        </div>

        <footer className="border-t border-slate-100 pt-5 text-sm text-slate-500">
          UI와 제품 흐름은 요구사항을 정한 뒤 구성합니다.
        </footer>
      </section>
    </main>
  );
}
