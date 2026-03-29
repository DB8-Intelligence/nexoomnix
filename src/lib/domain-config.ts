import type { NicheSlug } from './niche-config'

export interface DomainConfig {
  niche: NicheSlug
  /** Path of the landing page for this domain */
  landingPath: string
  /** Product name shown in the landing */
  productName: string
}

/** Maps hostname (without port) to a domain config */
export const DOMAIN_MAP: Record<string, DomainConfig> = {
  'imobpro.app':           { niche: 'imoveis',    landingPath: '/imobpro',       productName: 'iMobPro' },
  'salaopro.app':          { niche: 'beleza',      landingPath: '/salaopro',      productName: 'Salão Pro' },
  'reelcreator.app':       { niche: 'fotografia',  landingPath: '/reelcreator',   productName: 'Omnix Reels' },
  // Preview / staging aliases
  'www.imobpro.app':       { niche: 'imoveis',    landingPath: '/imobpro',       productName: 'iMobPro' },
  'www.salaopro.app':      { niche: 'beleza',      landingPath: '/salaopro',      productName: 'Salão Pro' },
  'www.reelcreator.app':   { niche: 'fotografia',  landingPath: '/reelcreator',   productName: 'Omnix Reels' },
}

/** Returns true if the hostname is the ReelCreator standalone product */
export function isReelCreatorDomain(hostname: string): boolean {
  const host = hostname.split(':')[0]
  return host === 'reelcreator.app' || host === 'www.reelcreator.app'
}

/** Cookie name used to signal the ReelCreator standalone mode in the dashboard */
export const PRODUCT_MODE_COOKIE = 'x-nexoomnix-product-mode'

/** Returns config for a given hostname, or null for the default nexoomnix.com domain */
export function getDomainConfig(hostname: string): DomainConfig | null {
  // Strip port for local dev (e.g. localhost:3000)
  const host = hostname.split(':')[0]
  return DOMAIN_MAP[host] ?? null
}

/** Cookie name used to persist detected niche across requests */
export const NICHE_COOKIE = 'x-nexoomnix-niche'
