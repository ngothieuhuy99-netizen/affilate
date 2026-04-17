/**
 * MKTChuDong - Recruitment Web Apps Script
 * Deployment Guide:
 * 1. Create a new Google Sheet.
 * 2. Rename the first sheet to "Data" (this will store candidate info). Add headers: 
 *    Timestamp, Full Name, Email, Phone, Position, Message, CV Link
 * 3. Add a new sheet named "Config". Add the following:
 *    - A1: "Zalo Link" | B1: `https://zalo.me/...`
 *    - A2: "Company Website" | B2: `https://yourcompany.com`
 *    - A3: "Drive Folder ID" | B3: `YOUR_DRIVE_FOLDER_ID` (Where CVs are saved)
 *    - A4: "Affiliate Link" | B4: `https://your-affiliate-link.com`
 * 4. Go to Extensions > Apps Script. Paste this code.
 * 5. Run setup() once to authorize permissions.
 * 6. Click Deploy > New Deployment > Web app. 
 *    Execute as: Me. Who has access: Anyone.
 * 7. Copy the Web App URL and paste it into app.js and redirect.html
 */

const SHEET_DATA = "Data";
const SHEET_CONFIG = "Config";

// Run this once manually to trigger Drive/Sheet Authorization
function setup() {
  SpreadsheetApp.getActiveSpreadsheet();
  DriveApp.getRootFolder();
}

// Ensure CORS headers are set
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};

// Handle OPTIONS requests (CORS Preflight)
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

// GET: Return config to the frontend
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = ss.getSheetByName(SHEET_CONFIG);
    
    // Read Configs
    const zaloLink = configSheet.getRange("B1").getValue() || "";
    const companyWeb = configSheet.getRange("B2").getValue() || "";
    const affiliateWeb = configSheet.getRange("B4").getValue() || "";
    
    const response = {
      status: "success",
      data: {
        zalo: zaloLink,
        url: companyWeb,
        affiliate: affiliateWeb
      }
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// POST: Save Candidate Info and File to Drive
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Get Drive Folder ID from config
    const configSheet = ss.getSheetByName(SHEET_CONFIG);
    const folderId = configSheet.getRange("B3").getValue();
    let folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
    
    // 1. Process and save the CV File to Drive
    let fileUrl = "";
    if (data.fileBase64 && data.fileName) {
      const decodedData = Utilities.base64Decode(data.fileBase64);
      const blob = Utilities.newBlob(decodedData, data.fileMimeType, data.fileName);
      const file = folder.createFile(blob);
      fileUrl = file.getUrl();
    }
    
    // 2. Save candidate info to the "Data" sheet
    const dataSheet = ss.getSheetByName(SHEET_DATA);
    dataSheet.appendRow([
      new Date(),       // Timestamp
      data.fullName,
      data.email,
      data.phone,
      data.position,
      data.message,
      fileUrl           // Link to the CV in Google Drive
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Application submitted successfully." }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
