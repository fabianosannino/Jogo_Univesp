// Cria o cliente Supabase a partir da CDN, sem npm e sem empacotador.
// Este arquivo e carregado apenas pelo navegador.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

if (SUPABASE_ANON_KEY.startsWith('COLE_')) {
  throw new Error(
    'A chave anon nao foi configurada. Edite js/config.js e cole a chave ' +
    '"anon public" do painel do Supabase.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,     // a sessao do professor sobrevive ao fechar a aba
    autoRefreshToken: true,
  },
});
