import * as spreadsheet from "../spreadsheet/spreadsheet";
import barcodeScanner from "../helpers/barcodeScanner";

import AppPage from "./AppPage";


class ScratchpadPage extends AppPage {
  constructor(data) {
    super(data);
  }

  onBtnDataMatrix() {
  }

  onBtnPDF417() {
    // if (data.startsWith("[)>06"))
  }

  updateNextResult(results) {
    if (!results || !results.length) {
      console.log("Completed 1D barcode update!");
      return;
    }

    let result = results.shift();
    let {rowIdx, item} = result;

    //
    let mpn = item["Manufacturer Part Number"];
    let pn = item["Manufacturer"];
    let quantity = parseInt(item["Quantity"], 10);

    let pnResults = barcodeScanner.parsePartNumber(pn);
    barcodeScanner.parseManufacturerPartNumber(mpn, pnResults, (mpnResults) => {
      let {
        internalPN,
        // isNewInternalPN,
        // supplierPN,

        locationID,

        manufacturerPN,
        manufacturer,
        // category,
        description,

        // quantity
      } = mpnResults; // includes pnResults, possibly modified

      let existingResult = spreadsheet.findInventoryItemByMPN(manufacturerPN);
      if (existingResult && (existingResult.rowIdx != rowIdx)) {
        let existingRowIdx = existingResult.rowIdx;
        let existingItem = existingResult.item;

        let newLocID = item["Location"] || locationID;
        let oldLocID = existingItem["Location"];
        if (!existingItem["Location"]) {
          existingItem["Location"] = newLocID;
        }
        existingItem["Part Number"] = `="${internalPN}"`;
        existingItem["Manufacturer Part Number"] = manufacturerPN;
        existingItem["Manufacturer"] = manufacturer;
        existingItem["Description"] = description;
        existingItem["Quantity"] = parseInt(existingItem["Quantity"], 10) + quantity;

        manufacturer = '=""';
        description = '=""';
        quantity = 0;

        if (oldLocID && (oldLocID !== newLocID)) {
          description = `*** MOVE TO ${existingItem["Location"]} [existing parts are there]`;
        }

        spreadsheet.setInventoryItem(existingRowIdx, existingItem, (err) => {
          if (err) {
            return console.error(err);
          }
        });
      }

      if (!item["Location"]) {
        item["Location"] = locationID;
      }
      item["Part Number"] = `="${internalPN}"`;
      item["Manufacturer Part Number"] = manufacturerPN;
      item["Manufacturer"] = manufacturer;
      item["Quantity"] = quantity;
      item["Description"] = description;

      spreadsheet.setInventoryItem(rowIdx, item, (err) => {
        if (err) {
          return console.error(err);
        }
      });
    });

    //
    setTimeout(() => {
      this.updateNextResult(results);
    }, 1000);
  }

  onBtn1D() {
    let results = spreadsheet.findInventoryItemsByCategory("0");
    this.updateNextResult(results);
  }

  onInitialize(appState) {
    super.onInitialize(appState);

    this.Elements = {};
    let elementNames = [
      "btnDataMatrix",
      "btnPDF417",
      "btn1D",
      "category",
      "pn",
      "mpn",
      "qty",
    ];
    for (let name of elementNames) {
      this.Elements[name] = document.querySelector(`#${this.pageName}-${name}`);
    }

    this.Elements.btnDataMatrix.addEventListener("click",  () => {
      this.onBtnDataMatrix();
    });
    this.Elements.btnPDF417.addEventListener("click",  () => {
      this.onBtnPDF417();
    });
    this.Elements.btn1D.addEventListener("click",  () => {
      this.onBtn1D();
    });
  }

  onDataReady() {
    super.onDataReady();
  }

  onEnter() {
    super.onEnter();
  }

  onExit() { super.onExit(); }
}

export default ScratchpadPage;
