let bwipjs = require("bwip-js");
const octopartjs = require("octopartjs");

import * as spreadsheet from "../spreadsheet/spreadsheet";

import AppPage from "./AppPage";


function logAll(title, o) {
  console.log(title);
  console.log(JSON.stringify(o, null, 4));
}

function appendOutput(str) {
  let el = document.createElement("span");
  el.innerHTML = str + "<br/>";

  document.getElementById("kbe-data").appendChild(el);
}

function createBarcode(barcodeData) {
  bwipjs.toBuffer({ bcid:"qrcode", height: 25, width: 25, text:barcodeData }, function (err, png) {
    if (err) {
      document.getElementById("barcode-error").textContent = err;
    } else {
      document.getElementById("barcode-img").src = "data:image/png;base64," + png.toString("base64");
    }
  });
}

function isBarcodeDataMatrix(kbeData) {
  if (kbeData.length > 8) {
    let h = kbeData[0].join("");
    if (h == "[)>*F9*06") {
      return true;
    }
  }

  return false;
}

function findOctopartDescription(item, source) {
  for (let d in item.descriptions) {
    let desc = item.descriptions[d];

    for (let s in desc.attribution.sources) {
      let src = desc.attribution.sources[s];

      if (src.name === source) {
        return d.value;
      }
    }
  }

  return null;
}

function octopartLookup(mpn, cb) {
  var queries = [
    {"mpn": mpn, "reference": "line1"}
  ];

  var args = {
    queries: JSON.stringify(queries),
    "include[]": "descriptions"
  };

  octopartjs.parts.match(args, (err, body) => {
    if (err)
      return cb(err, null);

    let mfr;
    let desc;

    // console.log(JSON.stringify(body, null, 4));
    if (body.results.length > 0) {
      if (body.results[0].items.length > 0) {
        let item = body.results[0].items[0];

        mfr = item.manufacturer.name;

        // console.log(JSON.stringify(item.descriptions, null, 4));

        desc = findOctopartDescription(item, mfr);
        if (desc == null)
          desc = findOctopartDescription(item, "Digi-Key");
        if (desc == null)
          desc = findOctopartDescription(item, "Arrow");
        if (desc == null)
          desc = findOctopartDescription(item, "Mouser");
        if (desc == null)
          desc = findOctopartDescription(item, "Avnet");
        if (desc == null) {
          if (item.descriptions.length > 0)
            desc = item.descriptions[0].value;
        }
      }
    }

    cb(null, mfr, desc);
  });
}

function processBarcodeDataMatrix(kbeData) {
  // P<internalPartNumber>
  let internalPartNumber = kbeData[1].join("");
  internalPartNumber = internalPartNumber.substring(internalPartNumber.indexOf("P") + 1);
  appendOutput("PN: " + internalPartNumber);

  // 1P<manufacturerPartNumber>
  let manufacturerPartNumber = kbeData[2].join("");
  manufacturerPartNumber = manufacturerPartNumber.substring(manufacturerPartNumber.indexOf("P") + 1);
  appendOutput("MPN: " + manufacturerPartNumber);

  // Q<quantity>
  let quantity = kbeData[8].join("");
  quantity = parseInt(quantity.substring(quantity.indexOf("Q") + 1));
  appendOutput("Q: " + quantity);

  //   for (let i=3; i<kbeData.length; i++) {
  //     appendOutput(kbeData[i].join(''));
  //   }

  let barcodeData = internalPartNumber + "\u000D" + manufacturerPartNumber + "\u000D" + quantity;
  createBarcode(barcodeData);

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
        logAll("Inventory item updated", rowIdx);
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
        logAll("Inventory item added", rowIdx);

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
              logAll("Item updated with Octopart data", rowIdx);
            });
          }
        });
      });
    }
  });
}

function processBarcodeGeneric(kbeData) {
  let data = kbeData[0].join("");
  appendOutput("Barcode: " + data);

  createBarcode(data);

  spreadsheet.findInventoryItemByMPN(data, (res) => {
    if (res) {
      // Update
      let rowIdx = res.rowIdx;
      let item = res.item;

      item.Quantity = parseInt(item.Quantity) + 1;

      spreadsheet.setInventoryItem(rowIdx, item, (err, rowIdx) => {
        logAll("Inventory item updated", rowIdx);
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
        logAll("Inventory item added", rowIdx);
      });
    }
  });
}

class ScanBarcodePage extends AppPage {
  constructor(data) {
    super(data);

    this.kbeData = [];
    this.kbeBlock = [];
    this.isCapturingBarcode = false;
  }

  onInitialize() {
    super.onInitialize();

    window.addEventListener("keydown", function(event) {
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
      } else {
        if (!this.isCapturingBarcode) {
          return;
        }

        if (event.key == "Enter") {
          if (this.kbeBlock.length > 0) {
            this.kbeData.push(this.kbeBlock);
          }

          if (isBarcodeDataMatrix(this.kbeData)) {
            // Valid Data Matrix barcode
            processBarcodeDataMatrix(this.kbeData);
          } else {
            processBarcodeGeneric(this.kbeData);
          }
          this.kbeData = [];
          this.kbeBlock = [];
          this.isCapturingBarcode = false;
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
    }, true);
  }

  onEnter() { super.onEnter(); }
  onExit() { super.onExit(); }
}

export default ScanBarcodePage;
