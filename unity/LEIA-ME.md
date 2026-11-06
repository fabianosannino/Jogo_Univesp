# Ligar o jogo à plataforma — passo a passo para o projeto Unity

Esta pasta não é usada pelo site. Ela guarda os dois arquivos que entram no
projeto Unity do jogo para que **o mesmo projeto gere as duas versões**:

| Versão | Como a criança joga | Progresso |
|---|---|---|
| **Windows (.exe)** — a de hoje | baixa e abre no computador | a professora marca à mão |
| **Navegador (WebGL)** — nova | clica em "Jogar" na plataforma | o jogo grava sozinho cada fase concluída |

As duas continuam existindo. O `.exe` vira o plano B para computadores fracos demais para
o jogo no navegador.

## 1. Copiar os dois arquivos para o projeto

| Arquivo daqui | Para onde vai no projeto Unity |
|---|---|
| `Plataforma.jslib` | `Assets/Plugins/WebGL/Plataforma.jslib` (crie as pastas se não existirem) |
| `Plataforma.cs` | `Assets/Scripts/Plataforma.cs` (ou qualquer pasta de scripts) |

## 2. Avisar no fim de cada fase

No ponto do código em que a fase termina com sucesso, uma linha:

```csharp
Plataforma.FaseConcluida("contar-ate-10");
```

Cada fase tem um código fixo: letras minúsculas, números e hífen, sem acento nem espaço.
No `.exe` e no Editor essa linha só escreve no Console. Não muda nada no jogo de hoje.

## 3. Mandar a lista de fases

Para a plataforma, uma lista com o código e o nome de cada fase, no formato:

```
contar-ate-10        Contar até 10
reconhecer-cores     Reconhecer as cores
```

O nome é o que a professora vê na grade de progresso. A lista entra em
`FASES_DO_JOGO`, no `js/config.js`.

## 4. Gerar a versão Windows de novo (corrigida)

A build publicada hoje é uma **Development Build**: ela abre uma porta no computador
para o profiler e carrega o endereço da máquina onde foi compilada. Para corrigir:
`File > Build Profiles` (ou `Build Settings`) → Windows → **desmarcar "Development Build"**
→ Build. Mande a pasta zipada; ela vira o `jogo-v1.02` na página de Releases.

## 5. Gerar a versão WebGL

1. No **Unity Hub**: `Installs` → engrenagem da versão 6000.5.10f1 → `Add modules` →
   **WebGL Build Support** (no Unity 6 pode aparecer como **Web Build Support**).
2. `File > Build Profiles` → **Web** (ou WebGL) → `Switch Platform`.
3. **Desmarcar "Development Build".**
4. `Player Settings` → `Publishing Settings`:
   - **Compression Format: Gzip**
   - **Decompression Fallback: marcado** (sem isso o jogo não abre no GitHub Pages)
   - **Data Caching: marcado** (o navegador guarda o jogo e não baixa de novo a cada aula)
5. Template: pode ser o **Default** ou o **Minimal**.
6. Build numa pasta chamada **`jogo-web`**.

Para testar no seu computador, use **Build And Run**. Abrir o `index.html` com dois
cliques não funciona: o navegador bloqueia WebGL aberto direto do disco.

Mande a pasta `jogo-web` zipada. **Nenhum arquivo dentro dela pode passar de 100 MB**
(limite do GitHub). Se algum passar, avise antes: dá para resolver diminuindo texturas e
áudio na build.

## 6. O que acontece do lado da plataforma (não precisa fazer nada)

1. A pasta `jogo-web/` entra na raiz do repositório.
2. Em `js/config.js`: `CAMINHO_JOGO_WEB = 'jogo-web/index.html'` e a lista de fases em
   `FASES_DO_JOGO`.
3. A tela de cada criança ganha o botão **"Jogar"**. O jogo abre dentro da plataforma, e
   cada `Plataforma.FaseConcluida(...)` vira um registro de progresso com origem
   `'jogo'`, separado das marcações da professora.

Para ver isso funcionando antes da build existir, há um jogo de mentira em
`tests/jogo-falso/index.html` que chama a plataforma exatamente como o
`Plataforma.jslib` vai chamar.
