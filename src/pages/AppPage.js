class AppPage {
  constructor(data) {
    this.pageName = data.pageName;
    this.state = data.state;

    this.isActive = false;
  }

  getPageDocElement() {
    return document.querySelector(`#${this.pageName}-page`);
  }

  onInitialize() {
    let el = this.getPageDocElement();
    if (el != null) {
      el.style.display = "none";
    }
  }

  onEnter() {
    this.isActive = true;

    let el = this.getPageDocElement();
    if (el != null) {
      el.style.display = "flex";
    }
  }

  onExit() {
    this.isActive = false;

    let el = this.getPageDocElement();
    if (el != null) {
      el.style.display = "none";
    }
  }
}

export default AppPage;
