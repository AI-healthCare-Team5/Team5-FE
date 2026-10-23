type DesignIconName = "microphone" | "phone" | "chevron" | "info";

export function DesignIcon({
  name,
  size = 22,
}: {
  name: DesignIconName;
  size?: number;
}) {
  if (name === "microphone") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 72 72"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M36 9C33.6131 9 31.3239 9.94821 29.636 11.636C27.9482 13.3239 27 15.6131 27 18V36C27 38.3869 27.9482 40.6761 29.636 42.364C31.3239 44.0518 33.6131 45 36 45C38.3869 45 40.6761 44.0518 42.364 42.364C44.0518 40.6761 45 38.3869 45 36V18C45 15.6131 44.0518 13.3239 42.364 11.636C40.6761 9.94821 38.3869 9 36 9Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 33C15 38.5695 17.2125 43.911 21.1508 47.8492C25.089 51.7875 30.4305 54 36 54M36 54C41.5695 54 46.911 51.7875 50.8492 47.8492C54.7875 43.911 57 38.5695 57 33M36 54V63"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.66667"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {name === "phone" && (
        <path d="M4.16667 3.33337H7.5L9.16667 7.50004L7.08333 8.75004C7.9758 10.5596 9.44039 12.0242 11.25 12.9167L12.5 10.8334L16.6667 12.5V15.8334C16.6667 16.2754 16.4911 16.6993 16.1785 17.0119C15.866 17.3244 15.442 17.5 15 17.5C11.7494 17.3025 8.68346 15.9221 6.38069 13.6194C4.07792 11.3166 2.69754 8.25065 2.5 5.00004C2.5 4.55801 2.67559 4.13409 2.98816 3.82153C3.30072 3.50897 3.72464 3.33337 4.16667 3.33337Z" />
      )}
      {name === "chevron" && <path d="M7.5 5L12.5 10L7.5 15" />}
      {name === "info" && (
        <>
          <circle cx="10" cy="10" r="7.5" />
          <path d="M10 9.16663V13.3333M10 6.66663H10.0083" />
        </>
      )}
    </svg>
  );
}
