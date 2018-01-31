import "./stylesheets/main.css";

// Small helpers you might want to keep
import "./helpers/context_menu.js";
import "./helpers/external_links.js";

// ----------------------------------------------------------------------------
// Everything below is just to show you how it works. You can delete all of it.
// ----------------------------------------------------------------------------

import { remote } from "electron";
import jetpack from "fs-jetpack";
import { greet } from "./hello_world/hello_world";
import env from "env";
// let HID = require('node-hid');
// let btSerial = new (require('bluetooth-serial-port')).BluetoothSerialPort();
let bwipjs = require('bwip-js');

const app = remote.app;
const appDir = jetpack.cwd(app.getAppPath());

// Holy crap! This is browser window with HTML and stuff, but I can read
// files from disk like it's node.js! Welcome to Electron world :)
const manifest = appDir.read("package.json", "json");

const osMap = {
  win32: "Windows",
  darwin: "macOS",
  linux: "Linux"
};

document.querySelector("#app").style.display = "block";
document.querySelector("#greet").innerHTML = greet();
document.querySelector("#os").innerHTML = osMap[process.platform];
document.querySelector("#author").innerHTML = manifest.author;
document.querySelector("#env").innerHTML = env.name;
document.querySelector("#electron-version").innerHTML = process.versions.electron;


function appendOutput(str) {
  let el = document.createElement("span");
  el.innerHTML = str + "<br/>";

  document.getElementById("kbe-data").appendChild(el);
}

let kbeData = [];
let kbeBlock = [];
window.addEventListener("keydown", function(event) {
  if (event.preventDefaulted) {
    return; // Do nothing if event already handled
  }

  if (event.key == 'Clear') {
    kbeData = [];
    kbeBlock = [];
  } else if (event.key == 'Enter') {
    if (kbeData.length > 8) {
      let h = kbeData[0].join('');
      if (h == '[)>*F9*06') {
        // Valid Data Matrix barcode

        // P<internalPartNumber>
        let internalPartNumber = kbeData[1].join('');
        internalPartNumber = internalPartNumber.substring(internalPartNumber.indexOf("P") + 1);
        appendOutput('PN: ' + internalPartNumber);

        // 1P<manufacturerPartNumber>
        let manufacturerPartNumber = kbeData[2].join('');
        manufacturerPartNumber = manufacturerPartNumber.substring(manufacturerPartNumber.indexOf("P") + 1);
        appendOutput('MPN: ' + manufacturerPartNumber);

        // Q<quantity>
        let quantity = kbeData[8].join('');
        quantity = parseInt(quantity.substring(quantity.indexOf("Q") + 1));
        appendOutput('Q: ' + quantity);

//         for (let i=3; i<kbeData.length; i++) {
//           appendOutput(kbeData[i].join(''));
//         }

        let barcodeData = internalPartNumber + '\u000D' + manufacturerPartNumber + '\u000D' + quantity;
        bwipjs.toBuffer({ bcid:'qrcode', height: 25, width: 25, text:barcodeData }, function (err, png) {
          if (err) {
            document.getElementById('barcode-error').textContent = err;
          } else {
            document.getElementById('barcode-img').src = 'data:image/png;base64,' + png.toString('base64');
          }
        });
      }
    }
    kbeData = [];
    kbeBlock = [];
  } else if (event.key == 'Shift') {
    // Ignored
  } else {
    if (event.key == 'F8') {
      kbeData.push(kbeBlock);
      kbeBlock = [];
    } else if (event.key == 'F9') {
      kbeBlock.push('*' + event.key + '*');
    } else {
      kbeBlock.push(event.key);
    }
  }

  // Consume the event so it doesn't get handled twice
  event.preventDefault();
}, true);


// let devices = HID.devices();
// console.log(devices, null, 4);

/*let deviceInfo = devices.find(function(d) {
  return (d.vendorId == 13) && (d.productId == 0);
});
if (deviceInfo) {
  let barcodeScanner = new HID.HID(deviceInfo.path);
  let barcodeData = [];

  barcodeScanner.on("data", function(data) {
    barcodeData.push(data);
    console.log(JSON.stringify(data, null, 4));

    document.querySelector("#hid-data").innerHTML = JSON.stringify(barcodeData, null, 4);

    if (data[2] == 40) {
      barcodeData = [];
    }
  });
}*/


// btSerial.on('found', function(address, name) {
//     console.log('found device at ' + address + ' (' + name + ')');
//     btSerial.findSerialPortChannel(address, function(channel) {
//         console.log('' + address + ' has serial port on channel ' + channel);
//         btSerial.connect(address, channel, function() {
//             console.log('connected to ' + address + ' on channel ' + channel);
//
//             let btData = [];
//             btSerial.on('data', function(buffer) {
//                 btData.push(...buffer);
//                 console.log(JSON.stringify(buffer, null, 4));
//
//                 let bufferArr = [...buffer];
//                 for (let ch of bufferArr) {
//                   if (ch == 0x13) {
//                     console.log(JSON.stringify(btData, null, 4));
//                     console.log('disconnecting');
//                     // close the connection when you're ready
//                     btSerial.close();
//
//                     document.querySelector("#bt-data").innerHTML = JSON.stringify(btData, null, 4);
//                     btData = [];
//
//                     break;
//                   }
//                 }
//            });
//         }, function () {
//             console.log('cannot connect to ' + address + ' on channel ' + channel);
//         });
//      }, function() {
//         console.log('no serial port channel found for ' + address);
//     });
// });
// btSerial.on('failure', function(err) {
//   console.log('BT error: ' + JSON.stringify(err, null, 4));
// });
// btSerial.on('closed', function() {
//   console.log('connection closed.');
// });
// btSerial.on('finished', function() {
//   console.log('search finished.');
//
//   btSerial.listPairedDevices(function(devices) {
//     console.log(`${devices.length} BlueTooth device(s) are connected.`);
//     for (let dev of devices) {
// //         console.log('Paired with: ' + JSON.stringify(dev, null, 4));
//
//         if (dev.name.indexOf('SL_') === 0) {
//             console.log('Trying to connect to: ' + JSON.stringify(dev, null, 4));
//             let address = dev.address;
//             btSerial.findSerialPortChannel(address, function(channel) {
//                 console.log('' + address + ' has serial port on channel ' + channel);
//                 btSerial.connect(address, channel, function() {
//                     console.log('connected to ' + address + ' on channel ' + channel);
//                     console.log(`CONNECTED >>> `);
//                     btSerial.close();
//                 }, function () {
//                     console.log('cannot connect to ' + address + ' on channel ' + channel);
//                 });
//              }, function() {
//                 console.log('no serial port channel found for ' + address);
//             });
//         }
//     };
//   });
// });
//
// btSerial.inquire();
// console.log('searching for BT serial port devices...');


