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

import { remote } from "electron";
import jetpack from "fs-jetpack";

import octopartjs from "octopartjs";

import * as spreadsheet from "./spreadsheet/spreadsheet";

//
const app = remote.app;
const appDir = jetpack.cwd(app.getAppPath() + "/app");

const config = appDir.read("config.json", "json");

octopartjs.apikey(config.octopart_key);

document.querySelector("#loading").style.display = "flex";

import LookupPage from "./pages/LookupPage";
import ScanBarcodePage from "./pages/ScanBarcodePage";
import InventoryPage from "./pages/InventoryPage";
import CategoriesPage from "./pages/CategoriesPage";
import InfoPage from "./pages/InfoPage";

import AppState from "./AppState";

let appState = new AppState([
  new LookupPage({
    pageName: "lookup",
    state: {}
  }),
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
    spreadsheetURL: config.spreadsheet_url,
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

const creds = appDir.read("Inventory-System-Auth.json", "json");
spreadsheet.initialize(config.spreadsheet_id, creds, () => {
  console.log(`Successfully loaded ${spreadsheet.docInfo.title}`);

  appState.onDataReady();
});
