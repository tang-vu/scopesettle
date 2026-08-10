import type { MetadataRoute } from "next";

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/u,
    "",
  );
}

export default function robots(): MetadataRoute.Robots {
  return {
    host: baseUrl(),
    rules: {
      allow: "/",
      disallow: ["/api/", "/e2e-actions"],
      userAgent: "*",
    },
    sitemap: `${baseUrl()}/sitemap.xml`,
  };
}
