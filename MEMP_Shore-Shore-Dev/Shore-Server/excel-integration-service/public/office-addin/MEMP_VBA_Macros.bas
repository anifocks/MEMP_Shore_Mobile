' ==============================================================================
' MEMP Ship Report Uploader - VBA Macros
' ==============================================================================
' Purpose: Detect clicks on Report Status Sheet cells B6/B7 and trigger
'          the Excel Add-in validation/upload functions
' 
' Installation:
' 1. Save this file as MEMP_VBA_Macros.bas
' 2. In Excel, go to File > Options > Trust Center > Trust Center Settings
' 3. Enable "Enable all Macros"
' 4. Open Tools > Macro > Modules and import this file
' ==============================================================================

Option Explicit

' Global variable to track the last clicked cell
Private lastClickedCell As String

' ==============================================================================
' MAIN: Detect cell clicks on Report Status Sheet
' ==============================================================================
Private Sub Workbook_SheetSelectionChange(ByVal Sh As Object, ByVal Target As Range)
    ' Only process if on "Report Status Sheet"
    If Sh.Name <> "Report Status Sheet" Then Exit Sub
    
    Dim cellAddress As String
    cellAddress = Target.Address(False, False) ' Get address without sheet name or $ signs
    
    ' Only trigger on first click (ignore multi-cell selections)
    If Target.Cells.Count > 1 Then Exit Sub
    
    ' Check if clicked on B6 (Validate button)
    If cellAddress = "B6" Or cellAddress = "B7" Then
        Call TriggerValidate
        Exit Sub
    End If
    
    ' Check if clicked on B8 (Upload button)
    If cellAddress = "B8" Then
        Call TriggerUpload
        Exit Sub
    End If
End Sub

' ==============================================================================
' FUNCTION: Trigger Validate Report via hidden cell
' ==============================================================================
Private Sub TriggerValidate()
    On Error Resume Next
    
    Dim triggerSheet As Worksheet
    Dim triggerCell As Range
    
    ' Create or get _MacroTrigger sheet
    On Error Resume Next
    Set triggerSheet = ThisWorkbook.Sheets("_MacroTrigger")
    On Error GoTo 0
    
    If triggerSheet Is Nothing Then
        ' Create the trigger sheet if it doesn't exist
        Set triggerSheet = ThisWorkbook.Sheets.Add
        triggerSheet.Name = "_MacroTrigger"
        triggerSheet.Visible = xlSheetHidden
    End If
    
    ' Write trigger value
    Set triggerCell = triggerSheet.Range("B1")
    triggerCell.Value = "VALIDATE"
    
    ' Show visual feedback
    MsgBox "✓ Validating Report..." & vbCrLf & vbCrLf & _
           "The add-in will process your data.", vbInformation, "MEMP Report Validator"
    
    ' Clear after a short delay
    Application.Wait Now + TimeValue("00:00:02")
    triggerCell.Value = ""
    
End Sub

' ==============================================================================
' FUNCTION: Trigger Upload Report via hidden cell
' ==============================================================================
Private Sub TriggerUpload()
    On Error Resume Next
    
    Dim triggerSheet As Worksheet
    Dim triggerCell As Range
    
    ' Create or get _MacroTrigger sheet
    On Error Resume Next
    Set triggerSheet = ThisWorkbook.Sheets("_MacroTrigger")
    On Error GoTo 0
    
    If triggerSheet Is Nothing Then
        ' Create the trigger sheet if it doesn't exist
        Set triggerSheet = ThisWorkbook.Sheets.Add
        triggerSheet.Name = "_MacroTrigger"
        triggerSheet.Visible = xlSheetHidden
    End If
    
    ' Write trigger value
    Set triggerCell = triggerSheet.Range("B1")
    triggerCell.Value = "UPLOAD"
    
    ' Show visual feedback
    MsgBox "📤 Uploading Report..." & vbCrLf & vbCrLf & _
           "The add-in will upload your data to the server.", vbInformation, "MEMP Report Uploader"
    
    ' Clear after a short delay
    Application.Wait Now + TimeValue("00:00:02")
    triggerCell.Value = ""
    
End Sub

' ==============================================================================
' SETUP: Initialize macro security on first run
' ==============================================================================
Sub InitializeMacros()
    MsgBox "MEMP Ship Report Macros Initialized" & vbCrLf & vbCrLf & _
           "✓ Click 'Validate' button (B6) to validate your report" & vbCrLf & _
           "✓ Click 'Upload' button (B8) to send your report" & vbCrLf & vbCrLf & _
           "The add-in in the taskpane will process your request.", _
           vbInformation, "MEMP Setup"
End Sub

' ==============================================================================
' END OF MEMP VBA MACROS
' ==============================================================================
