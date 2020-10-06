const sadab = {
  name: "Sadab",
  site: {
    url: "https://www.sadab.se/",
    treat: (markup) =>
      markup.replace(/(<script(.|\r\n|\n)*?<\/script>)/gm, (e, p1) => {
        if (p1 === `<script defer src="/build/bundle.js"></script>`) {
          return p1;
        }
        return "";
      }),
    test: (document) => {
      return (
        [...document.querySelectorAll("H2")]
          .map((x) => x.innerHTML)
          .filter((x) => x.includes("Flex"))[0] === "Extreme Flexibility"
      );
    },
  },
};

module.exports = sadab;
