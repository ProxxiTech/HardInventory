import { Grid } from "ag-grid";

import barcodeScanner from "../helpers/barcodeScanner";

import * as spreadsheet from "../spreadsheet/spreadsheet";

import AppPage from "./AppPage";


class CategoriesPage extends AppPage {
  constructor(data) {
    super(data);
  }

  onInitialize(appState) {
    super.onInitialize(appState);

    this.nextRowID = 1001;
    this.changedRow = {};

    this.Elements = {};
    let elementNames = [
      "grid",
    ];
    for (let name of elementNames) {
      this.Elements[name] = document.querySelector(`#${this.pageName}-${name}`);
    }
  }

  allocateRowID() {
    return this.nextRowID++;
  }

  onDataReady() {
    super.onDataReady();

    let columnDefs = [];
    for (let i=0; i<spreadsheet.catNumCols; i++) {
      let catName = spreadsheet.catHeaderIndexToName[i];

      let colDef = {
        field: catName,
        headerName: catName
      };
      columnDefs.push(colDef);
    }

    columnDefs[0].width = 150;
    columnDefs[0].maxWidth = 150;
    columnDefs[0].suppressSizeToFit = true;
    // columnDefs[0].suppressSorting = false;
    columnDefs[0].sort = "asc";
    columnDefs[0].comparator = (valueA, valueB, nodeA, nodeB, isInverted) => {
      if (nodeA.data.isNew) {
        return isInverted ? -1 : 1;
      }
      if (nodeB.data.isNew) {
        return isInverted ? 1 : -1;
      }

      return valueA - valueB;
    };
    columnDefs[0].valueGetter = (params) => {
      let val = params.data[params.colDef.field];
      if (val === null) {
        return null;
      }
      return parseInt(val, 10);
    };
    // columnDefs[0].valueFormatter = (params) => {
    //   return params.value.toString();
    // };
    columnDefs[0].filter = "agNumberColumnFilter";
    columnDefs[0].filterParams = { inRangeInclusive: true };
    columnDefs[0].cellRenderer = (params) => {
      if ((params.value !== null) && (params.value !== "")) {
        return params.value.toString();
      }

      return "<span style='opacity: 0.38;'>new</style>";
    };

    let rowData = [];
    for (let i=0; i<spreadsheet.getCategoryItemCount(); i++) {
      let item = spreadsheet.getCategoryItem(i);

      rowData.push({
        ...item,
        itemIndex: i,
        rowID: this.allocateRowID(),
        isNew: false
      });
    }

    let blankItem = {};
    for (let i=0; i<spreadsheet.catNumCols; i++) {
      let catName = spreadsheet.catHeaderIndexToName[i];
      blankItem[catName] = null;
    }
    rowData.push({
      ...blankItem,
      itemIndex: spreadsheet.getCategoryItemCount(),
      rowID: this.allocateRowID(),
      isNew: true
    });

    this.gridOptions = {
      columnDefs: columnDefs,
      rowData: rowData,

      getRowNodeId: (data) => {
        return data.rowID;
      },

      defaultColDef: {
        editable: true,
        // suppressSorting: true,
        // valueGetter: (params) => {
        //   let val = params.data[params.colDef.field];
        //   if (val === null) {
        //     return null;
        //   }
        //   return val.toString().trim();
        // },
        filter: "agTextColumnFilter",
        // filterParams: {
        //   textFormatter: (gridValue) => {
        //     return gridValue.toString().trim().toLowerCase();
        //   }
        // },
        cellRenderer: (params) => {
          if ((params.value !== null) && (params.value !== "")) {
            return params.value;
          }

          return "<span style='opacity: 0.38;'>Double-click to edit</style>";
        },

        comparator: (valueA, valueB, nodeA, nodeB, isInverted) => {
          if (nodeA.data.isNew) {
            return isInverted ? -1 : 1;
          }
          if (nodeB.data.isNew) {
            return isInverted ? 1 : -1;
          }

          return valueA.localeCompare(valueB);
        }
      },

      suppressMovableColumns: true,
      enableSorting: true,
      enableColResize: true,
      enableFilter: true,
      suppressRowDrag: true,

      editType: "fullRow",
      stopEditingWhenGridLosesFocus: true,
      rowSelection: "single",
      rowDeselection: true,
      suppressScrollOnNewData: true,
      // pagination: true,
      // paginationAutoPageSize: true,

      // onGridReady: (params) => {
      // },

      onCellValueChanged: (params) => {
        // console.log(`Column ${params.colDef.field} changed of row ${params.data.itemIndex} from ${params.oldValue} to ${params.newValue} (${params.value})`);

        this.changedRow[params.colDef.field] = (typeof params.newValue === "string") ? params.newValue.trim() : params.newValue;
      },
      onRowValueChanged: (params) => {
        // console.log(`Row ${params.data.itemIndex} changed`);

        let item = spreadsheet.getCategoryItem(params.data.itemIndex);
        let updatedRow = {
          ...item,
          ...this.changedRow
        };

        this.changedRow = {};

        let isCleared = true;
        for (let [, value] of Object.entries(updatedRow)) {
          isCleared = isCleared && !value;
        }
        if (isCleared) {
          // Remove item
          if (!params.data.isNew) {
            spreadsheet.removeCategoryItem(params.data.itemIndex, (err) => {
              if (err != null) {
                return console.error(err);
              }

              let updateList = [];
              for (let row of rowData) {
                if (row.itemIndex > params.data.itemIndex) {
                  row.itemIndex--;
                  updateList.push(row);
                }
              }

              rowData.splice(params.data.itemIndex, 1);

              let transaction = {
                remove: [params.data],
                update: updateList
              };
              params.api.updateRowData(transaction);
            });
          }
        } else {
          if (params.data.isNew) {
            // Add item
            spreadsheet.addCategoryItem(updatedRow, (err, rowIdx) => {
              if (err != null) {
                return console.error(err);
              }

              params.data.itemIndex = rowIdx;
              params.data.isNew = false;

              // We just used up our empty item; add a new one
              setTimeout(() => {
                let blankItem = {};
                for (let i=0; i<spreadsheet.catNumCols; i++) {
                  let catName = spreadsheet.catHeaderIndexToName[i];
                  blankItem[catName] = null;
                }

                let newItem = {
                  ...blankItem,
                  itemIndex: spreadsheet.getCategoryItemCount(),
                  rowID: this.allocateRowID(),
                  isNew: true
                };

                rowData.push(newItem);

                let transaction = {
                  add: [newItem]
                };
                params.api.updateRowData(transaction);
              }, 0);
            });
          } else {
            // Update item
            spreadsheet.setCategoryItem(params.data.itemIndex, updatedRow, (err) => {
              if (err != null) {
                return console.error(err);
              }
            });
          }
        }
      },
    };

    new Grid(this.Elements.grid, this.gridOptions);
  }

  onScanBarcodeCompleted({ internalPN/*, locationID, manufacturerPN*/ }) {
    if (internalPN) {
      // No validation needed; we only have an internalPN here when it's already been validated
      let pnPrefixEnd = internalPN.indexOf("-");
      let pnCategory = internalPN.substring(0, pnPrefixEnd);

      let filterComponent = this.gridOptions.api.getFilterInstance("Category");
      // let model = filterComponent.getModel();
      filterComponent.setModel({
        type: "equals",  // One of: {equals, notEqual, lessThanOrEqual, greaterThan, greaterThanOrEqual, inRange}
        filter: parseInt(pnCategory, 10),
        // filterTo: 0 // Only valid for inRange, otherwise unused
      });
      filterComponent.onFilterChanged();
    }
  }

  onEnter() {
    super.onEnter();

    this.onCaptureEndHandle = barcodeScanner.addListener("onCaptureEnd", (barcodeData) => {
      this.onScanBarcodeCompleted(barcodeData);
    });
  }

  showPage() {
    super.showPage();

    this.gridOptions.api.sizeColumnsToFit();
  }

  onExit() {
    super.onExit();

    barcodeScanner.removeListener("onCaptureEnd", this.onCaptureEndHandle);
  }
}

export default CategoriesPage;
