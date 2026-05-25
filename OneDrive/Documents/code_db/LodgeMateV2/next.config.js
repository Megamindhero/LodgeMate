/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async headers() {
    if (process.env.NODE_ENV !== 'production') return [];
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
          // Allow YouTube/Vimeo iframes — removed X-Frame-Options DENY
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com",
              "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
              "img-src 'self' data: blob: https:",
              "media-src 'self' https:",
              "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
              "font-src 'self' https://cdnjs.cloudflare.com",
              "connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com https://*.googleapis.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
