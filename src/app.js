// Typefaces required by Xel
// require("typeface-roboto");
// require("typeface-roboto-mono");
// require("typeface-noto-sans");
require("../node_modules/typeface-roboto");
require("../node_modules/typeface-roboto-mono");
require("../node_modules/typeface-noto-sans");
// import "typeface-roboto";
// import "typeface-roboto-mono/index.css";
// require("typeface-noto-sans");
// require("typeface-noto-sans/index.css");

import "./stylesheets/main.css";

// Small helpers you might want to keep
import "./helpers/context_menu.js";
import "./helpers/external_links.js";

// ----------------------------------------------------------------------------
// Everything below is just to show you how it works. You can delete all of it.
// ----------------------------------------------------------------------------

import { remote } from "electron";
import jetpack from "fs-jetpack";
// import { greet } from "./hello_world/hello_world";
import env from "env";

let bwipjs = require("bwip-js");
const octopartjs = require("octopartjs");
import * as spreadsheet from "./spreadsheet/spreadsheet";

//
const app = remote.app;
const appRootDir = jetpack.cwd(app.getAppPath());
const appDir = jetpack.cwd(app.getAppPath() + "/app");

const config = appDir.read("config.json", "json");

octopartjs.apikey(config.octopart_key);


document.querySelector("#loading").style.display = "flex";

class AppPage {
  constructor(data) {
    this.pageName = data.pageName;
    this.state = data.state;
  }

  getPageDocElement() {
    return document.querySelector(`#${this.pageName}-page`);
  }

  onInitialize() {
    let el = this.getPageDocElement();
    if (el != null) {
      el.style.display = "none";
    }
  }

  onEnter() {
    let el = this.getPageDocElement();
    if (el != null) {
      el.style.display = "flex";
    }
  }

  onExit() {
    let el = this.getPageDocElement();
    if (el != null) {
      el.style.display = "none";
    }
  }
}

class ScanBarcodePage extends AppPage {
  constructor(data) {
    super(data);
  }

  onInitialize() { super.onInitialize(); }
  onEnter() { super.onEnter(); }
  onExit() { super.onExit(); }
}

class InventoryPage extends AppPage {
  constructor(data) {
    super(data);
  }

  onInitialize() { super.onInitialize(); }
  onEnter() { super.onEnter(); }
  onExit() { super.onExit(); }
}

class CategoriesPage extends AppPage {
  constructor(data) {
    super(data);
  }

  onInitialize() { super.onInitialize(); }
  onEnter() { super.onEnter(); }
  onExit() { super.onExit(); }
}

class InfoPage extends AppPage {
  constructor(data) {
    super(data);
  }

  onInitialize() {
    super.onInitialize();

    const manifest = appRootDir.read("package.json", "json");

    const osMap = {
      win32: "Windows",
      darwin: "macOS",
      linux: "Linux"
    };

    // document.querySelector("#greet").innerHTML = greet();
    document.querySelector("#info-platform").innerHTML = osMap[process.platform];
    document.querySelector("#info-author").innerHTML = manifest.author;
    document.querySelector("#info-env").innerHTML = env.name;
    document.querySelector("#info-version").innerHTML = manifest.version;
  }

  onEnter() { super.onEnter(); }
  onExit() { super.onExit(); }
}

class AppState {
  constructor(pages) {
    this.pages = pages;
    this.activePage = null;

    let pageNameDict = {};
    for (let page of pages) {
      pageNameDict[page.pageName] = page;
    }
    this.pageNameDict = pageNameDict;

    for (let page of this.pages) {
      page.onInitialize();
    }
  }

  onDataReady() {
    document.querySelector("#loading").style.display = "none";

    let firstPage = this.pages[0];
    this.changePage(firstPage.pageName);
  }

  changePage(newPageName) {
    if (this.activePage) {
      if (this.activePage.pageName === newPageName) {
        return;
      }

      this.activePage.onExit();
    }

    this.activePage = this.pageNameDict[newPageName];
    this.activePage.onEnter();
  }
}

let appState = new AppState([
  new ScanBarcodePage({
    pageName: "scan-barcode",
    state: {}
  }),
  new InventoryPage({
    pageName: "inventory",
    state: {}
  }),
  new CategoriesPage({
    pageName: "categories",
    state: {}
  }),
  new InfoPage({
    pageName: "info",
    state: {}
  }),
]);

let navButtons = document.querySelectorAll("#app-nav");
for (let navButton of navButtons) {
  navButton.addEventListener("click", function () {
    let pageName = navButton.attributes["nav-target"].value;
    appState.changePage(pageName);
  });
}

function logAll(title, o) {
  console.log(title);
  console.log(JSON.stringify(o, null, 4));
}

const creds = appDir.read("Inventory-System-Auth.json", "json");
spreadsheet.initialize(config.spreadsheet_id, creds, () => {
  console.log(`Successfully loaded ${spreadsheet.docInfo.title}`);

  appState.onDataReady();
});

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

let kbeData = [];
let kbeBlock = [];
window.addEventListener("keydown", function(event) {
  if (event.preventDefaulted) {
    return; // Do nothing if event already handled
  }

  if (event.key == "Clear") {
    kbeData = [];
    kbeBlock = [];
  } else if (event.key == "Enter") {
    if (kbeBlock.length > 0) {
      kbeData.push(kbeBlock);
    }

    if (isBarcodeDataMatrix(kbeData)) {
      // Valid Data Matrix barcode
      processBarcodeDataMatrix(kbeData);
    } else {
      processBarcodeGeneric(kbeData);
    }
    kbeData = [];
    kbeBlock = [];
  } else if (event.key == "Shift") {
    // Ignored
  } else {
    if (event.key == "F8") {
      kbeData.push(kbeBlock);
      kbeBlock = [];
    } else if (event.key == "F9") {
      kbeBlock.push("*" + event.key + "*");
    } else {
      kbeBlock.push(event.key);
    }
  }

  // Consume the event so it doesn't get handled twice
  event.preventDefault();
}, true);
