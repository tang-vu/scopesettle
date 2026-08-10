import { canonicalize } from "@scopesettle/shared";

import { exampleReport } from "@/lib/example-data";

export function GET() {
  return new Response(canonicalize(exampleReport), {
    headers: {
      "Cache-Control": "public, max-age=3600, immutable",
      "Content-Disposition":
        'attachment; filename="scopesettle-example-report.json"',
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
