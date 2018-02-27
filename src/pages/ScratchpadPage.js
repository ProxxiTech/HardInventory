import * as spreadsheet from "../spreadsheet/spreadsheet";
import barcodeScanner from "../helpers/barcodeScanner";

import AppPage from "./AppPage";


class ScratchpadPage extends AppPage {
  constructor(data) {
    super(data);
  }

  onBtnDuplicates() {
    let visited = new Map();
    for (let i=0; i<spreadsheet.getInventoryItemCount(); i++) {
      let item = spreadsheet.getInventoryItem(i);

      if (item["Location"]) {
        let items = visited.get(item["Part Number"].toUpperCase());
        if (!items) {
          items = [];
          visited.set(item["Part Number"].toUpperCase(), items);
        }

        items.push(item);
      }
    }

    for (let [ipn, pnItems] of visited) {
      if (pnItems.length > 1) {
        let locations = new Map();
        for (let item of pnItems) {
          let locItems = locations.get(item["Location"].toUpperCase());
          if (!locItems) {
            locItems = [];
            locations.set(item["Location"].toUpperCase(), locItems);
          }

          locItems.push(item);
        }

        if (locations.size > 1) {
          console.log(`Multiple locations for ${ipn}:`);
          for (let [loc, items] of locations.entries()) {
            console.log(`\t${loc}`);
            for (let item of items) {
              console.log(`\t\t${item["Manufacturer Part Number"]}`);
            }
          }
        }
      }
    }

    console.log("Done searching for duplicate locations.");
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
      "btnDuplicates",
      "btnDataMatrix",
      "btnPDF417",
      "btn1D",
      "location",
      "category",
      "pn",
      "mpn",
      "qty",
      "mfr",
      "desc",
    ];
    for (let name of elementNames) {
      this.Elements[name] = document.querySelector(`#${this.pageName}-${name}`);
    }

    this.Elements.btnDuplicates.addEventListener("click",  () => {
      this.onBtnDuplicates();
    });
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
