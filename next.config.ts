import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Security headers applied to all responses.
   * These are defence-in-depth mitigations — they do not replace application-level security.
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent browsers from MIME-sniffing responses
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Restrict browser features not needed by this app
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Strict referrer policy — legal documents should not leak referer headers
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Basic XSS protection (belt-and-suspenders; CSP is more effective)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Content Security Policy
          // Allows: same-origin scripts, Google Fonts, inline styles (Next.js requirement)
          // Restricts: all other origins for scripts, objects, and embeds
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires these in dev; tighten in strict production builds
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob:",
              "connect-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },

  /**
   * Standalone output for Docker/Railway/Render deployment.
   * Packages only the minimal server code needed, without the full node_modules tree.
   * Remove this if deploying to Vercel (Vercel handles bundling automatically).
   */
  // output: "standalone",
};

export default nextConfig;
