const tamano = 400;
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const otrocanvas = document.getElementById("otrocanvas");
const ctx = canvas.getContext("2d");
let currentStream = null;
let facingMode = "user";
let modelo = null;

// Cargar modelo
(async () => {
  console.log("Cargando modelo...");
  modelo = await tf.loadLayersModel("assets/model.json");
  console.log("Modelo cargado");
})();

window.onload = () => mostrarCamara();

const mostrarCamara = () => {
  const opciones = { audio: false, video: { width: tamano, height: tamano } };
  navigator.mediaDevices
    .getUserMedia(opciones)
    .then((stream) => {
      currentStream = stream;
      video.srcObject = currentStream;
      procesarCamara();
      predecir();
    })
    .catch((err) => alert("No se pudo utilizar la cámara: " + err));
};

const cambiarCamara = () => {
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
  }
  facingMode = facingMode === "user" ? "environment" : "user";
  mostrarCamara();
};

document.getElementById("cambiar-camara").onclick = cambiarCamara;

const procesarCamara = () => {
  ctx.drawImage(video, 0, 0, tamano, tamano);
  setTimeout(procesarCamara, 20);
};

const predecir = () => {
  if (modelo) {
    resample_single(canvas, 100, 100, otrocanvas);
    const ctx2 = otrocanvas.getContext("2d");
    const imgData = ctx2.getImageData(0, 0, 100, 100);

    const arr = [];
    let arr100 = [];
    for (let p = 0; p < imgData.data.length; p += 4) {
      const gris = (imgData.data[p] + imgData.data[p + 1] + imgData.data[p + 2]) / (255 * 3);
      arr100.push([gris]);
      if (arr100.length === 100) {
        arr.push(arr100);
        arr100 = [];
      }
    }

    const tensor = tf.tensor4d([arr]);
    const resultado = modelo.predict(tensor).dataSync()[0];
    const respuesta = resultado <= 0.5 ? "Gato" : "Perro";
    document.getElementById("resultado").innerHTML = respuesta;
  }
  setTimeout(predecir, 150);
};

// Función de redimensión Hermite
const resample_single = (canvas, width, height, resize_canvas) => {
  const ctx = canvas.getContext("2d");
  const ctx2 = resize_canvas.getContext("2d");
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const img2 = ctx2.createImageData(width, height);
  // Código de redimensión...
};
