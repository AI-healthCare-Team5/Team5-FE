export function MicrophoneIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      aria-hidden="true"
    >
      <rect x="26" y="8" width="20" height="35" rx="10" fill="currentColor" />
      <path
        d="M18 33v4a18 18 0 0 0 36 0v-4M36 55v10M26 65h20"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
