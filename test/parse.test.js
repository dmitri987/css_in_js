import {
  combineNestedSelectors,
  parseStyleRules,
  parseQuery,
  stringify,
} from "../src/parse.js";

import { expect } from "chai";

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

/*******  parseStyleRules  ********/
describe(`parseStyleRules(textStyleRule?: string): RuleSet | StyleSet`, () => {
  it(`should throw error if it has more than one argument or if the argument is not string`, () => {
    expect(() => parseStyleRules("abc", 42)).to.throw();
  });

  it(`if textStyleRules === '' should return {}`, () => {
    expect(parseStyleRules("")).to.be.null;
  });

  it(`property should always have string value (even for numbers)`, () => {
    expect(
      parseStyleRules(`
      width: 0;
      opacity: 0.5;   
    `)
    ).to.be.eql({ width: "0", opacity: "0.5" });
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
    expect(
      parseStyleRules(`
      body {}
    `)
    ).to.be.null;

    expect(
      parseStyleRules(`
      body {
        width: 10px
      }
    `)
    ).to.be.null;
  });

  it(`should remove /* multi line comments */ and // one line comments`, () => {
    expect(
      parseStyleRules(`
      body > div { // comment
        opacity: /*
           multi line
           comment
         */ 0.5;
      }`)
    ).to.be.deep.eql({
      "body > div": {
        opacity: "0.5",
      },
    });
  });

  it(`multiple consecutive whitespaces, tabs, newlines should be replaced with single whitespace`, () => {
    expect(
      parseStyleRules(`
        div     >    
           img 
             {
               background-color   :   rgba(0  ,  0,
                                                     0, 0.5);
             }
      `)
    ).to.be.deep.eql({
      "div > img": {
        "background-color": "rgba(0, 0, 0, 0.5)",
      },
    });
  });
  it(`properties should be delimited by ';', except when a property is the last token in the string and there is no } or { after it`, () => {
    expect(
      parseStyleRules(`
          width: 10rem
          color: red;
        `)
    ).to.not.have.keys("color");

    expect(
      parseStyleRules(`
          .foo {
            width: 10rem;
            color: red
          }
        `)
    ).to.be.deep.eql({
      ".foo": {
        width: "10rem",
      },
    });

    expect(
      parseStyleRules(`
          width: 10rem;
          color: red
        `)
    ).to.be.deep.eql({ width: "10rem", color: "red" });
  });

  it(`should return StyleSet for text with properties only (without rule selector); properties must be delimited with ';'`, () => {
    expect(
      parseStyleRules(`
        width: 10px;
        color: red;
      `)
    ).to.be.eql({ width: "10px", color: "red" });
  });

  it(`when a property is duplicated, the last occurence takes precedence: 'color: blue; color: red;' => 'color: red'`, () => {
    expect(parseStyleRules(`color: blue; color: red`)).to.be.eql({
      color: "red",
    });
  });

  it(`should combine nested properties with '-': padding: 
      {inline: { start: 1rem; end: 2rem; }} => padding-inline-start: 1rem; padding-inline-end; 2rem;`, () => {
    expect(
      parseStyleRules(`
      padding: {
        inline: {
          start: 1rem;
          end: 2rem;
        }
      }
    `)
    ).to.be.deep.eql({
      "padding-inline-start": "1rem",
      "padding-inline-end": "2rem",
    });
  });

  it(`a segment of nested property can have value; at least one whitespace between the value and preceding ':' is requied: 
     margin: auto { right: 1rem; } => margin: auto; margin-right: 1rem;`, () => {
    expect(
      parseStyleRules(`
        margin: auto {
          right: 1rem;
        }
      `)
    ).to.be.deep.eql({
      margin: "auto",
      "margin-right": "1rem",
    });
  });

  it(`should throw error, if there is no whitespace between ':' and property segment value`, () => {
    expect(() =>
      parseStyleRules(`
      margin:auto {
        right: 1rem;
      }
    `)
    ).to.throw();
  });

  it(`if nested property segment has value, but deeper segments - don't, then should return segment with value: maring: auto {}  =>  margin: auto`, () => {
    expect(
      parseStyleRules(`
      margin: auto {}
    `)
    ).to.be.eql({ margin: "auto" });
  });

  it(`if none of nested property segments has value, then ignore all of them`, () => {
    expect(
      parseStyleRules(`
      margin: {
        inline: {
          
        }
      }
    `)
    ).to.be.null;
  });

  it(`selectors of single rule can be combined with ',': 'div > img, div > #id'`, () => {
    expect(parseStyleRules(` div > img, #id { color: red; }`)).to.be.deep.eql({
      "div > img, #id": {
        color: "red",
      },
    });
  });

  it(`selectors can be spanned to multiple line; resulting selector is always one line`, () => {
    expect(
      parseStyleRules(`
      body,
      div { 
        width: 10rem;
      }
    `)
    ).to.be.deep.eql({
      "body, div": {
        width: "10rem",
      },
    });
  });

  it(`should understand attribute-based selectors: [attr^="foo"]`, () => {
    expect(
      parseStyleRules(`
      [attr^$|*="'foo'"] >+~ p {
        color: red;
      }
    `)
    ).to.be.deep.eql({
      "[attr^$|*=\"'foo'\"] >+~ p": {
        color: "red",
      },
    });
  });

  it(`should understand valid pseudo-classes in selectors`, () => {
    expect(parseStyleRules(` p:hover { color: red; }`)).to.be.deep.eql({
      "p:hover": {
        color: "red",
      },
    });

    expect(parseStyleRules(` ::before { color: red; }`)).to.be.deep.eql({
      "::before": {
        color: "red",
      },
    });
  });

  it(`should throw error on invalid pseudo-classes`, () => {
    expect(() => parseStyleRules(`:foo { color: red; }`)).to.throw();
  });

  it(`should combine nested selectors; nested selector can have placeholder '&', which will be replaced with content of parent selector`, () => {
    expect(
      parseStyleRules(`
      div {
        &__active {
          color: red;
        }
      }
    `)
    ).to.be.deep.eql({
      div__active: {
        color: "red",
      },
    });
  });

  it(`should combine nested selectors with single whitespace if there is no placeholder '&'`, () => {
    expect(
      parseStyleRules(`
      div {
        img {
          color: red;
        }
      }
    `)
    ).to.be.deep.eql({
      "div img": {
        color: "red",
      },
    });
  });

  it(`should create all possible unique combinations of nested selectors and combine them in one line, delimited with ','`, () => {
    expect(
      parseStyleRules(`
      div, section {
        .foo, & + #id {
          &:hover {
            color: red;
          }
        }
      }
    `)
    ).to.be.deep.eql({
      "div .foo:hover, div + #id:hover, section .foo:hover, section + #id:hover":
        {
          color: "red",
        },
    });
  });

  it(`property can go after nested rule`, () => {
    expect(
      parseStyleRules(`
      width: 1rem;
      body {
        img {
          color: red;
        }
      }
      opacity: 0;
    `)
    ).to.be.deep.eql({
      width: "1rem",
      opacity: "0",
      "body img": {
        color: "red",
      },
    });
  });

  it(`@rule ending with ';' (like @import) should be stored on top of returned RuleSet in key; its value can be any`, () => {
    expect(
      parseStyleRules(`
      @import url("style.css") screen;
    `)
    ).to.have.all.keys('@import url("style.css") screen');
  });

  it(`@rule ending with '{' should be treated as a selector, which body can have properties or other selectors`, () => {
    expect(
      parseStyleRules(`
      @page {
        width: 2rem;
        margin: {
          right: 3rem;
        }
      }
    `)
    ).to.be.deep.eql({
      "@page": {
        width: "2rem",
        "margin-right": "3rem",
      },
    });

    expect(
      parseStyleRules(`
      @keyframes slidein {
        from {
          transform: translateX(0%);
        }

        to {
          transform: translateY(100%);
        }
      }
    `)
    ).to.be.deep.eql({
      "@keyframes slidein": {
        from: {
          transform: "translateX(0%)",
        },
        to: {
          transform: "translateY(100%)",
        },
      },
    });

    expect(
      parseStyleRules(`
      @media (min-width: 500px) {
        body {
          color : blue;
        }
      }
    `)
    ).to.be.deep.eql({
      "@media (min-width: 500px)": {
        body: {
          color: "blue",
        },
      },
    });
  });

  it(`should elevate @rule if it's nested, its inner rules should get properly combined with outer selectors`, () => {
    expect(
      parseStyleRules(`
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
    
    `)
    ).to.be.deep.eql({
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
    expect(() =>
      parseStyleRules(`
      body {
        {
          width: 10rem;
      }
    `)
    ).to.throw();

    expect(() =>
      parseStyleRules(`
      margin: {
        right: 10rem;
        {
      }
    `)
    ).to.throw();
  });

  it(`should throw error on unbalanced braces { }}`, () => {
    expect(() =>
      parseStyleRules(`
      body {        
          width: 10rem; }
      }
    `)
    ).to.throw();

    expect(() =>
      parseStyleRules(`
      margin: {
      }
        right: 10rem;
      
      }
    `)
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
    const rules = parseStyleRules(`
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
    const rules = parseStyleRules(`
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
    const styles = parseStyleRules(`
      width: 10rem;
      opacity: 0.5;
      background-color: green;
    `);
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
