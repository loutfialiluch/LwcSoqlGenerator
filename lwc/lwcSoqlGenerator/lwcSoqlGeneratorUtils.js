import { NUMERIC_TYPES, OTHER_TYPES } from "./lwcSoqlGeneratorConstants";

export const getFormattedDate = (date) => {
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${date.getFullYear()}`;
};

export const getFormattedDateTime = (dateTime) => {
  return `${dateTime.getDate().toString().padStart(2, "0")}/${(dateTime.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${dateTime.getFullYear()} ${dateTime.getHours().toString().padStart(2, "0")}:${dateTime
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

export const getFormattedTime = (time) => {
  return time.substring(0, time.lastIndexOf(":"));
};

export const getOperatorOptions = (labelsObject) => [
  {
    operatorLabel: labelsObject.equalsLabel,
    operatorSymbol: "=",
    types: [...NUMERIC_TYPES, ...OTHER_TYPES.filter((type) => type !== "MULTIPICKLIST")]
  },
  {
    operatorLabel: labelsObject.doesntEqualLabel,
    operatorSymbol: "!=",
    types: [...NUMERIC_TYPES, ...OTHER_TYPES.filter((type) => type !== "MULTIPICKLIST")]
  },
  {
    operatorLabel: labelsObject.greaterThanLabel,
    operatorSymbol: ">",
    types: [...NUMERIC_TYPES]
  },
  {
    operatorLabel: labelsObject.lessThanLabel,
    operatorSymbol: "<",
    types: [...NUMERIC_TYPES]
  },
  {
    operatorLabel: labelsObject.greaterOrEqualThanLabel,
    operatorSymbol: ">=",
    types: [...NUMERIC_TYPES]
  },
  {
    operatorLabel: labelsObject.lessOrEqualThanLabel,
    operatorSymbol: "<=",
    types: [...NUMERIC_TYPES]
  },
  {
    operatorLabel: labelsObject.containsLabel,
    operatorSymbol: "LIKE '%KEY%'",
    multipicklistOperatorSymbol: "includes ('KEY')",
    types: [...OTHER_TYPES.filter((type) => !["PICKLIST", "BOOLEAN", "REFERENCE"].includes(type))]
  },
  {
    operatorLabel: labelsObject.doesntContainsLabel,
    operatorSymbol: "NOT LIKE '%KEY%'",
    multipicklistOperatorSymbol: "excludes ('KEY')",
    types: [...OTHER_TYPES.filter((type) => !["PICKLIST", "BOOLEAN", "REFERENCE"].includes(type))]
  },
  {
    operatorLabel: labelsObject.startsWithLabel,
    operatorSymbol: "LIKE 'KEY%'",
    types: [...OTHER_TYPES.filter((type) => !["PICKLIST", "MULTIPICKLIST", "BOOLEAN", "REFERENCE"].includes(type))]
  },
  {
    operatorLabel: labelsObject.doesntStartWithLabel,
    operatorSymbol: "NOT LIKE 'KEY%'",
    types: [...OTHER_TYPES.filter((type) => !["PICKLIST", "MULTIPICKLIST", "BOOLEAN", "REFERENCE"].includes(type))]
  }
];

export const getBooleanOptions = ({ trueLabel, falseLabel }) => [
  {
    label: trueLabel,
    value: "true"
  },
  {
    label: falseLabel,
    value: "false"
  }
];

export const getFilterLogicOptions = ({ andOperatorLabel, orOperatorLabel, customLogicLabel }) => [
  { label: andOperatorLabel, value: "AND" },
  { label: orOperatorLabel, value: "OR" },
  { label: customLogicLabel, value: "CUSTOM" }
];

export const setIndexes = (objectArray) => {
  return objectArray.map((filterRule, index) => ({
    ...filterRule,
    index: index + 1
  }));
};

export const validateInputs = (inputElements) => {
  return Array.from(inputElements).reduce((validSoFar, curr) => validSoFar && curr.reportValidity(), true);
};

export const isValidExpressionNum = (num) => {
  return ![NaN, 0].includes(+num);
};
