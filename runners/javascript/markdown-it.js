const md = require("markdown-it")({
  html: true,
  linkify: false,
  typographer: false,
});

require("./bench")(sample => {
  "use strict";

  return md.render(sample);
});
