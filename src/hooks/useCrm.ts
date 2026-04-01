'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  CrmPipeline, CrmStage, CrmDeal, CrmActivity,
  CrmMessage, CrmMessageTemplate,
  CrmType, CrmChannelType, DealPriority, CrmActivityType,
} from '@/types/database'

// ── Form data types ─────────────────────────────────────────

export interface DealFormData {
  title: string
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  contact_whatsapp: string | null
  estimated_value: number
  source_channel: CrmChannelType
  source_detail: string | null
  priority: DealPriority
  assigned_to: string | null
  expected_close_at: string | null
  client_id: string | null
  tags: string[]
  notes: string | null
  // Imobiliário
  property_id?: string | null
  interest_type?: string | null
  price_min?: number | null
  price_max?: number | null
  preferred_areas?: string[]
}

export interface StageFormData {
  name: string
  color: string
  position: number
  is_won: boolean
  is_lost: boolean
  auto_days_alert: number | null
}

// ── Hook return type ────────────────────────────────────────

interface UseCrmReturn {
  // State
  pipeline: CrmPipeline | null
  stages: CrmStage[]
  deals: CrmDeal[]
  activities: CrmActivity[]
  templates: CrmMessageTemplate[]
  loading: boolean
  error: string | null
  tenantId: string | null

  // Pipeline
  fetchPipeline: () => Promise<void>
  initializePipeline: (crmType: CrmType) => Promise<CrmPipeline | null>
  updatePipelineName: (name: string) => Promise<boolean>

  // Stages
  createStage: (data: StageFormData) => Promise<CrmStage | null>
  updateStage: (id: string, data: Partial<StageFormData>) => Promise<boolean>
  deleteStage: (id: string) => Promise<boolean>
  reorderStages: (stageIds: string[]) => Promise<boolean>

  // Deals
  createDeal: (stageId: string, data: DealFormData) => Promise<CrmDeal | null>
  updateDeal: (id: string, data: Partial<DealFormData>) => Promise<boolean>
  moveDeal: (dealId: string, toStageId: string) => Promise<boolean>
  closeDealWon: (dealId: string) => Promise<boolean>
  closeDealLost: (dealId: string, reason: string) => Promise<boolean>
  deleteDeal: (id: string) => Promise<boolean>

  // Activities
  fetchActivities: (dealId: string) => Promise<CrmActivity[]>
  addActivity: (dealId: string, type: CrmActivityType, title: string, description?: string) => Promise<boolean>

  // Channels
  addChannel: (dealId: string, channel: CrmChannelType, identifier: string, displayName?: string) => Promise<boolean>
  removeChannel: (channelId: string) => Promise<boolean>

  // Messages
  sendMessage: (dealId: string | null, clientId: string | null, channel: CrmChannelType, content: string) => Promise<boolean>
  fetchMessages: (dealId: string) => Promise<CrmMessage[]>

  // Templates
  fetchTemplates: () => Promise<void>
}

// ── Hook ────────────────────────────────────────────────────

export function useCrm(): UseCrmReturn {
  const supabase = createClient()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [pipeline, setPipeline] = useState<CrmPipeline | null>(null)
  const [stages, setStages] = useState<CrmStage[]>([])
  const [deals, setDeals] = useState<CrmDeal[]>([])
  const [activities, setActivities] = useState<CrmActivity[]>([])
  const [templates, setTemplates] = useState<CrmMessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Init: get tenant_id
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()
      if (profile) setTenantId(profile.tenant_id)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fetch pipeline + stages + deals ───────────────────────

  const fetchPipeline = useCallback(async () => {
    setLoading(true)
    setError(null)

    // Get default pipeline
    const { data: pipelines, error: pipeError } = await supabase
      .from('crm_pipelines')
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .limit(1)

    if (pipeError) {
      setError(pipeError.message)
      setLoading(false)
      return
    }

    if (!pipelines || pipelines.length === 0) {
      setPipeline(null)
      setStages([])
      setDeals([])
      setLoading(false)
      return
    }

    const currentPipeline = pipelines[0] as CrmPipeline
    setPipeline(currentPipeline)

    // Fetch stages
    const { data: stagesData } = await supabase
      .from('crm_stages')
      .select('*')
      .eq('pipeline_id', currentPipeline.id)
      .order('position')

    setStages((stagesData ?? []) as CrmStage[])

    // Fetch deals with client join
    const { data: dealsData } = await supabase
      .from('crm_deals')
      .select('*, client:clients(*)')
      .eq('pipeline_id', currentPipeline.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    setDeals((dealsData ?? []) as CrmDeal[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    if (tenantId) fetchPipeline()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  // ── Initialize pipeline (first time) ─────────────────────

  const initializePipeline = useCallback(async (crmType: CrmType): Promise<CrmPipeline | null> => {
    if (!tenantId) return null
    setLoading(true)

    const { data, error: rpcError } = await supabase.rpc('create_default_pipeline', {
      p_tenant_id: tenantId,
      p_crm_type: crmType,
    })

    if (rpcError) {
      setError(rpcError.message)
      setLoading(false)
      return null
    }

    // Update tenant_settings with chosen CRM type
    await supabase
      .from('tenant_settings')
      .update({ crm_type: crmType })
      .eq('tenant_id', tenantId)

    await fetchPipeline()
    return pipeline
  }, [supabase, tenantId, fetchPipeline, pipeline])

  const updatePipelineName = useCallback(async (name: string): Promise<boolean> => {
    if (!pipeline) return false
    const { error: updateError } = await supabase
      .from('crm_pipelines')
      .update({ name })
      .eq('id', pipeline.id)
    if (updateError) { setError(updateError.message); return false }
    setPipeline(prev => prev ? { ...prev, name } : null)
    return true
  }, [supabase, pipeline])

  // ── Stages CRUD ───────────────────────────────────────────

  const createStage = useCallback(async (data: StageFormData): Promise<CrmStage | null> => {
    if (!pipeline || !tenantId) return null
    const { data: created, error: createError } = await supabase
      .from('crm_stages')
      .insert({ ...data, pipeline_id: pipeline.id, tenant_id: tenantId })
      .select('*')
      .single()
    if (createError) { setError(createError.message); return null }
    const stage = created as CrmStage
    setStages(prev => [...prev, stage].sort((a, b) => a.position - b.position))
    return stage
  }, [supabase, pipeline, tenantId])

  const updateStage = useCallback(async (id: string, data: Partial<StageFormData>): Promise<boolean> => {
    const { error: updateError } = await supabase
      .from('crm_stages')
      .update(data)
      .eq('id', id)
    if (updateError) { setError(updateError.message); return false }
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
    return true
  }, [supabase])

  const deleteStage = useCallback(async (id: string): Promise<boolean> => {
    const { error: deleteError } = await supabase
      .from('crm_stages')
      .delete()
      .eq('id', id)
    if (deleteError) { setError(deleteError.message); return false }
    setStages(prev => prev.filter(s => s.id !== id))
    return true
  }, [supabase])

  const reorderStages = useCallback(async (stageIds: string[]): Promise<boolean> => {
    const updates = stageIds.map((id, index) =>
      supabase.from('crm_stages').update({ position: index }).eq('id', id)
    )
    await Promise.all(updates)
    setStages(prev => {
      const ordered = [...prev]
      ordered.sort((a, b) => stageIds.indexOf(a.id) - stageIds.indexOf(b.id))
      return ordered.map((s, i) => ({ ...s, position: i }))
    })
    return true
  }, [supabase])

  // ── Deals CRUD ────────────────────────────────────────────

  const createDeal = useCallback(async (stageId: string, data: DealFormData): Promise<CrmDeal | null> => {
    if (!pipeline || !tenantId) return null
    const { data: created, error: createError } = await supabase
      .from('crm_deals')
      .insert({
        ...data,
        pipeline_id: pipeline.id,
        stage_id: stageId,
        tenant_id: tenantId,
        stage_entered_at: new Date().toISOString(),
      })
      .select('*, client:clients(*)')
      .single()
    if (createError) { setError(createError.message); return null }
    const deal = created as CrmDeal
    setDeals(prev => [deal, ...prev])

    // Auto-create channels from contact info
    if (data.contact_whatsapp) {
      await supabase.from('crm_deal_channels').insert({
        deal_id: deal.id, tenant_id: tenantId,
        channel: 'whatsapp' as CrmChannelType, identifier: data.contact_whatsapp, is_primary: true,
      })
    }

    // Add creation activity
    await supabase.from('crm_activities').insert({
      deal_id: deal.id, tenant_id: tenantId, user_id: userId,
      type: 'system', title: 'Deal criado',
      description: `Novo deal "${data.title}" adicionado ao pipeline`,
    })

    return deal
  }, [supabase, pipeline, tenantId, userId])

  const updateDeal = useCallback(async (id: string, data: Partial<DealFormData>): Promise<boolean> => {
    const { data: updated, error: updateError } = await supabase
      .from('crm_deals')
      .update(data)
      .eq('id', id)
      .select('*, client:clients(*)')
      .single()
    if (updateError) { setError(updateError.message); return false }
    setDeals(prev => prev.map(d => d.id === id ? (updated as CrmDeal) : d))
    return true
  }, [supabase])

  const moveDeal = useCallback(async (dealId: string, toStageId: string): Promise<boolean> => {
    const deal = deals.find(d => d.id === dealId)
    if (!deal || !tenantId) return false

    const fromStage = stages.find(s => s.id === deal.stage_id)
    const toStage = stages.find(s => s.id === toStageId)

    const { error: moveError } = await supabase
      .from('crm_deals')
      .update({
        stage_id: toStageId,
        stage_entered_at: new Date().toISOString(),
        won_at: toStage?.is_won ? new Date().toISOString() : null,
      })
      .eq('id', dealId)

    if (moveError) { setError(moveError.message); return false }

    setDeals(prev => prev.map(d =>
      d.id === dealId ? { ...d, stage_id: toStageId, stage_entered_at: new Date().toISOString() } : d
    ))

    // Log activity
    await supabase.from('crm_activities').insert({
      deal_id: dealId, tenant_id: tenantId, user_id: userId,
      type: 'stage_change', title: `Movido de "${fromStage?.name}" para "${toStage?.name}"`,
      metadata: { from_stage_id: deal.stage_id, to_stage_id: toStageId },
    })

    return true
  }, [supabase, deals, stages, tenantId, userId])

  const closeDealWon = useCallback(async (dealId: string): Promise<boolean> => {
    const wonStage = stages.find(s => s.is_won)
    if (!wonStage) return false
    return moveDeal(dealId, wonStage.id)
  }, [stages, moveDeal])

  const closeDealLost = useCallback(async (dealId: string, reason: string): Promise<boolean> => {
    const lostStage = stages.find(s => s.is_lost)
    if (!lostStage || !tenantId) return false

    const { error: updateError } = await supabase
      .from('crm_deals')
      .update({
        stage_id: lostStage.id,
        lost_at: new Date().toISOString(),
        lost_reason: reason,
        stage_entered_at: new Date().toISOString(),
      })
      .eq('id', dealId)

    if (updateError) { setError(updateError.message); return false }

    setDeals(prev => prev.map(d =>
      d.id === dealId ? {
        ...d, stage_id: lostStage.id,
        lost_at: new Date().toISOString(), lost_reason: reason,
      } : d
    ))

    await supabase.from('crm_activities').insert({
      deal_id: dealId, tenant_id: tenantId, user_id: userId,
      type: 'deal_lost', title: 'Deal perdido',
      description: reason,
    })

    return true
  }, [supabase, stages, tenantId, userId])

  const deleteDeal = useCallback(async (id: string): Promise<boolean> => {
    const { error: deleteError } = await supabase
      .from('crm_deals')
      .update({ is_active: false })
      .eq('id', id)
    if (deleteError) { setError(deleteError.message); return false }
    setDeals(prev => prev.filter(d => d.id !== id))
    return true
  }, [supabase])

  // ── Activities ────────────────────────────────────────────

  const fetchActivities = useCallback(async (dealId: string): Promise<CrmActivity[]> => {
    const { data } = await supabase
      .from('crm_activities')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
    const result = (data ?? []) as CrmActivity[]
    setActivities(result)
    return result
  }, [supabase])

  const addActivity = useCallback(async (
    dealId: string, type: CrmActivityType, title: string, description?: string
  ): Promise<boolean> => {
    if (!tenantId) return false
    const { data: created, error: actError } = await supabase
      .from('crm_activities')
      .insert({ deal_id: dealId, tenant_id: tenantId, user_id: userId, type, title, description })
      .select('*')
      .single()
    if (actError) { setError(actError.message); return false }
    setActivities(prev => [created as CrmActivity, ...prev])
    return true
  }, [supabase, tenantId, userId])

  // ── Channels ──────────────────────────────────────────────

  const addChannel = useCallback(async (
    dealId: string, channel: CrmChannelType, identifier: string, displayName?: string
  ): Promise<boolean> => {
    if (!tenantId) return false
    const { error: chError } = await supabase
      .from('crm_deal_channels')
      .insert({ deal_id: dealId, tenant_id: tenantId, channel, identifier, display_name: displayName ?? null })
    if (chError) { setError(chError.message); return false }
    return true
  }, [supabase, tenantId])

  const removeChannel = useCallback(async (channelId: string): Promise<boolean> => {
    const { error: delError } = await supabase
      .from('crm_deal_channels')
      .delete()
      .eq('id', channelId)
    if (delError) { setError(delError.message); return false }
    return true
  }, [supabase])

  // ── Messages ──────────────────────────────────────────────

  const sendMessage = useCallback(async (
    dealId: string | null, clientId: string | null,
    channel: CrmChannelType, content: string
  ): Promise<boolean> => {
    if (!tenantId) return false

    // Save message record
    const { error: msgError } = await supabase
      .from('crm_messages')
      .insert({
        deal_id: dealId, client_id: clientId, tenant_id: tenantId,
        channel, direction: 'outbound', status: 'pending', content,
      })

    if (msgError) { setError(msgError.message); return false }

    // Log as activity if deal
    if (dealId) {
      const activityType: CrmActivityType = channel === 'whatsapp' ? 'whatsapp_sent'
        : channel === 'instagram' ? 'instagram_dm'
        : channel === 'facebook' ? 'facebook_msg' : 'note'

      await supabase.from('crm_activities').insert({
        deal_id: dealId, tenant_id: tenantId, user_id: userId,
        type: activityType,
        title: `Mensagem enviada via ${channel}`,
        description: content.substring(0, 200),
      })
    }

    return true
  }, [supabase, tenantId, userId])

  const fetchMessages = useCallback(async (dealId: string): Promise<CrmMessage[]> => {
    const { data } = await supabase
      .from('crm_messages')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: true })
    return (data ?? []) as CrmMessage[]
  }, [supabase])

  // ── Templates ─────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('crm_message_templates')
      .select('*')
      .eq('is_active', true)
      .order('name')
    setTemplates((data ?? []) as CrmMessageTemplate[])
  }, [supabase])

  return {
    pipeline, stages, deals, activities, templates,
    loading, error, tenantId,
    fetchPipeline, initializePipeline, updatePipelineName,
    createStage, updateStage, deleteStage, reorderStages,
    createDeal, updateDeal, moveDeal, closeDealWon, closeDealLost, deleteDeal,
    fetchActivities, addActivity,
    addChannel, removeChannel,
    sendMessage, fetchMessages,
    fetchTemplates,
  }
}
