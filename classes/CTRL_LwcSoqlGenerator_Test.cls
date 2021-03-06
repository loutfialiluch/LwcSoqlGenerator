@isTest
public with sharing class CTRL_LwcSoqlGenerator_Test {
  @isTest
  public static void getFieldSetDetails_Test() {
    String objectApiName = 'SOQL_Generator_Child__c';
    String filterFieldSetName = 'SoqlGeneratorFilterFields';
    Test.startTest();
    System.assertEquals(
      Schema.getGlobalDescribe()
        .get(objectApiName)
        .getDescribe()
        .FieldSets.getMap()
        .get(filterFieldSetName)
        .getFields()
        .size(),
      CTRL_LwcSoqlGenerator.getFieldSetDetails(objectApiName, filterFieldSetName).size()
    );
    Test.stopTest();
  }
}
