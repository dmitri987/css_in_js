export const f = () => 42;

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

const combineSelectorSegments = (prefix, segment) => {
  return (
    segment.includes("&")
      ? segment.replaceAll("&", prefix)
      : `${prefix} ${segment}`
  ).trim();
};

const unique = (arr) => [...new Set(arr)];
const removeExtraWhitespaces = (str) => str.trim().replaceAll(/\s\s+/g, " ");

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

// from here: https://github.com/ai/nanoid/blob/main/nanoid.js
const nanoid = (t = 6) => {
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

  const _rules = (filter) => {
    return sheets.reduce((rules, sheet) => {
      return rules.concat(...sheet.rules);
    }, []);
  };

  sheets.rules = _rules;
  sheets.default = defaultStyleSheet;
  return sheets;
};

_stylesheets.default = defaultStyleSheet;

export const stylesheets = _stylesheets;
