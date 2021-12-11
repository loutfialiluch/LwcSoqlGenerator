import { LightningElement } from "lwc";

export default class LwcSoqlGeneratorUsageExample extends LightningElement {
  objectApiName = "SOQL_Generator_Child__c";
  filterFieldSetName = "SoqlGeneratorFilterFields";
  fieldSetToQueryName = "SoqlGeneratorFieldsToQuery";

  handleSearchEvent(event) {
    const query = event.detail;
    alert(query);
  }
}
