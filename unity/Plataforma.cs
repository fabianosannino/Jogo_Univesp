// Vai no projeto Unity em: Assets/Scripts/Plataforma.cs
//
// Uma linha no fim de cada fase:
//
//     Plataforma.FaseConcluida("contar-ate-10");
//
// O mesmo codigo serve as duas versoes do jogo:
//   - WebGL (navegador): avisa a plataforma, que grava o progresso do aluno.
//   - Windows (.exe) e o Editor: nao ha plataforma para avisar; so escreve no
//     log e o jogo segue igual a hoje.
//
// O codigo da fase tem de ser exatamente um dos que estao em FASES_DO_JOGO, no
// arquivo js/config.js da plataforma: letras minusculas, numeros e hifen.
using System.Runtime.InteropServices;
using UnityEngine;

public static class Plataforma
{
#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void PlataformaFaseConcluida(string codigo);
#endif

    public static void FaseConcluida(string codigo)
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        PlataformaFaseConcluida(codigo);
#else
        Debug.Log("[Plataforma] fase concluida: " + codigo + " (so a versao WebGL avisa a plataforma)");
#endif
    }
}
