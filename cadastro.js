const form = document.getElementById('cadastro-form');
    form.addEventListener('submit', function(event) {
        event.preventDefault(); 

        const nome = document.querySelector("#nome-input").value;
        const email = document.querySelector("#email-input").value;

        localStorage.setItem("usuarioNome", nome);
        localStorage.setItem("usuarioEmail", email);

        window.location.href = 'perfil.html';
    });