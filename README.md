# BEM to SCSS/LESS Converter

![npm](https://img.shields.io/npm/v/bem-css-converter)
![downloads](https://img.shields.io/npm/dw/bem-css-converter)

Convert flat [BEM class](https://getbem.com/naming/) names into clean, nested SCSS/LESS structure automatically.

Supports both standard BEM (double dash `--` for modifiers) and single underscore `_` for modifiers.

## Installation

```bash
npm install -g bem-css-converter
```

## Usage

```bash
bem-css-converter input.css
```

That's it!
The tool reads the CSS file and outputs the nested SCSS to stdout if no output file is specified, or writes to the specified file.

You can also specify output filename:

```bash
bem-css-converter input.css [output.scss]
```

## Supported BEM Patterns

- Blocks: `.block`
- Elements: `.block__element`
- Modifiers: `.block--modifier` or `.block_modifier`
- Element modifiers: `.block__element--modifier` or `.block__element_modifier`
- Pseudo-classes: `.block:hover` → `&:hover`
- Media queries: Nested inside blocks
- Nested selectors: `.block img` → `img { ... }`

## Example

Input CSS:

```css
.block {
  color: red;
}

.block--error {
  color: blue;
}

.block__element {
  font-size: 14px;
}

.block__element--error {
  font-weight: bold;
}
```

Output SCSS:

```scss
.block {
  color: red;
  &--error {
    color: blue;
  }

  &__element {
    font-size: 14px;
    &--error {
      font-weight: bold;
    }
  }
}
```

## Example with media queries

Input CSS:

```css
.order-item {
  box-sizing: border-box;
  padding: 20px 32px;
  display: grid;
  grid-template-columns: 80fr 119fr 20px;
  gap: 20px;
  border: none;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.15s linear;
}

.order-item_error {
  background-color: red;
  opacity: 0.7;
}

.order-item:hover {
  background-color: rgba(29, 44, 64, 0.05);
}

.order-item > span {
  color: black;
}

@media (max-width: 1599px) {
  .order-item {
    grid-template-columns: 400fr 280fr 20px;
  }
}

@media (max-width: 639px) {
  .order-item {
    padding: 20px 16px;
  }
}
```

Output SCSS:

```scss
.order-item {
  box-sizing: border-box;
  padding: 20px 32px;
  display: grid;
  grid-template-columns: 80fr 119fr 20px;
  gap: 20px;
  border: none;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.15s linear;
  &:hover {
    background-color: rgba(29, 44, 64, 0.05);
  }
  > span {
    color: black;
  }
  @media (max-width: 1599px) {
    grid-template-columns: 400fr 280fr 20px;
  }
  @media (max-width: 639px) {
    padding: 20px 16px;
  }
  &_error {
    background-color: red;
    opacity: 0.7;
  }
}
```

## Motivation

I built this to speed up my workflow when converting legacy CSS into structured SCSS

## Assumptions

- Selectors are simple BEM classes starting with `.`
- No complex selectors with multiple classes or combinators
- Declarations are standard CSS properties

## GitHub repo

⭐ Give me a star on GitHub: https://github.com/psycholessdev/bem-to-scss
