const path = require("path");
const merge = require("webpack-merge");
const base = require("./webpack.base.config");

module.exports = env => {
  return merge(base(env), {
    context: path.resolve(__dirname, "../src"),
    entry: {
      background: "./background.js",
      app: "./app.js",
      print_barcode: "./print_barcode.js"
    },
    output: {
      filename: "[name].js",
      path: path.resolve(__dirname, "../app")
    }
  });
};
