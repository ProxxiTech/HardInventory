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

export default AppState;
