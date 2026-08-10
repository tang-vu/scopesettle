import Link from "next/link";

import { Logo } from "./logo";
import { WalletButton } from "./wallet-button";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Logo />
        <nav aria-label="Primary navigation">
          <Link href="/app">Jobs</Link>
          <Link href="/#methodology">Methodology</Link>
          <Link className="desktop-only" href="/jobs/new">
            Create job
          </Link>
        </nav>
        <WalletButton />
      </div>
    </header>
  );
}
