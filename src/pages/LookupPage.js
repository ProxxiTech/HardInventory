// import { remote, ipcRenderer } from "electron";
// const BrowserWindow = remote.BrowserWindow;
// import path from "path";
// import url from "url";

const bwipjs = require("bwip-js");
const Jimp = require("jimp");
const printer = require("printer");

import * as spreadsheet from "../spreadsheet/spreadsheet";

import AppPage from "./AppPage";


class LookupPage extends AppPage {
  constructor(data) {
    super(data);

    this.kbeData = [];
    this.kbeBlock = [];
    this.isCapturingBarcode = false;
  }

  isBarcodeDataMatrix(kbeData) {
    if (kbeData.length > 8) {
      let h = kbeData[0].join("");
      if (h == "[)>*F9*06") {
        return true;
      }
    }

    return false;
  }

  processBarcodeGeneric(kbeData) {
    let prefixLocID = "LOC-";
    let prefixPN = "IPN-";

    let data = kbeData[0].join("");
    if (data.startsWith(prefixLocID)) {
      let locID = data.substring(prefixLocID.length);
      if (locID.length > 0) {
        this.Elements.locID.value = locID;
      }
    } else if (data.startsWith(prefixPN)) {
      let pn = data.substring(prefixPN.length);
      if (pn.length > 0) {
        this.Elements.pn.value = pn;
      }
    }
  }

  onKeyDown(event) {
    if (event.preventDefaulted) {
      return; // Do nothing if event already handled
    }
    if (!this.isActive) {
      return;
    }

    if (event.key == "Clear") {
      this.kbeData = [];
      this.kbeBlock = [];
      this.isCapturingBarcode = true;

      // Show spinner
      this.displayLoadingScreen(true);
    } else {
      if (!this.isCapturingBarcode) {
        return;
      }

      if (event.key == "Enter") {
        if (this.kbeBlock.length > 0) {
          this.kbeData.push(this.kbeBlock);
        }

        if (!this.isBarcodeDataMatrix(this.kbeData)) {
          this.processBarcodeGeneric(this.kbeData);
        }
        this.kbeData = [];
        this.kbeBlock = [];
        this.isCapturingBarcode = false;

        // Hide spinner
        this.displayLoadingScreen(false);
      } else if (event.key == "Shift") {
        // Ignored
      } else {
        if (event.key == "F8") {
          this.kbeData.push(this.kbeBlock);
          this.kbeBlock = [];
        } else if (event.key == "F9") {
          this.kbeBlock.push("*" + event.key + "*");
        } else {
          this.kbeBlock.push(event.key);
        }
      }
    }

    // Consume the event so it doesn't get handled twice
    event.preventDefault();
  }

  clearFormFields() {
    this.Elements.locID.value = "";
    this.Elements.pn.value = "";
  }

  onBtnClearClicked() {
    this.clearFormFields();
  }

  appendOutput(str) {
    let el = document.createElement("span");
    el.innerHTML = str + "<br/>";

    this.Elements.lookupResult.appendChild(el);
  }

  clearOutput() {
    let el = this.Elements.lookupResult;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  onBtnLookupClicked() {
    let locID = this.Elements.locID.value;
    let pn = this.Elements.pn.value;

    this.clearOutput();

    if (locID && (locID.length > 0)) {
      spreadsheet.findInventoryItemsByLocation(locID, (results) => {
        if (results != null) {
          this.rawBarcodeData = {
            data: "LOC-" + locID,
            text: "LOC: " + locID
          };

          for (let result of results) {
            let rowIdx = result.rowIdx;
            let item = result.item;
            this.appendOutput(`Inventory #: ${rowIdx}`);
            this.appendOutput(`Location ID: ${item["Location"]}`);
            this.appendOutput(`Part Number: ${item["Part Number"]}`);
            this.appendOutput(`Mfr Part Number: ${item["Manufacturer Part Number"]}`);
            this.appendOutput(`Manufactuer: ${item["Manufacturer"]}`);
            this.appendOutput(`Quantity: ${item["Quantity"]}`);
            this.appendOutput(`Description: ${item["Description"]}`);
            this.appendOutput("&nbsp;");
          }

          this.hidePage();
          this.Elements.results.style.display = "flex";
        }
      });
    } else if (pn && (pn.length > 0)) {
      spreadsheet.findInventoryItemByPN(pn, (result) => {
        if (result != null) {
          this.rawBarcodeData = {
            data: "IPN-" + pn,
            text: "IPN: " + pn
          };

          let rowIdx = result.rowIdx;
          let item = result.item;
          this.appendOutput(`Inventory #: ${rowIdx}`);
          this.appendOutput(`Location ID: ${item["Location"]}`);
          this.appendOutput(`Part Number: ${item["Part Number"]}`);
          this.appendOutput(`Mfr Part Number: ${item["Manufacturer Part Number"]}`);
          this.appendOutput(`Manufactuer: ${item["Manufacturer"]}`);
          this.appendOutput(`Quantity: ${item["Quantity"]}`);
          this.appendOutput(`Description: ${item["Description"]}`);
          this.appendOutput("&nbsp;");

          this.hidePage();
          this.Elements.results.style.display = "flex";
        }
      });
    }
  }

  _getDefaultPrinterName() {
    let printers = printer.getPrinters();
    for (let p of printers) {
      if ((p.name.indexOf("QL_800") >= 0) || (p.name.indexOf("QL-800") >= 0)) {
        return p.name;
      }
    }
    for (let p of printers) {
      if (p.isDefault) {
        return p.name;
      }
    }

    return null;
  }

  onBtnResultsPrintClicked() {
    if (this.rawBarcodeData == null) {
      return;
    }

    bwipjs.toBuffer({
      bcid:"qrcode",
      height: 30,
      width: 30,
      scale: 3,
      text: this.rawBarcodeData.data,
      alttext: this.rawBarcodeData.text,
      includetext: true,
      textxalign: "center",
      textxoffset: 33
    }, (err, pngImage) => {
      if (err != null) {
        console.error(`Error generating barcode buffer: ${err}`);
        return;
      }

      Jimp.read(pngImage, (err, image) => {
        if (err != null) {
          console.error(`Error reading PNG buffer: ${err}`);
          return;
        }

        // console.log(`Image read as ${image.bitmap.width}x${image.bitmap.height}`);
        image.background(0xFFFFFFFF);
        image.quality(100);

        // image.write("barcode-test.png", (err) => {
        //   if (err != null) {
        //     console.error(`Error saving PNG file: ${err}`);
        //   } else {
        //     console.log("Saved PNG file");
        //   }
        // });
        // image.write("barcode-test.jpg", (err) => {
        //   if (err != null) {
        //     console.error(`Error saving JPEG file: ${err}`);
        //   } else {
        //     console.log("Saved JPEG file");
        //   }
        // });

        image.getBuffer(Jimp.MIME_JPEG, (err, jpgImage) => {
          if (err != null) {
            console.error(`Error generating JPEG buffer: ${err}`);
            return;
          }

          let printerName = this._getDefaultPrinterName();
          if (printerName != null) {
            printer.printDirect({
              data: jpgImage,
              printer: printerName,
              type: "JPEG",
              options: {
                "PageSize": "DC08",
                "PageRegion": "DC08",
                "ImageableArea": "DC08",
                "PaperDimension": "DC08",
                "BrTapeLength": "42mm",
                "BrMargin": "3.0",
                "BrResolution": "BrQuality300x300dpi",
                "BrHalftonePattern": "BrBinary",
                "BrMultiColor": "BrMultiColorMonochrome",
                "BrBiDiPrint": "ON",
                "BrAutoTapeCut": "ON",
                "BrCutAtEnd": "ON",
                "BrRemoveBlkSpace": "ON",
              },
              success: (jobID) => {
                console.log(`Printed with job id ${jobID}`);
              },
              error: (err) => {
                console.error(`Error printing: ${err}`);
              }
            });
          }
        });
      });

      // let printWindow = new BrowserWindow({
      //   width: 50,
      //   height: 50,
      //   center: true,
      //   useContentSize: true,
      //   // closable: false,
      //   resizable: false,
      //   skipTaskbar: true,
      //   show: false
      // });

      // printWindow.loadURL(
      //   url.format({
      //     pathname: path.join(__dirname, "../../print_barcode.html"),
      //     protocol: "file:",
      //     slashes: true
      //   })
      // );

      // printWindow.webContents.on("dom-ready", () => {
      //   let webContentsID = printWindow.webContents.id;
      //   ipcRenderer.send("setBarcodeData", { webContentsID, pngImage });
      // });
      
      // printWindow.webContents.on("did-finish-load", () => {
      //   let printers = printWindow.webContents.getPrinters();
      //   console.log(JSON.stringify(printers, null, 4));
        
      //   printWindow.webContents.print({ silent: true });

      //   setTimeout(() => {
      //     printWindow.destroy();
      //     printWindow = null;
      //   }, 5000);
      // });

      // printWindow.webContents.once("ready-to-show", () => {
      //   // printWindow.show();
      // });
    });
  }

  onBtnResultsBackClicked() {
    this.Elements.results.style.display = "none";
    this.showPage();

    this.clearOutput();
    this.rawBarcodeData = null;
  }

  onInitialize() {
    super.onInitialize();

    this.Elements = {};
    let elementNames = [
      "locID",
      "pn",
      "btnClear",
      "btnLookup",
      "results",
      "lookupResult",
      "btnResultsPrint",
      "btnResultsBack"
    ];
    for (let name of elementNames) {
      this.Elements[name] = document.querySelector(`#${this.pageName}-${name}`);
    }

    this.Elements.btnClear.addEventListener("click",  () => {
      this.onBtnClearClicked();
    });
    this.Elements.btnLookup.addEventListener("click",  () => {
      this.onBtnLookupClicked();
    });

    this.Elements.results.style.display = "none";
    this.Elements.btnResultsPrint.addEventListener("click",  () => {
      this.onBtnResultsPrintClicked();
    });
    this.Elements.btnResultsBack.addEventListener("click",  () => {
      this.onBtnResultsBackClicked();
    });

    this.rawBarcodeData = null;
      
    //
    window.addEventListener("keydown", (event) => {
      this.onKeyDown(event);
    }, true);
  }

  onEnter() { super.onEnter(); }
  onExit() {
    super.onExit();

    this.Elements.results.style.display = "none";
  }
}

export default LookupPage;
