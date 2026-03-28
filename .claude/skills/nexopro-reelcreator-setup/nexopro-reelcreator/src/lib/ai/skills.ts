import fs from 'fs'
import path from 'path'

/**
 * Carrega as skills do diretório .claude/skills/ como strings
 * para uso como system prompts nas chamadas à API Anthropic.
 *
 * Uso:
 *   const prompt = loadSkill('instagram-viral-engine')
 *   // passa como system prompt na chamada Claude API
 */

const SKILLS_DIR = path.join(process.cwd(), '.claude', 'skills')

export type SkillName = 'instagram-viral-engine' | 'reel-content-generator'

// Cache em memória para evitar leitura de disco repetida
const skillCache: Record<string, string> = {}

export function loadSkill(name: SkillName): string {
  if (skillCache[name]) return skillCache[name]

  const filePath = path.join(SKILLS_DIR, `${name}.md`)

  if (!fs.existsSync(filePath)) {
    throw new Error(`Skill não encontrada: ${name} (${filePath})`)
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  skillCache[name] = content
  return content
}

/**
 * Combina múltiplas skills em um único system prompt.
 * Útil quando uma rota precisa das duas skills ao mesmo tempo.
 */
export function combineSkills(names: SkillName[]): string {
  return names
    .map((name) => loadSkill(name))
    .join('\n\n---\n\n')
}

// Skills pré-carregadas para uso direto
export const instagramViralEngine = () => loadSkill('instagram-viral-engine')
export const reelContentGenerator = () => loadSkill('reel-content-generator')
export const allSkills = () => combineSkills(['instagram-viral-engine', 'reel-content-generator'])
