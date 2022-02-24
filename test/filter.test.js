import { configureFilter, createRegExp, deepClone } from "../src/filter.js";
import { expect } from "chai";

describe(`configureFilter(config) => createFilter(query) => filter(target) => boolean`, () => {
  it(`if 'query' is function, then createFilter should return 'query' itself`, () => {
    const f = () => true;
    expect(configureFilter()(f)).to.be.equal(f);
  });

  it(`'query === undefined' && 'target === undefined' => true`, () => {
    let flt = configureFilter()();
    expect(flt()).to.be.true;

    flt = configureFilter()({ x: undefined });
    expect(flt({ x: undefined })).to.be.true;
  });

  it(`query[key] == null && target[key] != null => config.igonoreNull`, () => {
    const flt = configureFilter({ ignoreNull: true })({
      x: null,
    });
    expect(flt({ x: 42 })).to.be.true;

    const flt2 = configureFilter({ ignoreNull: false })({
      x: null,
    });
    expect(flt2({ x: 42 })).to.be.false;
  });

  it(`query[key] == undefined && target[key] != undefined => config.igonoreUndefined`, () => {
    const flt = configureFilter({ ignoreUndefined: true })({
      x: undefined,
    });
    expect(flt({ x: 42 })).to.be.true;

    const flt2 = configureFilter({ ignoreUndefined: false })({
      x: undefined,
    });
    expect(flt2({ x: 42 })).to.be.false;
  });

  it(`query[key] exists && target[key] doesn't exist => config.resultIfNoTarget`, () => {
    const query = { x: /abc/ };
    let target = { y: 42 };

    let flt = configureFilter({ resultIfNoTarget: false })(query);
    expect(flt(target)).to.be.false;

    flt = configureFilter({ resultIfNoTarget: true })(query);
    expect(flt(target)).to.be.true;
  });

  it(`query[key]: object && target[key]: not object => false`, () => {
    const flt = configureFilter()({
      x: 42,
      y: {},
    });
    const target = {
      x: 42,
      y: "abc",
    };
    expect(flt(target)).to.be.false;
  });

  it(`query[key]: not object && target[key]: object => false`, () => {
    const flt = configureFilter()({ x: 42 });
    const target = {
      x: { x: 42 },
    };
    expect(flt(target)).to.be.false;
  });

  it(`filter() on non-iterable target should return boolean`, () => {
    const f = configureFilter()();
    expect(f({ x: 42 })).to.be.a("boolean");
  });

  // it(`filter() on iterable target should return filtered array`, () => {
  //   const f = configureFilter()({ x: 42 });
  //   console.log("***********************");
  //   expect(f([1, { x: 42, y: "abc" }, 3, { x: 42 }]))
  //     .to.be.an("array")
  //     .to.be.lengthOf(1);
  // });
});

describe(`createRegExp(str: string): RegExp`, () => {
  it(`should return RegExp for non-empty string, or 'str' argument itself, otherwise`, () => {
    expect(createRegExp("foo")).to.be.instanceOf(RegExp);
    let re = /abc/;
    expect(createRegExp(re)).to.be.equal(re);
    expect(createRegExp("")).to.be.equal("");
    expect(createRegExp(42)).to.be.equal(42);
    let obj = {};
    expect(createRegExp(obj)).to.be.equal(obj);
  });

  it(`should trim whitespaces from str`, () => {
    expect(createRegExp("  abc  ")).to.be.eql(/abc/);
  });

  it(`should replace all whitespaces, tabs, newlines with \\s+`, () => {
    const source = createRegExp(`foo  >   
    div 
    
    `).source;
    expect(source).to.be.equal("foo\\s+>\\s+div");
  });

  it(`+*()[].^$\:{}/  should be escaped`, () => {
    const source = createRegExp("^+*()[].\\:{}$/").source;
    expect(source).to.be.equal("\\^\\+\\*\\(\\)\\[\\]\\.\\\\\\:\\{\\}\\$\\/");
  });
});

describe(`deepClone(obj: Object, stringToRegExp = true): Object`, () => {
  it(`if obj is not string and not plain object, return 'obj' itself`, () => {
    expect(deepClone(true)).to.be.true;
    expect(deepClone(42)).to.be.equal(42);
    expect(deepClone("")).to.be.equal("");

    let obj = [];
    expect(deepClone(obj)).to.be.equal(obj);
    obj = new Set();
    expect(deepClone(obj)).to.be.equal(obj);
  });

  it(`when stringToRegExp == false, should not convert strings to RegExps`, () => {
    expect(deepClone("foo", false)).to.be.equal("foo");
  });

  it(`should make deep copy of 'obj' argument, if it's a plain object`, () => {
    const obj = { x: { y: { z: 10 } } };
    expect(deepClone(obj)).to.not.be.equal(obj);
    expect(deepClone(obj).x.y.z).to.be.equal(10);
  });

  it(`should replace all string values to RegExp, when stringToRegExp == true`, () => {
    const obj = {
      a: "abc",
      b: {
        c: "def",
      },
    };
    expect(deepClone(obj).a).to.be.eql(/abc/);
    expect(deepClone(obj).b.c).to.be.eql(/def/);
  });
});
