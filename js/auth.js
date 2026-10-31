// Login, cadastro e guarda de pagina do professor.
// Unica conta autenticada do sistema: nenhuma crianca tem e-mail ou senha
// (spec D2, LGPD Art. 14).

import { supabase } from './supabase.js';
import { traduzirErroAuth as traduzir } from './mensagens.js';

function simplificar(usuario) {
  return usuario ? { id: usuario.id, email: usuario.email } : null;
}

export async function entrar(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error) throw new Error(traduzir(error.message));
  return simplificar(data.user);
}

// Devolve nulo quando o projeto exige confirmacao por e-mail: a conta foi
// criada, mas ainda nao ha sessao.
export async function cadastrar(email, senha) {
  const { data, error } = await supabase.auth.signUp({ email, password: senha });
  if (error) throw new Error(traduzir(error.message));
  return data.session ? simplificar(data.user) : null;
}

export async function sair() {
  await supabase.auth.signOut();
}

// getUser() sem nenhuma sessao NAO devolve user nulo: devolve
// AuthSessionMissingError. Isso e ausencia de sessao, nao falha de verificacao,
// e sem esta distincao quem abre professor.html deslogado le "Auth session
// missing!" em ingles no lugar de ser levado para a tela de entrar.
function ausenciaDeSessao(error) {
  return (
    error.name === 'AuthSessionMissingError' ||
    String(error.message ?? '').toLowerCase().includes('auth session missing')
  );
}

export async function professorAtual() {
  const { data, error } = await supabase.auth.getUser();
  // "Nao ha sessao" e "nao consegui verificar" sao coisas diferentes. Tratar os
  // dois como ausencia de sessao expulsa um professor logado para o login quando
  // a internet da escola oscila -- e, se oscilar de novo, em laco.
  if (error) {
    if (ausenciaDeSessao(error)) return null;
    throw new Error(traduzir(error.message));
  }
  return simplificar(data?.user ?? null);
}

export async function exigirProfessor() {
  // Se professorAtual lancar, o erro passa por aqui sem redirecionar: falha de
  // verificacao nao e falta de sessao. Quem chama trata a mensagem na tela.
  const professor = await professorAtual();
  if (!professor) {
    window.location.replace('login.html');
    throw new Error('sem sessao');
  }
  return professor;
}

// --- fiacao das paginas do Pedro ---
// Um unico arquivo atende login.html e cadastro.html: cada pagina tem apenas
// um dos dois formularios, e o codigo so liga o que encontrar.

function mostrarErro(form, texto) {
  let caixa = form.querySelector('.erro-auth');
  if (!caixa) {
    caixa = document.createElement('p');
    caixa.className = 'erro-auth aviso';
    caixa.setAttribute('role', 'alert');
    form.prepend(caixa);
  }
  caixa.textContent = texto;
}

const formLogin = document.querySelector('#login-form');
if (formLogin) {
  formLogin.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const botao = formLogin.querySelector('button[type="submit"]');
    botao.disabled = true;
    try {
      await entrar(
        formLogin.querySelector('#email-input').value.trim(),
        formLogin.querySelector('#senha-input').value
      );
      window.location.href = 'professor.html';
    } catch (e) {
      mostrarErro(formLogin, e.message);
    } finally {
      botao.disabled = false;
    }
  });
}

const formCadastro = document.querySelector('#cadastro-form');
if (formCadastro) {
  formCadastro.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const senha = formCadastro.querySelector('#senha-input').value;
    const confirmacao = formCadastro.querySelector('#senha-confirma-input').value;

    if (senha !== confirmacao) {
      mostrarErro(formCadastro, 'As duas senhas nao sao iguais.');
      return;
    }

    const botao = formCadastro.querySelector('button[type="submit"]');
    botao.disabled = true;
    try {
      const professor = await cadastrar(
        formCadastro.querySelector('#email-input').value.trim(),
        senha
      );
      if (professor) {
        window.location.href = 'professor.html';
      } else {
        mostrarErro(formCadastro, 'Conta criada. Confirme o e-mail e depois entre.');
      }
    } catch (e) {
      mostrarErro(formCadastro, e.message);
    } finally {
      botao.disabled = false;
    }
  });
}
