// import { remote, ipcRenderer } from "electron";
// const BrowserWindow = remote.BrowserWindow;
// import path from "path";
// import url from "url";

import bwipjs from "bwip-js";
import Jimp from "jimp";
import printer from "printer";

import barcodeScanner from "../helpers/barcodeScanner";

import * as spreadsheet from "../spreadsheet/spreadsheet";

import AppPage from "./AppPage";


class LookupPage extends AppPage {
  constructor(data) {
    super(data);

    this.kbeData = [];
    this.kbeBlock = [];
    this.isCapturingBarcode = false;
  }

  onScanBarcodeCompleted({ internalPN, locationID, manufacturerPN }) {
    if (manufacturerPN) {
      this.Elements.type.value = this.Elements.typeMPN.value;
      this.Elements.value.value = manufacturerPN;
    } else if (internalPN) {
      this.Elements.type.value = this.Elements.typePN.value;
      this.Elements.value.value = internalPN;
    } else if (locationID) {
      this.Elements.type.value = this.Elements.typeLocID.value;
      this.Elements.value.value = locationID;
    }

    this.Elements.type._updateButton();
    this.updateValueHint();
  }

  updateValueHint() {
    let val = this.Elements.type.value;
    if (val === this.Elements.typeMPN.value) {
      this.Elements.valueHint.innerHTML = "manufacturer p/n";
    } else if (val === this.Elements.typePN.value) {
      this.Elements.valueHint.innerHTML = "12-3456";
    } else if (val === this.Elements.typeLocID.value) {
      this.Elements.valueHint.innerHTML = "U1S1P1";
    }
  }

  clearFormFields() {
    this.Elements.type.value = this.Elements.typePN.value;
    this.Elements.type._updateButton();

    this.Elements.value.value = "";
    this.updateValueHint();
  }

  onBtnClearClicked() {
    this.clearFormFields();
  }

  appendLookupResultsForLocation(locID, results) {
    let idSuffixResult = (locID) ? `-${locID}` : "-unknown";

    let resultsLocID = this.Elements.resultsLocID.cloneNode(true);
    resultsLocID.id += idSuffixResult;
    resultsLocID.style.display = "block";
    this.Elements.resultsListLocation.appendChild(resultsLocID);

    let resultsHeaderLocID = resultsLocID.querySelector("#lookup-resultsHeaderLocID");
    resultsHeaderLocID.id += idSuffixResult;
    resultsHeaderLocID.innerHTML = (locID) ? `Location: ${locID}` : "No Location Set";

    let locationResults = spreadsheet.findInventoryItemsByLocation(locID);
    if (locationResults) {
      let btnResultsPrintLocID = resultsLocID.querySelector("#lookup-btnResultsPrintLocID");
      btnResultsPrintLocID.id += idSuffixResult;
      if (locID) {
        btnResultsPrintLocID.addEventListener("click",  () => {
          let barcodeData = {
            data: "LOC-" + locID,
            text: "LOC: " + locID
          };
          this.onBtnResultsPrintClicked(barcodeData);
        });
      } else {
        btnResultsPrintLocID.style.display = "none";
      }

      let lookupResultsLocID = resultsLocID.querySelector("#lookup-lookupResultsLocID");
      lookupResultsLocID.id += idSuffixResult;

      this.appendOutputDiv(lookupResultsLocID, `Items at this Location: ${locationResults.length}`);
      if (locationResults.length != results.length) {
        this.appendOutputDiv(lookupResultsLocID, `${results.length} item${(results.length == 1) ? "" : "s"} displayed`);
      } else if (locationResults.length > 0) {
        this.appendOutputDiv(lookupResultsLocID, "Displaying all items");
      }
    }

    //
    let resultsListPN = this.Elements.resultsListPN.cloneNode(true);
    resultsListPN.id += idSuffixResult;
    resultsListPN.style.display = "flex";
    this.Elements.resultsListLocation.appendChild(resultsListPN);

    for (let subResultIdx=0; subResultIdx<results.length; subResultIdx++) {
      let {rowIdx, item} = results[subResultIdx];

      let idSuffixSubResult = `${idSuffixResult}_${subResultIdx}`;

      let resultsPN = this.Elements.resultsPN.cloneNode(true);
      resultsPN.id += idSuffixSubResult;
      resultsPN.style.display = "block";

      let resultsHeaderPN = resultsPN.querySelector("#lookup-resultsHeaderPN");
      resultsHeaderPN.id += idSuffixSubResult;
      resultsHeaderPN.innerHTML = `Part Number: ${item["Part Number"]}`;

      let btnResultsPrintPN = resultsPN.querySelector("#lookup-btnResultsPrintPN");
      btnResultsPrintPN.id += idSuffixSubResult;
      btnResultsPrintPN.addEventListener("click",  () => {
        let val = item["Part Number"];
        let barcodeData = {
          data: "IPN-" + val,
          text: "IPN: " + val
        };
        this.onBtnResultsPrintClicked(barcodeData);
      });

      let lookupResultsPN = resultsPN.querySelector("#lookup-lookupResultsPN");
      lookupResultsPN.id += idSuffixSubResult;
      this.appendOutputDiv(lookupResultsPN, `Inventory #: ${rowIdx}`);
      this.appendOutputDiv(lookupResultsPN, `Mfr Part Number: ${item["Manufacturer Part Number"]}`);
      this.appendOutputDiv(lookupResultsPN, `Manufactuer: ${item["Manufacturer"]}`);
      this.appendOutputDiv(lookupResultsPN, `Quantity: ${item["Quantity"]}`);
      this.appendOutputDiv(lookupResultsPN, `Description: ${item["Description"]}`);

      resultsListPN.appendChild(resultsPN);
    }
  }

  appendOutputDiv(parent, str) {
    let el = document.createElement("div");
    el.innerHTML = str;

    parent.appendChild(el);
  }

  displayLookupResults(results) {
    let groups = this.coalateItemsByLocation(results);
    for (let [locID, items] of groups) {
      this.appendLookupResultsForLocation(locID, items);
    }
  }

  coalateItemsByLocation(results) {
    let groups = new Map();
    for (let result of results) {
      let locID = result.item["Location"].toUpperCase();

      let group = groups.get(locID);
      if (!group) {
        group = [];
        groups.set(locID, group);
      }

      group.push(result);
    }

    return groups;
  }

  clearResults() {
    this.Elements.results.style.display = "none";

    this.rawBarcodeDataLocID = null;
    this.rawBarcodeDataPN = null;

    let el = this.Elements.resultsListLocation;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  onBtnLookupClicked() {
    let val = this.Elements.value.value;
    if ((val == null) || (val.length == 0)) {
      return;
    }
    val = val.toUpperCase();

    let isMPN = this.Elements.typeMPN.toggled;
    let isIPN = this.Elements.typePN.toggled;
    // let isLocID = this.Elements.typeLocID.toggled;

    this.clearResults();

    if (isMPN) {
      // Manufacturer P/N
      let result = spreadsheet.findInventoryItemByMPN(val);
      if (!result) {
        this.Elements.notification.innerHTML = `Nothing found for manufacturer p/n '${val}'.`;
        this.Elements.notification.opened = true;
        return;
      }

      let results = [ result ];
      this.displayLookupResults(results);

      this.hidePage();
      this.Elements.results.style.display = "flex";
    } else if (isIPN) {
      // Internal P/N
      let results = spreadsheet.findInventoryItemsByPN(val);
      if (!results || !results.length) {
        this.Elements.notification.innerHTML = `Nothing found for internal p/n '${val}'.`;
        this.Elements.notification.opened = true;
        return;
      }

      this.displayLookupResults(results);

      this.hidePage();
      this.Elements.results.style.display = "flex";
    } else {
      // Location ID
      let results = spreadsheet.findInventoryItemsByLocation(val);
      if (!results || !results.length) {
        this.Elements.notification.innerHTML = `Nothing found for location '${val}'.`;
        this.Elements.notification.opened = true;
        return;
      }

      this.displayLookupResults(results);

      this.hidePage();
      this.Elements.results.style.display = "flex";
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
    });
  }

  onBtnResultsBackClicked() {
    this.clearResults();

    this.showPage();
  }

  onInitialize(appState) {
    super.onInitialize(appState);

    this.Elements = {};
    let elementNames = [
      "notification",
      "type",
      "typeMenu",
      "typeMPN",
      "typePN",
      "typeLocID",
      "value",
      "valueHint",
      "btnClear",
      "btnLookup",
      "results",
      "resultsListLocation",
      "resultsLocID",
      "resultsHeaderLocID",
      "btnResultsPrintLocID",
      "lookupResultsLocID",
      "resultsListPN",
      "resultsPN",
      "resultsHeaderPN",
      "btnResultsPrintPN",
      "lookupResultsPN",
      "btnResultsBack"
    ];
    for (let name of elementNames) {
      this.Elements[name] = document.querySelector(`#${this.pageName}-${name}`);
    }

    this.Elements.type.addEventListener("change", (/*e*/) => {
      this.updateValueHint();
    });

    this.Elements.btnClear.addEventListener("click",  () => {
      this.onBtnClearClicked();
    });
    this.Elements.btnLookup.addEventListener("click",  () => {
      this.onBtnLookupClicked();
    });

    this.clearFormFields();
    this.clearResults();

    this.Elements.results.style.display = "none";
    this.Elements.btnResultsBack.addEventListener("click",  () => {
      this.onBtnResultsBackClicked();
    });
  }

  onEnter() {
    super.onEnter();

    this.onCaptureEndHandle = barcodeScanner.addListener("onCaptureEnd", (barcodeData) => {
      this.onScanBarcodeCompleted(barcodeData);
    });
  }

  onExit() {
    super.onExit();

    barcodeScanner.removeListener("onCaptureEnd", this.onCaptureEndHandle);

    this.clearResults();
  }
}

export default LookupPage;
