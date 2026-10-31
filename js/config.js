// Configuracao da plataforma.
// A chave anon e publica por desenho: quem protege os dados e a Row Level
// Security do banco, nao o sigilo desta chave. A chave service_role NUNCA
// entra aqui.
export const SUPABASE_URL = 'https://mdtuldswgsgewqfnggqe.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kdHVsZHN3Z3NnZXdxZm5nZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MTY0NjgsImV4cCI6MjEwODk5MjQ2OH0.6KAGjv99WSmdex_tpGCSDXz6eJwwJsH6XgMw-FKM6Ak';

// Onde o jogo esta hospedado para download.
//
// A build nao entra no git: o limite do GitHub e 100 MB por arquivo e a pasta
// tem 334 MB. Mora como asset de Release, que nao tem esse limite e serve o
// arquivo sem exigir conta: o professor clica e baixa.
//
// A pasta publicada e 203 MB, nao 334: sairam os 130 MB de arquivos .pdb e a
// pasta BurstDebugInformation_DoNotShip, que o proprio Unity nomeia assim.
// Nada disso e lido para jogar -- so um depurador abre .pdb.
//
// Se esta string voltar a ficar vazia, a tela do aluno para de mostrar o link
// em vez de mostrar um link quebrado. Trocar de hospedagem e trocar esta linha.
export const URL_DOWNLOAD_JOGO =
  'https://github.com/fabianosannino/Jogo_Univesp/releases/download/jogo-v1.01/Jogos-Educativos-2-v1.01-windows.zip';

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
  { id: 'coelho',    rotulo: 'Coelho',    emoji: '\u{1F430}' },
  { id: 'pato',      rotulo: 'Pato',      emoji: '\u{1F986}' },
  { id: 'cavalo',    rotulo: 'Cavalo',    emoji: '\u{1F434}' },
  { id: 'porco',     rotulo: 'Porco',     emoji: '\u{1F437}' },
  { id: 'pintinho',  rotulo: 'Pintinho',  emoji: '\u{1F425}' },
  { id: 'peixe',     rotulo: 'Peixe',     emoji: '\u{1F41F}' },
  { id: 'cobra',     rotulo: 'Cobra',     emoji: '\u{1F40D}' },
  { id: 'polvo',     rotulo: 'Polvo',     emoji: '\u{1F419}' },
  { id: 'papagaio',  rotulo: 'Papagaio',  emoji: '\u{1F99C}' },
  { id: 'hamster',   rotulo: 'Hamster',   emoji: '\u{1F439}' },
  { id: 'zebra',     rotulo: 'Zebra',     emoji: '\u{1F993}' },
  { id: 'girafa',    rotulo: 'Girafa',    emoji: '\u{1F992}' },
  { id: 'vaca',      rotulo: 'Vaca',      emoji: '\u{1F404}' },
  { id: 'urso',      rotulo: 'Urso',      emoji: '\u{1F43B}' },
];

export function acharAvatar(id) {
  return AVATARES.find((a) => a.id === id) ?? null;
}
