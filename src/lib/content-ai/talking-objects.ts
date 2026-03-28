export interface TalkingObject {
  id: string
  name: string
  emoji: string
  prompt: string
}

export const TALKING_OBJECTS: Record<string, TalkingObject[]> = {
  imoveis: [
    {
      id: 'house_key',
      name: 'Chave de Casa',
      emoji: '🔑',
      prompt: 'A magical golden house key character with expressive friendly face, glowing eyes, floating in warm light, photorealistic 3D render, Pixar-like quality, lip-sync ready mouth, aspect ratio 9:16',
    },
    {
      id: 'sold_sign',
      name: 'Placa VENDIDO',
      emoji: '🏠',
      prompt: 'An animated Brazilian VENDIDO real estate sign character with happy expressive face, bold red and white colors, 3D render, lip-sync ready mouth, aspect ratio 9:16',
    },
    {
      id: 'contract',
      name: 'Contrato',
      emoji: '📄',
      prompt: 'An animated official real estate contract character with reading glasses and trustworthy face, professional blue tones, 3D render, lip-sync mouth, aspect ratio 9:16',
    },
    {
      id: 'apartment_window',
      name: 'Janela com Vista',
      emoji: '🪟',
      prompt: 'A beautiful apartment window character with warm welcoming face, ocean view through glass, golden hour lighting, 3D animated style, lip-sync ready, aspect ratio 9:16',
    },
    {
      id: 'house_robot',
      name: 'Robô Corretor',
      emoji: '🤖',
      prompt: 'A friendly real estate robot character in tiny blazer, holding miniature house, metallic silver with gold accents, Pixar-style 3D, expressive lip-sync face, aspect ratio 9:16',
    },
  ],
  beleza: [
    {
      id: 'scissors',
      name: 'Tesoura Mágica',
      emoji: '✂️',
      prompt: 'An animated magical hair scissors character with sparkly personality, rainbow sheen, expressive lip-sync face, salon background, 3D Pixar render, aspect ratio 9:16',
    },
    {
      id: 'mirror',
      name: 'Espelho da Beleza',
      emoji: '🪞',
      prompt: 'A glamorous vanity mirror character, ornate gold frame, flirty expressive face, beauty salon, 3D Pixar style, lip-sync ready, aspect ratio 9:16',
    },
    {
      id: 'hair_brush',
      name: 'Escova Profissional',
      emoji: '💇',
      prompt: 'A professional hair brush character with wavy hair flowing, warm friendly face, salon context, 3D render, lip-sync mouth, aspect ratio 9:16',
    },
    {
      id: 'nail_polish',
      name: 'Esmalte Animado',
      emoji: '💅',
      prompt: 'An animated nail polish bottle character, glamorous sparkly personality, expressive face, beauty context, 3D Pixar render, lip-sync mouth, aspect ratio 9:16',
    },
    {
      id: 'hair_dryer',
      name: 'Secador Falante',
      emoji: '💨',
      prompt: 'A friendly hair dryer character blowing colorful wind, expressive animated face, salon environment, 3D render, lip-sync ready, aspect ratio 9:16',
    },
  ],
  saude: [
    {
      id: 'stethoscope',
      name: 'Estetoscópio',
      emoji: '🩺',
      prompt: 'An animated medical stethoscope character with caring face, doctor look, clinical environment, 3D render, lip-sync ready mouth, aspect ratio 9:16',
    },
    {
      id: 'medical_chart',
      name: 'Prontuário',
      emoji: '📊',
      prompt: 'An animated medical chart clipboard character, reading glasses, helpful expression, 3D medical aesthetic, lip-sync mouth, aspect ratio 9:16',
    },
    {
      id: 'tooth',
      name: 'Dente Feliz',
      emoji: '🦷',
      prompt: 'A cheerful animated tooth character with wide smile, clean white, dental clinic background, 3D Pixar style, lip-sync ready, aspect ratio 9:16',
    },
    {
      id: 'pill',
      name: 'Cápsula Saudável',
      emoji: '💊',
      prompt: 'A friendly medicine capsule character half red half white, health-focused, clean background, 3D animated, expressive lip-sync face, aspect ratio 9:16',
    },
    {
      id: 'heart',
      name: 'Coração Animado',
      emoji: '❤️',
      prompt: 'An animated healthy heart character, energetic personality, red with golden highlights, fitness context, 3D Pixar style, lip-sync face, aspect ratio 9:16',
    },
  ],
  juridico: [
    {
      id: 'law_book',
      name: 'Livro de Leis',
      emoji: '⚖️',
      prompt: 'An animated law book in burgundy leather, golden scales, wise authoritative face, 3D render, lip-sync mouth, legal setting, aspect ratio 9:16',
    },
    {
      id: 'gavel',
      name: 'Martelo do Juiz',
      emoji: '🔨',
      prompt: 'An animated judge gavel character, stern fair expression, wooden texture, courtroom background, 3D Pixar render, lip-sync face, aspect ratio 9:16',
    },
    {
      id: 'briefcase',
      name: 'Pasta do Advogado',
      emoji: '💼',
      prompt: 'A professional lawyer briefcase character with spectacles, dark leather, golden clasps, 3D render, lip-sync ready mouth, legal office, aspect ratio 9:16',
    },
    {
      id: 'shield',
      name: 'Escudo da Justiça',
      emoji: '🛡️',
      prompt: 'An animated justice shield character, protective expression, blue and gold, legal protection concept, 3D Pixar style, lip-sync face, aspect ratio 9:16',
    },
    {
      id: 'contract_legal',
      name: 'Contrato Legal',
      emoji: '📜',
      prompt: 'An animated legal contract scroll character, official seal, trustworthy face, law firm setting, 3D render, lip-sync mouth, aspect ratio 9:16',
    },
  ],
  tecnico: [
    {
      id: 'wrench',
      name: 'Chave de Fenda',
      emoji: '🔧',
      prompt: 'An animated wrench character, expert confident expression, metallic silver, workshop background, 3D render, lip-sync mouth, aspect ratio 9:16',
    },
    {
      id: 'circuit',
      name: 'Placa de Circuito',
      emoji: '💡',
      prompt: 'An animated circuit board character, bright LED eyes, tech blue color, electronics workshop, 3D Pixar style, lip-sync ready face, aspect ratio 9:16',
    },
    {
      id: 'hard_hat',
      name: 'Capacete Técnico',
      emoji: '⛑️',
      prompt: 'A friendly hard hat safety helmet character, expert look, yellow, construction setting, 3D render, expressive lip-sync face, aspect ratio 9:16',
    },
    {
      id: 'multimeter',
      name: 'Multímetro',
      emoji: '🔌',
      prompt: 'An animated multimeter character with digital display face, electrical testing tool, workshop background, 3D Pixar style, lip-sync ready, aspect ratio 9:16',
    },
    {
      id: 'gear',
      name: 'Engrenagem Mestre',
      emoji: '⚙️',
      prompt: 'An animated master gear character, mechanical expert expression, metallic with oil sheen, industrial setting, 3D render, lip-sync face, aspect ratio 9:16',
    },
  ],
  pet: [
    { id: 'paw', name: 'Patinha Amiga', emoji: '🐾', prompt: 'An animated cute dog paw character with big expressive eyes, warm brown tones, veterinary clinic background, 3D Pixar style, lip-sync ready mouth, aspect ratio 9:16' },
    { id: 'bone', name: 'Osso do Saber', emoji: '🦴', prompt: 'A friendly animated dog bone character with a wise happy face, shiny white with golden tips, pet shop background, 3D render, expressive lip-sync mouth, aspect ratio 9:16' },
    { id: 'stethoscope_pet', name: 'Estetoscópio Vet', emoji: '🩺', prompt: 'An animated veterinary stethoscope character with caring gentle expression, teal and silver, animal clinic setting, 3D Pixar style, lip-sync face, aspect ratio 9:16' },
    { id: 'pet_collar', name: 'Coleira Expert', emoji: '🏷️', prompt: 'A colorful pet collar character with tags jingling, friendly expert expression, rainbow colors, pet boutique background, 3D render, lip-sync ready, aspect ratio 9:16' },
    { id: 'food_bowl', name: 'Tigela Nutritiva', emoji: '🍖', prompt: 'An animated pet food bowl character overflowing with healthy kibble, cheerful caring face, cozy home background, 3D Pixar style, lip-sync mouth, aspect ratio 9:16' },
  ],
  educacao: [
    { id: 'book', name: 'Livro Falante', emoji: '📚', prompt: 'An animated magical open book character with glowing pages, wise friendly face with reading glasses, classroom background, 3D Pixar render, lip-sync ready mouth, aspect ratio 9:16' },
    { id: 'pencil', name: 'Lápis Criativo', emoji: '✏️', prompt: 'A cheerful animated pencil character, yellow with pink eraser, creative energetic personality, school background, 3D render, expressive lip-sync face, aspect ratio 9:16' },
    { id: 'diploma', name: 'Diploma Conquistado', emoji: '🎓', prompt: 'An animated graduation diploma character with proud accomplishment expression, gold seal and ribbon, ceremony background, 3D Pixar style, lip-sync mouth, aspect ratio 9:16' },
    { id: 'owl', name: 'Coruja do Conhecimento', emoji: '🦉', prompt: 'A wise animated owl character with professor glasses and graduation cap, warm brown plumage, library background, 3D render, expressive lip-sync face, aspect ratio 9:16' },
    { id: 'chalkboard', name: 'Quadro Interativo', emoji: '🖊️', prompt: 'An animated chalkboard character with chalk-drawn face, enthusiastic teaching expression, colorful diagrams, classroom setting, 3D Pixar style, lip-sync ready, aspect ratio 9:16' },
  ],
  nutricao: [
    { id: 'apple', name: 'Maçã Saudável', emoji: '🍎', prompt: 'An animated red apple character with healthy radiant glow, energetic happy face, nutrition clinic background, 3D Pixar style, lip-sync ready mouth, aspect ratio 9:16' },
    { id: 'scale_nut', name: 'Balança Nutritiva', emoji: '⚖️', prompt: 'An animated nutrition scale character with balanced wise expression, fruits on pans, clean clinic background, 3D render, lip-sync face, aspect ratio 9:16' },
    { id: 'salad', name: 'Tigela Colorida', emoji: '🥗', prompt: 'A vibrant animated salad bowl character overflowing with colorful vegetables, bright cheerful face, healthy kitchen background, 3D Pixar style, lip-sync mouth, aspect ratio 9:16' },
    { id: 'water_bottle', name: 'Garrafa d\'Água', emoji: '💧', prompt: 'An animated water bottle character with crystal clear personality, refreshing smile, gym or clinic background, 3D render, expressive lip-sync face, aspect ratio 9:16' },
    { id: 'vitamin', name: 'Cápsula Vitamínica', emoji: '💊', prompt: 'A friendly animated vitamin capsule character split with colorful nutrients inside, approachable face, supplement shop background, 3D Pixar style, lip-sync ready, aspect ratio 9:16' },
  ],
  engenharia: [
    { id: 'helmet', name: 'Capacete da Segurança', emoji: '⛑️', prompt: 'A friendly yellow hard hat safety helmet character with bold confident expression, construction site background, 3D render, expressive lip-sync face, aspect ratio 9:16' },
    { id: 'blueprint', name: 'Planta Baixa', emoji: '📐', prompt: 'An animated architectural blueprint character unrolling itself, technical expert face with ruler glasses, engineering office background, 3D Pixar style, lip-sync mouth, aspect ratio 9:16' },
    { id: 'level', name: 'Nível de Precisão', emoji: '📏', prompt: 'An animated spirit level character with perfectly balanced expression, professional yellow and black, construction background, 3D render, lip-sync ready face, aspect ratio 9:16' },
    { id: 'brick', name: 'Tijolo Fundamento', emoji: '🧱', prompt: 'A sturdy animated brick character with solid reliable personality, warm terracotta color, building site background, 3D Pixar style, expressive lip-sync face, aspect ratio 9:16' },
    { id: 'crane', name: 'Guindaste Mestre', emoji: '🏗️', prompt: 'A powerful animated construction crane character with commanding expert expression, metallic yellow, skyline background, 3D render, lip-sync mouth, aspect ratio 9:16' },
  ],
  fotografia: [
    { id: 'camera', name: 'Câmera Falante', emoji: '📷', prompt: 'An animated vintage camera character with single expressive lens eye, artistic personality, photography studio background, 3D Pixar render, lip-sync ready mouth, aspect ratio 9:16' },
    { id: 'lens', name: 'Lente Reveladora', emoji: '🔭', prompt: 'An animated prime lens character with sharp focused expression, crystal glass element visible, professional photo studio background, 3D render, lip-sync face, aspect ratio 9:16' },
    { id: 'polaroid', name: 'Polaroid do Momento', emoji: '🖼️', prompt: 'A nostalgic animated polaroid photo character developing in real time, warm nostalgic expression, photography studio background, 3D Pixar style, lip-sync mouth, aspect ratio 9:16' },
    { id: 'tripod', name: 'Tripé Estável', emoji: '🎥', prompt: 'A steady animated camera tripod character with three-leg personality, reliable helpful expression, outdoor photoshoot background, 3D render, expressive lip-sync face, aspect ratio 9:16' },
    { id: 'flash', name: 'Flash Iluminador', emoji: '⚡', prompt: 'An animated camera flash character radiating light and energy, bright enthusiastic expression, dark studio with dramatic lighting, 3D Pixar style, lip-sync ready mouth, aspect ratio 9:16' },
  ],
}

export function getTalkingObjectsForNiche(nicho: string): TalkingObject[] {
  return TALKING_OBJECTS[nicho] ?? TALKING_OBJECTS['tecnico']
}
