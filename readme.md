# My implementation of CSS-in-JS

Add `<style>` element to DOM on module's creation. This is the _default_ stylesheet. All inserted CSS rules go there.

```
import { insert, set, rules, filter as f, del } from './css-in-js.js'

// add new CSS rule
const newRule = insert` div { color: red; } `;

// get list of all rules
rules()              // rules()[0] === newRule

// query rules with optional filter
rules('div')[0]      // newRule
rules(/foo/).length  // 0

// filter rules
f(`div`)(newRule)                   // true
f({ selectorCSS: '.foo' })(newRule) // false
rules().filter(f`.foo`).length      // 1

// add new CSS props to newRule.style
const patch = set('opacity: 1; width: 100px;')(newRule)

// restore newRule to previous state
set(patch)(newRule)

// delete CSS rule
del(newRule)

```

## Main functions

### **insert**

`insert(rules: string | RuleSet): CSSRule[]`

Insert CSS rules into _default_ stylesheet. Can be used as function or tagged template.

#### Arguments:

`rules`: string in [SCSS-like syntax](#parse) or [RuleSet](#data-structures).

#### Return Value:

Array of inserted rules.

#### Usage:

```
// tagged template with SCSS syntax
const insertedRules = insert`
  div {
    color: ${myColor}
  }`

// with RuleSet
insert({
  'div > .box': {
     width: '100px'
  }
})
```

---

<h3 id="rules"><strong>rules</strong></h3>

`rules(filter?: string | RegExp | `[(target) => boolean ](#filter)`): CSSRule[]`

Return array of rules, that match optional [filter](#filter) argument. The source stylesheet is the _default_ stylesheet. The source stylesheets can be reset with [stylesheets()](#stylesheets).

#### Usage:

```
rules()
rules('.foo > #id')
rules('.foo { width: 2rem; color: red; } ')
rules(/foo/)
rules((rule) => rule.selectorText === 'div')
```

---

<h3 id="filter"><strong>filter</strong></h3>

`filter(query: string | RegExp | Query | (rule) => boolean): (target) => boolean`

High order function, which takes `query` and return a function, that compares the `query` with `target` object and return `true` on match or `false`, otherwise

#### Argument:

`query:` define conditions, which `target` must match. Can be in different forms:

    string: convert to RegExp, which will be tested against target.cssText.
            Trim all whitespaces, convert inside whitespaces to \s+,
            escape special RegExp symbols.
            If there is list of CSS properties, wrapped in {}, then each property's value
            is converted to RegExp and tested against corresponding target.style.<property>

            '.foo { width: 20; }' match target.cssText to /\.foo/ and target.style.width to /20/

    RegExp: test target.cssText against query

    Query: {
             selectorCss: '.foo',
             style: {
               color: /#ef/
             }
           }

    Function: consider query to be a ready to use matcher (rule) => boolean, so
              it filter() just return query

#### Usage:

```
const myFilter = filter('.foo { opacity: 0.5 }');
rules(myFilter)
rules().filter(myFilter)
```

```
import { rules, filter as f } from 'css_in_js';
rules().filter(f`.foo`)
```

---

### **set**

`set(styleSet: string | `[StyleSet](#data-structures)`): (target) => Patch`

High order function, which returns function, that applies `styleSet` on `target` and returns `patch` object (old values of changed properties). Applying the `patch` to the same target will set it to its original state.

#### Usage:

```
// tagged template syntax
rules().forEach(set`
  width: 2rem;
  color: red;
`)

// with StyleSet
set({
  width: '2rem',
  color: 'red',
})(rule)
```

```
// undo changes
const patch = set`    // <- patch contains prop value differences
  width: 2rem;
  color: red;
`(rule);

set(patch)(rule);     // <- this will bring rule to its previous state
```

---

### **del**

`del(rules: CSSRule | CSSRule[])`

Delete `rules` from containing stylesheet(s).

```
const rules = insert`
  div {
    width: 20rem;
    & img {
      width: 100px;
    }
  }`;

del(rules);
```

---

### **stylesheets**

`stylesheets(sheets: CSSStyleSheet | CSSStyleSheet[]): ScopedStyleSheets`

#### Return Value;

Array with some additional properties:

```
rules(),  // scoped to 'sheets' stylesheets; see 'rules'
default   // default stylesheet
```

`default` is the stylesheet, in which all new rules are inserted. _Default_ stylesheet is shared for all `stylesheet()`

```
stylesheets.default === stylesheets().default
stylesheets().default === stylesheets().default
```

`rules()` work is the same way as [rules()](#rules), but scoped to `sheets` stylesheets.

```
// return all existing CSS rules
stylesheets(document.styleSheets).rules()
```

When called without argument return _default_ stylesheet:

```
stylesheets().length === 1
stylesheets()[0] === stylesheets.default
rules()  and  stylesheets().rules()  are equivalent
```

---

## Auxiliary Functions

<h3 id="parse"><strong>parse</strong></h3>

`parse(textStyleRules: string): RuleSet | StyleSet;`

Parse SCSS-like syntax to RuleSet. Can be used as function or tagged template.

#### Usage:

##### Making [RuleSet](#data-structures)

```
parse`
  // can have one line or
  /* multiline
     comments */

  section {
    box-sizing: padding-box; // <- ';' must be after each property declaration

    // rules can be nested; placeholder '&' will be replaced with parent selector
    & > div {
      color: #eee;
    }

    // no '&'; equivalent to 'section .card'
    .card {
      //  empty rules will be ignored
    }

    // props can be nested
    padding: {             // must have ':' in the end of property name
      inline: auto {       // partial property can have value
        start: 2rem;
      }
    }
  }`
```

##### Result:

```
{
  section: {
    'box-sizing': 'padding-box',
    'padding-inline': 'auto',
    'padding-inline-start': '2rem'
  },
  'section > div': {
    color: '#eee'
  }
}
```

##### Making [StyleSet](#data-structures):

```
parse`
    // no selector or braces
    color: red;
    width: 100px;
    opacity: 0.5    // <- ';' can be ommitted for the last prop
  `
```

##### Result:

```
{
  color: 'red',
  width: '100px',
  opacity: '0.5'   // <- values are always string, even numeric
}
```

---

### **createStyleSheet**

`createStyleSheet(): CSSStyleSheet`

Append new &lt;style&gt; element to the DOM and return corresponding CSSStyleSheet.

```
const ss = createStyleSheet();
stylesheets(ss).rules().length === 0
```

---

### **deleteStyleSheet**

`deleteStyleSheet(stylesheet: CSSStyleSheet): void`

Remove &lt;style&gt; element corresponding to `stylesheet`. Works only for stylesheets, which were created with `createStyleSheet()`.

```
const ss = createStyleSheet();
deleteStyleSheet(ss);                      // OK

deleteStyleSheet(document.styleSheets[0])  // ERROR
```

---

<h2 id="data-structures">Data Structures</h2>

`RuleSet`

```
{                            //  EXAMPLES
  <selector or @rule>: {     // 'div > #some-id + .some-class' or '@page'
    <prop>: <value>          // 'padding-inline': '2rem' or color: 'red'
        ...
  },

  <@rule>: string,           // '@import ... '

  <@rule>: {                 // '@keyframes' or '@media min-width(...)'
    <selector>: {
      prop: value
    }
  }
}
```

`StyleSet`

```
{
  prop: value,
     ...
}
```
