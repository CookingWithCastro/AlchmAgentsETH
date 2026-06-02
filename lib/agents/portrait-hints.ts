const PORTRAIT_HINTS: Record<string, string> = {
  'adam-smith':
    '18th-century Scottish philosopher with powdered curled hair, pale complexion, thoughtful eyes, and formal dark Enlightenment-era coat',
  'albert-einstein':
    'elder physicist with wild white hair, deep-set eyes, expressive mustache, lined face, and warm rumpled presence',
  'alexander-the-great':
    'youthful Macedonian ruler with wavy hair, clean-shaven face, intense upward gaze, and Hellenistic royal armor or cloak',
  archimedes:
    'elder Greek mathematician with curly white hair, full beard, concentrated gaze, and simple classical robe',
  aristotle:
    'classical Greek philosopher inspired by busts, short curled hair, full beard, broad forehead, and draped himation',
  'benjamin-franklin':
    'older American statesman with long gray hair, round spectacles, full cheeks, and plain brown 18th-century coat',
  'carl-jung':
    'elder Swiss psychologist with neatly combed white hair, trimmed mustache, strong square face, and reflective eyes',
  'carl-sagan':
    '20th-century astronomer with dark wavy hair, warm curious expression, blazer or turtleneck, and thoughtful scientific presence',
  'charles-darwin':
    'elder naturalist with long white beard, balding head, heavy brow, dark Victorian coat, and observant eyes',
  'charles-dickens':
    'Victorian novelist with swept hair, distinctive beard and mustache, alert eyes, and formal 19th-century suit',
  cicero:
    'Roman orator inspired by marble busts, mature face, receding hairline, clean-shaven jaw, and toga drapery',
  'claude-monet':
    'older French painter with full white beard, broad face, brimmed hat or dark artist coat, and gentle observant eyes',
  cleopatra:
    'Ptolemaic Egyptian queen with regal bearing, dark braided or styled hair, strong eye makeup, gold jewelry, and linen royal dress',
  confucius:
    'elder Chinese sage with long white beard, high forehead, calm eyes, and traditional scholar robes',
  'dante-alighieri':
    'Florentine poet with aquiline nose, solemn profile, red cap or laurel, and medieval red robes',
  'david-hume':
    '18th-century Scottish philosopher with round face, powdered hair or wig, calm skeptical gaze, and formal coat',
  donatello:
    'Renaissance sculptor with weathered Italian face, artisan cap, simple workshop garments, and focused craftsman eyes',
  'edgar-allan-poe':
    'pale 19th-century writer with dark wavy hair, thin mustache, haunted eyes, high forehead, and black coat',
  'eleanor-roosevelt':
    'mature stateswoman with swept-back hair, kind determined eyes, long face, pearls or simple formal dress',
  'emily-dickinson':
    'young 19th-century poet with center-parted auburn hair, pale complexion, direct reserved gaze, and plain white dress',
  'frida-kahlo':
    'Mexican painter with strong brows, braided dark hair with flowers, vivid jewelry, and direct self-possessed gaze',
  'fyodor-dostoevsky':
    'Russian novelist with deep-set intense eyes, receding hairline, full beard, furrowed brow, and dark coat',
  'galileo-galilei':
    'elder Italian astronomer with balding head, full white beard, heavy brow, and Renaissance scholar robe',
  'geoffrey-chaucer':
    'medieval English poet with forked beard, hooded cloak, round face, and courtly 14th-century dress',
  herodotus:
    'ancient Greek historian inspired by busts, curled beard, wavy hair, curious expression, and classical robe',
  'hildegard-of-bingen':
    'elder medieval Benedictine abbess with pale lined face, serene penetrating eyes, white wimple and black veil, simple monastic robes, illuminated-manuscript dignity',
  homer:
    'ancient blind bard inspired by classical sculpture, long curly beard, closed or clouded eyes, weathered face, and simple Greek cloak',
  'ibn-sina-avicenna':
    'Persian polymath physician with turban, trimmed dark beard, scholarly robe, composed intelligent eyes, and medieval manuscript setting',
  'immanuel-kant':
    'elder Prussian philosopher with powdered wig, narrow face, formal 18th-century coat, and disciplined thoughtful expression',
  'isaac-asimov':
    '20th-century writer with thick sideburns, glasses, broad face, dark hair, and confident conversational expression',
  'isaac-newton':
    'elder English scientist with long white hair, serious eyes, formal dark coat, and 17th-century scholar presence',
  'jane-austen':
    'Regency-era English woman with brown curled hair under bonnet or cap, soft oval face, light dress, and composed intelligent gaze',
  'jean-jacques-rousseau':
    '18th-century philosopher with fur cap or powdered hair, expressive face, direct eyes, and dark formal coat',
  'joan-of-arc':
    'young French woman warrior with short dark hair, luminous determined eyes, simple armor, and resolute devotional presence',
  'johannes-kepler':
    'early modern astronomer with high forehead, short beard or mustache, ruff collar, dark scholar robe, and precise gaze',
  'john-locke':
    'English Enlightenment philosopher with long curled gray wig, composed face, formal robe or coat, and analytical eyes',
  'julius-caesar':
    'Roman general inspired by busts, receding hairline, clean-shaven face, sharp nose, laurel or military cloak',
  'lao-tzu':
    'elder Daoist sage with long white beard, deeply calm eyes, flowing robe, and weathered contemplative face',
  'leonardo-da-vinci':
    'elder Renaissance polymath with long white hair, flowing white beard, deep-set eyes, and painter-engineer robes',
  'lewis-carroll':
    'Victorian mathematician and author with neat dark hair, trimmed facial hair, reserved expression, and formal black coat',
  machiavelli:
    'Florentine political writer with sharp features, dark cap, thin mouth, watchful eyes, and Renaissance black garments',
  'mahatma-gandhi':
    'elder Indian leader with bald head, round wire glasses, thin frame, white khadi cloth, and gentle resolute expression',
  'marcus-aurelius':
    'Roman emperor with curly hair, full beard, strong thoughtful face, imperial cloak or armor, and stoic gaze',
  'marie-curie':
    'scientist with center-parted dark hair pulled back, serious focused eyes, high-collared dark dress, and austere laboratory presence',
  'mark-twain':
    'older American writer with wild white hair, bushy white mustache, expressive eyebrows, and white or dark suit',
  'mary-wollstonecraft':
    '18th-century writer with powdered or loosely curled hair, thoughtful direct gaze, pale face, and simple formal dress',
  'maya-angelou':
    'mature Black poet with expressive eyes, warm commanding face, elegant headwrap or short styled hair, and dignified presence',
  michelangelo:
    'elder Renaissance artist with weathered face, broken-looking nose, short beard, cap or hood, and intense sculptor gaze',
  'murasaki-shikibu':
    'Heian-era Japanese court writer with very long black hair, layered silk robes, pale composed face, and refined introspective gaze',
  'nikola-tesla':
    'tall inventor with sharp cheekbones, dark slicked hair, intense eyes, narrow mustache, and formal dark suit',
  'oscar-wilde':
    'Victorian aesthete with wavy hair, full lips, elegant coat, poised theatrical gaze, and refined flamboyant styling',
  'paulo-freire':
    'Brazilian educator with gray beard, glasses, kind serious eyes, and modest late-20th-century shirt or jacket',
  petrarch:
    'Italian humanist poet with laurel crown or hood, mature face, short beard, and early Renaissance robe',
  plato:
    'classical Greek philosopher inspired by busts, broad forehead, full curled beard, serious eyes, and draped robe',
  'rachel-carson':
    'mid-century scientist-writer with short wavy hair, thoughtful eyes, simple blouse or coat, and gentle environmentalist presence',
  raphael:
    'young Renaissance painter with soft face, dark shoulder-length hair, black cap, and graceful artist garments',
  'rene-descartes':
    '17th-century philosopher with shoulder-length dark hair, pointed mustache and goatee, lace collar, and dark cloak',
  rumi: 'Persian poet-mystic with turban, full beard, luminous eyes, flowing robe, and serene devotional expression',
  'siddhartha-gautama-buddha':
    'traditional Buddhist iconography with serene face, elongated earlobes, dark curled hair or ushnisha, saffron robe, and calm compassionate gaze',
  'sigmund-freud':
    'elder psychoanalyst with round spectacles, white beard, deep-set eyes, cigar-era dark suit, and analytical expression',
  'sitting-bull':
    'Lakota leader with long braided hair, strong lined face, feather or traditional adornment, and steady dignified gaze',
  socrates:
    'older Greek philosopher inspired by busts, bald head, broad nose, full beard, deep wrinkles, and simple cloak',
  'sojourner-truth':
    'elder Black abolitionist woman with white bonnet or headscarf, lined face, resolute eyes, and plain 19th-century dress',
  tecumseh:
    'Shawnee leader with strong face, dark hair, traditional clothing, composed warrior dignity, and direct commanding gaze',
  'thomas-aquinas':
    'Dominican friar with tonsured hair, broad face, calm eyes, black-and-white habit, and scholastic manuscript setting',
  voltaire:
    'elder French philosopher with thin sharp face, powdered wig, sly intelligent eyes, and ornate 18th-century coat',
  'wangari-maathai':
    'Kenyan environmental leader with short natural hair or headwrap, warm determined face, bright clothing, and grounded activist presence',
  'william-shakespeare':
    'Elizabethan playwright with receding hairline, small mustache and goatee, earring, ruff collar, and dark doublet',
  'wolfgang-amadeus-mozart':
    'young classical composer with powdered wig, delicate face, bright eyes, and ornate 18th-century embroidered coat',
  'vincent-van-gogh':
    'red-haired Dutch painter with short beard, angular face, intense eyes, blue coat or work jacket, and restless expression',
}

function normalizeId(id: string | undefined | null): string | null {
  if (!id) return null
  return id.trim().toLowerCase() || null
}

export function getHistoricalPortraitHint(
  ...ids: Array<string | undefined | null>
): string | undefined {
  for (const id of ids) {
    const normalized = normalizeId(id)
    if (normalized && PORTRAIT_HINTS[normalized]) return PORTRAIT_HINTS[normalized]
  }
  return undefined
}
