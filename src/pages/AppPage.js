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
    if (isLoading) {
      this.hidePage();
      document.querySelector("#loading").style.display = "block";
    } else {
      document.querySelector("#loading").style.display = "none";
      this.showPage();
    }
  }

  onInitialize() {
    this.hidePage();
  }

  onEnter() {
    this.isActive = true;

    this.showPage();
  }

  onExit() {
    this.isActive = false;

    this.hidePage();
  }
}

export default AppPage;
