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

const isPlainObject = (obj) => obj?.constructor === Object;
const isEmptyObject = (obj) => Object.keys(obj).length === 0;
const isFunction = (fnc) => fnc instanceof Function;
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

export function parseStyleRules(textStyleRules) {
  if (arguments.length !== 1)
    throw new SyntaxError(`must have one and only one string argument`);

  if (typeof textStyleRules !== "string" || textStyleRules.length === 0)
    return null;
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
