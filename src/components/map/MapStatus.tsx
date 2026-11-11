// 카카오맵을 쓸 수 없을 때(앱 키 없음, SDK 로드 실패, 표시할 위치 없음) 지도 자리에 보여 주는 안내입니다.
// 지도를 흉내 낸 그림은 그리지 않고, 목록·전화·길 찾기는 이 안내와 상관없이 그대로 둡니다.
export function MapStatus() {
  return (
    <p
      role="status"
      className="rounded-[12px] border border-line bg-brand-soft p-4 text-center text-muted"
    >
      지도를 불러오지 못했어요.
    </p>
  );
}
