import { ContentTemplateGallery } from '@/components/content-ai/ContentTemplateGallery'

export const metadata = {
  title: 'Templates — NexoOmnix',
}

export default function ContentTemplatesPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <ContentTemplateGallery />
    </div>
  )
}
