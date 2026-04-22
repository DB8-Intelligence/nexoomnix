'use client'

import { useState } from 'react'
import { useContentAI } from '@/hooks/useContentAI'
import { useAuth } from '@/hooks/useAuth'
import { LinkInput } from './LinkInput'
import { AnalysisResult } from './AnalysisResult'
import { NichoConfig } from './NichoConfig'
import { TalkingObjectSelector } from './TalkingObjectSelector'
import { ImageGallery } from './ImageGallery'
import { PackagePreview } from './PackagePreview'
import { DeliveryScreen } from './DeliveryScreen'
import { getTalkingObjectsForNiche } from '@/lib/content-ai/talking-objects'
import type { ContentProject } from '@/types/database'
import type { TalkingObject } from '@/lib/content-ai/talking-objects'
import { cn } from '@/lib/utils'

type WizardStep = 'input' | 'analysis' | 'config' | 'talking_object' | 'images' | 'package' | 'delivery'

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'input', label: 'Fonte' },
  { key: 'analysis', label: 'Análise' },
  { key: 'config', label: 'Formato' },
  { key: 'talking_object', label: 'Personagem' },
  { key: 'images', label: 'Imagens' },
  { key: 'package', label: 'Textos' },
  { key: 'delivery', label: 'Pronto' },
]

function StepIndicator({ current }: { current: WizardStep }) {
  const currentIndex = STEPS.findIndex(s => s.key === current)
  return (
    <div className="flex items-center gap-0.5 mb-6">
      {STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center">
          <div className={cn(
            'flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-colors',
            i < currentIndex ? 'bg-green-500 text-white' :
            i === currentIndex ? 'bg-blue-600 text-white' :
            'bg-gray-100 text-gray-400'
          )}>
            {i < currentIndex ? '✓' : i + 1}
          </div>
          <span className={cn(
            'text-[10px] ml-1 hidden sm:block',
            i === currentIndex ? 'text-blue-600 font-semibold' : 'text-gray-400'
          )}>
            {step.label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={cn(
              'h-px w-4 mx-1',
              i < currentIndex ? 'bg-green-400' : 'bg-gray-200'
            )} />
          )}
        </div>
      ))}
    </div>
  )
}

export function ContentWizard() {
  const {
    createProject,
    analyze,
    generateImages,
    generatePackage,
    updateProject,
  } = useContentAI()
  const { tenant } = useAuth()

  const [step, setStep] = useState<WizardStep>('input')
  const [project, setProject] = useState<ContentProject | null>(null)
  const [formato, setFormato] = useState('reel')
  const [selectedObject, setSelectedObject] = useState<TalkingObject | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleInputSubmit(data: { nicho: string; source_url?: string; source_description?: string }) {
    setLoading(true)
    const created = await createProject(data)
    if (!created) { setLoading(false); return }

    setProject(created)
    const ok = await analyze(created.id)
    if (ok) {
      // Fetch updated project from state
      setProject(prev => prev ? { ...prev, status: 'configuring' } : prev)
      setStep('analysis')
    }
    setLoading(false)
  }

  async function handleAnalysisContinue() {
    setStep('config')
  }

  async function handleReanalyze() {
    if (!project) return
    setLoading(true)
    await analyze(project.id)
    setLoading(false)
  }

  async function handleConfigContinue() {
    if (!project) return
    setLoading(true)
    await updateProject(project.id, { formato })
    setProject(prev => prev ? { ...prev, formato } : prev)
    setLoading(false)
    setStep('talking_object')
  }

  async function handleObjectContinue() {
    if (!project) return
    if (selectedObject) {
      await updateProject(project.id, { talking_object_selected: selectedObject })
      setProject(prev => prev ? { ...prev, talking_object_selected: selectedObject } : prev)
    }
    setStep('images')
  }

  async function handleGenerateImages() {
    if (!project) return false
    setLoading(true)
    const ok = await generateImages(project.id)
    if (ok) setProject(prev => prev ? { ...prev, status: 'configuring' } : prev)
    setLoading(false)
    return ok
  }

  async function handleGeneratePackage() {
    if (!project) return false
    const ok = await generatePackage(project.id)
    return ok
  }

  async function handleFinish() {
    if (!project) return
    await updateProject(project.id, { status: 'ready' })
    setProject(prev => prev ? { ...prev, status: 'ready' } : prev)
    setStep('delivery')
  }

  function handleNewProject() {
    setStep('input')
    setProject(null)
    setFormato('reel')
    setSelectedObject(null)
  }

  const talkingObjects = project?.nicho ? getTalkingObjectsForNiche(project.nicho) : []

  return (
    <div className="max-w-2xl">
      <StepIndicator current={step} />

      {step === 'input' && (
        <LinkInput
          onSubmit={handleInputSubmit}
          loading={loading}
          defaultNiche={tenant?.niche}
          tenantName={tenant?.name}
        />
      )}

      {step === 'analysis' && project?.analysis && (
        <AnalysisResult
          analysis={project.analysis}
          onContinue={handleAnalysisContinue}
          onReanalyze={handleReanalyze}
          loading={loading}
        />
      )}

      {step === 'config' && (
        <NichoConfig
          formato={formato}
          onFormatoChange={setFormato}
          onContinue={handleConfigContinue}
          onBack={() => setStep('analysis')}
          loading={loading}
        />
      )}

      {step === 'talking_object' && (
        <TalkingObjectSelector
          nicho={project?.nicho ?? ''}
          objects={talkingObjects}
          selected={selectedObject}
          onSelect={setSelectedObject}
          onContinue={handleObjectContinue}
          onBack={() => setStep('config')}
          loading={loading}
        />
      )}

      {step === 'images' && project && (
        <ImageGallery
          project={project}
          onGenerateImages={handleGenerateImages}
          onContinue={() => setStep('package')}
          onBack={() => setStep('talking_object')}
          loading={loading}
        />
      )}

      {step === 'package' && project && (
        <PackagePreview
          project={project}
          onGeneratePackage={handleGeneratePackage}
          onBack={() => setStep('images')}
          onFinish={handleFinish}
          loading={loading}
        />
      )}

      {step === 'delivery' && project && (
        <DeliveryScreen
          project={project}
          onNewProject={handleNewProject}
        />
      )}
    </div>
  )
}
