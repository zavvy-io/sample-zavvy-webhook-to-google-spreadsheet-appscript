/** 
 * This file contains util funcitons to perform some transformations on Zavvy's 
 * Webhook payload. 
 */

/**
 * Extract answer values as a string from an answer object
 * 
 * @param answer Answer object from Zavvy webhook payload.
 */ 
function getStringifiedAnswersValueFromAnswerObject(answer) {
  let values = [];
  if (answer.text.body_as_plain_text != null) {
    values.push(answer.text.body_as_plain_text);
  }

  answer.answer_option_answers.forEach((aoa) => {
    values.push(aoa.answer_option.label)
  });

  return values.join(", ");
}

/**
 * Flatten the FormSubmission webhook payload from Zavvy into an object 
 * map that easily represent a row in a Speadsheet.
 * 
 * @param webhookPayload Zavvy webhook payload object
 */ 
function transformPayloadToFlattenedObject(webhookPayload) {
  let originalPayload = webhookPayload;

  let flattenedData = {
    "Firstname": originalPayload.data.assignee_company_user.user?.first_name,
    "Lastname": originalPayload.data.assignee_company_user.user?.last_name,
    // TODO: Zavvy returns date in format "YYYY-MM-DD". Please adjust the line below
    // to match the format of your date field.
    "Start date": originalPayload.data.assignee_company_user.hire_date,
    "Assignee email": originalPayload.data.assignee_company_user.email,
    "Manager email": originalPayload.data.assignee_company_user.manager_company_users[0]?.email,
  };
  originalPayload.data.form_submission.answers.forEach((answer) => {
    let questionText = answer.question.text;    
    flattenedData[questionText] = getStringifiedAnswersValueFromAnswerObject(answer);
  });
  return flattenedData;
}
