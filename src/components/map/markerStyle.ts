// 지도 마커의 모양을 한곳에서 관리합니다.
export function hospitalMarkerClassName(selected: boolean) {
  const base =
    "grid h-[44px] w-[44px] place-items-center rounded-full border-[3px] border-white font-bold text-white shadow-md";
  return selected
    ? `${base} z-10 bg-ink ring-4 ring-brand/30`
    : `${base} bg-brand`;
}

export const userLocationClassName =
  "block h-[24px] w-[24px] rounded-full border-[3px] border-white bg-ink shadow-md";
