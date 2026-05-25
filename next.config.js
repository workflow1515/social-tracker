/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: { domains: ['yt3.ggpht.com', 'yt3.googleusercontent.com'] },
  eslint: { ignoreDuringBuilds: true },
}
module.exports = nextConfig
