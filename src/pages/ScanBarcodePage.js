let bwipjs = require("bwip-js");

import * as spreadsheet from "../spreadsheet/spreadsheet";
import octopartLookup from "../helpers/octopartLookup";

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

  isBarcodeDataMatrix(kbeData) {
    if (kbeData.length > 8) {
      let h = kbeData[0].join("");
      if (h == "[)>*F9*06") {
        return true;
      }
    }

    return false;
  }

  processBarcodeDataMatrix(kbeData) {
    // P<internalPartNumber>
    let internalPartNumber = kbeData[1].join("");
    internalPartNumber = internalPartNumber.substring(internalPartNumber.indexOf("P") + 1);
    this.appendOutput("PN: " + internalPartNumber);

    // 1P<manufacturerPartNumber>
    let manufacturerPartNumber = kbeData[2].join("");
    manufacturerPartNumber = manufacturerPartNumber.substring(manufacturerPartNumber.indexOf("P") + 1);
    this.appendOutput("MPN: " + manufacturerPartNumber);

    // Q<quantity>
    let quantity = kbeData[8].join("");
    quantity = parseInt(quantity.substring(quantity.indexOf("Q") + 1));
    this.appendOutput("Q: " + quantity);

    //   for (let i=3; i<kbeData.length; i++) {
    //     appendOutput(kbeData[i].join(''));
    //   }

    // let barcodeData = internalPartNumber + "\u000D" + manufacturerPartNumber + "\u000D" + quantity;
    let barcodeData = {
      data: `IPN-${internalPartNumber}`,
      text: `IPN: ${internalPartNumber}`
    };
    this.createBarcode(barcodeData);

    spreadsheet.findInventoryItemByMPN(manufacturerPartNumber, (res) => {
      if (res) {
        // Update
        let rowIdx = res.rowIdx;
        let item = res.item;

        item.Quantity = parseInt(item.Quantity) + parseInt(quantity);

        // If item['Part Number'] is NOT an internal part number (e.g. a distributor PN),
        // and we have a real internal part number from this scan, update it.
        if (!spreadsheet.isInternalPartNumber(item["Part Number"]) && spreadsheet.isInternalPartNumber(internalPartNumber)) {
          item["Part Number"] = internalPartNumber;
        }

        spreadsheet.setInventoryItem(rowIdx, item, (err, rowIdx) => {
          this.logAll("Inventory item updated", rowIdx);
        });
      } else {
        // Add
        let item = {
          loc: '="A0"',
          pn: `="${internalPartNumber}"`,
          mpn: `="${manufacturerPartNumber}"`,
          mfr: '="Unknown"',
          qty: quantity,
          desc: '=""'
        };
        spreadsheet.addInventoryItem(item, (err, rowIdx) => {
          this.logAll("Inventory item added", rowIdx);

          // Lookup the MPN on Octopart
          octopartLookup(manufacturerPartNumber, (err, octopartMfr, octopartDesc) => {
            if (err) {
              console.log(err);
              return;
            }

            if (octopartMfr != null)
              item.mfr = `="${octopartMfr}"`;
            if (octopartDesc != null)
              item.desc = `="${octopartDesc}"`;

            if ((octopartMfr != null) || (octopartDesc != null)) {
              spreadsheet.setInventoryItem(rowIdx, item, (err, rowIdx) => {
                this.logAll("Item updated with Octopart data", rowIdx);
              });
            }
          });
        });
      }
    });
  }

  processBarcodeGeneric(kbeData) {
    let data = kbeData[0].join("");
    this.appendOutput("Barcode: " + data);

    this.createBarcode(data);

    spreadsheet.findInventoryItemByMPN(data, (res) => {
      if (res) {
        // Update
        let rowIdx = res.rowIdx;
        let item = res.item;

        item.Quantity = parseInt(item.Quantity) + 1;

        spreadsheet.setInventoryItem(rowIdx, item, (err, rowIdx) => {
          this.logAll("Inventory item updated", rowIdx);
        });
      } else {
        // Add
        spreadsheet.addInventoryItem({
          loc: '="A0"',
          pn: `="${data}"`,
          mpn: `="${data}"`,
          mfr: '="Unknown"',
          qty: 1,
          desc: '=""'
        }, (err, rowIdx) => {
          this.logAll("Inventory item added", rowIdx);
        });
      }
    });
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

        if (this.isBarcodeDataMatrix(this.kbeData)) {
          // Valid Data Matrix barcode
          this.processBarcodeDataMatrix(this.kbeData);
        } else {
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

  onBtnAddClicked() {
    let locID = this.Elements.locID.value.trim().toUpperCase();
    let pnPrefix = this.Elements.category.value.trim();
    let pnSuffix = this.Elements.pn.value.trim().toUpperCase();
    let pn = `${pnPrefix}-${pnSuffix}`;
    let mfr = this.Elements.mfr.value.trim();
    let mpn = this.Elements.mpn.value.trim().toUpperCase();
    let desc = this.Elements.desc.value.trim();
    let qty = parseInt(this.Elements.qty.value.trim());
    let qtyAction = this.Elements.qtyAction.value;

    let newItemIndex = 123;

    this.Elements.resultsHeaderLocID.innerHTML = `Location ID: ${locID}`;
    this.appendOutput(this.Elements.scanBarcodeResultsLocID, "Location of new inventory item.");

    this.Elements.resultsHeaderPN.innerHTML = `Part Number: ${pn}`;
    this.appendOutput(this.Elements.scanBarcodeResultsPN, `Inventory #: ${newItemIndex}`);
    this.appendOutput(this.Elements.scanBarcodeResultsPN, `Mfr Part Number: ${mpn}`);
    this.appendOutput(this.Elements.scanBarcodeResultsPN, `Manufactuer: ${mfr}`);
    this.appendOutput(this.Elements.scanBarcodeResultsPN, `Quantity: ${qtyAction} ${qty}`);
    this.appendOutput(this.Elements.scanBarcodeResultsPN, `Description: ${desc}`);

    // TODO: Read barcode

    // TODO: Create location/IPN barcode //

    // this.clearFormFields();
    this.hidePage();
    this.Elements.results.style.display = "flex";
    this.Elements.successResults.style.display = "flex";
  }

  onBtnResultsBackClicked() {
    this.clearResults();

    this.showPage();
  }

  onInitialize() {
    super.onInitialize();

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
    this.Elements.btnAdd.addEventListener("click",  () => {
      this.onBtnAddClicked();
    });

    this.clearResults();

    this.Elements.btnResultsBack.addEventListener("click",  () => {
      this.onBtnResultsBackClicked();
    });

    //
    window.addEventListener("keydown", (event) => {
      this.onKeyDown(event);
    }, true);
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
  }

  onExit() {
    super.onExit();

    this.clearResults();
  }
}

export default ScanBarcodePage;
