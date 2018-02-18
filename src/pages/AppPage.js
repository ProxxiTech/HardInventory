class AppPage {
  constructor(data) {
    this.pageName = data.pageName;
    this.state = data.state;

    this.isActive = false;
  }

  getPageDocElement() {
    return document.querySelector(`#${this.pageName}-page`);
  }

  showPage() {
    let el = this.getPageDocElement();
    if (el != null) {
      el.style.display = "flex";
    }
  }

  hidePage() {
    let el = this.getPageDocElement();
    if (el != null) {
      el.style.display = "none";
    }
  }

  displayLoadingScreen(isLoading) {
    this.appState.displayLoadingScreen(isLoading);
  }

  onInitialize(appState) {
    this.appState = appState;

    this.hidePage();
  }

  onDataReady() {
    // Spreadsheet data has been loaded
  }

  onEnter() {
    this.isActive = true;
  }

  onExit() {
    this.isActive = false;
  }
}

export default AppPage;
