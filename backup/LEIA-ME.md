# Backup do layout original do Pedro (2026-11-06)

`layout-pedro-2026-11-06.zip` guarda, sem nenhuma alteração, os arquivos do layout do
Pedro como estavam no `main` antes da tela do aluno nova (PR #1), no commit `c7c47c6`.

| Arquivo | O que aconteceu com ele no PR #1 |
|---|---|
| `perfil.html` | apagado (página órfã com seletor de foto; ver `docs/PENDENCIAS.md`, item 6) |
| `script.js` | apagado (só servia ao `perfil.html`) |
| `avatar.jpg` | apagado (só servia ao `script.js`) |
| `Forest-Background.jpg` | apagado (fundo antigo; o fundo de estrelas ficou) |
| `style.css` | reescrito |
| `principal.html`, `login.html`, `cadastro.html` | reescritos |

As mudanças tiveram o **aval do Pedro em 2026-11-06**, com a condição de manter este
backup.

## Por que um .zip, e não os arquivos soltos

O repositório inteiro é publicado no GitHub Pages. Solto aqui, o `perfil.html` voltaria a
ser uma página que qualquer pessoa abre, com o convite para escolher foto. Foi
justamente para tirar isso do ar que ele saiu. Dentro do zip, ele não é publicado como página.

## Como recuperar

- **Um arquivo:** abrir o zip e copiar o arquivo.
- **Pelo git, sem o zip** (o histórico guarda tudo):

  ```bash
  git checkout c7c47c6 -- perfil.html
  ```

- **O site inteiro como estava:** no GitHub, abrir o commit `c7c47c6` e usar
  "Browse files", ou `git checkout c7c47c6` numa cópia local.
