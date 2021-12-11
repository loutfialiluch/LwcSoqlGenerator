import { LightningElement, api } from "lwc";
import getFieldSetDetails from "@salesforce/apex/CTRL_SoqlGenerator.getFieldSetDetails";
import { loadStyle } from "lightning/platformResourceLoader";
import searchFilterCssOverwrite from "@salesforce/resourceUrl/LWC_SoqlGeneratorCssOverwrite";

const numericTypes = ["DATETIME", "CURRENCY", "DATE", "TIME", "INTEGER", "PERCENT", "DOUBLE", "LONG"];
const otherTypes = ["BOOLEAN", "EMAIL", "ID", "LOCATION", "MULTIPICKLIST", "PICKLIST", "REFERENCE", "STRING", "TEXTAREA", "URL"];

const withoutQuotesFields = ["DATETIME", "CURRENCY", "DATE", "TIME", "INTEGER", "PERCENT", "DOUBLE", "BOOLEAN"];

const operatorOptions = [
  {
    operatorLabel: "égal",
    operatorSymbol: "=",
    types: [...numericTypes, ...otherTypes.filter((type) => type !== "MULTIPICKLIST")]
  },
  {
    operatorLabel: "différent",
    operatorSymbol: "!=",
    types: [...numericTypes, ...otherTypes.filter((type) => type !== "MULTIPICKLIST")]
  },
  {
    operatorLabel: "supérieur",
    operatorSymbol: ">",
    types: [...numericTypes]
  },
  {
    operatorLabel: "inférieur",
    operatorSymbol: "<",
    types: [...numericTypes]
  },
  {
    operatorLabel: "supérieur ou égal",
    operatorSymbol: ">=",
    types: [...numericTypes]
  },
  {
    operatorLabel: "inférieur ou égal",
    operatorSymbol: "<=",
    types: [...numericTypes]
  },
  {
    operatorLabel: "contient",
    operatorSymbol: "LIKE '%KEY%'",
    multipicklistOperatorSymbol: "includes ('KEY')",
    types: [...otherTypes.filter((type) => !["PICKLIST", "BOOLEAN", "REFERENCE"].includes(type))]
  },
  {
    operatorLabel: "ne contient pas",
    operatorSymbol: "NOT LIKE '%KEY%'",
    multipicklistOperatorSymbol: "excludes ('KEY')",
    types: [...otherTypes.filter((type) => !["PICKLIST", "BOOLEAN", "REFERENCE"].includes(type))]
  },
  {
    operatorLabel: "commence par",
    operatorSymbol: "LIKE 'KEY%'",
    types: [...otherTypes.filter((type) => !["PICKLIST", "MULTIPICKLIST", "BOOLEAN", "REFERENCE"].includes(type))]
  },
  {
    operatorLabel: "ne commence pas par",
    operatorSymbol: "NOT LIKE 'KEY%'",
    types: [...otherTypes.filter((type) => !["PICKLIST", "MULTIPICKLIST", "BOOLEAN", "REFERENCE"].includes(type))]
  }
];

const booleanOptions = [
  {
    label: "vrai",
    value: "true"
  },
  {
    label: "faux",
    value: "false"
  }
];

export default class LWC_SoqlGenerator extends LightningElement {
  @api
  objectApiName = "Child__c";
  @api
  filterFieldSetName = "SearchFilter_FS";
  @api
  fieldSetToQueryName = "FieldsToQuery_FS";

  filterFieldSetDetails;
  fieldsToQuery;
  fieldOptions;
  operatorOptions;
  picklistOptions;
  selectedField;
  selectedOperator;
  value;
  customLogic;
  selectedLogic = "AND";
  booleanOptions = booleanOptions;
  filterRules = [];
  whereClauseRules = [];

  async connectedCallback() {
    // Overwriting some lightning components css properties
    loadStyle(this, searchFilterCssOverwrite);
    this.filterFieldSetDetails = await getFieldSetDetails({
      objectApiName: this.objectApiName,
      fieldSetName: this.filterFieldSetName
    });
    this.fieldSetToQuery = await getFieldSetDetails({
      objectApiName: this.objectApiName,
      fieldSetName: this.fieldSetToQueryName
    });
    this.fieldsToQuery = this.fieldSetToQuery.map(({ apiName }) => apiName);
    this.fieldOptions = this.filterFieldSetDetails.map(({ apiName, label }) => ({
      label,
      value: apiName
    }));
  }

  get filterRuleClass() {
    return `filter__rule ${this.selectedFieldType === "MULTIPICKLIST" ? "multipicklist" : ""}`;
  }

  get inputsDisabled() {
    return !this.selectedField;
  }

  get isPickListField() {
    return this.selectedFieldType === "PICKLIST";
  }

  get isDateField() {
    return this.selectedFieldType === "DATE";
  }

  get isDateTimeField() {
    return this.selectedFieldType === "DATETIME";
  }

  get isTimeField() {
    return this.selectedFieldType === "TIME";
  }
  get isMultipicklistField() {
    return this.selectedFieldType === "MULTIPICKLIST";
  }
  get isBooleanField() {
    return this.selectedFieldType === "BOOLEAN";
  }
  get isLookupField() {
    return this.selectedFieldType === "REFERENCE";
  }
  get isOtherFields() {
    return !["PICKLIST", "DATE", "DATETIME", "TIME", "MULTIPICKLIST", "BOOLEAN", "REFERENCE"].includes(this.selectedFieldType);
  }

  get logicOptions() {
    return [
      { label: "ET", value: "AND" },
      { label: "OU", value: "OR" },
      { label: "CUSTOM", value: "CUSTOM" }
    ];
  }

  get isCustomLogic() {
    return this.selectedLogic === "CUSTOM";
  }

  get customLogicHelpText() {
    return "Utiliser les parenthèses, ET, OU  pour personnaliser la logique. par exemple : (1 AND 2 AND 3) OR 4";
  }

  get shouldDisplayLogicSelector() {
    return this.filterRules.length > 1;
  }

  get shouldDisplaySearchBtn() {
    return this.filterRules.length === 0;
  }

  handleFieldChange(event) {
    this.selectedField = event.detail.value;
    this.selectedFieldType = this.getSelectedFieldType();
    this.operatorOptions = operatorOptions
      .filter(({ types }) => types.includes(this.selectedFieldType))
      .map(({ operatorLabel, operatorSymbol }) => ({
        label: operatorLabel,
        value: operatorSymbol
      }));
    if (["PICKLIST", "MULTIPICKLIST"].includes(this.selectedFieldType)) {
      this.picklistOptions = this.getSelectedFieldPicklistValues();
    }
  }

  handleOperatorChange(event) {
    this.selectedOperator = event.detail.value;
  }

  handleValueChange(event) {
    this.value = event.detail.value;
  }

  handleAddRule() {
    if (!this.validateInputs()) {
      return;
    }
    this.whereClauseRules = [...this.whereClauseRules, this.getWhereClauseRule()];
    this.filterRules = [...this.filterRules, this.getFilterRule()];
    this.setFilterRulesIndexes();
    this.clearFilterRule();
  }

  handleLogicChange(event) {
    this.selectedLogic = event.detail.value;
  }

  handleDeleteRule(event) {
    const ruleIndex = +event.target.dataset.index;
    this.filterRules = this.filterRules.filter((filterRule, index) => index !== ruleIndex);
    this.setFilterRulesIndexes();
    this.whereClauseRules = this.whereClauseRules.filter((whereClauseRule, index) => index !== ruleIndex);
  }

  handleReset() {
    this.clearFilterRule();
    this.whereClauseRules = [];
    this.filterRules = [];
    this.selectedLogic = "ET";
  }

  handleSearch() {
    if (!this.filterRules.length) {
      return;
    }

    if (this.selectedLogic !== "CUSTOM") {
      const whereClause = this.whereClauseRules.join(` ${this.selectedLogic} `);
      const query = `SELECT ${this.fieldsToQuery.join(", ")} FROM ${this.objectApiName} WHERE ${whereClause}`;
      alert(query);
      return;
    }

    const customLogicInput = this.template.querySelector("[data-custom-logic]");

    if (!customLogicInput.reportValidity()) {
      return;
    }

    if (!this.validateCustomLogicExpression()) {
      customLogicInput.setCustomValidity("Logique personnalisée erronée !");
      customLogicInput.reportValidity();
      return;
    }

    if (!this.validateCustomLogicNumbers()) {
      customLogicInput.setCustomValidity("Veuillez utiliser les nombres correspondants aux filtres ajoutés !");
      customLogicInput.reportValidity();
      return;
    }

    if (!this.validateIfAllFilterRulesHasBeenUsed()) {
      customLogicInput.setCustomValidity("Certains filtres ne sont pas utilisés, veuillez les utiliser ou les supprimer avant de réessayer !");
      customLogicInput.reportValidity();
      return;
    }
    const whereClause = this.getCustomLogicWhereClause();
    const query = `SELECT ${this.fieldsToQuery.join(", ")} FROM ${this.objectApiName} WHERE ${whereClause}`;
    alert(query);
  }

  handleCustomLogicChange(event) {
    this.customLogic = event.detail.value;
  }
  handleCustomLogicFocus(event) {
    event.target.setCustomValidity("");
  }

  // ********** HELPERS **********
  getSelectedFieldType() {
    const { type: selectedFieldType } = this.filterFieldSetDetails.find(({ apiName }) => apiName === this.selectedField);
    return selectedFieldType;
  }
  getSelectedFieldPicklistValues() {
    const { picklistValues } = this.filterFieldSetDetails.find(({ apiName }) => apiName === this.selectedField);
    return picklistValues.map((picklistValue) => ({
      label: picklistValue,
      value: picklistValue
    }));
  }
  getSelectedFieldLabel(fieldApiName) {
    const { label: selectedFieldLabel } = this.fieldOptions.find(({ value }) => value === fieldApiName);
    return selectedFieldLabel;
  }
  getSelectedOperatorLabel(operator) {
    const { label: operatorLabel } = this.operatorOptions.find(({ value }) => value === operator);
    return operatorLabel;
  }
  getFilterRule() {
    let value;
    switch (this.selectedFieldType) {
      case "DATE":
        value = this.getFormattedDate(new Date(this.value));
        break;
      case "DATETIME":
        value = this.getFormattedDateTime(new Date(this.value));
        break;
      case "TIME":
        value = this.getFormattedTime(this.value);
        break;
      default:
        value = this.value;
    }
    return {
      field: this.getSelectedFieldLabel(this.selectedField),
      operator: this.getSelectedOperatorLabel(this.selectedOperator),
      value
    };
  }
  getWhereClauseRule() {
    // ****** /EXCEPTIONS ******
    if (this.selectedFieldType === "TIME") {
      return `${this.selectedField} ${this.selectedOperator} ${this.value}Z`;
    }
    if (this.selectedFieldType === "MULTIPICKLIST") {
      const { multipicklistOperatorSymbol } = operatorOptions.find(({ operatorSymbol }) => operatorSymbol === this.selectedOperator);
      return `${this.selectedField} ${multipicklistOperatorSymbol.replace("KEY", this.value.join(";"))}`;
    }
    if (this.selectedOperator.includes("LIKE")) {
      return `${this.selectedField} ${this.selectedOperator.replace("KEY", this.value)}`;
    }
    // ****** /EXCEPTIONS ******
    const isWithoutQuotes = this.isWithoutQuotes(this.selectedFieldType);
    return `${this.selectedField} ${this.selectedOperator} ${isWithoutQuotes ? this.value : `'${this.value}'`}`;
  }
  getFormattedDate(date) {
    return `${date.getDay().toString().padStart(2, "0")}/${date.getMonth().toString().padStart(2, "0")}/${date.getFullYear()}`;
  }
  getFormattedDateTime(dateTime) {
    return `${dateTime.getDay().toString().padStart(2, "0")}/${dateTime.getMonth().toString().padStart(2, "0")}/${dateTime.getFullYear()} ${dateTime
      .getHours()
      .toString()
      .padStart(2, "0")}:${dateTime.getMinutes().toString().padStart(2, "0")}`;
  }
  getFormattedTime(time) {
    return time.substring(0, time.lastIndexOf(":"));
  }

  getCustomLogicNumbers() {
    let customLogic = this.customLogic;
    customLogic = customLogic.replaceAll(/AND|OR/g, " ").replace(/\(|\)/g, "");
    const customLogicNumbers = [];
    let customLogicNumber = "";
    for (let i = 0; i < customLogic.length; i++) {
      if (this.isValidExpressionNum(customLogic.charAt(i))) {
        customLogicNumber += customLogic.charAt(i);
      }
      if (customLogicNumber && !this.isValidExpressionNum(customLogic.charAt(i + 1))) {
        customLogicNumbers.push(customLogicNumber);
        customLogicNumber = "";
      }
    }
    return customLogicNumbers;
  }

  getCustomLogicWhereClause() {
    const customWhereClause = [...this.customLogic];
    let customLogic = this.customLogic;
    let customLogicNumber = "";
    let startIndex = -1;
    let endIndex = -1;
    for (let i = 0; i < customLogic.length; i++) {
      if (this.isValidExpressionNum(customLogic.charAt(i))) {
        startIndex === -1 && (startIndex = i);
        customLogicNumber += customLogic.charAt(i);
      }
      if (customLogicNumber && !this.isValidExpressionNum(customLogic.charAt(i + 1))) {
        endIndex = i;
        customWhereClause.splice(startIndex, startIndex - endIndex + 1, this.whereClauseRules[+customLogicNumber - 1]);
        startIndex = -1;
        customLogicNumber = "";
      }
    }
    return customWhereClause.join("");
  }
  validateInputs() {
    const ruleInputs = this.template.querySelectorAll(".filter__rule-input");
    return Array.from(ruleInputs).reduce((validSoFar, curr) => validSoFar && curr.reportValidity(), true);
  }
  validateCustomLogicExpression() {
    let customLogic = this.customLogic.replaceAll("AND", "&&").replaceAll("OR", "||");
    for (let i = this.filterRules.length; i > 0; i--) {
      customLogic = customLogic.replaceAll(`${i}`, "true");
    }
    try {
      eval(customLogic);
      return true;
    } catch (error) {
      return false;
    }
  }
  validateCustomLogicNumbers() {
    const customLogicNumbers = this.getCustomLogicNumbers();
    const maxCustomLogicNumber = Math.max(...customLogicNumbers);
    return maxCustomLogicNumber <= this.filterRules.length;
  }

  validateIfAllFilterRulesHasBeenUsed() {
    const usedCustomLogicNumbers = new Set([...this.getCustomLogicNumbers()]);
    return [...usedCustomLogicNumbers].length === this.filterRules.length;
  }

  clearFilterRule() {
    this.selectedField = null;
    this.selectedOperator = null;
    this.value = null;
  }

  isWithoutQuotes(field) {
    return withoutQuotesFields.includes(field);
  }

  setFilterRulesIndexes() {
    this.filterRules = this.filterRules.map((filterRule, index) => ({
      ...filterRule,
      index: index + 1
    }));
  }
  isValidExpressionNum(num) {
    return ![NaN, 0].includes(+num);
  }
}
