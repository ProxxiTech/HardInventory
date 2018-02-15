const bwipjs = require("bwip-js");
const Jimp = require("jimp");
const printer = require("printer");

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
    let validPN = false;
    this.Elements.category.value = "0";

    // P<internalPartNumber>
    let internalPartNumber = kbeData[1].join("");
    internalPartNumber = internalPartNumber.substring(internalPartNumber.indexOf("P") + 1);
    let pnPrefixEnd = internalPartNumber.indexOf("-");
    if (pnPrefixEnd > 0) {
      let pnPrefix = internalPartNumber.substring(0, pnPrefixEnd);
      let pnSuffix = internalPartNumber.substring(pnPrefixEnd + 1);
      if ((pnPrefix.length > 0) && (pnSuffix.length > 0)) {
        // Valid PN's are alphanumeric only
        if (pnSuffix.indexOf("-") < 0) {
          this.Elements.category.value = pnPrefix;
          this.Elements.pn.value = pnSuffix;

          validPN = true;
        }
      }
    }

    // 1P<manufacturerPartNumber>
    let manufacturerPartNumber = kbeData[2].join("");
    manufacturerPartNumber = manufacturerPartNumber.substring(manufacturerPartNumber.indexOf("P") + 1);
    this.Elements.mpn.value = manufacturerPartNumber;
    if (manufacturerPartNumber.length > 0) {
      // Lookup the MPN on Octopart
      octopartLookup(manufacturerPartNumber, (err, octopartMfr, octopartDesc, octopartCat) => {
        if (err) {
          return console.error(err);
        }

        if (octopartMfr)
          this.Elements.mfr.value = octopartMfr;
        if (octopartDesc)
          this.Elements.desc.value = octopartDesc;

        if (!validPN) {
          if (octopartCat) {
            this.Elements.category.value = octopartCat;
          }

          spreadsheet.findInventoryItemByMPN(manufacturerPartNumber, (invResults) => {
            if (invResults) {
              let invItem = invResults.item;
              let ipn = invItem["Part Number"];

              let pnPrefixEnd = ipn.indexOf("-");
              if (pnPrefixEnd > 0) {
                let pnPrefix = ipn.substring(0, pnPrefixEnd);
                let pnSuffix = ipn.substring(pnPrefixEnd + 1);
                if ((pnPrefix.length > 0) && (pnSuffix.length > 0)) {
                  // Valid PN's are alphanumeric only
                  if (pnSuffix.indexOf("-") < 0) {
                    this.Elements.category.value = pnPrefix;
                    this.Elements.pn.value = pnSuffix;

                    validPN = true;
                  }
                }
              }
            }

            if (!validPN && octopartCat) {
              // Generate a new IPN as CAT-(catMaxIPN+1)
              spreadsheet.findInventoryItemsByCategory(octopartCat, (results) => {
                let highestPN = 0;

                if (results) {
                  for (let invItem of results) {
                    let ipn = invItem.item["Part Number"];

                    if (ipn) {
                      let pnPrefixEnd = ipn.indexOf("-");
                      if (pnPrefixEnd > 0) {
                        let pnSuffix = ipn.substring(pnPrefixEnd + 1);
                        if (pnSuffix.length > 0) {
                          let pn = parseInt(pnSuffix, 10);
                          if (pn > highestPN) {
                            highestPN = pn;
                          }
                        }
                      }
                    }
                  }
                }

                this.Elements.pn.value = `${highestPN+1}`.padStart(4, "0");
              });
            }
          });
        }
      });
    }

    // Q<quantity>
    let quantityStr = kbeData[8].join("");
    quantityStr = quantityStr.substring(quantityStr.indexOf("Q") + 1);
    let quantity = quantityStr ? parseInt(quantityStr) : 0;
    this.Elements.qty.value = quantity.toString();

    //   for (let i=3; i<kbeData.length; i++) {
    //     appendOutput(kbeData[i].join(''));
    //   }
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
      this.Elements.category.value = "0";

      let internalPartNumber = data.substring(prefixPN.length);
      let pnPrefixEnd = internalPartNumber.indexOf("-");
      if (pnPrefixEnd > 0) {
        let pnPrefix = internalPartNumber.substring(0, pnPrefixEnd);
        let pnSuffix = internalPartNumber.substring(pnPrefixEnd + 1);
        if ((pnPrefix.length > 0) && (pnSuffix.length > 0)) {
          // Valid PN's are alphanumeric only
          if (pnSuffix.indexOf("-") < 0) {
            this.Elements.category.value = pnPrefix;
            this.Elements.pn.value = pnSuffix;
          }
        }
      }
    } else {
      this.Elements.mpn.value = data;
    }

    // spreadsheet.findInventoryItemByMPN(data, (res) => {
    //   if (res) {
    //     // Update
    //     let rowIdx = res.rowIdx;
    //     let item = res.item;

    //     item.Quantity = parseInt(item.Quantity) + 1;

    //     spreadsheet.setInventoryItem(rowIdx, item, (err, rowIdx) => {
    //       this.logAll("Inventory item updated", rowIdx);
    //     });
    //   } else {
    //     // Add
    //     spreadsheet.addInventoryItem({
    //       loc: '="A0"',
    //       pn: `="${data}"`,
    //       mpn: `="${data}"`,
    //       mfr: '="Unknown"',
    //       qty: 1,
    //       desc: '=""'
    //     }, (err, rowIdx) => {
    //       this.logAll("Inventory item added", rowIdx);
    //     });
    //   }
    // });
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

  onBtnAddClicked() {
    let locID = this.Elements.locID.value.trim().toUpperCase();
    let pnPrefix = this.Elements.category.value.trim();
    let pnSuffix = this.Elements.pn.value.trim().toUpperCase();
    let pn = `${pnPrefix}-${pnSuffix}`;
    let mfr = this.Elements.mfr.value.trim();
    let mpn = this.Elements.mpn.value.trim().toUpperCase();
    let desc = this.Elements.desc.value.trim();
    let qtyStr = this.Elements.qty.value.trim();
    let qty = qtyStr ? parseInt(qtyStr) : 0;
    let qtyAction = this.Elements.qtyAction.value;

    spreadsheet.findInventoryItemByMPN(mpn, (res) => {
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
          item.Quantity = parseInt(item.Quantity) + qty;
        } else {
          item.Quantity = qty;
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
    });
  }

  displayInventoryItemResults(msg, rowIdx) {
    this.logAll(msg, rowIdx);

    let item = spreadsheet.getInventoryItem(rowIdx);

    let locID = item["Location"];
    let pn = item["Part Number"];
    let mpn = item["Manufacturer Part Number"];
    let mfr = item["Manufacturer"];
    let qty = item["Quantity"];
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
