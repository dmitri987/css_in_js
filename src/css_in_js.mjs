import { createFilter } from "./filter.js";

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
const isEmptyObject = (obj) => Object.keys(obj).length === 0;
const isFunction = (fnc) => fnc instanceof Function;
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

export const filter = withTaggedTemplate((query) => {
  if (!isValidFilterArg(query))
    throw new SyntaxError(
      `argument must be non empty string, RegExp or plain query object`
    );

  return createFilter(parseQuery(query));
});

// shortcut to use as inline tagged template:  f` div > #id { width: 100; }`
export const f = filter;

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
export const createStyleSheet = () => {
  const existingStyleSheets = new Set([...document.styleSheets]);
  const id = `${UID}-${nanoid(10)}`;
  document.head.insertAdjacentHTML("beforeend", `<style id="${id}"></style>`);
  return [...document.styleSheets].filter((ss) => {
    return !existingStyleSheets.has(ss) && ss.ownerNode.id === `${id}`;
  })[0];
};

export const deleteStyleSheet = (styleSheet) => {
  if (
    !(styleSheet.ownerNode instanceof HTMLStyleElement) ||
    !styleSheet.ownerNode.id.startsWith(UID)
  )
    return false;

  styleSheet.ownerNode.remove();
  return true;
};

const defaultStyleSheet = createStyleSheet();

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
        return rules.concat([...sheet.cssRules].filter(f(conditions)));
      }
      return rules.concat(...sheet.cssRules);
    }, []);
  };

  sheets.rules = _rules;
  sheets.default = defaultStyleSheet;
  return sheets;
};

_stylesheets.default = defaultStyleSheet;

export const stylesheets = _stylesheets;
export const rules = _stylesheets().rules;
export const insert = insertRules;

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

// rules.forEach(set(`width:...`))
// f`...` && f`...`(rule)
// filter(`...`)(rule)
// set(`...`)(rule)

/*****   PARSING STYLES AND RULES  *****/

// from here: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference   (on 19.02.2022)
const validPseudoClasses = [
  ":active",
  "::after",
  ":any-link",
  "::backdrop",
  "::before",
  ":blank",
  ":checked",
  "::cue",
  "::cue-region",
  ":current",
  ":default",
  ":defined",
  ":dir",
  ":disabled",
  ":empty",
  ":enabled",
  ":first",
  ":first-child",
  "::first-letter",
  "::first-line",
  ":first-of-type",
  ":focus",
  ":focus-visible",
  ":focus-within",
  ":fullscreen",
  ":future",
  "::grammar-error",
  ":has",
  ":host",
  ":host-context",
  ":hover",
  ":in-range",
  ":indeterminate",
  ":invalid",
  ":is",
  ":lang",
  ":last-child",
  ":last-of-type",
  ":left",
  ":link",
  ":local-link",
  "::marker",
  ":not",
  ":nth-child",
  ":nth-col",
  ":nth-last-child",
  ":nth-last-col",
  ":nth-last-of-type",
  ":nth-of-type",
  ":only-child",
  ":only-of-type",
  ":optional",
  ":out-of-range",
  "::part",
  ":past",
  ":paused",
  ":picture-in-picture",
  "::placeholder",
  ":placeholder-shown",
  ":playing",
  ":read-only",
  ":read-write",
  ":required",
  ":right",
  ":root",
  ":scope",
  "::selection",
  "::slotted",
  "::spelling-error",
  ":target",
  "::target-text",
  ":target-within",
  ":user-invalid",
  ":user-valid",
  ":valid",
  ":visited",
  ":where",
];

const unique = (arr) => [...new Set(arr)];
const removeExtraWhitespaces = (str) => str.trim().replaceAll(/\s\s+/g, " ");

const combineSelectorSegments = (prefix, segment) => {
  return (
    segment.includes("&")
      ? segment.replaceAll("&", prefix)
      : `${prefix} ${segment}`
  ).trim();
};

// ['div, .foo', 'img, > #bar'] => 'div img, div > #bar, .foo img, .foo > #bar'
export const combineNestedSelectors = (selectors) => {
  const ERROR_VALUE = null;
  if (!selectors || !(selectors instanceof Array) || selectors.length === 0)
    return ERROR_VALUE;
  for (let i = 0; i < selectors.length; i++) {
    if (typeof selectors[i] !== "string") return ERROR_VALUE;
  }

  if (selectors.length === 1) return removeExtraWhitespaces(selectors[0]);

  const combined = selectors.reduce((result, selector) => {
    const segments = selector.split(/(?<!\([^,]*),(?![^,]*\))/g);
    if (result.length === 0) return segments;

    return result.reduce((newResult, prefix) => {
      segments.forEach((sgm) =>
        newResult.push(combineSelectorSegments(prefix, sgm))
      );
      return newResult;
    }, []);
  }, []);
  return unique(combined.map(removeExtraWhitespaces)).join(", ");
};

const isValidSelector = (selector) => {
  if (!selector.includes(":") || /^\s*@/.test(selector)) return true;

  for (const m of selector.match(/:[\w-:]*/g)) {
    if (!validPseudoClasses.includes(m)) return false;
  }
  return true;
};

// padding: auto {...}
//         /\
//      space between ':' and value is obligatory!!
const isValidPropertySegment = (segment) => /\w:(\s|$)/.test(segment);

const isAtRule = (selector) => selector?.startsWith("@");

const removeComments = (str) =>
  str
    .replace(/\/\*.*?\*\//gs, "") // remove /* comment */
    .replace(/\/\/.*\n/g, ""); // remove // comment

const removeConsecutiveWhitespaces = (text) =>
  text.replace(/\s+/g, " ").replaceAll(/ ,/g, ",");

const parseProperty = (token) => {
  const match = token.match(/(?<key>[\w-]+)\s*:\s*(?<value>[^:]*)/);
  if (!match) return { key: token };

  const { key, value } = match.groups;
  return { key, value };
};

const removeEmptyRules = (rules) => {
  Object.entries(rules).forEach(([selector, props]) => {
    if (props instanceof Object && Object.keys(props).length === 0)
      delete rules[selector];
  });
};

export function parse(...args) {
  if (isPlainObject(args[0])) return args[0];

  if (typeof args[0] === "string" && args[0].length > 0)
    return parseStyleRules(args[0]);

  if (isTaggedTemplate(...args))
    return parseStyleRules(taggedTemplateArgsToString(...args));

  throw new SyntaxError(`argument must be non empty string`);
}

function parseStyleRules(textStyleRules) {
  // if (typeof args[0] !== "string" && !isTaggedTemplate(...args)) return null;
  if (!textStyleRules || textStyleRules?.length === 0) return null;
  // console.log(args);

  const text = removeConsecutiveWhitespaces(removeComments(textStyleRules));
  const matches = [...text.matchAll(/(?<d>[{};]|$)/gs)];
  let index = -1;
  let depth = 0;
  const blockTypes = [];
  const parentTypes = [];
  const selectorSegments = [];
  const propKeySegments = [];
  const tree = {};
  const selectors = [tree];
  const groupingRules = [tree];
  let currentSelector;

  const fullKey = (key) => {
    if (propKeySegments.length === 0) return key;
    return propKeySegments.join("-") + (key ? "-" + key : "");
  };

  for (let i = 0; i < matches.length; i++) {
    const { d } = matches[i].groups;
    const prevIndex = index;
    index = matches[i].index;
    const token = text.slice(prevIndex + 1, index).trim();

    // console.log(i, token, groupingRules, selectors);
    let type;
    if (d === "{") {
      if (isAtRule(token)) {
        type = "@rule";
        tree[token] = {};
        groupingRules.unshift(tree[token]);
      } else if (isValidSelector(token)) {
        type = "selector";
        selectorSegments.push(token);
        currentSelector = combineNestedSelectors(selectorSegments);
        groupingRules[0][currentSelector] = {};
        selectors.unshift(groupingRules[0][currentSelector]);
      } else if (isValidPropertySegment(token)) {
        type = "prop-segment";
        const { key, value } = parseProperty(token);
        propKeySegments.push(key);

        if (!!value) {
          const parent =
            parentTypes[0] === "@rule" ? groupingRules[0] : selectors[0];
          parent[fullKey()] = value;
        }
      } else throw new SyntaxError(`Illegal selector '${token}'`);

      blockTypes[++depth] = type;
      if (type !== "prop-segment") parentTypes.unshift(type);

      // d === '' means end of string
    } else if (d === ";" || d === "") {
      if (isAtRule(token)) {
        tree[token] = null;
      } else {
        const { key, value } = parseProperty(token);

        if (key && value && key != "" && value != "") {
          const parent =
            parentTypes[0] === "@rule" ? groupingRules[0] : selectors[0];
          parent[fullKey(key)] = value;
        }
      }
    } else if (d === "}") {
      type = blockTypes[depth];
      depth--;
      if (type === "prop-segment") {
        propKeySegments.pop();
      } else if (type === "selector") {
        selectorSegments.pop();
        currentSelector = combineNestedSelectors(selectorSegments);
        selectors.shift();
      } else if (type === "@rule") {
        groupingRules.shift();
      }

      if (parentTypes[0] === type) {
        parentTypes.shift();
      }

      if (depth < 0)
        throw new SyntaxError(
          `Unmatched '}' at #${index}: "...${textRules.slice(
            Math.max(index - 100, 0),
            index + 1
          )}" // <-`
        );
    }
  }

  if (depth > 0) throw new SyntaxError(`Unmatched '{'`);

  removeEmptyRules(tree);
  return Object.keys(tree).length > 0 ? tree : null;
}

export function stringify(styleRules, indentation = 2) {
  if (!isPlainObject(styleRules) || isEmptyObject(styleRules)) return [];

  const delimiter = indentation > 0 ? "\n" : " ";
  const indent = (depth) => " ".repeat(indentation * depth);

  let isStylesOnly = true;
  const _stringify = (rule, depth = 0) => {
    isStylesOnly &= depth === 0;
    const rules = Object.entries(rule).reduce((segments, [key, value]) => {
      if (value instanceof Object) {
        // console.log('Object:', key, value, depth)
        segments.push(
          [
            `${indent(depth)}${key} {${delimiter}`,
            _stringify(value, depth + 1),
            `${indent(depth)}}${delimiter}`,
          ].join("")
        );
        // console.log(segments[segments.length-1])
        return segments;
      }
      // console.log("property:", key, value, depth);
      segments.push(`${indent(depth)}${key}: ${value};${delimiter}`);
      return segments;
    }, []);
    return depth > 0 ? rules.join("") : rules;
  };

  const results = _stringify(styleRules);
  // console.log('results:', results)
  return isStylesOnly ? [results.join("")] : results;
}

/********** PARSING QUERY **********/

export function parseQuery(textQuery) {
  if (textQuery instanceof RegExp) {
    return {
      cssText: textQuery,
    };
  }

  if (isPlainObject(textQuery) || isFunction(textQuery)) return textQuery;

  if (typeof textQuery !== "string" || textQuery.length === 0) return null;

  const query = {};
  const groups = textQuery.match(
    /^(?<re>[^{}]*){(?<props>[^{}]+)}([^{}]*)$/
  )?.groups;

  query.cssText = (groups?.re ?? textQuery).trim();
  if (query.cssText === "") delete query.cssText;

  query.style = parseStyleRules(groups?.props);
  if (!query.style) delete query.style;

  return query;
}
