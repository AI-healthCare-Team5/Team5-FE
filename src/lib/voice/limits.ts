// 서버가 받는 녹음의 상한은 최대 10MB·60초입니다(이슈 #28).
// 10MB는 1000 단위로 잡아서, 서버가 MB와 MiB 중 어느 쪽으로 세어도 넘지 않게 합니다.
export const MAX_RECORDING_BYTES = 10 * 1000 * 1000;
export const MAX_RECORDING_SECONDS = 60;

// 멈춤 요청부터 마지막 조각이 나올 때까지 시간이 걸려 녹음이 60초를 조금 넘을 수 있습니다.
// 서버가 60초 초과로 거절하지 않도록 그만큼 먼저 멈춥니다.
export const AUTO_STOP_MARGIN_SECONDS = 1;
export const AUTO_STOP_MS =
  (MAX_RECORDING_SECONDS - AUTO_STOP_MARGIN_SECONDS) * 1000;

// 이 간격마다 조각을 받아 쌓인 크기를 셉니다. 크기 상한은 녹음이 끝나기 전에 확인합니다.
export const RECORDER_TIMESLICE_MS = 1000;

// 멈춤을 요청했는데 마지막 조각과 stop 이벤트가 오지 않을 때 마이크를 붙잡고 있지 않도록 기다리는 시간입니다.
export const STOP_TIMEOUT_MS = 3000;
