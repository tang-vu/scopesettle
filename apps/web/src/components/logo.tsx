import Link from "next/link";

export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="ScopeSettle home">
      <svg aria-hidden="true" viewBox="0 0 34 34" width="30" height="30">
        <path
          d="M3 8.5 17 2l14 6.5v17L17 32 3 25.5Z"
          fill="none"
          stroke="currentColor"
        />
        <path
          d="M9 12h13l3 3-3 3H12v4h13"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="9" cy="12" r="2" fill="currentColor" />
        <circle cx="25" cy="22" r="2" fill="currentColor" />
      </svg>
      <span>ScopeSettle</span>
    </Link>
  );
}
