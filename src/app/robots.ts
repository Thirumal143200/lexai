import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/privacy', '/terms'],
      disallow: ['/documents', '/documents/*', '/api/*', '/compare'],
    },
    sitemap: 'https://lexai-zanu.onrender.com/sitemap.xml',
  };
}
