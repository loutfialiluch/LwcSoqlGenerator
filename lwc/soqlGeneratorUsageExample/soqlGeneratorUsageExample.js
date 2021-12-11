import { LightningElement, api } from "lwc";

export default class SoqlGeneratorUsageExample extends LightningElement {
  @api
  objectApiName = "SOQL_Generator_Child__c";
  @api
  filterFieldSetName = "SoqlGeneratorFilterFields";
  @api
  fieldSetToQueryName = "SoqlGeneratorFieldsToQuery";
}
