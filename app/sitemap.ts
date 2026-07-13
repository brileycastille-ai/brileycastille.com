import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://brileycastille.com";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/essays/beyond-the-algorithm`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/account`, changeFrequency: "monthly", priority: 0.4 },
  ];
}
