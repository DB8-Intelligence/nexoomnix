import { AutopilotSchedulesPanel } from '@/components/social/AutopilotSchedulesPanel'

export const metadata = {
  title: 'Autopilot — NexoOmnix',
}

export default function ContentAutopilotPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <AutopilotSchedulesPanel />
    </div>
  )
}
