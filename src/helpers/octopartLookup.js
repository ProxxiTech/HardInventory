const octopartjs = require("octopartjs");


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

export default (mpn, cb) => {
  var queries = [
    {"mpn": mpn, "reference": "line1"}
  ];

  var args = {
    queries: JSON.stringify(queries),
    "include[]": "descriptions"
  };

  octopartjs.parts.match(args, (err, body) => {
    if (err)
      return cb(err, null);

    let mfr;
    let desc;

    // console.log(JSON.stringify(body, null, 4));
    if (body.results.length > 0) {
      if (body.results[0].items.length > 0) {
        let item = body.results[0].items[0];

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
      }
    }

    cb(null, mfr, desc);
  });
};
