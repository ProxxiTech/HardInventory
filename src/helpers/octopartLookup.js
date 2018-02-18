import octopartjs from "octopartjs";

import * as spreadsheet from "../spreadsheet/spreadsheet";


function findOctopartDescription(item, source) {
  for (let d in item.descriptions) {
    let desc = item.descriptions[d];

    for (let s in desc.attribution.sources) {
      let src = desc.attribution.sources[s];

      if (src.name === source) {
        return d.value;
      }
    }
  }

  return null;
}

function hasMatchingCategory(categories, cat) {
  cat = cat.toLowerCase();

  // TODO: The categories are hierarchical, but may be in any order - we should search them depth-first
  for (let [/*uid*/, catObj] of Object.entries(categories)) {
    let catName = catObj.name.toLowerCase();

    if (catName.indexOf(cat) >= 0) {
      return true;
    }
  }

  return false;
}

function findCategory(cat) {
  cat = cat.toLowerCase();

  let count = spreadsheet.getCategoryItemCount();
  for (let catIdx=0; catIdx<count; catIdx++) {
    let catItem = spreadsheet.getCategoryItem(catIdx);

    let lcDesc = catItem["Description"].toLowerCase();
    if (lcDesc.indexOf(cat) >= 0) {
      return catItem["Category"];
    }
  }

  console.error(`Cannot find category matching ${cat}, but it should exist. Check spreadsheet.`);
  return null;
}

function performLookup(queries, cb) {
  var args = {
    queries: JSON.stringify(queries),
    "include[0]": "descriptions",
    "include[1]": "category_uids",
  };

  octopartjs.parts.match(args, (err, body) => {
    if (err)
      return cb(err);

    let mpn;
    let mfr;
    let desc;
    let cat;

    // console.log(JSON.stringify(body, null, 4));
    if (!body.results || !body.results.length || !body.results[0].items || !body.results[0].items.length) {
      return cb(null);
    }

    let item = body.results[0].items[0];

    mpn = item.mpn;
    mfr = item.manufacturer.name;

    // console.log(JSON.stringify(item.descriptions, null, 4));

    desc = findOctopartDescription(item, mfr);
    if (desc == null)
      desc = findOctopartDescription(item, "Digi-Key");
    if (desc == null)
      desc = findOctopartDescription(item, "Arrow");
    if (desc == null)
      desc = findOctopartDescription(item, "Mouser");
    if (desc == null)
      desc = findOctopartDescription(item, "Avnet");
    if (desc == null) {
      if (item.descriptions.length > 0)
        desc = item.descriptions[0].value;
    }

    let uids = {};
    for (let i=0; i<item.category_uids.length; i++) {
      let uid = item.category_uids[i];
      uids[`uid[${i}]`] = uid;
    }
    octopartjs.categories.get_multi(uids, (err, results) => {
      if (err) {
        // Call the CB anyway (with no error), as categories aren't that
        // important and maybe Octopart is missing some data?
        cb(null, mpn, mfr, desc, cat);

        return console.error(err);
      }

      // console.log(JSON.stringify(results, null, 4));

      // Find an appropriate category (best guess)
      if (hasMatchingCategory(results, "resistor")) {
        cat = findCategory("resistor");
      } else if (hasMatchingCategory(results, "capacitor")) {
        cat = findCategory("capacitor");
      } else if (hasMatchingCategory(results, "transistor")) {
        cat = findCategory("discrete");
      } else if (hasMatchingCategory(results, "diode")) {
        cat = findCategory("discrete");
      } else if (hasMatchingCategory(results, "leds")) {
        cat = findCategory("discrete");
      } else if (hasMatchingCategory(results, "inductor")) {
        cat = findCategory("discrete");
      } else if (hasMatchingCategory(results, "crystal")) {
        cat = findCategory("discrete");
      } else if (hasMatchingCategory(results, "antenna")) {
        cat = findCategory("discrete");
      } else if (hasMatchingCategory(results, "coil")) {
        cat = findCategory("discrete");
      } else if (hasMatchingCategory(results, "connector")) {
        cat = findCategory("connector");
      } else if (hasMatchingCategory(results, "integrated")) {
        cat = findCategory("integrated");
      } else if (hasMatchingCategory(results, "ics")) {
        cat = findCategory("integrated");
      }

      //
      cb(null, mpn, mfr, desc, cat);
    });
  });
}

export function lookupByMPN(mpn, cb) {
  var queries = [
    {"mpn": mpn, "reference": "line1"}
  ];

  performLookup(queries, cb);
}

export function lookupByDigiKeyPN(pn, cb) {
  var queries = [
    {"sku": pn, "seller": "Digi-Key", "reference": "line1"}
  ];

  performLookup(queries, cb);
}
