import got from "got";
import cheerio from "cheerio";

const octopartLookup = require("./helpers/octopartLookup");

let dkPartID = 5195612;
got(`http://www.digikey.com/classic/ordering/leadtime.aspx?partid=${dkPartID}`, {
  headers: {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36"
  }
}).then(response => {
  console.log(response.body);
  const $ = cheerio.load(response.body);
  let dkPartNumber = $("#ctl00_ctl00_mainContentPlaceHolder_mainContentPlaceHolder_lblPartNumberValue").html();
  console.log(`Digi-Key PN: ${dkPartNumber}`);

  if (dkPartNumber) {
    // Look up on Octopart
    octopartLookup.lookupByDigiKeyPN(dkPartNumber, (err, octopartMPN, octopartMfr, octopartDesc, octopartCat) => {
      if (err) {
        return console.error(err);
      }

      console.log(`PN: ${dkPartNumber}`);
      console.log(`MPN: ${octopartMPN}`);
      console.log(`Mfr: ${octopartMfr}`);
      console.log(`Cat: ${octopartDesc}`);
      console.log(`Desc: ${octopartCat}`);
    });
  }
}).catch(error => {
  console.error(error);
  console.log(error.response.body);
});
