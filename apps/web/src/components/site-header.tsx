import Link from "next/link";

import { Logo } from "./logo";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Logo />
        <nav aria-label="Primary navigation">
          <Link href="/app" prefetch={false}>
            Jobs
          </Link>
          <Link href="/developers" prefetch={false}>
            Developers
          </Link>
          <Link href="/#methodology">Methodology</Link>
          <Link className="desktop-only" href="/jobs/new" prefetch={false}>
            Create job
          </Link>
        </nav>
        <Link
          className="button button-primary button-small"
          href="/app"
          prefetch={false}
        >
          Launch app
        </Link>
      </div>
    </header>
  );
}
