import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/u, "");
  return [
    { changeFrequency: "weekly", priority: 1, url: base },
    { changeFrequency: "daily", priority: 0.8, url: `${base}/app` },
    { changeFrequency: "monthly", priority: 0.7, url: `${base}/developers` },
    { changeFrequency: "monthly", priority: 0.7, url: `${base}/jobs/new` },
    {
      changeFrequency: "monthly",
      priority: 0.7,
      url: `${base}/jobs/1952/42`,
    },
  ];
}
