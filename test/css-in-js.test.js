import {
  createStyleSheet,
  deleteStyleSheet,
  parse,
  stylesheets,
  rules,
  insert,
  del,
  set,
  filter,
} from "../src/css-in-js.js";

const { expect } = chai;

const clearDefaultStyleSheet = () => {
  const ss = stylesheets.default;
  for (let i = 0; i < ss.cssRules.length; i++) {
    ss.deleteRule(i);
  }
};

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

    deleteStyleSheet(ss);
    deleteStyleSheet(ss2);
  });

  it(`when used on its own, should return rules from default stylesheet: 'rules()' is equivalent to 'stylesheets().rules()'`, () => {
    stylesheets.default.insertRule(".foo > #id { width: 10px; }", 0);
    expect(rules()[0].cssText).to.be.equal(".foo > #id { width: 10px; }");
    clearDefaultStyleSheet();
  });
});

/******** insert **********/
describe(`insert(rules: string | string[] | StyleRuleSet): CSSRUle[]`, () => {
  it(`should return array of inserted rules, or empty array, if no rule was inserted`, () => {
    expect(insert()).to.be.an("array").and.to.be.lengthOf(0);
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
});

describe(`set(propSet): (target) => patch`, () => {
  it(`should be used as tagged template: set\` width: 20rem;\``, () => {
    const obj = {};
    set`
      width: 10rem;
      color: red;
    `(obj);
    expect(obj).to.be.deep.eql({
      style: {
        width: "10rem",
        color: "red",
      },
    });
  });

  it(`propSet can be plain object`, () => {
    const obj = {};
    set({
      width: "10rem",
      color: "red",
    })(obj);

    expect(obj).to.be.deep.eql({
      width: "10rem",
      color: "red",
    });
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

/*******  parse  ********/
describe(`parse(textStyleRule?: string): RuleSet | StyleSet`, () => {
  it(`can be used as function and tagged template (parse\` .foo { color: red; }\`)`, () => {
    expect(parse(".foo { color: red; }")).to.be.deep.eql(
      parse`.foo { color: red; }`
    );
  });

  it(`if textStyleRule is plain object, then parse() should return it`, () => {
    const ruleObj = {};
    expect(parse(ruleObj)).to.be.equal(ruleObj);
  });
});

/********** del ***********/
describe(`del(rules: CSSRule|CSSRule[])`, () => {
  it(`should delete single rule`, () => {
    const ss = createStyleSheet();
    ss.insertRule(`.foo { width: 2rem; }`);
    const rule = ss.cssRules[0];
    expect(ss.cssRules).to.be.lengthOf(1);
    del(rule);
    expect(ss.cssRules).to.be.lengthOf(0);
    deleteStyleSheet(ss);
  });

  it(`should delete multiple rules`, () => {
    const ss = createStyleSheet();
    ss.insertRule(`.foo { width: 2rem; }`);
    ss.insertRule(`.foo { width: 3rem; }`);
    const rules = [...ss.cssRules];
    expect(ss.cssRules).to.be.lengthOf(2);
    del(rules);
    expect([...ss.cssRules]).to.be.lengthOf(0);
    deleteStyleSheet(ss);
  });
});
