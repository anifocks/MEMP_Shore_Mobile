// Helper module for creating standardized Report Status Sheet across all Excel templates
// This ensures consistent UI and functionality across Vessel, Bunker, Voyage, and Bulk reports

/**
 * Creates a Report Status Sheet with submission controls and instructions
 * Used by all Excel templates (Single, Bunker, Voyage, Bulk)
 * 
 * @param {Workbook} workbook - ExcelJS workbook instance
 * @param {string} reportType - Type of report (e.g., "Vessel", "Bunker", "Voyage", "Bulk")
 * @returns {Worksheet} The created status sheet
 */
export const createReportStatusSheet = (workbook, reportType = "Vessel") => {
    const statusSheet = workbook.addWorksheet('Report Status', { 
        properties: { tabColor: 'FF0000' } 
    });
    
    // Set column widths
    statusSheet.columns = [
        { width: 2 },
        { width: 50 },
        { width: 50 }
    ];

    // Title
    statusSheet.mergeCells('B1:C1');
    const titleCell = statusSheet.getCell('B1');
    titleCell.value = `📋 MEMP_SHORE - ${reportType.toUpperCase()} REPORT STATUS`;
    titleCell.font = { bold: true, size: 18, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4788' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    statusSheet.getRow(1).height = 30;

    // Subtitle
    statusSheet.mergeCells('B2:C2');
    const subtitleCell = statusSheet.getCell('B2');
    subtitleCell.value = 'Report Submission Instructions';
    subtitleCell.font = { bold: true, size: 12, color: { argb: '1F4788' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    statusSheet.getRow(2).height = 20;

    let rowNum = 4;

    // ===== SECTION: SUBMISSION CONTROLS =====
    statusSheet.mergeCells(`B${rowNum}:C${rowNum}`);
    let cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = '🚀 SUBMISSION CONTROLS';
    cell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9534F' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    statusSheet.getRow(rowNum).height = 22;
    rowNum++;

    // Important Notice
    statusSheet.mergeCells(`B${rowNum}:C${rowNum}`);
    cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = '⚠️ IMPORTANT: Use the buttons in the TASKPANE (right sidebar) to validate and send your report. The buttons below are for reference only.';
    cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    cell.font = { size: 10, bold: true, color: { argb: 'D32F2F' } };
    statusSheet.getRow(rowNum).height = 35;
    rowNum++;

    // Instructions
    statusSheet.mergeCells(`B${rowNum}:C${rowNum}`);
    cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = `1. Click the add-in icon to open the MEMP ${reportType} Report Uploader taskpane on the right\n2. Fill in your API URL and authentication token\n3. Click "Validate Report" in the taskpane to check your data\n4. Click "Send Report" in the taskpane to upload to the server`;
    cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    cell.font = { size: 10 };
    statusSheet.getRow(rowNum).height = 60;
    rowNum += 2;

    // Validate Button Reference
    const validateButtonRow = rowNum;
    statusSheet.getRow(rowNum).height = 32;
    statusSheet.getCell(`B${rowNum}`).value = '✓ VALIDATE';
    statusSheet.getCell(`B${rowNum}`).font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
    statusSheet.getCell(`B${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '5CB85C' } };
    statusSheet.getCell(`B${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
    statusSheet.getCell(`B${rowNum}`).border = { 
        top: { style: 'thin' }, 
        left: { style: 'thin' }, 
        bottom: { style: 'thin' }, 
        right: { style: 'thin' } 
    };
    statusSheet.getRow(rowNum).height = 22;
    statusSheet.getCell(`C${rowNum}`).value = '(Reference - Use taskpane button instead)';
    statusSheet.getCell(`C${rowNum}`).font = { size: 9, italic: true, color: { argb: '999999' } };
    rowNum++;

    // Upload Button Reference
    const uploadButtonRow = rowNum;
    statusSheet.getRow(rowNum).height = 32;
    statusSheet.getCell(`B${rowNum}`).value = '📤 SEND REPORT';
    statusSheet.getCell(`B${rowNum}`).font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
    statusSheet.getCell(`B${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0275D8' } };
    statusSheet.getCell(`B${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
    statusSheet.getCell(`B${rowNum}`).border = { 
        top: { style: 'thin' }, 
        left: { style: 'thin' }, 
        bottom: { style: 'thin' }, 
        right: { style: 'thin' } 
    };
    statusSheet.getRow(rowNum).height = 22;
    statusSheet.getCell(`C${rowNum}`).value = '(Reference - Use taskpane button instead)';
    statusSheet.getCell(`C${rowNum}`).font = { size: 9, italic: true, color: { argb: '999999' } };
    rowNum += 2;
    
    // Store button row numbers for later reference
    statusSheet.validateButtonRow = validateButtonRow;
    statusSheet.uploadButtonRow = uploadButtonRow;

    // Status Area
    statusSheet.mergeCells(`B${rowNum}:C${rowNum}`);
    cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = '📊 SUBMISSION STATUS';
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    statusSheet.getRow(rowNum).height = 20;
    rowNum++;

    statusSheet.mergeCells(`B${rowNum}:C${rowNum + 1}`);
    cell = statusSheet.getCell(`B${rowNum}`);
    cell.value = 'Results from your validation and upload will appear in the taskpane. Look at the right sidebar for status updates.';
    cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    cell.font = { size: 10, italic: true };
    statusSheet.getRow(rowNum).height = 40;
    rowNum += 2;

    return statusSheet;
};

/**
 * Creates a hidden Upload Token sheet for embedded authentication
 * @param {Workbook} workbook - ExcelJS workbook instance
 * @param {string} uploadToken - The upload token UUID
 * @returns {Worksheet} The created token sheet
 */
export const createUploadTokenSheet = (workbook, uploadToken = '') => {
    const tokenSheet = workbook.addWorksheet('_UploadToken', { 
        properties: { hidden: true } 
    });
    
    tokenSheet.columns = [
        { width: 2 },
        { width: 50 }
    ];
    
    // Add token in B1
    tokenSheet.getCell('B1').value = uploadToken;
    
    return tokenSheet;
};

export default {
    createReportStatusSheet,
    createUploadTokenSheet
};
