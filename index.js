#!/usr/bin/env node
const madge = require("madge");
const path = require("path");
const packageJSON = require(path.resolve(process.cwd(), "package.json"));

try {
  main();
} catch (e) {
  console.error("Error while running next-unused:", e);
}

function main() {
  const userConfig = packageJSON["next-unused"] || {};

  const {
    debug,
    include = [],
    exclude = [],
    entrypoints: userEntrypoints = [],
  } = userConfig;

  if (debug) {
    if (include.length) {
      console.log(`[debug] Found include config: ${include}`);
    }

    if (exclude.length) {
      console.log(`[debug] Found exclude config: ${exclude}`);
    }

    if (userEntrypoints.length) {
      console.log(`[debug] Found entrypoints config: ${userEntrypoints}`);
    }
  }

  for (const entrypoint of userEntrypoints) {
    if (!include.includes(entrypoint)) {
      include.push(entrypoint);

      if (debug) {
        console.log(
          `[debug] Entrypoint "${entrypoint}" is missing in includes, adding it`
        );
      }
    }
  }

  const userSearchDirs = include.length ? include.join("|") : "";

  const searchDirs = new RegExp(
    `^(?!(${
      userSearchDirs.includes("pages") ? "" : "pages|"
    }${userSearchDirs}))`,
    "i"
  );

  if (debug === true) {
    console.log(`[debug] Using exclude regex: ${[searchDirs, ...exclude]}`);
  }

  const madgePath = [
    path.resolve(process.cwd(), "pages"),
  ]

  include.forEach((inc) => {
    madgePath.push(path.resolve(process.cwd(), inc))
  })

  madge(madgePath, {
    webpackConfig: path.resolve(__dirname, "madge.webpack.js"),
    tsConfig: path.resolve(process.cwd(), "tsconfig.json"),
    excludeRegExp: [searchDirs, ...exclude, "(^|\/)(\.(?!\.).+)$"],
    fileExtensions: ["js", "jsx", "ts", "tsx"],
  }).then((res) => {
    const tree = res.obj();
    const entrypoints = Object.keys(tree).filter((f) => {
      return (
        f.startsWith("pages/") ||
        userEntrypoints.some((x) => f.startsWith(x.includes("/") ? x : `${x}/`))
      );
    });
    if (debug) {
      console.log("[debug] Found entrypoints");
      console.log(entrypoints);
    }
    if (!entrypoints.length) {
      return console.log("No entrypoints found.");
    }
    pruneTree(entrypoints, tree);
    const unusedFilenames = Object.keys(tree);
    if (!unusedFilenames.length) {
      console.log("No unused files!");
    } else {
      console.log(
        `Found ${unusedFilenames.length} unused ${
          unusedFilenames.length === 1 ? "file" : "files"
        }:`
      );
      unusedFilenames.map((f) => console.log(f));
    }
  });
}

function pruneTree(subtree, tree) {
  if (!subtree || subtree.length === 0) return;

  for (let child of subtree) {
    const nextSubtree = tree[child];

    if (tree[child]) {
      delete tree[child];
    }

    pruneTree(nextSubtree, tree);
  }
}
