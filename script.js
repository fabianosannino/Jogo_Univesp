const inputFile = document.querySelector("#picture_input");
const pictureImage = document.querySelector(".picture_image");
const pictureImageTxt = "Escolha uma imagem de perfil";
pictureImage.innerHTML = pictureImageTxt;

inputFile.addEventListener("change", function (e) {
  const inputTarget = e.target;
  const file = inputTarget.files[0];

  if (file) {
    const reader = new FileReader();

    reader.addEventListener("load", function (e) {
      const readerTarget = e.target;

      const img = document.createElement("img");
      img.src = readerTarget.result;
      img.classList.add("picture_img");

      pictureImage.innerHTML = "";
      pictureImage.appendChild(img);

      document.querySelector(".picture").style.backgroundImage = "none";
    });

    reader.readAsDataURL(file);
  } else {
    pictureImage.innerHTML = pictureImageTxt;
    document.querySelector(".picture").style.backgroundImage = "url(avatar.jpg)";
  }
});

const nomeSalvo = localStorage.getItem("usuarioNome");
const emailSalvo = localStorage.getItem("usuarioEmail");

if (nomeSalvo) {
    document.querySelector("#perfil-nome").textContent = nomeSalvo;
}

if (emailSalvo) {
    document.querySelector("#perfil-email").textContent = emailSalvo;
}