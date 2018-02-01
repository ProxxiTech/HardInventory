import { remote } from "electron";
import jetpack from "fs-jetpack";
let GoogleSpreadsheet = require('google-spreadsheet');
let async = require('async');

function logAll(title, o) {
  console.log(title);
  console.log(JSON.stringify(o, null, 4));
}

export let docInfo;
export let catWorksheet;
export let invWorksheet;
export let catNumCols;
let catMaxRow;
export let catTable = [];
export let invNumCols;
let invMaxRow;
export let invTable = [];
export let catHeaderNameToIndex = {};
export let invHeaderNameToIndex = {};
export let catHeaderIndexToName = [];
export let invHeaderIndexToName = [];

export function initialize(doc_id, credentials, cb) {
  try {
    let doc = new GoogleSpreadsheet(doc_id);
    var sheet;

    async.series(
      [
        function setAuth(step) {
          console.log('Authenticating...');

          doc.useServiceAccountAuth(credentials, step);
        },
        function getInfoAndWorksheets(step) {
          console.log('Loading document information...');

          doc.getInfo(function(err, info) {
//             logAll(`Loaded ${info.title} by ${info.author.email}`, info);
            /*
            {
                "id": "https://spreadsheets.google.com/feeds/worksheets/177egcyC1eNPNm2Mot-E7kMe11MYMUfcBA5ohmbnMFhU/private/full",
                "title": "Proxxi Inventory",
                "updated": "2018-01-31T21:59:52.356Z",
                "author": {
                    "name": "richard",
                    "email": "richard@proxxiband.com"
                },
                "worksheets": [
                    {
                        "url": "https://spreadsheets.google.com/feeds/worksheets/177egcyC1eNPNm2Mot-E7kMe11MYMUfcBA5ohmbnMFhU/od6",
                        "id": "od6",
                        "title": "Inventory",
                        "rowCount": 1000,
                        "colCount": 27,
                        "_links": []
                    },
                    {
                        "url": "https://spreadsheets.google.com/feeds/worksheets/177egcyC1eNPNm2Mot-E7kMe11MYMUfcBA5ohmbnMFhU/o57sqfi",
                        "id": "o57sqfi",
                        "title": "Categories",
                        "rowCount": 1000,
                        "colCount": 26,
                        "_links": []
                    }
                ]
            }
            */

            docInfo = info;

            for (let ws of info.worksheets) {
//               logAll(`Worksheet ${ws.id} (${ws.title})`, ws);

              if (ws.title === 'Categories') {
                catWorksheet = ws;
                catMaxRow = ws.rowCount;
              } else if (ws.title === 'Inventory') {
                invWorksheet = ws;
                invMaxRow = ws.rowCount;
              }
            }

            step();
          });
        },
        function getCategoryHeaders(step) {
          console.log('Loading category headers...');

          catWorksheet.getCells(
            { 'min-row': 1, 'max-row': 1, 'min-col': 1, 'max-col': 26, 'return-empty': false },
            function(err, cells) {
//               logAll('Category Headers', cells);
              /*
              [
                  {
                      "value": "Category",
                      "valueForSave": "Category",
                      "id": "https://spreadsheets.google.com/feeds/cells/177egcyC1eNPNm2Mot-E7kMe11MYMUfcBA5ohmbnMFhU/o57sqfi/R1C1",
                      "row": 1,
                      "col": 1,
                      "batchId": "R1C1",
                      "_links": [],
                      "_value": "Category"
                  },
                  {
                      "value": "Description",
                      "valueForSave": "Description",
                      "id": "https://spreadsheets.google.com/feeds/cells/177egcyC1eNPNm2Mot-E7kMe11MYMUfcBA5ohmbnMFhU/o57sqfi/R1C2",
                      "row": 1,
                      "col": 2,
                      "batchId": "R1C2",
                      "_links": [],
                      "_value": "Description"
                  }
              ]
              */

              catNumCols = cells.length;

              for (let i=0; i<cells.length; i++) {
                catHeaderNameToIndex[cells[i].value] = i;
                catHeaderIndexToName[i] = cells[i].value;
              }

              // Short names
              catHeaderNameToIndex['cat'] = catHeaderNameToIndex['Category'];
              catHeaderNameToIndex['desc'] = catHeaderNameToIndex['Description'];

              step();
            });
        },
        function getInventoryHeaders(step) {
          console.log('Loading inventory headers...');

          invWorksheet.getCells(
            { 'min-row': 1, 'max-row': 1, 'min-col': 1, 'max-col': 26, 'return-empty': false },
            function(err, cells) {
//               logAll('Inventory Headers', cells);
              /*
              [
                "value": "Location",
                "value": "Part Number",
                "value": "Manufacturer Part Number",
                "value": "Manufacturer",
                "value": "Quantity",
                "value": "Description",
              ]
              */

              invNumCols = cells.length;

              for (let i=0; i<cells.length; i++) {
                invHeaderNameToIndex[cells[i].value] = i;
                invHeaderIndexToName[i] = cells[i].value;
              }

              // Short names
              invHeaderNameToIndex['loc'] = invHeaderNameToIndex['Location'];
              invHeaderNameToIndex['pn'] = invHeaderNameToIndex['Part Number'];
              invHeaderNameToIndex['mpn'] = invHeaderNameToIndex['Manufacturer Part Number'];
              invHeaderNameToIndex['mfr'] = invHeaderNameToIndex['Manufacturer'];
              invHeaderNameToIndex['qty'] = invHeaderNameToIndex['Quantity'];
              invHeaderNameToIndex['desc'] = invHeaderNameToIndex['Description'];

              step();
            });
        },
        function getCategoryTable(step) {
          console.log('Loading categories...');

          catWorksheet.getCells(
            { 'min-row': 2, 'max-row': catMaxRow, 'min-col': 1, 'max-col': 26, 'return-empty': false },
            function(err, cells) {
//               logAll('Category Rows', cells);
              /*
              [
                  {
                      "value": "10",
                      "numericValue": 10,
                      "valueForSave": "10",
                      "id": "https://spreadsheets.google.com/feeds/cells/177egcyC1eNPNm2Mot-E7kMe11MYMUfcBA5ohmbnMFhU/o57sqfi/R2C1",
                      "row": 2,
                      "col": 1,
                      "batchId": "R2C1",
                      "_links": [],
                      "_numericValue": 10,
                      "_value": "10"
                  },
                  {
                      "value": "Printed Circuit Assembly",
                      "valueForSave": "Printed Circuit Assembly",
                      "id": "https://spreadsheets.google.com/feeds/cells/177egcyC1eNPNm2Mot-E7kMe11MYMUfcBA5ohmbnMFhU/o57sqfi/R2C2",
                      "row": 2,
                      "col": 2,
                      "batchId": "R2C2",
                      "_links": [],
                      "_value": "Printed Circuit Assembly"
                  },
                  ...
              ]
              */

              catMaxRow = 0;
              for (let cell of cells) {
                if (catMaxRow < cell.row)
                  catMaxRow = cell.row;

                let rowIdx = cell.row - 2;  // First row is the header row
                let colIdx = cell.col - 1;
                if (catTable[rowIdx] == null) {
                  catTable[rowIdx] = new Array(catNumCols);
                }
                catTable[rowIdx][colIdx] = cell;
              }

              step();
            });
        },
        function getInventoryTable(step) {
          console.log('Loading inventory...');

          invWorksheet.getCells(
            { 'min-row': 2, 'max-row': invMaxRow, 'min-col': 1, 'max-col': 26, 'return-empty': false },
            function(err, cells) {
//               logAll('Inventory Rows', cells);
              /*
              [
                  {
                      "value": "10",
                      "numericValue": 10,
                      "row": 2,
                      "col": 1,
                  },
                  {
                      "value": "Printed Circuit Assembly",
                      "row": 2,
                      "col": 2,
                  },
                  ...
              ]
              */

              invMaxRow = 0;
              for (let cell of cells) {
                if (invMaxRow < cell.row)
                  invMaxRow = cell.row;

                let rowIdx = cell.row - 2;  // First row is the header row
                let colIdx = cell.col - 1;
                if (invTable[rowIdx] == null) {
                  invTable[rowIdx] = new Array(invNumCols);
                }
                invTable[rowIdx][colIdx] = cell;
              }

              step();
            });
        },
        function finished(step) {
          console.log('Ready.');

          cb();

          step();
        }
      ],
      function(err){
          if( err ) {
            console.log('Error: '+err);
          }
      }
    );
  }
  catch (err) {
    console.log('ERROR: ' + err.message);
    logAll('ERROR', err);
  }
}

function findInventoryItemInternal(findColIdx, value, cb) {
  for (let rowIdx=0; rowIdx<invTable.length; rowIdx++) {
    let row = invTable[rowIdx];
    let itemValue = row[findColIdx].value;

    if (itemValue === value) {
      let item = {};
      for (let cell of row) {
        let colIdx = cell.col - 1;
        let colName = invHeaderIndexToName[colIdx];

        item[colName] = cell.value;
      }

      return cb({ rowIdx, item });
    }
  }

  cb(null);
}

export function findInventoryItemByMPN(mpn, cb) {
  let mpnColIdx = invHeaderNameToIndex['mpn'];

  findInventoryItemInternal(mpnColIdx, mpn, cb);
}

export function findInventoryItemByPN(pn, cb) {
  let pnColIdx = invHeaderNameToIndex['pn'];

  findInventoryItemInternal(pnColIdx, pn, cb);
}

export function findInventoryItemByLocation(loc, cb) {
  let locColIdx = invHeaderNameToIndex['loc'];

  findInventoryItemInternal(locColIdx, loc, cb);
}

export function getInventoryItemDirect(rowIdx, cb) {
  let rowNum = rowIdx + 2;  // First row is the headers
  invWorksheet.getCells(
    { 'min-row': rowNum, 'max-row': rowNum, 'min-col': 1, 'max-col': invNumCols, 'return-empty': true },
    function(err, cells) {
      if (err) {
        return cb(err, null);
      }

      let item = {};
      for (let cell of cells) {
        let colIdx = cell.col - 1;
        let colName = invHeaderIndexToName[colIdx];

        item[colName] = cell.value;
      }

      cb(null, item);
    });
}

export function getInventoryItem(rowIdx, cb) {
  if (rowIdx >= invTable.length) {
    return cb(new Error('Row index out of range'), null);
  }

  let row = invTable[rowIdx];

  let item = {};
  for (let cell of row) {
    let colIdx = cell.col - 1;
    let colName = invHeaderIndexToName[colIdx];

    item[colName] = cell.value;
  }

  cb(null, item);
}

function setInventoryItemInternal(rowIdx, rowNum, item, cb) {
  invWorksheet.getCells(
    { 'min-row': rowNum, 'max-row': rowNum, 'min-col': 1, 'max-col': invNumCols, 'return-empty': true },
    function(err, cells) {
      if (err) {
        return cb(err, null);
      }

      for (let col in item) {
        let colIdx = invHeaderNameToIndex[col];

        cells[colIdx].value = item[col];
      }

      invTable[rowIdx] = new Array(invNumCols);
      for (let i=0; i<cells.length; i++) {
        invTable[rowIdx][i] = cells[i];
      }

      invWorksheet.bulkUpdateCells(cells);

      cb(null, rowIdx);
    });
}

export function setInventoryItem(rowIdx, item, cb) {
  let rowNum = rowIdx + 2;  // First row is the headers
  if (rowNum > invWorksheet.rowCount) {
    invWorksheet.resize({ rowCount: invWorksheet.rowCount + 100 }, function(err) {
      if (err != null) {
        return cb(err, null);
      }

      invWorksheet.rowCount += 100;

      setInventoryItemInternal(rowIdx, rowNum, item, cb);
    });
  } else {
      setInventoryItemInternal(rowIdx, rowNum, item, cb);
  }
}

export function addInventoryItem(item, cb) {
  let newRowIdx = invTable.length;

  setInventoryItem(newRowIdx, item, cb);
}

export function isInternalPartNumber(pn) {
  let pnParts = pn.split('-');
  if (pnParts.length < 2)
    return false;

  let catIdx = catHeaderNameToIndex['cat'];
  for (let cat in catTable) {
    let catPrefix = cat[catIdx].value;

    if (pnParts[0] === catPrefix)
      return true;
  }

  return false;
}
