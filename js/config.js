// Configuracao da plataforma.
// A chave anon e publica por desenho: quem protege os dados e a Row Level
// Security do banco, nao o sigilo desta chave. A chave service_role NUNCA
// entra aqui.
export const SUPABASE_URL = 'https://mdtuldswgsgewqfnggqe.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kdHVsZHN3Z3NnZXdxZm5nZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MTY0NjgsImV4cCI6MjEwODk5MjQ2OH0.6KAGjv99WSmdex_tpGCSDXz6eJwwJsH6XgMw-FKM6Ak';

// Avatares em emoji: nenhum arquivo de imagem para carregar, funciona sem
// rede, e cresce no tamanho que a tela precisar sem perder nitidez.
export const AVATARES = [
  { id: 'coruja',    rotulo: 'Coruja',    emoji: '\u{1F989}' },
  { id: 'raposa',    rotulo: 'Raposa',    emoji: '\u{1F98A}' },
  { id: 'tartaruga', rotulo: 'Tartaruga', emoji: '\u{1F422}' },
  { id: 'gato',      rotulo: 'Gato',      emoji: '\u{1F431}' },
  { id: 'cachorro',  rotulo: 'Cachorro',  emoji: '\u{1F436}' },
  { id: 'leao',      rotulo: 'Leao',      emoji: '\u{1F981}' },
  { id: 'sapo',      rotulo: 'Sapo',      emoji: '\u{1F438}' },
  { id: 'pinguim',   rotulo: 'Pinguim',   emoji: '\u{1F427}' },
  { id: 'abelha',    rotulo: 'Abelha',    emoji: '\u{1F41D}' },
  { id: 'borboleta', rotulo: 'Borboleta', emoji: '\u{1F98B}' },
  { id: 'golfinho',  rotulo: 'Golfinho',  emoji: '\u{1F42C}' },
  { id: 'elefante',  rotulo: 'Elefante',  emoji: '\u{1F418}' },
  { id: 'panda',     rotulo: 'Panda',     emoji: '\u{1F43C}' },
  { id: 'unicornio', rotulo: 'Unicornio', emoji: '\u{1F984}' },
  { id: 'caranguejo',rotulo: 'Caranguejo',emoji: '\u{1F980}' },
  { id: 'joaninha',  rotulo: 'Joaninha',  emoji: '\u{1F41E}' },
];

export function acharAvatar(id) {
  return AVATARES.find((a) => a.id === id) ?? null;
}
