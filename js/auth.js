// Login, cadastro e guarda de pagina do professor.
// Unica conta autenticada do sistema: nenhuma crianca tem e-mail ou senha
// (spec D2, LGPD Art. 14).

import { supabase } from './supabase.js';

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

export async function professorAtual() {
  const { data } = await supabase.auth.getUser();
  return simplificar(data?.user ?? null);
}

export async function exigirProfessor() {
  const professor = await professorAtual();
  if (!professor) {
    window.location.replace('login.html');
    throw new Error('sem sessao');
  }
  return professor;
}

function traduzir(mensagem) {
  const m = String(mensagem).toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme o e-mail antes de entrar.';
  if (m.includes('already registered')) return 'Este e-mail ja tem conta.';
  if (m.includes('password should be')) return 'A senha precisa de pelo menos 6 caracteres.';
  if (m.includes('failed to fetch')) return 'Sem conexao com a internet.';
  return mensagem;
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
