const remark = require("remark");
const html = require("remark-html");

require("./bench")(sample => {
  "use strict";

  return String(remark().use(html).processSync(sample));
});
