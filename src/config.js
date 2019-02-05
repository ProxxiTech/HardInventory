import { remote } from "electron";
import jetpack from "fs-jetpack";

//
const app = remote.app;
const appDir = jetpack.cwd(app.getAppPath() + "/app");

const config = appDir.read("config.json", "json");


export default config;
