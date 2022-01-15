import { LightningElement, api } from "lwc";
import getFieldSetDetails from "@salesforce/apex/CTRL_LwcSoqlGenerator.getFieldSetDetails";
import { WITHOUT_QUOTES_TYPES } from "./lwcSoqlGeneratorConstants";
import { SUPPORTED_LANGUAGES } from "./lwcSoqlGeneratorLang";
import {
  getFormattedDate,
  getFormattedDateTime,
  getFormattedTime,
  getOperatorOptions,
  getBooleanOptions,
  getFilterLogicOptions,
  setIndexes,
  validateInputs,
  isValidExpressionNum
} from "./lwcSoqlGeneratorUtils.js";
import searchFilterCssOverwrite from "@salesforce/resourceUrl/LwcSoqlGeneratorCssOverwrite";
import { loadStyle } from "lightning/platformResourceLoader";

export default class LwcSoqlGenerator extends LightningElement {
  @api
  objectApiName = "SOQL_Generator_Child__c";
  @api
  filterFieldSetName = "SoqlGeneratorFilterFields";
  @api
  fieldSetToQueryName = "SoqlGeneratorFieldsToQuery";
  @api
  lang = "en";

  filterFieldSetDetails;
  fieldsToQuery;
  fieldOptions;
  booleanOptions;
  operatorOptions;
  operatorPicklistOptions;
  valuePicklistOptions;
  filterLogicOptions;
  selectedField;
  selectedOperator;
  value;
  customLogic;
  selectedLogic = "AND";
  filterRules = [];
  whereClauseRules = [];
  langObj; // This object contains the different labels and messages used in the component based on the passed in language (en/fr)

  async connectedCallback() {
    // Overwriting some lightning components css properties
    loadStyle(this, searchFilterCssOverwrite);

    // Loading the different labels and messages used in the component based on the passed in language
    this.loadLangObject();

    this.operatorOptions = getOperatorOptions(this.langObj);
    this.booleanOptions = getBooleanOptions(this.langObj);
    this.filterLogicOptions = getFilterLogicOptions(this.langObj);

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
    return !["PICKLIST", "DATE", "DATETIME", "TIME", "MULTIPICKLIST", "BOOLEAN", "REFERENCE"].includes(
      this.selectedFieldType
    );
  }

  get isCustomLogic() {
    return this.selectedLogic === "CUSTOM";
  }

  get customLogicHelpText() {
    return this.langObj.customLogicHelpText;
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
    this.operatorPicklistOptions = this.operatorOptions
      .filter(({ types }) => types.includes(this.selectedFieldType))
      .map(({ operatorLabel, operatorSymbol }) => ({
        label: operatorLabel,
        value: operatorSymbol
      }));
    if (["PICKLIST", "MULTIPICKLIST"].includes(this.selectedFieldType)) {
      this.valuePicklistOptions = this.getSelectedFieldPicklistValues();
    }
  }

  handleOperatorChange(event) {
    this.selectedOperator = event.detail.value;
  }

  handleValueChange(event) {
    this.value = event.detail.value;
  }

  handleAddRule() {
    const filterRuleInputs = this.template.querySelectorAll(".filter__rule-input");
    if (!validateInputs(filterRuleInputs)) {
      return;
    }
    this.whereClauseRules = [...this.whereClauseRules, this.getWhereClauseRule()];
    this.filterRules = [...this.filterRules, this.getFilterRule()];
    this.filterRules = setIndexes(this.filterRules);
    this.clearFilterRule();
  }

  handleLogicChange(event) {
    this.selectedLogic = event.detail.value;
  }

  handleDeleteRule(event) {
    const ruleIndex = +event.target.dataset.index;
    this.filterRules = this.filterRules.filter(({ index }) => index - 1 !== ruleIndex);
    this.filterRules = setIndexes(this.filterRules);
    this.whereClauseRules = this.whereClauseRules.filter(({ index }) => index - 1 !== ruleIndex);
  }

  handleReset() {
    this.clearFilterRule();
    this.whereClauseRules = [];
    this.filterRules = [];
    this.selectedLogic = "AND";
  }

  handleSearch() {
    if (!this.filterRules.length) {
      return;
    }

    if (this.selectedLogic !== "CUSTOM") {
      const whereClause = this.whereClauseRules.join(` ${this.selectedLogic} `);
      const query = `SELECT ${this.fieldsToQuery.join(", ")} FROM ${this.objectApiName} WHERE ${whereClause}`;
      this.fireOnSearchEvent(query);
      return;
    }

    const customLogicInput = this.template.querySelector("[data-custom-logic]");

    if (!customLogicInput.reportValidity()) {
      return;
    }

    if (!this.validateCustomLogicExpression()) {
      customLogicInput.setCustomValidity(this.langObj.wrongCustomLogicErrorMsg);
      customLogicInput.reportValidity();
      return;
    }

    if (!this.validateCustomLogicNumbers()) {
      customLogicInput.setCustomValidity(this.langObj.wrongCustomLogicNumbersErrorMsg);
      customLogicInput.reportValidity();
      return;
    }

    if (!this.validateIfAllFilterRulesHasBeenUsed()) {
      customLogicInput.setCustomValidity(this.langObj.unusedFilterRulesInCustomLogicErrorMsg);
      customLogicInput.reportValidity();
      return;
    }
    const whereClause = this.getCustomLogicWhereClause();
    const query = `SELECT ${this.fieldsToQuery.join(", ")} FROM ${this.objectApiName} WHERE ${whereClause}`;
    this.fireOnSearchEvent(query);
  }

  handleCustomLogicChange(event) {
    this.customLogic = event.detail.value;
  }
  handleCustomLogicFocus(event) {
    event.target.setCustomValidity("");
  }

  // ********** HELPERS **********
  getSelectedFieldType() {
    const { type: selectedFieldType } = this.filterFieldSetDetails.find(
      ({ apiName }) => apiName === this.selectedField
    );
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
    const { label: operatorLabel } = this.operatorPicklistOptions.find(({ value }) => value === operator);
    return operatorLabel;
  }
  getFilterRule() {
    let value;
    switch (this.selectedFieldType) {
      case "DATE":
        value = getFormattedDate(new Date(this.value));
        break;
      case "DATETIME":
        value = getFormattedDateTime(new Date(this.value));
        break;
      case "TIME":
        value = getFormattedTime(this.value);
        break;
      case "BOOLEAN":
        value = this.value === "true" ? this.booleanOptions[0].label : this.booleanOptions[1].label;
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
      const { multipicklistOperatorSymbol } = this.operatorOptions.find(
        ({ operatorSymbol }) => operatorSymbol === this.selectedOperator
      );
      return `${this.selectedField} ${multipicklistOperatorSymbol.replace("KEY", this.value.join(";"))}`;
    }
    if (this.selectedOperator.includes("LIKE")) {
      return `${this.selectedField} ${this.selectedOperator.replace("KEY", this.value)}`;
    }
    // ****** /EXCEPTIONS ******
    const isWithoutQuotes = this.isWithoutQuotes(this.selectedFieldType);
    return `${this.selectedField} ${this.selectedOperator} ${isWithoutQuotes ? this.value : `'${this.value}'`}`;
  }

  getCustomLogicNumbers() {
    let customLogic = this.customLogic;
    customLogic = customLogic.replaceAll(/AND|OR/g, " ").replace(/\(|\)/g, "");
    const customLogicNumbers = [];
    let customLogicNumber = "";
    for (let i = 0; i < customLogic.length; i++) {
      if (isValidExpressionNum(customLogic.charAt(i))) {
        customLogicNumber += customLogic.charAt(i);
      }
      if (customLogicNumber && !isValidExpressionNum(customLogic.charAt(i + 1))) {
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
      if (isValidExpressionNum(customLogic.charAt(i))) {
        startIndex === -1 && (startIndex = i);
        customLogicNumber += customLogic.charAt(i);
      }
      if (customLogicNumber && !isValidExpressionNum(customLogic.charAt(i + 1))) {
        endIndex = i;
        customWhereClause.splice(startIndex, startIndex - endIndex + 1, this.whereClauseRules[+customLogicNumber - 1]);
        startIndex = -1;
        customLogicNumber = "";
      }
    }
    return customWhereClause.join("");
  }

  loadLangObject() {
    if (["en", "fr"].includes(this.lang)) {
      this.langObj = SUPPORTED_LANGUAGES[this.lang];
    } else {
      this.langObj = SUPPORTED_LANGUAGES.en;
    }
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
    return WITHOUT_QUOTES_TYPES.includes(field);
  }

  fireOnSearchEvent(query) {
    const onSearchCustomEvent = new CustomEvent("search", {
      detail: query
    });
    this.dispatchEvent(onSearchCustomEvent);
  }
}
