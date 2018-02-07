import { expect } from "chai";
import testUtils from "./utils";

describe("application launch", () => {
  beforeEach(testUtils.beforeEach);
  afterEach(testUtils.afterEach);

  it("shows 'Hard Inventory' text on screen after launch", function() {
    return this.app.client.getText("#heading").then(text => {
      expect(text).to.equal("Hard Inventory");
    });
  });
});
