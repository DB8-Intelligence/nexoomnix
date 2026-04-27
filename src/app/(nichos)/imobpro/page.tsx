import { redirect } from 'next/navigation'

// Rota fora de escopo do produto — middleware já faz 301 pra /. Stub mantido pra
// preservar o arquivo no histórico durante a janela de SEO.
export default function ImobProPage(): never {
  redirect('/')
}
