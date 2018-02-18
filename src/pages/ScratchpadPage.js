// import * as spreadsheet from "../spreadsheet/spreadsheet";

import AppPage from "./AppPage";


class ScratchpadPage extends AppPage {
  constructor(data) {
    super(data);
  }

  isInternalPartNumber(data) {
    let prefixPN = "IPN-";

    if (data.startsWith(prefixPN)) {
      let internalPartNumber = data.substring(prefixPN.length);
      let pnPrefixEnd = internalPartNumber.indexOf("-");
      if (pnPrefixEnd > 0) {
        let pnPrefix = internalPartNumber.substring(0, pnPrefixEnd);
        let pnSuffix = internalPartNumber.substring(pnPrefixEnd + 1);
        if ((pnPrefix.length > 0) && (pnSuffix.length > 0)) {
          // TODO: Validate that pnPrefix is a valid/existing Category

          // Valid PN's are alphanumeric only
          if (pnSuffix.indexOf("-") < 0) {
            return true;
          }
        }
      }
    }

    return false;
  }

  isLocationID(data) {
    let prefixLocID = "LOC-";

    if (data.startsWith(prefixLocID)) {
      let locID = data.substring(prefixLocID.length);
      if (locID.length > 0) {
        return true;
      }
    }

    return false;
  }

  findDataMatrixBlock(kbeData, blockPrefix) {
    for (let block of kbeData) {
      let idx = block.indexOf(blockPrefix);
      if (idx == 0) {
        return block.substring(idx + blockPrefix.length);
      }
    }

    return null;
  }

  onBtnDataMatrix() {
    let kbeData = [
      "[)>*F9*06",
      "P14-0025",
      "1PGRM033R71E221KA01D",
      "K1K51687419",
      "10K5917815111K14L",
      "Q100",
      "11ZPICK",
      "12Z702717",
      "13Z9046122",
      "0Z0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    ];

    this.Elements.category.value = null;
    this.Elements.pn.value = null;
    this.Elements.mpn.value = null;
    this.Elements.qty.value = null;

    // P<internalPartNumber>
    let internalPartNumber = this.findDataMatrixBlock(kbeData, "P");
    this.Elements.category.value = null;
    this.Elements.pn.value = null;
    if (internalPartNumber) {
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
    }

    // 1P<manufacturerPartNumber>
    let manufacturerPartNumber = this.findDataMatrixBlock(kbeData, "1P");
    this.Elements.mpn.value = manufacturerPartNumber;

    // Q<quantity>
    let quantityStr = this.findDataMatrixBlock(kbeData, "Q");
    let quantity = quantityStr ? parseInt(quantityStr, 10) : 0;
    this.Elements.qty.value = quantity.toString();
  }

  onBtnPDF417() {
    let kbeData = [
      "[)>*F9*06",
      "J28A55EBB.F0264EE8.AF946017.7FFAB16D30C9",
      "PNSR01L30NXT5GOSDKR-ND",
      "1PNSR01L30NXT5G",
      "9D1522",
      "14Z150524",
      "1TDL167851A",
      "4LCN",
      "11ZPREPACK",
      "15Z1.0.1",
      "12Z3488042",
      "Q000000200",
      "13Z000000",
    ];

    this.Elements.category.value = null;
    this.Elements.pn.value = null;
    this.Elements.mpn.value = null;
    this.Elements.qty.value = null;

    // P<internalPartNumber>
    let internalPartNumber = this.findDataMatrixBlock(kbeData, "P");
    this.Elements.category.value = null;
    this.Elements.pn.value = null;
    if (internalPartNumber) {
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
    }

    // 1P<manufacturerPartNumber>
    let manufacturerPartNumber = this.findDataMatrixBlock(kbeData, "1P");
    this.Elements.mpn.value = manufacturerPartNumber;

    // Q<quantity>
    let quantityStr = this.findDataMatrixBlock(kbeData, "Q");
    let quantity = quantityStr ? parseInt(quantityStr, 10) : 0;
    this.Elements.qty.value = quantity.toString();
  }

  onBtn1D() {
    let kbeData = [
      "5195612000000010880707"
    ];

    this.Elements.category.value = null;
    this.Elements.pn.value = null;
    this.Elements.mpn.value = null;
    this.Elements.qty.value = null;

    let data = kbeData[0];
    if ((data.length == 22) && (/^\d+$/.test(data))) {
      let dkPartID = data.substring(0, 7);
      let orderQty = parseInt(data.substring(7, 16), 10);

      this.Elements.qty.value = orderQty;


      // TODO
      this.Elements.category.value = "0";
      this.Elements.pn.value = `${dkPartID}`;

      this.Elements.mpn.value = null;
    }
  }

  onInitialize(appState) {
    super.onInitialize(appState);

    this.Elements = {};
    let elementNames = [
      "btnDataMatrix",
      "btnPDF417",
      "btn1D",
      "category",
      "pn",
      "mpn",
      "qty",
    ];
    for (let name of elementNames) {
      this.Elements[name] = document.querySelector(`#${this.pageName}-${name}`);
    }

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
