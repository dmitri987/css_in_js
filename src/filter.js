const isString = (str) => typeof str === "string";
const isRegExp = (re) => re instanceof RegExp;
const isIterable = (obj) => typeof obj?.[Symbol.iterator] === "function";
const isPlainObject = (obj) =>
  obj instanceof Object && !isIterable(obj) && !isRegExp(obj); // obj?.constructor === Object;

export function createRegExp(str) {
  if (str instanceof RegExp || !isString(str) || str === "") return str;

  const source = str
    .trim()
    .replace(/[+*()\[\].^$:{}\/\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  return new RegExp(source);
}

export const deepClone = (obj, stringToRegExp = true) => {
  if (isString(obj))
    return stringToRegExp && obj.length > 0 ? createRegExp(obj) : obj;

  if (!isPlainObject(obj)) return obj;

  const newObj = {};
  Object.entries(obj).forEach(([key, value]) => {
    newObj[key] = deepClone(value, stringToRegExp);
  });
  return newObj;
};

const defaultConfig = {
  stringToRegExp: true,
  resultIfNoTarget: false,
  ignoreNull: true,
  ignoreUndefined: true,
};

export function configureFilter(config) {
  const { stringToRegExp, resultIfNoTarget, ignoreNull, ignoreUndefined } = {
    ...defaultConfig,
    ...config,
  };

  return function createFilter(queryObj) {
    if (queryObj instanceof Function) return queryObj;

    const query = deepClone(queryObj, stringToRegExp);

    const _filter = (target, query) => {
      // console.log("#1    ", target, query);
      if (ignoreNull && query === null) return true;
      if (ignoreUndefined && query === undefined) return true;

      if (isRegExp(query) && isString(target)) {
        // console.log("#2  ", query.test(target));
        return query.test(target);
      }
      const entries = Object.entries(query ?? {});
      if (entries.length === 0) {
        return target === query;
      }

      for (let [key, value] of entries) {
        // console.log("#3   ", key, value, key in target);
        // if (ignoreNull && value === null) continue;
        // if (ignoreUndefined && value === undefined) continue;
        if (!(key in target)) {
          if (resultIfNoTarget === true) continue;
          return false;
        }
        if (!_filter(target[key], value)) return false;
      }

      return true;
    };

    return function filter(target) {
      return _filter(target, query);
    };
  };
}

export const createFilter = configureFilter();
