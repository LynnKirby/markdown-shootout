const md = require("marked");

require("./bench")(sample => {
  "use strict";

  return md(sample);
});
