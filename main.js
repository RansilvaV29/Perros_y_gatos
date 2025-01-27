const tamano = 400;
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const otrocanvas = document.getElementById("otrocanvas");
const ctx = canvas.getContext("2d");
let currentStream = null;
let facingMode = "user";
let modelo = null;

// Cargar el modelo TensorFlow.js
(async () => {
  try {
    console.log("Cargando modelo...");
    modelo = await tf.loadLayersModel("model.json");
    console.log("Modelo cargado exitosamente.");
  } catch (error) {
    console.error("Error al cargar el modelo:", error);
    alert("Hubo un problema cargando el modelo. Verifica la ruta y asegúrate de que los archivos del modelo estén accesibles.");
  }
})();

// Inicializar la cámara al cargar la página
window.onload = () => {
  mostrarCamara();
};

// Mostrar la cámara
function mostrarCamara() {
  const opciones = {
    audio: false,
    video: {
      width: tamano,
      height: tamano,
    },
  };

  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia(opciones)
      .then((stream) => {
        currentStream = stream;
        video.srcObject = stream;
        procesarCamara();
        predecir();
      })
      .catch((err) => {
        alert("No se pudo utilizar la cámara :(");
        console.error("Error al acceder a la cámara:", err);
      });
  } else {
    alert("La función getUserMedia no está disponible en este navegador.");
  }
}

// Cambiar la cámara entre frontal y trasera
function cambiarCamara() {
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
  }

  facingMode = facingMode === "user" ? "environment" : "user";

  const opciones = {
    audio: false,
    video: {
      facingMode: facingMode,
      width: tamano,
      height: tamano,
    },
  };

  navigator.mediaDevices.getUserMedia(opciones)
    .then((stream) => {
      currentStream = stream;
      video.srcObject = stream;
    })
    .catch((err) => {
      console.error("Error al cambiar la cámara:", err);
    });
}

// Procesar la imagen de la cámara
function procesarCamara() {
  ctx.drawImage(video, 0, 0, tamano, tamano, 0, 0, tamano, tamano);
  setTimeout(procesarCamara, 20);
}

// Realizar la predicción
function predecir() {
  if (modelo) {
    resampleSingle(canvas, 100, 100, otrocanvas);

    const ctx2 = otrocanvas.getContext("2d");
    const imgData = ctx2.getImageData(0, 0, 100, 100);

    const arr = [];
    let arr100 = [];

    for (let p = 0; p < imgData.data.length; p += 4) {
      const rojo = imgData.data[p] / 255;
      const verde = imgData.data[p + 1] / 255;
      const azul = imgData.data[p + 2] / 255;
      const gris = (rojo + verde + azul) / 3;

      arr100.push([gris]);
      if (arr100.length === 100) {
        arr.push(arr100);
        arr100 = [];
      }
    }

    const tensor = tf.tensor4d([arr]);
    console.log("Tensor generado:", tensor);

    try {
      const resultado = modelo.predict(tensor).dataSync();
      console.log("Resultado de la predicción:", resultado);

      const respuesta = resultado <= 0.5 ? "Gato" : "Perro";
      document.getElementById("resultado").textContent = respuesta;
    } catch (error) {
      console.error("Error durante la predicción:", error);
      alert("Ocurrió un error al hacer la predicción. Revisa la consola para más detalles.");
    }
  }

  setTimeout(predecir, 150);
}

// Redimensionar el canvas
function resampleSingle(canvas, width, height, resizeCanvas) {
  const widthSource = canvas.width;
  const heightSource = canvas.height;

  const ctx = canvas.getContext("2d");
  const ctx2 = resizeCanvas.getContext("2d");
  const img = ctx.getImageData(0, 0, widthSource, heightSource);
  const img2 = ctx2.createImageData(width, height);

  const ratioW = widthSource / width;
  const ratioH = heightSource / height;

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const x2 = (i + j * width) * 4;
      let weight = 0;
      let weights = 0;
      let gxR = 0;
      let gxG = 0;
      let gxB = 0;

      const centerY = (j + 0.5) * ratioH;
      const yyStart = Math.floor(j * ratioH);
      const yyStop = Math.ceil((j + 1) * ratioH);

      for (let yy = yyStart; yy < yyStop; yy++) {
        const centerX = (i + 0.5) * ratioW;
        const xxStart = Math.floor(i * ratioW);
        const xxStop = Math.ceil((i + 1) * ratioW);

        for (let xx = xxStart; xx < xxStop; xx++) {
          const pos = 4 * (xx + yy * widthSource);
          gxR += img.data[pos];
          gxG += img.data[pos + 1];
          gxB += img.data[pos + 2];
          weights++;
        }
      }

      img2.data[x2] = gxR / weights;
      img2.data[x2 + 1] = gxG / weights;
      img2.data[x2 + 2] = gxB / weights;
      img2.data[x2 + 3] = 255; // Alpha
    }
  }

  ctx2.putImageData(img2, 0, 0);
}
