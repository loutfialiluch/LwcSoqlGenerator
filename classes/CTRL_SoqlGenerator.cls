public with sharing class CTRL_SoqlGenerator {
  @AuraEnabled
  public static List<FieldSetItem> getFieldSetDetails(String objectApiName, String fieldSetName) {
    List<FieldSetItem> fieldSetMemberDetailList = new List<FieldSetItem>();
    Map<String, Schema.SObjectType> globalDescribe = Schema.getGlobalDescribe();
    Schema.FieldSet fieldSetObj = globalDescribe.get(objectApiName).getDescribe().FieldSets.getMap().get(fieldSetName);
    List<Schema.FieldSetMember> fieldSetMemberList = fieldSetObj.getFields();
    for (Schema.FieldSetMember fieldSetMember : fieldSetMemberList) {
      String fieldType = String.valueOf(fieldSetMember.getType());
      String fieldApiName = fieldSetMember.getFieldPath();
      String fieldLabel = getFieldLabel(fieldApiName, fieldSetMember.getLabel());
      FieldSetItem fsi = new FieldSetItem(fieldApiName, fieldLabel, fieldType);
      if (fieldType == 'PICKLIST' || fieldType == 'MULTIPICKLIST') {
        List<String> picklistValues = new List<String>();
        List<Schema.PicklistEntry> pickListEntries = fieldSetMember.getSObjectField().getDescribe().getPicklistValues();
        for (Schema.PicklistEntry ple : pickListEntries) {
          picklistValues.add(ple.getValue());
        }
        fsi.picklistValues = picklistValues;
      }
      fieldSetMemberDetailList.add(fsi);
    }
    return fieldSetMemberDetailList;
  }

  public static String getFieldLabel(String fieldApiName, String fieldLabel) {
    if (fieldApiName.contains('.')) {
      String parentObjectApiName;
      if (fieldApiName.contains('__r')) {
        fieldApiName = fieldApiName.replace('__r', '__c');
      }
      parentObjectApiName = fieldApiName.split('\\.').get(0);
      return Schema.getGlobalDescribe().get(parentObjectApiName).getDescribe().getLabel() + ' > ' + fieldLabel;
    } else {
      return fieldLabel;
    }
  }

  public class FieldSetItem {
    @AuraEnabled
    public String apiName { get; set; }
    @AuraEnabled
    public String label { get; set; }
    @AuraEnabled
    public String type { get; set; }
    @AuraEnabled
    public List<String> picklistValues { get; set; }

    public FieldSetItem(String apiName, String label, String type) {
      this.apiName = apiName;
      this.label = label;
      this.type = type;
    }
  }
}
