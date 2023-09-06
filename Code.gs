const SPREADSHEET = SpreadsheetApp.getActive();

/*
 * TODO: Change Journey IDs and Sheet names.
 * Journey ID as the key.
 * Sheet name in the value.
 */
const SPREADSHEET_SHEETS_BY_JOURNEY_ID = {
  1234567890: SPREADSHEET.getSheetByName("Sheet1"),
  7890123456: SPREADSHEET.getSheetByName("Sheet2"),
}

const LAST_UPDATED_AT_COLUMN_NAME = "Last updated at";
const ASSIGNMENT_ID_COLUMN_NAME = "Assignment ID";

function getSheetHeaderColumnIndexWithContent(sheet, content) {
  var idx = sheet.getDataRange().getValues()[0].indexOf(content);
  if (idx == -1) { return null; }

  /*
   * +idx+ is an index from Array of values. They start from 0.
   * However, when working with Column and Row indexes, we are
   * used to indexes starting from 1. So, we add 1 to this for
   * consistency
   */
  return idx + 1;
}

function setValueInSheetCell(sheet, rowIndex, columnIndex, content) {
  sheet.getRange(rowIndex, columnIndex).setValue(content);
  sheet.getRange(
    rowIndex,
    getSheetHeaderColumnIndexWithContent(sheet, LAST_UPDATED_AT_COLUMN_NAME)
  ).setValue(new Date().toUTCString());
}

function appendNewHeaderColumnToSheet(sheet, content) {
  var lastColumnIndex = sheet.getLastColumn();
  sheet.getRange(1, (lastColumnIndex + 1)).setValue(content);
}

function checkAndCreateColumns(sheet, columnNames) {
  columnNames.forEach(function(columnName){
    if (getSheetHeaderColumnIndexWithContent(sheet, columnName) == null) {
      console.log("Missing column: '%s'. Will create it now.", columnName);
      appendNewHeaderColumnToSheet(sheet, columnName);
    }
  });
}

function getRowIndexForColumnAndValuePair(sheet, columnName, value, shouldCreateIfMissing=false) {
  const assingmentIdMatchRange = sheet
    .createTextFinder(value)
    .matchEntireCell(true)
    .findNext();

  if (assingmentIdMatchRange) {
    return assingmentIdMatchRange.getRowIndex();
  } else if (shouldCreateIfMissing) {
    console.log("Row for '%s':'%s' is missing. Will create one.", columnName, value);
    sheet.getRange(
      sheet.getLastRow() + 1,
      getSheetHeaderColumnIndexWithContent(sheet, columnName)
    ).setValue(value);

    return getRowIndexForColumnAndValuePair(sheet, columnName, value, false);
  }
}

function doPost(e) {
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
  //             "id": 123123,
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
  //               "id": 12341234,
  //               "text": null
  //             }
  //           ],
  //           "id": 43,
  //           "question": {
  //             "id": 12312347,
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
  //     "journey_step_title": "Your laptop request form",
  //     "journey_title": "Preboarding"
  //   },
  //   "type": "journey.form_submission.submitted"
  // }

  var sheet = SPREADSHEET_SHEETS_BY_JOURNEY_ID[webhookPayload.data.journey_id];
  if (!sheet) {
    let message = `ERROR: No sheet configured for Journey ID: ${webhookPayload.data.journey_id}`;
    console.log(message);
    return;
  }

  let transformedData = transformPayloadToFlattenedObject(webhookPayload); // this is defined in +simpleWebhookPayloadTransformationUtils+ file
  let assignmentId = webhookPayload.data.form_submission.form_submission_scopes.find(
    (scope) => scope.scopeable_type == "Assignment"
  ).scopeable_id;

  console.log(`Processing webhook data for Assignment ID: ${assignmentId}, Journey ID: ${webhookPayload.data.journey_id}`);

  checkAndCreateColumns(sheet, [LAST_UPDATED_AT_COLUMN_NAME, ASSIGNMENT_ID_COLUMN_NAME]);
  checkAndCreateColumns(sheet, Object.keys(transformedData));

  var assignmentRowIndex = getRowIndexForColumnAndValuePair(
    sheet,
    ASSIGNMENT_ID_COLUMN_NAME,
    assignmentId,
    true
  );

  Object.entries(transformedData).forEach(([columnName, value]) => {
    var columnIndex = getSheetHeaderColumnIndexWithContent(sheet, columnName);
    setValueInSheetCell(
      sheet,
      assignmentRowIndex,
      columnIndex,
      value
    );
  });

  let message = `Successfully upserted the data: ${JSON.stringify(transformedData)}`;
  console.log(message);
  return;
}
