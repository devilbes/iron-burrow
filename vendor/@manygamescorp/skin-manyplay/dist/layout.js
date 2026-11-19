export const landscapeRules = (root, rules) => `${rules.replaceAll('&', `.${root}--landscape`)}
@media(orientation:landscape) and (max-height:560px){${rules.replaceAll('&', `.${root}--auto`)}}`;
