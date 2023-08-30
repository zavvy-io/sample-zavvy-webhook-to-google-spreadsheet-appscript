# [Sample] Zavvy Webhook to Google Spreadsheets

This is a sample Google Apps Script project to receive payload from Zavvy Webhooks,
transform the data and insert it into a Google Spreadsheet.

The code transforms the payload from a Form submission from a Journey step on
Zavvy into a row in a Spreadsheet. 
It creates a column for each question and fills the answers for those questions
as submitted by the Assignee or any other recipients of the Zavvy Journey Step.

## Pre-requisites

* Zavvy account
* Zavvy webhook documentation -- Reach out to your Zavvy account manager

## Setup

1. Copy the files `Code.gs` and `simpleWebhookPayloadTransformationUtils.gs` into your 
   Apps Script project
2. Go through the `TODO` comments in the files and set the constants and other variables
   to match your setup.

## Testing

For testing, there is a sample payload in `Code.gs` that is commented out. 
Uncomment it and run the `doPost` method from your Apps Script editor to test the code.


