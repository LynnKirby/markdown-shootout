const commonmark = require("commonmark");

const reader = new commonmark.Parser();
const writer = new commonmark.HtmlRenderer();

require("./bench")(sample => {
  "use strict";

  const parsed = reader.parse(sample);
  return writer.render(parsed);
});
