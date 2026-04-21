import { UpcomingPostsPanel } from '@/components/social/UpcomingPostsPanel'

export const metadata = {
  title: 'Fila de publicações — NexoOmnix',
}

export default function ContentQueuePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <UpcomingPostsPanel />
    </div>
  )
}
