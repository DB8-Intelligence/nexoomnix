/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloud Run / qualquer container deployment: gera bundle minimal Node em
  // .next/standalone com apenas as deps efetivamente usadas. Reduz imagem
  // Docker em ~80% e elimina necessidade de copiar node_modules inteiro.
  // Sem efeito em deploy Vercel (Vercel ignora a flag).
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.fal.media' },
      { protocol: 'https', hostname: '*.fal.ai' },
      { protocol: 'https', hostname: 'pbxt.replicate.delivery' },
      { protocol: 'https', hostname: 'replicate.delivery' },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false }
    }
    return config
  },
}

export default nextConfig
