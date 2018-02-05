const path = require("path");
const nodeExternals = require("webpack-node-externals");
// const webpack = require("webpack");
const FriendlyErrorsWebpackPlugin = require("friendly-errors-webpack-plugin");

module.exports = env => {
  return {
    target: "node",
    node: {
      __dirname: false,
      __filename: false
    },
    externals: [nodeExternals()],
    resolve: {
      // modules: [
      //   path.resolve(__dirname, "../node_modules"),
      //   "node_modules",
      //   path.resolve(__dirname, "../app")
      // ],
      extensions: [".js", ".json", ".jsx", ".css", "*"],
      alias: {
        env: path.resolve(__dirname, `../config/env_${env}.json`)//,
        // node_modules: path.resolve(__dirname, "../node_modules")
      }
    },
    devtool: "source-map",
    module: {
      rules: [
        {
          test: (inp) => {
            console.log(JSON.stringify(inp, null, 4));
            return false;
          },
          use: [
          ]
        },
        {
          test: /\.css$/,
          use: [
            {
              loader: "style-loader"
            },
            {
              loader: "css-loader",
              options: {
                // modules: true
              }
            }
          ]
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: [
            {
              loader: "babel-loader",
              options: {
                presets: [
                  [
                    "@babel/preset-env", {
                      "targets": {
                        "node": "current"
                      }
                    }
                  ]
                ]
              }
            }
          ]
        },
        {
          test: /\.jsx$/,
          use: [
            {
              loader: "babel-loader",
              options: {
                presets: [
                  [
                    "@babel/preset-env", {
                      "targets": {
                        "node": "current"
                      }
                    }
                  ]
                ]
              }
            }
          ]
        },
        {
          test: /\.(svg|png|jpg|jpeg|gif)$/,
          include: /styles\//,
          use: [
            {
              loader: "url-loader",
            }
          ]
        },
        {
          test: /\.(svg|png|jpg|jpeg|gif)$/,
          exclude: /styles\//,
          use: [
            {
              loader: "file-loader",
              options: {
                name: "images/[name].[ext]"
              }
            }
          ]
        },
        {
          test: /\.(eot|otf|ttf|woff|woff2)$/,
          use: [
            {
              loader: "file-loader",
              options: {
                name: "fonts/[name].[ext]"
              }
            }
          ]
        }
      ]
    },
    plugins: [
      new FriendlyErrorsWebpackPlugin({ clearConsole: env === "development" })//,
      // new webpack.LoaderOptionsPlugin({ debug: true })
    ]
  };
};
