const showdown = require("showdown");

const converter = new showdown.Converter();

require("./bench")(sample => {
  "use strict";

  return converter.makeHtml(sample);
});
