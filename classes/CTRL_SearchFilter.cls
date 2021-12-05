public with sharing class CTRL_SearchFilter {
  @AuraEnabled
  public static List<FieldSetItem> getFieldSetDetails(String objectApiName, String fieldSetName) {
    List<FieldSetItem> fieldSetMemberDetailList = new List<FieldSetItem>();
    Map<String, Schema.SObjectType> globalDescribe = Schema.getGlobalDescribe();
    Schema.FieldSet fieldSetObj = globalDescribe.get(objectApiName).getDescribe().FieldSets.getMap().get(fieldSetName);
    List<Schema.FieldSetMember> fieldSetMemberList = fieldSetObj.getFields();
    for (Schema.FieldSetMember fieldSetMember : fieldSetMemberList) {
      String fieldType = String.valueOf(fieldSetMember.getType());
      FieldSetItem fsi = new FieldSetItem(fieldSetMember.getFieldPath(), fieldSetMember.getLabel(), fieldType);
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
