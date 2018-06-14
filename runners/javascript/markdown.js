const md = require("markdown").markdown;

require("./bench")(sample => {
  "use strict";

  return md.toHTML(sample);
});
