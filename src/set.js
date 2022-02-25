// configureSetter(config) => createSetter(propSet) => set(target) => patch

const defaultConfig = {
  mode: "both", // 'add' | 'change' | 'both'
  // addPropIfAbsernt: true,
  // returnValue: "diff", // 'diff' | 'object'
  // changeInPlace: true, // true | false | 'deepClone' ??
};

const isObject = (obj) => obj instanceof Object;
const hasKeys = (obj) =>
  obj instanceof Object && Object.keys(obj ?? {}).length > 0;
const hasKey = (obj, key) => hasKeys(obj) && key in obj;
const assertMode = (mode) => {
  if (!["add", "change", "both"].includes(mode))
    throw new TypeError(
      `invalid mode '${mode}'; possible values: 'add', 'change', 'both'`
    );
};

const assertPropSet = (propSet) => {
  if (!(propSet instanceof Object) || Object.keys(propSet).length === 0)
    throw new TypeError(
      `invalid 'propSet' argument: should be non empty object`
    );
};

const assertTarget = (target) => {
  if (!(target instanceof Object))
    throw new TypeError(`invalid 'target' argument: should be object`);
};

const $$DELETED = Symbol("deleted");

export function configureSetter(mode = "both") {
  assertMode(mode);

  return function createSetter(propSet) {
    assertPropSet(propSet);

    const _set = (target, propSet, diff) => {
      if (!propSet || !hasKeys(propSet) || !isObject(target)) {
        return [propSet, target];
      }

      for (const [key, value] of Object.entries(propSet)) {
        if (
          (hasKey(target, key) && (mode === "change" || mode === "both")) ||
          (!hasKey(target, key) && (mode === "add" || mode === "both"))
        ) {
          const [v, d] = _set(target[key], value);
          diff[key] = hasKey(target, key) ? d : $$DELETED;
          if (v === $$DELETED) delete target[key];
          else target[key] = v;
          // console.log("#2  ", v, d, key, target, diff, hasKey(target, key));
        }
      }
      return [target, diff];
    };

    return function set(target) {
      assertTarget(target);
      const [_, diff] = _set(target, propSet, {});
      return diff;
    };
  };
}

export const createSetter = configureSetter();
