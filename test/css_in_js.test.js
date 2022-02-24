// import { describe, it, fn } from "../node_modules/mocha/";
// import chai from "../node_modules/chai/index.mjs";
import {
  combineNestedSelectors,
  createStyleSheet,
  deleteStyleSheet,
  parse,
  stringify,
  stylesheets,
  rules,
  insert,
  parseQuery,
  filter,
} from "../src/css_in_js.mjs";

const { expect } = chai;

const clearDefaultStyleSheet = () => {
  const ss = stylesheets.default;
  for (let i = 0; i < ss.cssRules.length; i++) {
    ss.deleteRule(i);
  }
  // [...stylesheets.default.cssRules].forEach((_, i) =>
  //   stylesheets.default.deleteRule(i)
  // );
};

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

  it(`rules() should return CSSRule[]; number of rules must be sum of all rules in observed stylesheets`, () => {
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

  it(`rules(conditions) should return CSSRule[], which match filter`, () => {
    const ss = createStyleSheet();
    ss.insertRule(`.foo { color: red; }`, 0);
    ss.insertRule(`.bar { color: green; }`, 1);

    const ss2 = createStyleSheet();
    ss2.insertRule(`.baz { color: blue; }`);
    const css = stylesheets([ss, ss2]);
    // console.log("************************");
    expect(css.rules(".foo")).to.have.lengthOf(1);
    expect(css.rules("{color: green;}")[0].style).to.have.property(
      "color",
      "green"
    );
    // expect(css.rules()[0].style).to.have.property("color", "red");
    // expect(stylesheets().rules())

    deleteStyleSheet(ss);
    deleteStyleSheet(ss2);
  });

  it(`when used on its own, should return rules from default stylesheet: 'rules()' is equivalent to 'stylesheets().rules()'`, () => {
    stylesheets.default.insertRule(".foo > #id { width: 10px; }", 0);
    expect(rules()[0].cssText).to.be.equal(".foo > #id { width: 10px; }");
    // stylesheets.default.deleteRule(0);
    clearDefaultStyleSheet();
  });

  // it(`array, returned by rules(), should have custom 'filter()' method, which should work as 'filter' function (see filter()), but scoped to the rules inside the array`, () => {
  //   const ss = createStyleSheet();
  //   ss.insertRule(`.foo { color: red; }`, 0);
  //   ss.insertRule(`.bar { color: green; }`, 1);

  //   const rules = stylesheets(ss).rules();
  //   expect(rules.filter).to.be.not.equal(Array.prototype.filter);

  //   const filteredRules = rules.filter('foo');
  //   expect(filteredRules).to.be.lengthOf(1);

  // })
});

/******** insert **********/
describe(`insert(rules: string | string[] | StyleRuleSet): CSSRUle[]`, () => {
  it(`should return array of inserted rules, or empty array, if no rule was inserted`, () => {
    expect(insert()).to.be.an("array").and.to.be.lengthOf(0);
    // expect(insert(42)).to.be.an("array").and.to.be.lengthOf(0);
    expect(insert({})).to.be.an("array").and.to.be.lengthOf(0);
    expect(insert("")).to.be.an("array").and.to.be.lengthOf(0);

    const rules = insert(`
      .foo { width: 200px; }
      div > #id {
        color: red;
      }
    `);
    expect(rules).to.be.lengthOf(2);
    expect(rules[0]).to.be.instanceOf(CSSRule);
    expect(rules[1].style).to.have.property("color", "red");

    clearDefaultStyleSheet();
  });

  // should take RuleSet
  // should be tagged template
});

/*******  parse  ********/
describe(`parse(textStyleRule?: string): RuleSet | StyleSet`, () => {
  it(`can be used as function and tagged template (parse\` .foo { color: red; }\`)`, () => {
    expect(parse(".foo { color: red; }")).to.be.deep.eql(
      parse`.foo { color: red; }`
    );
  });

  it(`should throw error if 'textStyleRule' is not a string or empty string`, () => {
    expect(() => parse()).to.throw();
    expect(() => parse("")).to.throw();
    expect(() => parse(42)).to.throw();
    // expect(() => parse({})).to.throw();
    expect(() => parse(``)).to.throw();
  });

  it(`if textStyleRule is plain object, then parse() should return it`, () => {
    const ruleObj = {};
    expect(parse(ruleObj)).to.be.equal(ruleObj);
  });

  it(`property should always have string value (even for numbers)`, () => {
    expect(parse`
      width: 0;
      opacity: 0.5;   
    `).to.be.eql({ width: "0", opacity: "0.5" });
  });

  it(`should ignore properties with empty values`, () => {
    expect(parse(`width: ; color: red;`)).to.be.eql({ color: "red" });
    expect(
      parse(`
      .foo {
        width: ; 
        color: red;
      }`)
    ).to.be.deep.eql({ ".foo": { color: "red" } });
  });

  it(`should ignore empty rules (without valid properties)`, () => {
    expect(parse`
      body {}
    `).to.be.null;

    expect(parse`
      body {
        width: 10px
      }
    `).to.be.null;
  });

  it(`should remove /* multi line comments */ and // one line comments`, () => {
    expect(parse`
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
    expect(parse`
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
    expect(parse`
          width: 10rem
          color: red;
        `).to.not.have.keys("color");

    expect(parse`
          .foo {
            width: 10rem;
            color: red
          }
        `).to.be.deep.eql({
      ".foo": {
        width: "10rem",
      },
    });

    expect(parse`
          width: 10rem;
          color: red
        `).to.be.deep.eql({ width: "10rem", color: "red" });
  });

  it(`should return StyleSet for text with properties only (without rule selector); properties must be delimited with ';'`, () => {
    expect(parse`
        width: 10px;
        color: red;
      `).to.be.eql({ width: "10px", color: "red" });
  });

  it(`when a property is duplicated, the last occurence takes precedence: 'color: blue; color: red;' => 'color: red'`, () => {
    expect(parse`color: blue; color: red`).to.be.eql({
      color: "red",
    });
  });

  it(`should combine nested properties with '-': padding: 
      {inline: { start: 1rem; end: 2rem; }} => padding-inline-start: 1rem; padding-inline-end; 2rem;`, () => {
    expect(parse`
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
    expect(parse`
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
      () => parse`
      margin:auto {
        right: 1rem;
      }
    `
    ).to.throw();
  });

  it(`if nested property segment has value, but deeper segments - don't, then should return segment with value: maring: auto {}  =>  margin: auto`, () => {
    expect(parse`
      margin: auto {}
    `).to.be.eql({ margin: "auto" });
  });

  it(`if none of nested property segments has value, then ignore all of them`, () => {
    expect(parse`
      margin: {
        inline: {
          
        }
      }
    `).to.be.null;
  });

  it(`selectors of single rule can be combined with ',': 'div > img, div > #id'`, () => {
    expect(parse` div > img, #id { color: red; }`).to.be.deep.eql({
      "div > img, #id": {
        color: "red",
      },
    });
  });

  it(`selectors can be spanned to multiple line; resulting selector is always one line`, () => {
    expect(parse`
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
    expect(parse`
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
    expect(parse` p:hover { color: red; }`).to.be.deep.eql({
      "p:hover": {
        color: "red",
      },
    });

    expect(parse` ::before { color: red; }`).to.be.deep.eql({
      "::before": {
        color: "red",
      },
    });
  });

  it(`should throw error on invalid pseudo-classes`, () => {
    expect(() => parse`:foo { color: red; }`).to.throw();
  });

  it(`should combine nested selectors; nested selector can have placeholder '&', which will be replaced with content of parent selector`, () => {
    expect(parse`
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
    expect(parse`
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
    expect(parse`
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
    expect(parse`
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
    expect(parse`
      @import url("style.css") screen;
    `).to.have.all.keys('@import url("style.css") screen');
  });

  it(`@rule ending with '{' should be treated as a selector, which body can have properties or other selectors`, () => {
    expect(parse`
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

    expect(parse`
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

    expect(parse`
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
    expect(parse`
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
      () => parse`
      body {
        {
          width: 10rem;
      }
    `
    ).to.throw();

    expect(
      () => parse`
      margin: {
        right: 10rem;
        {
      }
    `
    ).to.throw();
  });

  it(`should throw error on unbalanced braces { }}`, () => {
    expect(
      () => parse`
      body {        
          width: 10rem; }
      }
    `
    ).to.throw();

    expect(
      () => parse`
      margin: {
      }
        right: 10rem;
      
      }
    `
    ).to.throw();
  });
});

describe(`stringify(styleRules, indentation = 2): string[]`, () => {
  it(`if styleRules is not correctly formed StyleRuleSet (returned by parseStyleRules), should return empty array []`, () => {
    expect(stringify()).to.be.an("array").and.to.be.empty;
    expect(stringify("")).to.be.an("array").and.to.be.empty;
    expect(stringify(42)).to.be.an("array").and.to.be.empty;
    expect(stringify({})).to.be.an("array").and.to.be.empty;
  });

  it(`should create one string for each top-level rule (nested rules in @rules go in the same string)`, () => {
    const rules = parse(`
      .foo {
        width: 10rem;
      }
      @media (min-width: 300px) {
        .bar {
          color: red;
        }
        [attr="boo"] {
          opacity: 0;
        }
      }
    `);
    const strings = stringify(rules);
    expect(strings).to.be.lengthOf(2);
    expect(strings[0].startsWith(".foo")).to.be.true;
    expect(strings[1].startsWith("@media")).to.be.true;
  });

  it(`when 'indentation <= 0', resulting strings should not have newlines`, () => {
    const rules = parse(`
      @media (min-width: 300px) {
        .bar {
          color: red;
        }
        [attr="boo"] {
          opacity: 0;
        }
      }
  `);
    const strings = stringify(rules, 0);
    expect(/\n/.test(strings[0])).to.be.false;
  });

  it(`styles without selectors should be joined with ';' and should not have wrapping {} around them`, () => {
    const styles = parse`
      width: 10rem;
      opacity: 0.5;
      background-color: green;
    `;
    const s = stringify(styles);
    // console.log(s);
    expect(s).to.be.lengthOf(1);
    expect(s[0].match(/;/g)).to.be.lengthOf(3);
    expect(s[0].match(/[{}]/g)).to.be.null;
  });
});

/**********  PARSING QUERY *********/

describe(`parseQuery(textQuery)`, () => {
  it(`should return null if textQuery is not a string or an empty string`, () => {
    expect(parseQuery()).to.be.null;
    expect(parseQuery("")).to.be.null;
  });

  it(`should return object with 'cssText' == textQuery`, () => {
    expect(parseQuery("abc").cssText).to.be.eql("abc");
  });

  it(`if textQuery is RegExp, it should be set to 'cssText' of resulting object`, () => {
    const re = /foo/;
    expect(parseQuery(re).cssText).to.be.equal(re);
  });

  it(`if textQuery is plain object, then should return textQuery itself`, () => {
    const source = {
      cssText: "foo",
      style: {
        width: "200px",
      },
    };
    const query = parseQuery(source);
    expect(query).to.be.equal(source);
  });

  it(`' .foo { width: 2rem; color: red; }' => { cssTxt: .foo, style: { width: '2rem', color: 'red' }}`, () => {
    const query = parseQuery("abc { width: 1rem; opacity: 1; }");
    // console.log(query);
    expect(query).to.be.deep.eql({
      cssText: "abc",
      style: {
        width: "1rem",
        opacity: "1",
      },
    });
  });

  it(`should ignore text after last '}': 'foo {width: 0;} this will be ignored' => { cssText: /foo/, style: { width: '0' }}`, () => {
    const query = parseQuery(
      "abc { width: 1rem; opacity: 1; } this will be ignored"
    );
    expect(query).to.be.deep.eql({
      cssText: "abc",
      style: {
        width: "1rem",
        opacity: "1",
      },
    });
  });

  it(`should not have 'style' property if {} block is absent, empty or all props are invalid`, () => {
    expect(parseQuery("foo")).to.not.have.property("style");
    expect(parseQuery("foo {}")).to.not.have.property("style");
    expect(parseQuery("foo { width: }")).to.not.have.property("style");
  });
});

describe(`filter(query: string|RegExp|Query|Function): (item: CSSRule|Element) => boolean`, () => {
  it(`if 'query' argument is not a non-empty string, RegExp, Query, Function or tagged template, should throw error`, () => {
    expect(() => filter()).to.throw();
    expect(() => filter(42)).to.throw();
    expect(() => filter("")).to.throw();
  });

  it(`if 'query' is function, then 'filter()' should return the 'query' itself`, () => {
    const predicate = () => true;
    expect(filter(predicate)).to.be.equal(predicate);
  });

  it(`should return filter function, which can be applied to CSSRule`, () => {
    const f = filter("foo");
    const fakeRule = {
      cssText: ` .foo > div {
         width: 100px;
      }`,
    };
    // console.log("***********************");
    expect(f(fakeRule)).to.be.true;
  });

  it(`filter('{ width: 100; }') should match 'width: 100px' or ' 100rem' or anything with '100'`, () => {
    const f = filter(`{ width: 100; }`);
    expect(
      f({
        style: {
          width: "100px",
        },
      })
    ).to.be.true;

    expect(
      f({
        style: {
          width: " 1000/2",
        },
      })
    ).to.be.true;

    expect(
      f({
        style: {
          width: "200rem",
        },
      })
    ).to.be.false;
  });

  it(`filter({ style: { width: /^10/ }}) should match only values starting from '10'`, () => {
    const f = filter({
      style: {
        width: /^10/,
      },
    });
    expect(
      f({
        style: {
          width: "100px",
        },
      })
    ).to.be.true;

    expect(
      f({
        style: {
          width: "210px",
        },
      })
    ).to.be.false;
  });

  it(`should be possible to call as tagged template: filter\`.foo\``, () => {
    const width = "100";
    const f = filter` .foo { width: ${width}; }`;
    expect(
      f({
        cssText: `.foo {
          width: 100px;
        }`,
        style: {
          width: " 100px",
        },
      })
    ).to.be.true;

    expect(
      f({
        cssText: `.foo {
          width: 200px;
        }`,
        style: {
          width: " 200px",
        },
      })
    ).to.be.false;
  });
});

// describe(`filter(target, query): boolean | Array<typeof target>`, () => {
//   it(`if 'target' is non iterable, should return boolean`, () => {
//     const fakeRule = {
//       cssText: `.foo {
//         width: 50px;
//       }`,
//       style: {
//         width: "50px",
//       },
//     };
//     expect(filter(fakeRule, "foo")).to.be.true;
//     expect(filter(fakeRule, "bar")).to.be.false;
//     expect(filter(fakeRule, "{width: 50;}")).to.be.true;
//   });

//   it(`if 'target' is iterable, should return array of matched elements`, () => {
//     const rules = [{ style: { width: "100px" } }, { cssText: ".foo > div" }];
//     expect(filter(rules, "foo")).to.have.lengthOf(1);
//     expect(filter(rules, "{width: 10;}")).to.have.lengthOf(1);
//     expect(filter(rules, "{width: 20;}")).to.be.empty;
//   });
// });
