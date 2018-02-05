import { remote } from "electron";
import jetpack from "fs-jetpack";

// import { greet } from "./hello_world/hello_world";
import env from "env";

import AppPage from "./AppPage";

class InfoPage extends AppPage {
  constructor(data) {
    super(data);

    this.spreadsheetURL = data.spreadsheetURL;
  }

  onInitialize() {
    super.onInitialize();

    const app = remote.app;
    const appRootDir = jetpack.cwd(app.getAppPath());
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

    document.querySelector("#info-spreadsheet-link").setAttribute("href", this.spreadsheetURL);
  }

  onEnter() { super.onEnter(); }
  onExit() { super.onExit(); }
}

export default InfoPage;
