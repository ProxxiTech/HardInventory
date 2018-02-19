import got from "got";
import cheerio from "cheerio";

import * as spreadsheet from "../spreadsheet/spreadsheet";
import * as octopartLookup from "./octopartLookup";
import EventEmitter from "./EventEmitter";


class BarcodeScanner extends EventEmitter {
  constructor() {
    super();

    this.kbeData = [];
    this.kbeBlock = [];
    this.isCapturingBarcode = false;
  }

  init() {
    window.addEventListener("keydown", (event) => {
      this.onKeyDown(event);
    }, true);
  }

  findExtendedBarcodeBlock(kbeData, blockPrefix) {
    for (let block of kbeData) {
      let idx = block.indexOf(blockPrefix);
      if (idx == 0) {
        return block.substring(idx + blockPrefix.length);
      }
    }

    return null;
  }

  parsePartNumber(partNumber) {
    let internalPN;
    let supplierPN = partNumber;
    if (partNumber) {
      let pnPrefixEnd = partNumber.indexOf("-");
      if (pnPrefixEnd > 0) {
        let pnCategory = partNumber.substring(0, pnPrefixEnd);
        let pnSuffix = partNumber.substring(pnPrefixEnd + 1);
        if ((pnCategory.length > 0) && (pnSuffix.length > 0)) {
          // Valid PN's are alphanumeric only
          let regexp = /[^\d\w]/gi;
          if (!pnCategory.match(regexp) && !pnSuffix.match(regexp)) {
            // Make sure the prefix matches a known category
            if (spreadsheet.findCategoryItem(pnCategory)) {
              internalPN = partNumber;
              supplierPN = null;
            }
          }
        }
      }
    }

    return {
      internalPN,
      supplierPN
    };
  }

  onOctopartMPNLookup(err, internalPN, supplierPN, manufacturerPN, octopartMPN, octopartMfr, octopartDesc, octopartCat, cb) {
    if (err) {
      console.error(err);
      return cb({
        internalPN,
        supplierPN,
      });
    }

    // TODO: Should we take octopartMPN over manufacturerPN; might it be more complete/accurate?
    // Downside would be if the wrong part was looked up (e.g. several manufacturers use the same
    // MPN for different parts), we'd loose the original (correct) MPN.

    let manufacturer = octopartMfr;
    let category = octopartCat;
    let description = octopartDesc;

    if (internalPN) {
      // We have an IPN, no need to look one up or generate it
      return cb({
        internalPN,
        supplierPN,

        manufacturerPN,
        manufacturer,
        category,
        description
      });
    }

    spreadsheet.findInventoryItemByMPN(manufacturerPN, (invResults) => {
      let locationID;

      if (invResults) {
        let invItem = invResults.item;
        let ipn = invItem["Part Number"];

        let pnResults = this.parsePartNumber(ipn);
        internalPN = pnResults.internalPN;
        if (!supplierPN) {
          supplierPN = pnResults.supplierPN;
        }

        locationID = invItem["Location"];
      }

      if (internalPN || !octopartCat) {
        // Without a category we can't generate an IPN, so call it here
        return cb({
          internalPN,
          supplierPN,

          locationID,

          manufacturerPN,
          manufacturer,
          category,
          description
        });
      }

      // Generate a new IPN as <cat>-<catMaxIPN+1>
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

        internalPN = `${octopartCat}-` + `${highestPN+1}`.padStart(4, "0");
        return cb({
          internalPN,
          isNewInternalPN: true,
          supplierPN,

          locationID,

          manufacturerPN,
          manufacturer,
          category,
          description
        });
      });
    });
  }

  parseManufacturerPartNumber(manufacturerPartNumber, pnResults, cb) {
    let manufacturerPN = manufacturerPartNumber;
    let { internalPN, supplierPN } = pnResults || {};

    if (!manufacturerPN) {
      return cb({
        internalPN,
        supplierPN,
      });
    }

    // Lookup the MPN on Octopart
    octopartLookup.lookupByMPN(manufacturerPN, (err, octopartMPN, octopartMfr, octopartDesc, octopartCat) => {
      this.onOctopartMPNLookup(err, internalPN, supplierPN, manufacturerPN, octopartMPN, octopartMfr, octopartDesc, octopartCat, cb);
    });
  }

  processECIA2DBarcode(kbeData, cb) {
    // Block prefixes for ECIA 2D Data Matrix and PDF417 barcodes (used by e.g. Digi-Key):
    // P		Customer Part Number
    // 1P		Vendor Part Number
    // Q		Quantity
    // 10D	Date code
    // 1T		Lot code
    // 4L		Country of origin
    // See docs/ECIA_Specifications.pdf for detailed information

    let partNumber = this.findExtendedBarcodeBlock(kbeData, "P");
    let manufacturerPartNumber = this.findExtendedBarcodeBlock(kbeData, "1P");
    let quantityStr = this.findExtendedBarcodeBlock(kbeData, "Q");

    //
    let pnResults = this.parsePartNumber(partNumber);
    let quantity = quantityStr ? parseInt(quantityStr, 10) : 0;
    this.parseManufacturerPartNumber(manufacturerPartNumber, pnResults, (mpnResults) => {
      cb({
        ...mpnResults,  // includes pnResults, possibly modified
        quantity
      });
    });
  }

  processMouser2DBarcode(kbeData, cb) {
    // Block prefixes for Mouser Mata Matrix barcodes:
    // 1P		Vendor Part Number (or Customer Part Number, ugh)
    // Q		Quantity
    // 4L		Country of origin

    let manufacturerPartNumber = this.findExtendedBarcodeBlock(kbeData, "1P");
    let quantityStr = this.findExtendedBarcodeBlock(kbeData, "Q");

    //
    let quantity = quantityStr ? parseInt(quantityStr, 10) : 0;
    this.parseManufacturerPartNumber(manufacturerPartNumber, null, (mpnResults) => {
      cb({
        ...mpnResults,  // includes pnResults, possibly modified
        quantity
      });
    });
  }

  processSimpleBarcode(kbeData, cb) {
    let prefixLocID = "LOC-";
    let prefixPN = "IPN-";

    let data = kbeData[0];
    if (data.startsWith(prefixLocID)) {
      // Location ID barcode
      let locID = data.substring(prefixLocID.length);
      cb({
        locationID: locID
      });
    } else if (data.startsWith(prefixPN)) {
      // Internal Part Number barcode
      let partNumber = data.substring(prefixPN.length);
      let { internalPN } = this.parsePartNumber(partNumber);
      cb({
        internalPN: internalPN
      });
    } else if ((data.length == 22) && (/^\d+$/.test(data))) {
      // Digi-Key 1D barcode
      let dkPartID = data.substring(0, 7);
      let orderQty = parseInt(data.substring(7, 16), 10);

      this.lookupDigiKeyPartID(dkPartID, (dkResults) => {
        cb({
          ...dkResults,
          quantity: orderQty
        });
      });
    } else {
      // Unknown barcode, assume it's a MPN
      this.parseManufacturerPartNumber(data, null, (mpnResults) => {
        if (!mpnResults.manufacturerPN) {
          // It's not a MPN, but oh well, we at least want to capture something...
          return cb({
            manufacturerPN: data
          });
        }

        cb(mpnResults);
      });
    }
  }

  lookupDigiKeyPartID(dkPartID, cb) {
    // x/x/x/ hack taken from https://github.com/brentyi/digikey_parser/blob/master/DigikeyParser.js
    got(`http://www.digikey.com/product-detail/en/x/x/x/${dkPartID}`).then(response => {
      const $ = cheerio.load(response.body);
      let dkPartNumber = $("#reportPartNumber").text();
      let manufacturerPartNumber = $("meta").filter(function(/*i, el*/) {
        // this === el
        return $(this).attr("itemprop") === "name";
      }).attr("content");

      if (dkPartNumber) {
        // Lookup the Digi-Key part number on Octopart
        octopartLookup.lookupByDigiKeyPN(dkPartNumber, (err, octopartMPN, octopartMfr, octopartDesc, octopartCat) => {
          this.onOctopartMPNLookup(err, null, dkPartNumber, manufacturerPartNumber, octopartMPN, octopartMfr, octopartDesc, octopartCat, cb);
        });
      }
    }).catch(error => {
      console.log(error.response.body);
      cb();
    });
  }

  isECIA2DBarcode(kbeData) {
    if (kbeData.length > 8) {
      if (kbeData[0] === "[)>*F9*06") {
        return true;
      }
    }

    return false;
  }

  isMouser2DBarcode(kbeData) {
    if (kbeData.length > 6) {
      if (kbeData[0] === ">[)>06") {
        return true;
      }
    }

    return false;
  }

  processBarcode(cb) {
    if (this.isECIA2DBarcode(this.kbeData)) {
      // Valid Data Matrix or PDF417 barcode
      this.processECIA2DBarcode(this.kbeData, cb);
    } else if (this.isMouser2DBarcode(this.kbeData)) {
      // Valid Data Matrix barcode. Mouser's 2D barcodes are almost ECIA compliant, but... not.
      this.processMouser2DBarcode(this.kbeData, cb);
    } else {
      // Probably either a 1D or QR barcode
      this.processSimpleBarcode(this.kbeData, cb);
    }
  }

  onKeyDown(event) {
    if (event.preventDefaulted) {
      return; // Do nothing if event already handled
    }

    if (event.key == "Clear") {
      this.kbeData = [];
      this.kbeBlock = [];
      this.isCapturingBarcode = true;

      // Show spinner
      this.emit("onCaptureStart");
    } else {
      if (!this.isCapturingBarcode) {
        return;
      }

      if (event.key == "Enter") {
        if (this.kbeBlock.length > 0) {
          this.kbeData.push(this.kbeBlock.join(""));
          this.kbeBlock = [];
        }

        this.processBarcode((results) => {
          this.kbeData = [];
          this.isCapturingBarcode = false;

          // Hide spinner
          this.emit("onCaptureEnd", results);
        });
      } else if (event.key == "Shift") {
        // Ignored
      } else {
        if (event.key == "F8") {
          this.kbeData.push(this.kbeBlock.join(""));
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
}


export default new BarcodeScanner();
