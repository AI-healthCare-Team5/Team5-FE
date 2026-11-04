import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { SummaryLoadingContent } from "@/pages/summary-loading/components/SummaryLoadingContent";
import {
  createSummaryLoading,
  initialLoadingView,
  type SummaryLoading,
} from "@/pages/summary-loading/summaryLoading";

export function SummaryLoadingPage() {
  const navigate = useNavigate();
  const [view, setView] = useState(initialLoadingView);
  const loadingRef = useRef<SummaryLoading | null>(null);

  // 조회와 이동은 summaryLoading.ts가 맡습니다. 화면을 떠나면 진행 중인 조회를 취소합니다.
  useEffect(() => {
    const loading = createSummaryLoading({
      onView: setView,
      onExit: (to) =>
        navigate(to === "summary" ? "/summary" : "/", { replace: true }),
    });
    loadingRef.current = loading;
    void loading.start();
    return () => {
      loading.dispose();
      loadingRef.current = null;
    };
  }, [navigate]);

  return (
    <SummaryLoadingContent
      view={view}
      onRetry={() => void loadingRef.current?.retry()}
      onCancel={() => void loadingRef.current?.cancel()}
    />
  );
}
