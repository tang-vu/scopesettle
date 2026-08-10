import Link from "next/link";

import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <Logo />
          <p>Verified work. Automatic settlement.</p>
        </div>
        <div>
          <p className="eyebrow">Protocol</p>
          <Link href="/app">Explore jobs</Link>
          <Link href="/jobs/new">Create a job</Link>
        </div>
        <div>
          <p className="eyebrow">Documentation</p>
          <a href="https://eips.ethereum.org/EIPS/eip-8183">ERC-8183</a>
          <a href="https://web3.okx.com/onchainos/dev-docs/xlayer/developer/build-on-xlayer/about-xlayer">
            X Layer docs
          </a>
        </div>
      </div>
      <div className="shell footer-bottom">
        <p>
          Unaudited beta · Evaluator signer is trusted · Use only low-value test
          funds
        </p>
        <p>MIT · ScopeSettle 2026</p>
      </div>
    </footer>
  );
}
