# BEM to SCSS Converter

A CLI tool to convert flat BEM CSS classes into nested SCSS syntax.

Supports both standard BEM (double dash `--` for modifiers) and single underscore `_` for modifiers.

## Installation

```bash
npm install -g .
```

## Usage

```bash
bem-to-scss input.css [output.scss]
```

The tool reads the CSS file and outputs the nested SCSS to stdout if no output file is specified, or writes to the specified file.

Examples:

```bash
# Output to file
bem-to-scss input.css output.scss
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

## Example with Single Underscore Modifiers

Input CSS:

```css
.block {
  color: red;
}

.block_error {
  color: blue;
}

.block__element {
  font-size: 14px;
}

.block__element_error {
  font-weight: bold;
}
```

Output SCSS:

```scss
.block {
  color: red;
  &_error {
    color: blue;
  }
  &__element {
    font-size: 14px;
    &_error {
      font-weight: bold;
    }
  }
}
```

## Assumptions

- Selectors are simple BEM classes starting with `.`
- No complex selectors with multiple classes or combinators
- Declarations are standard CSS properties
