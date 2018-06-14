const MarkdownDeep = require("markdowndeep");

const md = new MarkdownDeep.Markdown();

require("./bench")(sample => {
  "use strict";

  return md.Transform(sample);
});
