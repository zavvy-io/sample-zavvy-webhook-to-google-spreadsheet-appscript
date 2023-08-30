const SPREADSHEET = SpreadsheetApp.getActive();

// TODO: Change the name of the sheet if it is different.
const SPREADSHEET_SHEET = SPREADSHEET.getSheetByName("Sheet1"); 
// TODO: Change this to match your Journey ID.
const ZAVVY_JOURNEY_ID = 1234567; 
const LAST_UPDATED_AT_COLUMN_NAME = "Last updated at";
const ASSIGNMENT_ID_COLUMN_NAME = "Assignment ID";

function getSheetHeaderColumnIndexWithContent(content) {
  var idx = SPREADSHEET_SHEET.getDataRange().getValues()[0].indexOf(content);
  if (idx == -1) { return null; }

  /*
   * +idx+ is an index from Array of values. They start from 0. 
   * However, when working with Column and Row indexes, we are
   * used to indexes starting from 1. So, we add 1 to this for
   * consistency
   */
  return idx + 1;
}

function setValueInSheetCell(rowIndex, columnIndex, content) {
  SPREADSHEET_SHEET.getRange(rowIndex, columnIndex).setValue(content);
  SPREADSHEET_SHEET.getRange(
    rowIndex, 
    getSheetHeaderColumnIndexWithContent(LAST_UPDATED_AT_COLUMN_NAME)
  ).setValue(new Date().toUTCString());
}

function appendNewHeaderColumnToSheet(content) {
  var lastColumnIndex = SPREADSHEET_SHEET.getLastColumn();
  SPREADSHEET_SHEET.getRange(1, (lastColumnIndex + 1)).setValue(content);
}

function checkAndCreateColumns(columnNames) {
  columnNames.forEach(function(columnName){ 
    if (getSheetHeaderColumnIndexWithContent(columnName) == null) {    
      Logger.log("Missing column: '%s'. Will create it now.", columnName);      
      appendNewHeaderColumnToSheet(columnName);
    }
  });
}

function getRowIndexForColumnAndValuePair(columnName, value, shouldCreateIfMissing=false) {
  const assingmentIdMatchRange = SPREADSHEET_SHEET
    .createTextFinder(value)
    .matchEntireCell(true)
    .findNext();

  if (assingmentIdMatchRange) {
    return assingmentIdMatchRange.getRowIndex();    
  } else if (shouldCreateIfMissing) {
    Logger.log("Row for '%s':'%s' is missing. Will create one.", columnName, value);
    SPREADSHEET_SHEET.getRange(
      SPREADSHEET_SHEET.getLastRow() + 1, 
      getSheetHeaderColumnIndexWithContent(columnName)
    ).setValue(value);

    return getRowIndexForColumnAndValuePair(columnName, value, false);
  }
}

function doPost(e) {
  Logger.log(e);

  var webhookPayload = JSON.parse(e.postData.contents);

  // TODO: Below is a sample payload if you need a sample.
  // var webhookPayload = {
  //   "data": {
  //     "assignee_company_user": {
  //       "email": "assignee-user@example.com",
  //       "hire_date": null,
  //       "id": 42,
  //       "job_title": null,
  //       "manager_company_users": [
  //         {
  //           "email": "manager-user@example.com",
  //           "id": 43,
  //           "user": {
  //             "first_name": "Ben",
  //             "last_name": "Reece"
  //           }
  //         }
  //       ],
  //       "private_email": null,
  //       "user": {
  //         "first_name": "Assignee",
  //         "last_name": "User"
  //       },
  //       "work_email": null
  //     },
  //     "form_submission": {
  //       "answers": [
  //         {
  //           "answer_option_answers": [],
  //           "id": 42,
  //           "question": {
  //             "id": 198876,
  //             "text": "Please provide your current shipping address to include street, apartment number (if applicable), city, state, and zip code",
  //             "versioned_question_id": 1
  //           },
  //           "text": {
  //             "body_as_plain_text": "sadf"
  //           }
  //         },
  //         {
  //           "answer_option_answers": [
  //             {
  //               "answer_option": {
  //                 "label": "Eastern Time",
  //                 "value": null
  //               },
  //               "id": 767300,
  //               "text": null
  //             }
  //           ],
  //           "id": 43,
  //           "question": {
  //             "id": 198879,
  //             "text": "Please choose your current working time zone",
  //             "versioned_question_id": 2
  //           },
  //           "text": {
  //             "body_as_plain_text": null
  //           }
  //         },         
  //       ],
  //       "company_user": {
  //         "email": "assginee-user@example.com",
  //         "id": 42,
  //         "user": {
  //           "first_name": "Assignee",
  //           "last_name": "User"
  //         }
  //       },
  //       "form": {
  //         "id": 42
  //       },
  //       "form_submission_scopes": [
  //         {
  //           "scopeable_id": 42,
  //           "scopeable_type": "Assignment"
  //         }
  //       ],
  //       "id": 42,
  //       "submitted_at": "2023-08-16T13:22:23.536Z"
  //     },
  //     "journey_id": 1234567,
  //     "journey_step_id": 42,
  //     "journey_step_title": "Your laptop form",
  //     "journey_title": "Preboarding"
  //   },
  //   "type": "journey.form_submission.submitted"
  // }

  if (webhookPayload.data.journey_id != ZAVVY_JOURNEY_ID) {
    let message = `ERROR: Journey ID: ${webhookPayload.data.journey_id} is not allowed on this endpoint`
    Logger.log(message);
    return ContentService.createTextOutput(message);
  }

  let transformedData = transformPayloadToFlattenedObject(webhookPayload); // this is defined in +simpleWebhookPayloadTransformationUtils+ file
  Logger.log(transformedData);
  checkAndCreateColumns([LAST_UPDATED_AT_COLUMN_NAME, ASSIGNMENT_ID_COLUMN_NAME]);
  checkAndCreateColumns(Object.keys(transformedData));

  let assignmentId = webhookPayload.data.form_submission.form_submission_scopes.find(
    (scope) => scope.scopeable_type == "Assignment"
  ).scopeable_id;
  
  var assignmentRowIndex = getRowIndexForColumnAndValuePair(
    ASSIGNMENT_ID_COLUMN_NAME, 
    assignmentId,
    true
  );

  Object.entries(transformedData).forEach(([columnName, value]) => { 
    var columnIndex = getSheetHeaderColumnIndexWithContent(columnName);
    setValueInSheetCell(
      assignmentRowIndex, 
      columnIndex, 
      value
    );
  });

  let message = `Successfully upserted the data: ${JSON.stringify(transformedData)}`;
  Logger.log(message);
  return ContentService.createTextOutput(message);
}
