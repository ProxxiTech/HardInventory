import bwipjs from "bwip-js";
import Jimp from "jimp";
import printer from "printer";

import barcodeScanner from "../helpers/barcodeScanner";

import * as spreadsheet from "../spreadsheet/spreadsheet";

import AppPage from "./AppPage";


class ScanBarcodePage extends AppPage {
  constructor(data) {
    super(data);

    this.kbeData = [];
    this.kbeBlock = [];
    this.isCapturingBarcode = false;
  }

  logAll(title, o) {
    console.log(title);
    console.log(JSON.stringify(o, null, 4));
  }

  appendOutput(parent, str) {
    let el = document.createElement("div");
    el.innerHTML = str;

    parent.appendChild(el);
  }

  createBarcode(barcodeData) {
    bwipjs.toBuffer({
      bcid:"qrcode",
      height: 30,
      width: 30,
      scale: 1,
      text: barcodeData.data,
      alttext: barcodeData.text,
      includetext: true,
      textxalign: "center",
      textxoffset: 33
    }, function (err, png) {
      if (err) {
        this.Elements.barcodeError.textContent = err;
      } else {
        this.Elements.barcodeResult.src = "data:image/png;base64," + png.toString("base64");
      }
    });
  }

  onScanBarcodeCompleted({ internalPN, /*isNewInternalPN,*/ supplierPN, locationID, manufacturerPN, manufacturer, category, description, quantity }) {
    // this.Elements.category.value = "0";

    if (internalPN) {
      // No need to validate; internalPN is only set if it's valid
      let pnPrefixEnd = internalPN.indexOf("-");
      let pnPrefix = internalPN.substring(0, pnPrefixEnd);
      let pnSuffix = internalPN.substring(pnPrefixEnd + 1);

      this.Elements.category.value = pnPrefix;
      this.Elements.pn.value = pnSuffix;
    } else if (category) {
      this.Elements.category.value = category;
    }

    if (locationID) {
      this.Elements.locID.value = locationID;
    }

    if (manufacturerPN) {
      this.Elements.mpn.value = manufacturerPN;
    } else if (supplierPN) {
      this.Elements.mpn.value = supplierPN;
    }

    if (manufacturer) {
      this.Elements.mfr.value = manufacturer;
    }

    if (description) {
      this.Elements.desc.value = description;
    }

    if ((quantity !== undefined) && (quantity !== null)) {
      this.Elements.qty.value = quantity;
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

        image.background(0xFFFFFFFF);
        image.quality(100);

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

  clearFormFields() {
    this.Elements.locID.value = "";
    this.Elements.category.value = "0";
    this.Elements.pn.value = "";
    this.Elements.mfr.value = "";
    this.Elements.mpn.value = "";
    this.Elements.desc.value = "";
    this.Elements.qty.value = "";
    this.Elements.qtyAction.value = "add";
  }

  clearResults() {
    this.Elements.results.style.display = "none";
    this.Elements.errorResults.style.display = "none";
    this.Elements.successResults.style.display = "none";

    this.rawBarcodeDataLocID = null;
    this.rawBarcodeDataPN = null;

    let el;

    el = this.Elements.errorResults;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }

    this.Elements.resultsHeaderLocID.innerHTML = "";
    this.Elements.resultsHeaderPN.innerHTML = "";

    el = this.Elements.scanBarcodeResultsLocID;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
    el = this.Elements.scanBarcodeResultsPN;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  onBtnClearClicked() {
    this.clearFormFields();
  }

  onBtnAutoPopulateClicked() {
    let mpn = this.Elements.mpn.value;
    if (mpn) {
      barcodeScanner.parseManufacturerPartNumber(mpn, null, (mpnResults) => {
        let {
          internalPN,
          // isNewInternalPN,
          // supplierPN,

          locationID,

          // manufacturerPN,
          manufacturer,
          // category,
          description
        } = mpnResults;

        if (locationID && !this.Elements.locID.value) {
          this.Elements.locID.value = locationID;
        }
        if (internalPN && (!this.Elements.pn.value || (this.Elements.category.value === "0"))) {
          let sepIdx = internalPN.indexOf("-");
          this.Elements.category.value = internalPN.substring(0, sepIdx);
          this.Elements.pn.value = internalPN.substring(sepIdx + 1);
        }
        if (manufacturer && !this.Elements.mfr.value) {
          this.Elements.mfr.value = manufacturer;
        }
        if (description && !this.Elements.desc.value) {
          this.Elements.desc.value = description;
        }
      });
    }
  }

  onBtnAddClicked() {
    let locID = this.Elements.locID.value.trim().toUpperCase();
    let pnPrefix = this.Elements.category.value.trim();
    let pnSuffix = this.Elements.pn.value.trim().toUpperCase();
    let pn = `${pnPrefix}-${pnSuffix}`;
    let mfr = this.Elements.mfr.value.trim();
    let mpn = this.Elements.mpn.value.trim().toUpperCase();
    let desc = this.Elements.desc.value.trim();
    let qtyStr = this.Elements.qty.value.trim();
    let qty = qtyStr ? parseInt(qtyStr, 10) : 0;
    let qtyAction = this.Elements.qtyAction.value;

    let res = spreadsheet.findInventoryItemByMPN(mpn);
    if (res) {
      // Update
      let rowIdx = res.rowIdx;
      let item = res.item;

      if (locID) {
        item["Location"] = `="${locID}"`;
      }

      if (pnSuffix) {
        item["Part Number"] = `="${pn}"`;
      }

      if (mfr) {
        item["Manufacturer"] = `="${mfr}"`;
      }

      if (desc) {
        item["Description"] = `="${desc}"`;
      }

      if (qtyAction === "add") {
        item["Quantity"] = parseInt(item["Quantity"], 10) + qty;
      } else {
        item["Quantity"] = qty;
      }

      spreadsheet.setInventoryItem(rowIdx, item, (err, rowIdx) => {
        this.displayInventoryItemResults("Inventory item updated", rowIdx);
      });
    } else {
      // Add
      spreadsheet.addInventoryItem({
        loc: `="${locID}"`,
        pn: `="${pn}"`,
        mpn: `="${mpn}"`,
        mfr: `="${mfr}"`,
        qty: qty,
        desc: `="${desc}"`
      }, (err, rowIdx) => {
        this.displayInventoryItemResults("Inventory item added", rowIdx);
      });
    }
  }

  displayInventoryItemResults(msg, rowIdx) {
    this.logAll(msg, rowIdx);

    let item = spreadsheet.getInventoryItem(rowIdx);

    let locID = item["Location"];
    let pn = item["Part Number"];
    let mpn = item["Manufacturer Part Number"];
    let mfr = item["Manufacturer"];
    let qty = parseInt(item["Quantity"], 10);
    let desc = item["Description"];

    //
    this.rawBarcodeDataLocID = {
      data: "LOC-" + locID,
      text: "LOC: " + locID
    };
    this.rawBarcodeDataPN = {
      data: "IPN-" + pn,
      text: "IPN: " + pn
    };

    this.Elements.resultsHeaderLocID.innerHTML = `Location ID: ${locID}`;
    this.appendOutput(this.Elements.scanBarcodeResultsLocID, "Location that this item will be stored.");

    this.Elements.resultsHeaderPN.innerHTML = `Part Number: ${pn}`;
    this.appendOutput(this.Elements.scanBarcodeResultsPN, `Inventory #: ${rowIdx}`);
    this.appendOutput(this.Elements.scanBarcodeResultsPN, `Mfr Part Number: ${mpn}`);
    this.appendOutput(this.Elements.scanBarcodeResultsPN, `Manufactuer: ${mfr}`);
    this.appendOutput(this.Elements.scanBarcodeResultsPN, `Quantity: ${qty}`);
    this.appendOutput(this.Elements.scanBarcodeResultsPN, `Description: ${desc}`);

    //
    this.hidePage();
    this.Elements.results.style.display = "flex";
    this.Elements.successResults.style.display = "flex";
  }

  onBtnResultsPrintLocIDClicked() {
    let barcodeData = this.rawBarcodeDataLocID;
    this.onBtnResultsPrintClicked(barcodeData);
  }

  onBtnResultsPrintPNClicked() {
    let barcodeData = this.rawBarcodeDataPN;
    this.onBtnResultsPrintClicked(barcodeData);
  }

  onBtnResultsBackClicked() {
    this.clearResults();

    this.showPage();
  }

  onInitialize(appState) {
    super.onInitialize(appState);

    this.Elements = {};
    let elementNames = [
      "locID",
      "category",
      "categoryMenu",
      "pn",
      "mfr",
      "mpn",
      "desc",
      "qty",
      "qtyAction",
      "btnClear",
      "btnAutoPopulate",
      "btnAdd",
      "results",
      "errorResults",
      "successResults",
      "resultsHeaderLocID",
      "btnResultsPrintLocID",
      "scanBarcodeResultsLocID",
      "resultsHeaderPN",
      "btnResultsPrintPN",
      "scanBarcodeResultsPN",
      "btnResultsBack"
    ];
    for (let name of elementNames) {
      this.Elements[name] = document.querySelector(`#${this.pageName}-${name}`);
    }

    this.Elements.btnClear.addEventListener("click",  () => {
      this.onBtnClearClicked();
    });
    this.Elements.btnAutoPopulate.addEventListener("click",  () => {
      this.onBtnAutoPopulateClicked();
    });
    this.Elements.btnAdd.addEventListener("click",  () => {
      this.onBtnAddClicked();
    });

    this.clearFormFields();
    this.clearResults();

    this.Elements.btnResultsPrintLocID.addEventListener("click",  () => {
      this.onBtnResultsPrintLocIDClicked();
    });
    this.Elements.btnResultsPrintPN.addEventListener("click",  () => {
      this.onBtnResultsPrintPNClicked();
    });

    this.Elements.btnResultsBack.addEventListener("click",  () => {
      this.onBtnResultsBackClicked();
    });
  }

  onDataReady() {
    super.onDataReady();

    this.updateCategoryMenu();
  }

  updateCategoryMenu() {
    let menu = this.Elements.categoryMenu;

    // Clear any existing items
    while (menu.firstChild) {
      menu.removeChild(menu.firstChild);
    }

    // Add categories that were loaded
    let count = spreadsheet.getCategoryItemCount();
    for (let catIdx=0; catIdx<count; catIdx++) {
      let catItem = spreadsheet.getCategoryItem(catIdx);

      let menuItem = document.createElement("x-menuitem");
      menuItem.value = `${catItem["Category"]}`;
      menuItem.toggled = (catIdx === 0);

      let label = document.createElement("x-label");
      label.innerHTML = `${catItem["Category"]} (${catItem["Description"]})`;

      menuItem.appendChild(label);
      menu.appendChild(menuItem);
    }

    //
    this.Elements.category._updateButton();
  }

  onEnter() {
    super.onEnter();

    this.updateCategoryMenu();

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

export default ScanBarcodePage;
