import * as assert from "assert";

class AppState {
  constructor() {
    this.activePage = null;

    this.loadingScreenCounter = 0;
  }

  init(pages) {
    this.pages = pages;

    let pageNameDict = {};
    for (let page of pages) {
      pageNameDict[page.pageName] = page;
    }
    this.pageNameDict = pageNameDict;

    for (let page of this.pages) {
      page.onInitialize(this);
    }

    this.displayLoadingScreen(true);
  }

  onDataReady() {
    for (let page of this.pages) {
      page.onDataReady();
    }

    document.querySelector("#loading").style.display = "none";

    let firstPage = this.pages[0];
    this.changePage(firstPage.pageName);
  }

  changePage(newPageName) {
    if (this.activePage) {
      // if (this.activePage.pageName === newPageName) {
      //   return;
      // }

      this.displayLoadingScreen(true);
      this.activePage.onExit();
    }

    this.activePage = this.pageNameDict[newPageName];
    this.activePage.onEnter();

    this.displayLoadingScreen(false);
  }

  displayLoadingScreen(isLoading) {
    this.loadingScreenCounter += (isLoading) ? 1 : -1;
    assert.ok(this.loadingScreenCounter >= 0, "Too many calls to hide the loading screen without it being shown first.");

    let currentlyLoading = this.loadingScreenCounter > 0;

    if (currentlyLoading) {
      if (this.activePage) {
        this.activePage.hidePage();
      }
      document.querySelector("#loading").style.display = "flex";
    } else {
      document.querySelector("#loading").style.display = "none";
      if (this.activePage) {
        this.activePage.showPage();
      }
    }
  }
}

export default AppState;
