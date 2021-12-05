/* eslint-disable no-unused-vars */
/* eslint-disable no-useless-return */
import { LightningElement, api } from "lwc";
import getFieldSetDetails from "@salesforce/apex/CTRL_SearchFilter.getFieldSetDetails";
import { loadStyle } from "lightning/platformResourceLoader";
import searchFilterCssOverwrite from "@salesforce/resourceUrl/LWC_SearchFilter_Overwrite";

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
    types: [...otherTypes.filter((type) => !["PICKLIST", "BOOLEAN"].includes(type))]
  },
  {
    operatorLabel: "ne contient pas",
    operatorSymbol: "NOT LIKE '%KEY%'",
    multipicklistOperatorSymbol: "excludes ('KEY')",
    types: [...otherTypes.filter((type) => !["PICKLIST", "BOOLEAN"].includes(type))]
  },
  {
    operatorLabel: "commence par",
    operatorSymbol: "LIKE 'KEY%'",
    types: [...otherTypes.filter((type) => !["PICKLIST", "MULTIPICKLIST", "BOOLEAN"].includes(type))]
  },
  {
    operatorLabel: "ne commence pas par",
    operatorSymbol: "NOT LIKE 'KEY%'",
    types: [...otherTypes.filter((type) => !["PICKLIST", "MULTIPICKLIST", "BOOLEAN"].includes(type))]
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

export default class LWC_SearchFilter extends LightningElement {
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
    this.fieldOptions.sort(({ label: label1 }, { label: label2 }) => {
      if (label1 > label2) return 1;
      else if (label1 < label2) return -1;
      return 0;
    });
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
  get isOtherFields() {
    return !["PICKLIST", "DATE", "DATETIME", "TIME", "MULTIPICKLIST", "BOOLEAN"].includes(this.selectedFieldType);
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
    this.clearFilterRule();
  }

  handleLogicChange(event) {
    this.selectedLogic = event.detail.value;
  }

  handleDeleteRule(event) {
    const ruleIndex = +event.target.dataset.index;
    this.filterRules = this.filterRules.filter((filterRule, index) => index !== ruleIndex);
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
    if (this.selectedLogic === "CUSTOM") {
      console.log("custom logic");
    } else {
      const whereClause = this.whereClauseRules.join(` ${this.selectedLogic} `);
      const query = `SELECT ${this.fieldsToQuery.join(", ")} FROM ${this.objectApiName} WHERE ${whereClause}`;
      alert(query);
    }
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
    return {
      field: this.getSelectedFieldLabel(this.selectedField),
      operator: this.getSelectedOperatorLabel(this.selectedOperator),
      value: this.value
    };
  }
  getWhereClauseRule() {
    if (this.selectedFieldType === "MULTIPICKLIST") {
      const { multipicklistOperatorSymbol } = operatorOptions.find(({ operatorSymbol }) => operatorSymbol === this.selectedOperator);
      return `${this.selectedField} ${multipicklistOperatorSymbol.replace("KEY", this.value.join(";"))}`;
    }

    if (this.selectedOperator.includes("LIKE")) {
      return `${this.selectedField} ${this.selectedOperator.replace("KEY", this.value)}`;
    }
    const isWithoutQuotes = this.isWithoutQuotes(this.selectedFieldType);
    return `${this.selectedField} ${this.selectedOperator} ${isWithoutQuotes ? this.value : `'${this.value}'`}`;
  }
  validateInputs() {
    const ruleInputs = this.template.querySelectorAll(".filter__rule-input");
    return Array.from(ruleInputs).reduce((validSoFar, curr) => validSoFar && curr.reportValidity(), true);
  }
  clearFilterRule() {
    this.selectedField = null;
    this.selectedOperator = null;
    this.value = null;
  }
  isWithoutQuotes(field) {
    return withoutQuotesFields.includes(field);
  }
}
