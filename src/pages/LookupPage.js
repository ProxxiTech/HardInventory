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
        this.Elements.type.value = this.Elements.typeLocID.value;
        this.Elements.type._updateButton();

        this.Elements.value.value = locID;
      }
    } else if (data.startsWith(prefixPN)) {
      let pn = data.substring(prefixPN.length);
      if (pn.length > 0) {
        this.Elements.type.value = this.Elements.typePN.value;
        this.Elements.type._updateButton();

        this.Elements.value.value = pn;
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
    this.Elements.type.value = this.Elements.typeLocID.value;
    this.Elements.type._updateButton();

    this.Elements.value.value = "";
  }

  onBtnClearClicked() {
    this.clearFormFields();
  }

  setOutputHeaderLocID(str) {
    this.Elements.resultsHeaderLocID.innerHTML = str;
  }

  appendOutputLocID(str) {
    let el = document.createElement("div");
    el.innerHTML = str;

    this.Elements.lookupResultsLocID.appendChild(el);
  }

  setOutputHeaderPN(str) {
    this.Elements.resultsHeaderPN.innerHTML = str;
  }

  appendOutputPN(lookupResultsPN, str) {
    let el = document.createElement("div");
    el.innerHTML = str;

    lookupResultsPN.appendChild(el);
  }

  clearResults() {
    this.Elements.results.style.display = "none";

    this.rawBarcodeDataLocID = null;
    this.rawBarcodeDataPN = null;

    this.Elements.resultsHeaderLocID.innerHTML = "";

    let el;
    el = this.Elements.lookupResultsLocID;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
    el = this.Elements.resultsListPN;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  appendLookupResultsPN(result, idx) {
    let rowIdx = result.rowIdx;
    let item = result.item;

    let el = this.Elements.resultsPN.cloneNode(true);

    let resultsHeaderPN = el.querySelector("#lookup-resultsHeaderPN");
    resultsHeaderPN.innerHTML = `Part Number: ${item["Part Number"]}`;
    resultsHeaderPN.id += idx.toString();

    let btnResultsPrintPN = el.querySelector("#lookup-btnResultsPrintPN");
    btnResultsPrintPN.addEventListener("click",  () => {
      let val = item["Part Number"];
      let barcodeData = {
        data: "IPN-" + val,
        text: "IPN: " + val
      };
      this.onBtnResultsPrintClicked(barcodeData);
    });
    btnResultsPrintPN.id += idx.toString();

    let lookupResultsPN = el.querySelector("#lookup-lookupResultsPN");
    this.appendOutputPN(lookupResultsPN, `Inventory #: ${rowIdx}`);
    this.appendOutputPN(lookupResultsPN, `Mfr Part Number: ${item["Manufacturer Part Number"]}`);
    this.appendOutputPN(lookupResultsPN, `Manufactuer: ${item["Manufacturer"]}`);
    this.appendOutputPN(lookupResultsPN, `Quantity: ${item["Quantity"]}`);
    this.appendOutputPN(lookupResultsPN, `Description: ${item["Description"]}`);
    lookupResultsPN.id += idx.toString();

    el.id += idx.toString();
    this.Elements.resultsListPN.appendChild(el);

    el.style.display = "block";
    return el;
  }

  onBtnLookupClicked() {
    let val = this.Elements.value.value;
    if ((val == null) || (val.length == 0)) {
      return;
    }
    val = val.toUpperCase();

    let isLocID = this.Elements.typeLocID.toggled;

    this.clearResults();

    if (isLocID) {
      spreadsheet.findInventoryItemsByLocation(val, (results) => {
        if (results != null) {
          this.rawBarcodeDataLocID = {
            data: "LOC-" + val,
            text: "LOC: " + val
          };

          this.setOutputHeaderLocID(`Location ID: ${val}`);
          this.appendOutputLocID(`Number of Items: ${results.length}`);

          for (let i=0; i<results.length; i++) {
            let result = results[i];

            this.appendLookupResultsPN(result, i);
          }

          this.hidePage();
          this.Elements.results.style.display = "flex";
        }
      });
    } else {
      spreadsheet.findInventoryItemByPN(val, (result) => {
        if (result != null) {
          this.rawBarcodeDataPN = {
            data: "IPN-" + val,
            text: "IPN: " + val
          };

          let item = result.item;

          let locID = item["Location"];
          this.setOutputHeaderLocID(`Location ID: ${locID}`);
          this.rawBarcodeDataLocID = {
            data: "LOC-" + locID,
            text: "LOC: " + locID
          };

          spreadsheet.findInventoryItemsByLocation(locID, (results) => {
            if (results != null) {
              this.appendOutputLocID(`Number of Items: ${results.length} (displaying single item)`);
            }
          });

          this.appendLookupResultsPN(result, 0);

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

  onBtnResultsPrintLocIDClicked() {
    let barcodeData = this.rawBarcodeDataLocID;
    this.onBtnResultsPrintClicked(barcodeData);
  }

  onBtnResultsPrintClicked(barcodeData) {
    if (barcodeData == null) {
      return;
    }

    bwipjs.toBuffer({
      bcid:"qrcode",
      height: 30,
      width: 30,
      scale: 3,
      text: barcodeData.data,
      alttext: barcodeData.text,
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
    this.clearResults();

    this.showPage();
  }

  onInitialize() {
    super.onInitialize();

    this.Elements = {};
    let elementNames = [
      "type",
      "typeMenu",
      "typeLocID",
      "typePN",
      "value",
      "btnClear",
      "btnLookup",
      "results",
      "resultsHeaderLocID",
      "lookupResultsLocID",
      "btnResultsPrintLocID",
      "resultsListPN",
      "resultsPN",
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

    this.clearResults();

    this.Elements.results.style.display = "none";
    this.Elements.btnResultsPrintLocID.addEventListener("click",  () => {
      this.onBtnResultsPrintLocIDClicked();
    });
    this.Elements.btnResultsBack.addEventListener("click",  () => {
      this.onBtnResultsBackClicked();
    });

    this.Elements.type.value = this.Elements.typeLocID.value;
    this.Elements.type._updateButton();

    //
    window.addEventListener("keydown", (event) => {
      this.onKeyDown(event);
    }, true);
  }

  onEnter() { super.onEnter(); }
  onExit() {
    super.onExit();

    this.clearResults();
  }
}

export default LookupPage;
