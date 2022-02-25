import { createFilter } from "./filter.js";
import { createSetter } from "./set.js";
import { parseStyleRules, parseQuery, stringify } from "./parse.js";
// import cloneDeep from "lodash.clonedeep";

/**
 * TODO:
 *  stylesheets
 *  rules
 *  insert
 *  set
 *  get
 *  filter
 *
 *  Stylesheets:
 *   insert ??
 *   rules
 *   default
 *
 *  Rules:
 *   filter
 *
 */

// const isIterable = (obj) => typeof obj?.[Symbol.iterator] === "function";

/********** HELPERS *********/
const isPlainObject = (obj) => obj?.constructor === Object;
const isIterable = (obj) => typeof obj?.[Symbol.iterator] === "function";

const isEmpty = (obj) =>
  obj === null ||
  obj === undefined ||
  (isPlainObject(obj) ? Object.keys(obj) : obj)?.length === 0;

/********** TAGGED TEMPLATE MIXIN *********/
const isTaggedTemplate = (...args) => {
  if (!(args[0] instanceof Array)) return false;
  if (args[0].length !== args.length) return false;

  const strings = args[0];
  for (let i = 0; i < strings.length; i++) {
    if (typeof strings[i] !== "string") return false;
  }
  return true;
};

const taggedTemplateArgsToString = (...args) => {
  if (typeof args[0] === "string") return args[0];

  const strings = args[0];
  const segments = [strings[0]];
  for (let i = 1; i < args.length; i++) {
    segments.push(`${args[i]}${strings[i]}`);
  }
  return segments.join("");
};

function withTaggedTemplate(fnc) {
  return function (...args) {
    if (isTaggedTemplate(...args))
      return fnc(taggedTemplateArgsToString(...args));

    return fnc(...args);
  };
}

/************ FILTER ************/
function isValidFilterArg(arg) {
  return (
    (typeof arg === "string" && arg.length > 0) ||
    arg instanceof RegExp ||
    arg instanceof Function ||
    isPlainObject(arg)
  );
}

const _filter = withTaggedTemplate((query) => {
  if (!isValidFilterArg(query))
    throw new SyntaxError(
      `argument must be non empty string, RegExp or plain query object`
    );

  return createFilter(parseQuery(query));
});

// shortcut to use as inline tagged template:  f` div > #id { width: 100; }`
// export const f = filter;

/************** SET ***********/
const _set = withTaggedTemplate((propSet) => {
  if (typeof propSet !== "string" && !isPlainObject(propSet))
    throw new SyntaxError(
      `'propSet' argument must be non empty string or plain object`
    );

  const props = isPlainObject(propSet)
    ? propSet
    : { style: parseStyleRules(propSet) };
  // console.log(props, propSet);
  return createSetter(props);
});

/************** PARSE ***************/
const _parse = withTaggedTemplate((...args) => {
  if (isPlainObject(args[0])) return args[0];

  return parseStyleRules(args[0]);
});

/************** STYLESHEETS FUNCTIONS ***********/
// from here: https://github.com/ai/nanoid/blob/main/nanoid.js
const nanoid = (t = 10) => {
  let e = "",
    r = crypto.getRandomValues(new Uint8Array(t));
  for (; t--; ) {
    let n = 63 & r[t];
    e +=
      n < 36
        ? n.toString(36)
        : n < 62
        ? (n - 26).toString(36).toUpperCase()
        : n < 63
        ? "_"
        : "-";
  }
  return e;
};

const UID = nanoid(10).toString();
const _createStyleSheet = () => {
  const existingStyleSheets = new Set([...document.styleSheets]);
  const id = `${UID}-${nanoid(10)}`;
  document.head.insertAdjacentHTML("beforeend", `<style id="${id}"></style>`);
  return [...document.styleSheets].filter((ss) => {
    return !existingStyleSheets.has(ss) && ss.ownerNode.id === `${id}`;
  })[0];
};

const _deleteStyleSheet = (styleSheet) => {
  if (
    !(styleSheet.ownerNode instanceof HTMLStyleElement) ||
    !styleSheet.ownerNode.id.startsWith(UID)
  )
    return false;

  styleSheet.ownerNode.remove();
  return true;
};

const defaultStyleSheet = _createStyleSheet();

const _stylesheets = (styleSheets) => {
  let sheets;
  if (styleSheets instanceof CSSStyleSheet) {
    sheets = [styleSheets];
  } else if (
    styleSheets &&
    [...styleSheets].filter((s) => !(s instanceof CSSStyleSheet)).length === 0
  ) {
    sheets = [...styleSheets];
  } else {
    sheets = [defaultStyleSheet];
  }

  const _rules = (conditions) => {
    return sheets.reduce((rules, sheet) => {
      if (conditions) {
        return rules.concat([...sheet.cssRules].filter(_filter(conditions)));
      }
      return rules.concat(...sheet.cssRules);
    }, []);
  };

  sheets.rules = _rules;
  sheets.default = defaultStyleSheet;
  return sheets;
};

_stylesheets.default = defaultStyleSheet;

/************** INSERT **********/
const insertRule = (textRule) => {
  const last = defaultStyleSheet.length;
  const index = defaultStyleSheet.insertRule(textRule, last);
  return defaultStyleSheet.cssRules[index];
};

function insertRules(textRules) {
  if (isEmpty(textRules)) return [];
  // console.log("textRules:", textRules);
  const ruleSet = stringify(parse(textRules));

  return ruleSet.map(insertRule);
}

/************ DELETE **********/
function deleteRules(rules) {
  const _rules = isIterable(rules) ? rules : [rules];
  for (let rule of _rules) {
    if (!(rule instanceof CSSRule)) {
      throw new TypeError(
        `'rules' should be CSSRule or container of CSSRule's`
      );
    }

    const stylesheet = rule.parentStyleSheet;
    const index = [...stylesheet.cssRules].indexOf(rule);
    // console.log(rule, stylesheet, index);
    if (index >= 0) {
      stylesheet.deleteRule(index);
    }
  }
}

/********** API *************/
// main
export const insert = insertRules;
export const rules = _stylesheets().rules;
export const filter = _filter;
export const set = _set;
export const del = deleteRules;

// plumbing
export const createStyleSheet = _createStyleSheet;
export const deleteStyleSheet = _deleteStyleSheet;
export const stylesheets = _stylesheets;
export const parse = _parse;
