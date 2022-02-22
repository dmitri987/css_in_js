// import { describe, it, fn } from "../node_modules/mocha/";
// import chai from "../node_modules/chai/index.mjs";
import {
  combineNestedSelectors,
  createStyleSheet,
  deleteStyleSheet,
  stylesheets,
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

describe(`stylesheets(styleSheets: CSSStyleSheet|CSSStyleSheet[]): CSSStyleSheet[]`, () => {
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
    ss.insertRule(`.baz { color: blue; }`, 2);
    const css = stylesheets(ss);
    expect(css.rules()).to.have.lengthOf(3);
    expect(css.rules()[0].style).to.have.property("color", "red");
    // expect(stylesheets().rules())

    deleteStyleSheet(ss);
  });
});
