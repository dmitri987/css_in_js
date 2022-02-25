import { configureSetter } from "../src/set.js";
import { expect } from "chai";

describe(`configureSetter(config) => createSetter(propSet) => set(target) => patch`, () => {});

describe(`configureSetter(mode): SetterCreator`, () => {
  it(`if mode != 'add', 'change', 'both', should throw error`, () => {
    expect(() => configureSetter("add")).to.not.throw();
    expect(() => configureSetter("change")).to.not.throw();
    expect(() => configureSetter("both")).to.not.throw();
    expect(() => configureSetter("foo")).to.throw();
  });

  it(`if mode == 'add', setter can add new props, but can not change existing`, () => {
    const set = configureSetter("add")({
      x: 42,
      y: "foo",
    });
    const obj = { x: 0 };
    set(obj);
    expect(obj).to.be.eql({
      x: 0,
      y: "foo",
    });
  });

  it(`if mode == 'change', setter can change existing props, but can not add new ones`, () => {
    const set = configureSetter("change")({
      x: 42,
      y: "foo",
    });
    const obj = { x: 0 };
    set(obj);
    expect(obj).to.be.eql({
      x: 42,
    });
  });

  it(`if mode == 'both', setter can both add new props and change existing ones`, () => {
    const set = configureSetter("both")({
      x: 42,
      y: "foo",
    });
    const obj = { x: 0 };
    set(obj);
    expect(obj).to.be.eql({
      x: 42,
      y: "foo",
    });
  });

  it(`'both' mode should be default`, () => {
    const set = configureSetter()({
      x: 42,
      y: "foo",
    });
    const obj = { x: 0 };
    set(obj);
    expect(obj).to.be.eql({
      x: 42,
      y: "foo",
    });
  });
});

describe(`createSetter(propSet): Setter`, () => {
  it(`if 'propSet' is not an object with properties, should throw error`, () => {
    expect(() => configureSetter()()).to.throw();
    expect(() => configureSetter()("")).to.throw();
    expect(() => configureSetter()({})).to.throw();
    expect(() => configureSetter()(42)).to.throw();
    expect(() => configureSetter()(false)).to.throw();
  });
});

describe(`set(target): Patch`, () => {
  it(`should change 'target' in-place and should return patch object, from which it's possible to restore original state`, () => {
    const set = configureSetter()({
      x: 42,
    });
    const obj = { x: 0 };
    expect(set(obj)).to.deep.eql({ x: 0 });
    expect(obj).to.be.deep.eql({ x: 42 });
    // console.log(set(obj));
  });

  it(`applying patch on the same target should bring it to original state`, () => {
    const createSetter = configureSetter();
    const set = createSetter({
      x: 42,
      y: "foo",
    });
    const obj = { x: 0 };
    const patch = set(obj);
    expect(obj).to.be.eql({
      x: 42,
      y: "foo",
    });
    createSetter(patch)(obj);
    expect(obj).to.be.eql({ x: 0 });
  });

  it(`target[key]: primitive, propSet[key]: object => change target[key] to propSet[key]`, () => {
    const set = configureSetter()({
      x: {
        a: 42,
      },
    });
    const obj = { x: "foo" };
    const patch = set(obj);
    expect(obj).to.be.deep.eql({
      x: {
        a: 42,
      },
    });
    configureSetter()(patch)(obj);
    expect(obj).to.be.deep.eql({ x: "foo" });
  });

  it(`target[key] === undefined should be reversable with patch object`, () => {
    const set = configureSetter()({
      x: {
        a: 42,
      },
    });
    const obj = { x: undefined };
    const patch = set(obj);
    expect(obj).to.be.deep.eql({
      x: {
        a: 42,
      },
    });
    configureSetter()(patch)(obj);
    expect(obj).to.be.deep.eql({ x: undefined });
  });

  it(`target[key]: object, propSet[key]: primitive => change target[key] to propSet[key]`, () => {
    const set = configureSetter()({
      x: 42,
    });
    const obj = { x: { a: "foo" } };
    const patch = set(obj);
    expect(obj).to.be.deep.eql({ x: 42 });
    configureSetter()(patch)(obj);
    expect(obj).to.be.deep.eql({ x: { a: "foo" } });
  });
});
