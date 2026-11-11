// 카카오맵 확대 단계입니다. 숫자가 작을수록 가까이 보입니다.
export const minMapLevel = 1;
export const maxMapLevel = 14;

// 확대(zoomIn)면 한 단계 줄이고 축소면 한 단계 늘립니다. 범위를 넘기면 끝 단계에 머뭅니다.
export function nextMapLevel(level: number, direction: "in" | "out"): number {
  const next = direction === "in" ? level - 1 : level + 1;
  return Math.min(maxMapLevel, Math.max(minMapLevel, next));
}
