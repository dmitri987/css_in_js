// configureSetter(config) => createSetter(propSet) => set(target) => patch

const defaultConfig = {
  mode: "both", // 'add' | 'change' | 'both'
  // addPropIfAbsernt: true,
  // returnValue: "diff", // 'diff' | 'object'
  // changeInPlace: true, // true | false | 'deepClone' ??
};

const hasKeys = (obj) =>
  obj instanceof Object && Object.keys(obj ?? {}).length > 0;
const hasKey = (obj, key) => hasKeys(obj) && key in obj;
const assertMode = (mode) => {
  if (!["add", "change", "both"].includes(mode))
    throw new TypeError(
      `invalid mode '${mode}'; possible values: 'add', 'change', 'both'`
    );
};

const assertObject = (obj, name) => {
  if (!(obj instanceof Object))
    throw new TypeError(`invalid '${name}' argument: should be an object`);
};

const $$DELETED = Symbol("deleted");

export function configureSetter(mode = "both") {
  // const { mode } = {
  //   ...defaultConfig,
  //   ...config,
  // };

  assertMode(mode);

  return function createSetter(propSet) {
    assertObject(propSet, "propSet");

    const _set = (target, propSet, diff) => {
      if (!propSet || !hasKeys(propSet) || !target) {
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
      assertObject(target, "target");
      const [_, diff] = _set(target, propSet, {});
      return diff;
    };
  };
}

export const createSetter = configureSetter();
