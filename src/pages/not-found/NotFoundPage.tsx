import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <main className="grid min-h-svh place-items-center bg-canvas px-4 text-ink">
      <div className="text-center">
        <p className="text-sm font-medium text-brand">404</p>
        <h1 className="mt-2 text-2xl font-semibold">
          페이지를 찾을 수 없습니다.
        </h1>
        <Link
          className="mt-6 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white"
          to="/"
        >
          홈으로 이동
        </Link>
      </div>
    </main>
  );
}
