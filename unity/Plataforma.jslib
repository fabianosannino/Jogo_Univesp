// Vai no projeto Unity em: Assets/Plugins/WebGL/Plataforma.jslib
//
// Liga o jogo (build WebGL) a plataforma. O C# chama PlataformaFaseConcluida
// pelo Plataforma.cs; este codigo roda no navegador, dentro do <iframe> de
// jogar.html, e repassa o aviso para a pagina de fora (window.parent), onde
// js/jogar.js grava o progresso.
//
// Se o jogo for aberto fora da plataforma (a build sozinha, para testar), nao
// ha quem receba o aviso: ele so aparece no console e o jogo segue normal.
mergeInto(LibraryManager.library, {
  PlataformaFaseConcluida: function (codigoPtr) {
    var codigo = UTF8ToString(codigoPtr);
    try {
      var alvo = window.parent && window.parent !== window
        ? window.parent.PlataformaJogo
        : window.PlataformaJogo;
      if (alvo && typeof alvo.faseConcluida === 'function') {
        alvo.faseConcluida(codigo);
      } else {
        console.log('[Plataforma] fase concluida (fora da plataforma): ' + codigo);
      }
    } catch (e) {
      // Pagina de outro endereco: o navegador bloqueia o acesso ao parent.
      // O jogo nunca pode travar por causa disso.
      console.warn('[Plataforma] nao foi possivel avisar a plataforma', e);
    }
  }
});
