// 지도 마커의 모양을 한곳에서 관리합니다.
export function hospitalMarkerClassName(selected: boolean) {
  const base =
    "grid h-[44px] w-[44px] place-items-center rounded-full border-[3px] border-white p-0 leading-none font-bold text-white shadow-md";
  return selected
    ? `${base} z-10 bg-ink ring-4 ring-brand/30`
    : `${base} bg-brand`;
}

// 현재 위치는 속이 빈 고리로 그려, 속이 찬 번호 마커와 한눈에 구분됩니다.
export const userLocationClassName =
  "block h-[24px] w-[24px] rounded-full border-[6px] border-brand shadow-md";

// 현재 위치 점 옆에 붙는 이름표입니다. 병원 마커와 겹쳐도 읽히도록 배경을 둡니다.
export const userLocationLabelClassName =
  "absolute top-1/2 left-[30px] -translate-y-1/2 rounded-full border border-line bg-surface px-[8px] py-[2px] text-[0.889rem] font-bold whitespace-nowrap text-ink shadow-md";
