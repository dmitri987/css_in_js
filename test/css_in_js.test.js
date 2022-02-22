// import { describe, it, fn } from "../node_modules/mocha/";
// import chai from "../node_modules/chai/index.mjs";
import {
  combineNestedSelectors,
  createStyleSheet,
  deleteStyleSheet,
  parseStyleRules,
  stylesheets,
  createRegExp,
} from "../src/css_in_js.mjs";

const { expect } = chai;

describe(`combineNestedSelectors(selectors: string[]): string`, () => {
  it("if 'selectors' == [], null, undefined or any other type, return null", () => {
    const expected = null;
    expect(combineNestedSelectors()).to.be.equal(expected);
    expect(combineNestedSelectors(null)).to.be.equal(expected);
    expect(combineNestedSelectors([])).to.be.equal(expected);
    expect(combineNestedSelectors({})).to.be.equal(expected);
  });

  it(`if 'selectors' contains something other than strings, return null`, () => {
    expect(combineNestedSelectors(["a", 1, true])).to.be.null;
  });

  it(`if 'selectors' has only one element, just return it`, () => {
    const selectors = ["body > div"];
    expect(combineNestedSelectors(selectors)).to.be.equal(selectors[0]);
  });

  it(`nested selector segment (second element and higher) can have placeholder '&', which will be replaced with parent selector`, () => {
    const selectors = [".foo", "&__active", "body > &"];
    expect(combineNestedSelectors(selectors)).to.be.equal(
      "body > .foo__active"
    );
  });

  it(`segment can have multiple selectors, separated by ','; they should be splited and individually combined with nested selectors`, () => {
    const selectors = ["img, span", "div, .foo"];
    expect(combineNestedSelectors(selectors))
      .to.include("img div")
      .to.include("img .foo")
      .to.include("span div")
      .to.include("span .foo");
  });

  it(`should create all combinations of all nested selectors and return them separated with ','`, () => {
    const selectors = ["img, span", "div, .foo", "#id, pre"];
    expect(combineNestedSelectors(selectors).split(",").length).to.be.equal(8);
  });

  it(`returned string should contain only unique selectors`, () => {
    const selectors = ["div, div", "img, img", ".foo, #id"];
    expect(combineNestedSelectors(selectors).split(",").length).to.be.equal(2);
  });
});

describe(`createStyleSheet(): CSSStyleSheet`, () => {
  it(`should add new HTMLStyleElement to the DOM and return its CSSStyleSheet representation`, () => {
    const prevCount = document.styleSheets.length;
    const ss = createStyleSheet();
    expect(ss).to.be.instanceOf(CSSStyleSheet);
    expect(document.styleSheets.length - prevCount).to.be.equal(1);
    expect(ss.ownerNode).to.be.instanceOf(HTMLStyleElement);
    deleteStyleSheet(ss);
  });
});

describe(`deleteStyleSheet(styleSheet: CSSStyleSheet): boolean`, () => {
  it(`should delete 'stylesheet' and return true on success, or false othewise`, () => {
    const prevCount = document.styleSheets.length;
    const ss = createStyleSheet();
    expect(deleteStyleSheet(ss)).to.be.true;
    expect(document.styleSheets.length).to.be.equal(prevCount);
  });

  it(`should delete only stylesheets added by createStyleSheet()`, () => {
    const style = document.createElement("style");
    document.body.appendChild(style);
    const prevCount = document.styleSheets.length;
    const ss = document.styleSheets[0];

    expect(deleteStyleSheet(ss)).to.be.false;
    expect(document.styleSheets.length).to.be.equal(prevCount);
    style.remove();
  });
});

describe(`stylesheets(styleSheets?: CSSStyleSheet|CSSStyleSheet[]): CSSStyleSheet[]`, () => {
  it(`should return Array of CSSStyleSheet's`, () => {
    expect(stylesheets()).to.be.instanceOf(Array);
  });

  it(`'styleSheets' argument should be single CSSStyleSheet or any iterable container of CSSStyleSheet`, () => {
    const style = document.createElement("style");
    document.body.appendChild(style);
    const ss = document.styleSheets[0];
    expect(stylesheets(ss).length).to.be.equal(1);
    expect(stylesheets(document.styleSheets)).to.be.deep.eql([
      ...document.styleSheets,
    ]);

    const sss = [createStyleSheet(), createStyleSheet(), createStyleSheet()];
    expect(stylesheets(sss)).to.be.deep.eql(sss);

    sss.forEach((s) => deleteStyleSheet(s));
    style.remove();
  });

  it(`both stylesheets() and returned array should have 'default' property, which refers to default stylesheet`, () => {
    expect(stylesheets)
      .to.have.property("default")
      .that.is.instanceOf(CSSStyleSheet);

    expect(stylesheets())
      .to.have.property("default")
      .that.is.instanceOf(CSSStyleSheet);

    expect(stylesheets.default).to.be.equal(stylesheets().default);
  });

  it(`'default' stylesheet should be the same for all stylesheets() invocations`, () => {
    expect(stylesheets().default).to.be.equal(stylesheets().default);
  });

  it(`when called without arguments, should contain one default stylesheet`, () => {
    expect(stylesheets().length).to.be.equal(1);
    expect(stylesheets()[0]).to.be.equal(stylesheets.default);
  });

  it(`when called with arguments, should not contain default stylesheet`, () => {
    const sss = [createStyleSheet(), createStyleSheet()];
    expect(sss).to.not.contain(sss.default);
    sss.forEach((s) => deleteStyleSheet(s));
  });

  it(`should have 'rule()' property (see rules() tests)`, () => {
    expect(stylesheets())
      .to.have.property("rules")
      .that.is.instanceOf(Function);
  });
});

describe(`rules(filter?: string | string[] | RegExp | Query)`, () => {
  it(`should return empty array, if there are no rules in observed stylesheets (returned by 'stylesheets()')`, () => {
    expect(stylesheets().rules()).to.be.instanceOf(Array).and.to.be.empty;
  });

  it(`rule() should return CSSRule[]; number of rules must be sum of all rules in observed stylesheets`, () => {
    const ss = createStyleSheet();
    ss.insertRule(`.foo { color: red; }`, 0);
    ss.insertRule(`.bar { color: green; }`, 1);

    const ss2 = createStyleSheet();
    ss2.insertRule(`.baz { color: blue; }`);
    const css = stylesheets([ss, ss2]);
    expect(css.rules()).to.have.lengthOf(3);
    expect(css.rules()[0].style).to.have.property("color", "red");
    // expect(stylesheets().rules())

    deleteStyleSheet(ss);
    deleteStyleSheet(ss2);
  });
});

/*******  parseStyleRules  ********/
describe(`parseStyleRules(textStyleRule?: string): RuleSet | StyleSet`, () => {
  it(`can be used as function and tagged template (parseStyleRules\` .foo { color: red; }\`)`, () => {
    expect(parseStyleRules(".foo { color: red; }")).to.be.deep.eql(
      parseStyleRules`.foo { color: red; }`
    );
  });

  it(`should return {} if 'textStyleRule' is not a string or empty string`, () => {
    expect(parseStyleRules()).to.be.empty.and.to.be.an("object");
    expect(parseStyleRules("")).to.be.empty.and.to.be.an("object");
    expect(parseStyleRules(42)).to.be.empty.and.to.be.an("object");
    expect(parseStyleRules({})).to.be.empty.and.to.be.an("object");
    expect(parseStyleRules(``)).to.be.empty.and.to.be.an("object");
  });

  it(`property should always have string value (even for numbers)`, () => {
    expect(parseStyleRules`
      width: 0;
      opacity: 0.5;   
    `).to.be.eql({ width: "0", opacity: "0.5" });
  });

  it(`should ignore properties with empty values`, () => {
    expect(parseStyleRules(`width: ; color: red;`)).to.be.eql({ color: "red" });
    expect(
      parseStyleRules(`
      .foo {
        width: ; 
        color: red;
      }`)
    ).to.be.deep.eql({ ".foo": { color: "red" } });
  });

  it(`should ignore empty rules (without valid properties)`, () => {
    expect(parseStyleRules`
      body {}
    `).to.be.empty;

    expect(parseStyleRules`
      body {
        width: 10px
      }
    `).to.be.empty;
  });

  it(`should remove /* multi line comments */ and // one line comments`, () => {
    expect(parseStyleRules`
      body > div { // comment
        opacity: /*
           multi line
           comment
         */ 0.5;
      }`).to.be.deep.eql({
      "body > div": {
        opacity: "0.5",
      },
    });
  });

  it(`multiple consecutive whitespaces, tabs, newlines should be replaced with single whitespace`, () => {
    expect(parseStyleRules`
        div     >    
           img 
             {
               background-color   :   rgba(0  ,  0,
                                                     0, 0.5);
             }
      `).to.be.deep.eql({
      "div > img": {
        "background-color": "rgba(0, 0, 0, 0.5)",
      },
    });
  });
  it(`properties should be delimited by ';', except when a property is the last token in the string and there is no } or { after it`, () => {
    expect(parseStyleRules`
          width: 10rem
          color: red;
        `).to.not.have.keys("color");

    expect(parseStyleRules`
          .foo {
            width: 10rem;
            color: red
          }
        `).to.be.deep.eql({
      ".foo": {
        width: "10rem",
      },
    });

    expect(parseStyleRules`
          width: 10rem;
          color: red
        `).to.be.deep.eql({ width: "10rem", color: "red" });
  });

  it(`should return StyleSet for text with properties only (without rule selector); properties must be delimited with ';'`, () => {
    expect(parseStyleRules`
        width: 10px;
        color: red;
      `).to.be.eql({ width: "10px", color: "red" });
  });

  it(`when a property is duplicated, the last occurence takes precedence: 'color: blue; color: red;' => 'color: red'`, () => {
    expect(parseStyleRules`color: blue; color: red`).to.be.eql({
      color: "red",
    });
  });

  it(`should combine nested properties with '-': padding: 
      {inline: { start: 1rem; end: 2rem; }} => padding-inline-start: 1rem; padding-inline-end; 2rem;`, () => {
    expect(parseStyleRules`
      padding: {
        inline: {
          start: 1rem;
          end: 2rem;
        }
      }
    `).to.be.deep.eql({
      "padding-inline-start": "1rem",
      "padding-inline-end": "2rem",
    });
  });

  it(`a segment of nested property can have value; at least one whitespace between the value and preceding ':' is requied: 
     margin: auto { right: 1rem; } => margin: auto; margin-right: 1rem;`, () => {
    expect(parseStyleRules`
        margin: auto {
          right: 1rem;
        }
      `).to.be.deep.eql({
      margin: "auto",
      "margin-right": "1rem",
    });
  });

  it(`should throw error, if there is no whitespace between ':' and property segment value`, () => {
    expect(
      () => parseStyleRules`
      margin:auto {
        right: 1rem;
      }
    `
    ).to.throw();
  });

  it(`if nested property segment has value, but deeper segments - don't, then should return segment with value: maring: auto {}  =>  margin: auto`, () => {
    expect(parseStyleRules`
      margin: auto {}
    `).to.be.eql({ margin: "auto" });
  });

  it(`if any of nested property segments has value, then ignore all of them`, () => {
    expect(parseStyleRules`
      margin: {
        inline: {
          
        }
      }
    `).to.be.empty;
  });

  it(`selectors of single rule can be combined with ',': 'div > img, div > #id'`, () => {
    expect(parseStyleRules` div > img, #id { color: red; }`).to.be.deep.eql({
      "div > img, #id": {
        color: "red",
      },
    });
  });

  it(`selectors can be spanned to multiple line; resulting selector is always one line`, () => {
    expect(parseStyleRules`
      body,
      div { 
        width: 10rem;
      }
    `).to.be.deep.eql({
      "body, div": {
        width: "10rem",
      },
    });
  });

  it(`should understand attribute-based selectors: [attr^="foo"]`, () => {
    expect(parseStyleRules`
      [attr^$|*="'foo'"] >+~ p {
        color: red;
      }
    `).to.be.deep.eql({
      "[attr^$|*=\"'foo'\"] >+~ p": {
        color: "red",
      },
    });
  });

  it(`should understand valid pseudo-classes in selectors`, () => {
    expect(parseStyleRules` p:hover { color: red; }`).to.be.deep.eql({
      "p:hover": {
        color: "red",
      },
    });

    expect(parseStyleRules` ::before { color: red; }`).to.be.deep.eql({
      "::before": {
        color: "red",
      },
    });
  });

  it(`should throw error on invalid pseudo-classes`, () => {
    expect(() => parseStyleRules`:foo { color: red; }`).to.throw();
  });

  it(`should combine nested selectors; nested selector can have placeholder '&', which will be replaced with content of parent selector`, () => {
    expect(parseStyleRules`
      div {
        &__active {
          color: red;
        }
      }
    `).to.be.deep.eql({
      div__active: {
        color: "red",
      },
    });
  });

  it(`should combine nested selectors with single whitespace if there is no placeholder '&'`, () => {
    expect(parseStyleRules`
      div {
        img {
          color: red;
        }
      }
    `).to.be.deep.eql({
      "div img": {
        color: "red",
      },
    });
  });

  it(`should create all possible unique combinations of nested selectors and combine them in one line, delimited with ','`, () => {
    expect(parseStyleRules`
      div, section {
        .foo, & + #id {
          &:hover {
            color: red;
          }
        }
      }
    `).to.be.deep.eql({
      "div .foo:hover, div + #id:hover, section .foo:hover, section + #id:hover":
        {
          color: "red",
        },
    });
  });

  it(`property can go after nested rule`, () => {
    expect(parseStyleRules`
      width: 1rem;
      body {
        img {
          color: red;
        }
      }
      opacity: 0;
    `).to.be.deep.eql({
      width: "1rem",
      opacity: "0",
      "body img": {
        color: "red",
      },
    });
  });

  it(`@rule ending with ';' (like @import) should be stored on top of returned RuleSet in key; its value can be any`, () => {
    expect(parseStyleRules`
      @import url("style.css") screen;
    `).to.have.all.keys('@import url("style.css") screen');
  });

  it(`@rule ending with '{' should be treated as a selector, which body can have properties or other selectors`, () => {
    expect(parseStyleRules`
      @page {
        width: 2rem;
        margin: {
          right: 3rem;
        }
      }
    `).to.be.deep.eql({
      "@page": {
        width: "2rem",
        "margin-right": "3rem",
      },
    });

    expect(parseStyleRules`
      @keyframes slidein {
        from {
          transform: translateX(0%);
        }

        to {
          transform: translateY(100%);
        }
      }
    `).to.be.deep.eql({
      "@keyframes slidein": {
        from: {
          transform: "translateX(0%)",
        },
        to: {
          transform: "translateY(100%)",
        },
      },
    });

    expect(parseStyleRules`
      @media (min-width: 500px) {
        body {
          color : blue;
        }
      }
    `).to.be.deep.eql({
      "@media (min-width: 500px)": {
        body: {
          color: "blue",
        },
      },
    });
  });

  it(`should elevate @rule if it's nested, its inner rules should get properly combined with outer selectors`, () => {
    expect(parseStyleRules`
      body > div {
        img {
          width: 50%;
        }
        @media (min-width: 720px) {
          img {
            width: 20rem;
          }
        }
      }
    
    `).to.be.deep.eql({
      "body > div img": {
        width: "50%",
      },
      "@media (min-width: 720px)": {
        "body > div img": {
          width: "20rem",
        },
      },
    });
  });

  it(`should throw error on unbalanced braces {{ }`, () => {
    expect(
      () => parseStyleRules`
      body {
        {
          width: 10rem;
      }
    `
    ).to.throw();

    expect(
      () => parseStyleRules`
      margin: {
        right: 10rem;
        {
      }
    `
    ).to.throw();
  });

  it(`should throw error on unbalanced braces { }}`, () => {
    expect(
      () => parseStyleRules`
      body {        
          width: 10rem; }
      }
    `
    ).to.throw();

    expect(
      () => parseStyleRules`
      margin: {
      }
        right: 10rem;
      
      }
    `
    ).to.throw();
  });
});

/**********  PARSING QUERY *********/
describe(`createRegExp(textQuery: string): RegExp`, () => {
  it(`should return RegExp for non-empty textQuery`, () => {
    expect(createRegExp("foo")).to.be.instanceOf(RegExp);
  });

  it(`should return textQuery if it's RegExp`, () => {
    const re = /foo/;
    expect(createRegExp(re)).to.be.equal(re);
  });

  it(`should return null if textQuery is empty string or not a string or RegExp`, () => {
    expect(createRegExp(42)).to.be.null;
    expect(createRegExp("")).to.be.null;
    expect(createRegExp([1, 2])).to.be.null;
  });

  // it(`'/' at start and/or end of textQuery should be ignored`, () => {
  //   const source = createRegExp("/foo/").source;
  //   expect(/^\s*\/|\/\s*$/g.test(source)).to.be.false;
  // });

  it(`should replace all whitespaces, tabs, newlines with \\s+`, () => {
    const source = createRegExp(`foo  >   
    div 
    
    `).source;
    expect(source).to.be.equal("foo\\s+>\\s+div\\s+");
  });

  it(`+*()[].^$\:{}  should be escaped`, () => {
    const source = createRegExp("^+*()[].\\:{}$").source;
    expect(source).to.be.equal("\\^\\+\\*\\(\\)\\[\\]\\.\\\\\\:\\{\\}\\$");
  });

  // it(`should `)
});
