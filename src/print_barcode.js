import { ipcRenderer } from "electron";


ipcRenderer.on("setBarcodeData", (event, data) => {
  let pngImage = data.pngImage;

  let img = document.querySelector("#barcode-image");
  img.src = "data:image/png;base64," + pngImage.toString("base64");
});
