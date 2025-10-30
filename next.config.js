/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@trpc/client', '@trpc/server', '@trpc/react-query'],
}

module.exports = nextConfig
