const adjectives = [
  "tragic",
  "abject",
  "guilty",
  "penitent",
  "mendicant",
  "offensive",
  "adjutant",
  "ebullient",
  "exuberant",
  "despondent",
  // "master",
];
const nouns = [
  "solitude",
  "testament",
  "spark",
  "tangent",
  "bias",
  "reflex",
  "prism",
  "witness",
  "pyte",
  // "chief",
];
export default () =>
  `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${
    nouns[Math.floor(Math.random() * nouns.length)]
  }`;
