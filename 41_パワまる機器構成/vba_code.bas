Attribute VB_Name = "ModKikiKousei"
Option Explicit

' ============================================================
' Module: ModKikiKousei
' Purpose: Read input sheet and generate equipment configuration
'          sheet for solar PCS replacement projects.
' ============================================================

' --- Module-level constants ---
Private Const INPUT_SHEET As String = "入力"
Private Const OUTPUT_SHEET As String = "機器構成"
Private Const FONT_NAME As String = "Meiryo UI"
Private Const FONT_SIZE As Long = 11
Private Const TITLE_FONT_SIZE As Long = 16
Private Const COL_WIDTH_DATA As Double = 13.58
Private Const COL_WIDTH_SPACER As Double = 1.58
Private Const COL_WIDTH_SEPARATOR As Double = 5#
Private Const COLOR_BLACK As Long = 0        ' RGB(0,0,0)
Private Const COLOR_RED As Long = 255        ' RGB(255,0,0)
Private Const COLOR_YELLOW As Long = 65535   ' RGB(255,255,0)

' --- Module-level variables for input data ---
Private mCustomer As String
Private mSite As String
Private mType As String

' Existing side
Private mExCount As Long
Private mExPanelModel() As String    ' 1-based, up to 12
Private mExSeries() As String
Private mExCollection() As String
Private mExCircuit() As String
Private mExEstimated() As String
Private mExPCSModel() As String
Private mExPCSMethod() As String
Private mExPCSCapacity() As String
Private mExCableTier1() As String
Private mExBreakerType() As String
Private mExBreakerCap() As String
Private mExSensitivity() As String

' Existing side - 2nd type
Private mExSeries2() As String
Private mExCollection2() As String
Private mExCircuit2() As String
Private mExPanelCount As Long  ' total panel count

' Existing aggregate
Private mExCableTier2 As String
Private mExAggBreakerType As String
Private mExAggBreakerCap As String
Private mExAggSensitivity As String
Private mExMainCable As String

' New side
Private mNewCount As Long
Private mNewPanelModel() As String   ' 1-based, up to 8
Private mNewSeries() As String
Private mNewCollection() As String
Private mNewCircuit() As String
Private mNewPCSModel() As String
Private mNewPCSMethod() As String
Private mNewPCSCapacity() As String
Private mNewCableTier1() As String
Private mNewBreakerType() As String
Private mNewBreakerCap() As String
Private mNewSensitivity() As String

' New side - 2nd type
Private mNewSeries2() As String
Private mNewCollection2() As String
Private mNewCircuit2() As String
Private mNewPanelCount As Long  ' total panel count

' New aggregate
Private mNewCableTier2 As String
Private mNewAggBreakerType As String
Private mNewAggBreakerCap As String
Private mNewAggSensitivity As String
Private mNewMainCable As String

' Notes
Private mCircuitRearrange As Boolean
Private mDCExtension As Boolean
Private mCableReplace As Boolean
Private mReuseMemo As String

' Layout
Private mIsVertical As Boolean


' ============================================================
' Main entry point - assigned to the "作成" button
' ============================================================
Public Sub GenerateKikiKousei()
    On Error GoTo ErrHandler

    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual

    ' 1. Read all input parameters
    ReadInputParams

    ' 2. Determine layout
    mIsVertical = (mExCount + mNewCount > 8)

    ' 3. Prepare output sheet
    Dim ws As Worksheet
    Set ws = PrepareOutputSheet()

    ' 4. Draw content
    If mIsVertical Then
        DrawVerticalLayout ws
    Else
        DrawHorizontalLayout ws
    End If

    ' 5. Print settings
    With ws.PageSetup
        .Orientation = xlLandscape
        .Zoom = False
        .FitToPagesWide = 1
        .FitToPagesTall = False
    End With

    Application.Calculation = xlCalculationAutomatic
    Application.ScreenUpdating = True

    MsgBox "機器構成シートを作成しました。", vbInformation, "完了"
    Exit Sub

ErrHandler:
    Application.Calculation = xlCalculationAutomatic
    Application.ScreenUpdating = True
    MsgBox "エラーが発生しました: " & Err.Description & vbCrLf & _
           "エラー番号: " & Err.Number, vbCritical, "エラー"
End Sub


' ============================================================
' Read all inputs into module-level variables
' ============================================================
Private Sub ReadInputParams()
    Dim wsIn As Worksheet
    Set wsIn = ThisWorkbook.Sheets(INPUT_SHEET)

    ' Basic info
    mCustomer = CStr(wsIn.Range("B4").Value)
    mSite = CStr(wsIn.Range("B5").Value)
    mType = CStr(wsIn.Range("B6").Value)

    ' --- Existing side ---
    mExCount = CLng(wsIn.Range("B9").Value)
    If mExCount < 1 Or mExCount > 12 Then
        Err.Raise vbObjectError + 1, , "既設PCS台数は1~12の範囲で入力してください。"
    End If

    ' Total panel count (Row 10)
    mExPanelCount = 0
    If IsNumeric(wsIn.Range("B10").Value) And wsIn.Range("B10").Value <> "" Then
        mExPanelCount = CLng(wsIn.Range("B10").Value)
    End If

    ReDim mExPanelModel(1 To 12)
    ReDim mExSeries(1 To 12)
    ReDim mExCollection(1 To 12)
    ReDim mExCircuit(1 To 12)
    ReDim mExSeries2(1 To 12)
    ReDim mExCollection2(1 To 12)
    ReDim mExCircuit2(1 To 12)
    ReDim mExEstimated(1 To 12)
    ReDim mExPCSModel(1 To 12)
    ReDim mExPCSMethod(1 To 12)
    ReDim mExPCSCapacity(1 To 12)
    ReDim mExCableTier1(1 To 12)
    ReDim mExBreakerType(1 To 12)
    ReDim mExBreakerCap(1 To 12)
    ReDim mExSensitivity(1 To 12)

    Dim i As Long
    For i = 1 To mExCount
        Dim c As Long
        c = i + 1  ' B=2, C=3, ..., M=13
        mExPanelModel(i) = SafeStr(wsIn.Cells(13, c).Value)   ' Row 13
        mExSeries(i) = SafeStr(wsIn.Cells(14, c).Value)       ' Row 14
        mExCollection(i) = SafeStr(wsIn.Cells(15, c).Value)   ' Row 15
        mExCircuit(i) = SafeStr(wsIn.Cells(16, c).Value)      ' Row 16
        mExSeries2(i) = SafeStr(wsIn.Cells(17, c).Value)      ' Row 17
        mExCollection2(i) = SafeStr(wsIn.Cells(18, c).Value)  ' Row 18
        mExCircuit2(i) = SafeStr(wsIn.Cells(19, c).Value)     ' Row 19
        mExEstimated(i) = SafeStr(wsIn.Cells(21, c).Value)    ' Row 21 (was 20)
        mExPCSModel(i) = SafeStr(wsIn.Cells(22, c).Value)     ' Row 22 (was 21)
        mExPCSMethod(i) = SafeStr(wsIn.Cells(23, c).Value)    ' Row 23 (was 22)
        mExPCSCapacity(i) = SafeStr(wsIn.Cells(24, c).Value)  ' Row 24 (was 23)
        mExCableTier1(i) = SafeStr(wsIn.Cells(25, c).Value)   ' Row 25 (was 24)
        mExBreakerType(i) = SafeStr(wsIn.Cells(26, c).Value)  ' Row 26 (was 25)
        mExBreakerCap(i) = SafeStr(wsIn.Cells(27, c).Value)   ' Row 27 (was 26)
        mExSensitivity(i) = SafeStr(wsIn.Cells(28, c).Value)  ' Row 28 (was 27)
    Next i

    ' Existing aggregate
    mExCableTier2 = SafeStr(wsIn.Range("B31").Value)      ' Row 31 (was 30)
    mExAggBreakerType = SafeStr(wsIn.Range("B32").Value)   ' Row 32 (was 31)
    mExAggBreakerCap = SafeStr(wsIn.Range("B33").Value)    ' Row 33 (was 32)
    mExAggSensitivity = SafeStr(wsIn.Range("B34").Value)   ' Row 34 (was 33)
    mExMainCable = SafeStr(wsIn.Range("B35").Value)        ' Row 35 (was 34)

    ' --- New side ---
    mNewCount = CLng(wsIn.Range("B38").Value)   ' Row 38 (was 37)
    If mNewCount < 1 Or mNewCount > 8 Then
        Err.Raise vbObjectError + 2, , "新設PCS台数は1~8の範囲で入力してください。"
    End If

    ' Total panel count (Row 39)
    mNewPanelCount = 0
    If IsNumeric(wsIn.Range("B39").Value) And wsIn.Range("B39").Value <> "" Then
        mNewPanelCount = CLng(wsIn.Range("B39").Value)
    End If

    ReDim mNewPanelModel(1 To 8)
    ReDim mNewSeries(1 To 8)
    ReDim mNewCollection(1 To 8)
    ReDim mNewCircuit(1 To 8)
    ReDim mNewSeries2(1 To 8)
    ReDim mNewCollection2(1 To 8)
    ReDim mNewCircuit2(1 To 8)
    ReDim mNewPCSModel(1 To 8)
    ReDim mNewPCSMethod(1 To 8)
    ReDim mNewPCSCapacity(1 To 8)
    ReDim mNewCableTier1(1 To 8)
    ReDim mNewBreakerType(1 To 8)
    ReDim mNewBreakerCap(1 To 8)
    ReDim mNewSensitivity(1 To 8)

    For i = 1 To mNewCount
        c = i + 1  ' B=2, ..., I=9
        mNewPanelModel(i) = SafeStr(wsIn.Cells(42, c).Value)   ' Row 42 (was 41)
        mNewSeries(i) = SafeStr(wsIn.Cells(43, c).Value)       ' Row 43 (was 42)
        mNewCollection(i) = SafeStr(wsIn.Cells(44, c).Value)   ' Row 44 (was 43)
        mNewCircuit(i) = SafeStr(wsIn.Cells(45, c).Value)      ' Row 45 (was 44)
        mNewSeries2(i) = SafeStr(wsIn.Cells(46, c).Value)      ' Row 46 (was 45)
        mNewCollection2(i) = SafeStr(wsIn.Cells(47, c).Value)  ' Row 47 (was 46)
        mNewCircuit2(i) = SafeStr(wsIn.Cells(48, c).Value)     ' Row 48 (was 47)
        mNewPCSModel(i) = SafeStr(wsIn.Cells(50, c).Value)     ' Row 50 (was 48)
        mNewPCSMethod(i) = SafeStr(wsIn.Cells(51, c).Value)    ' Row 51 (was 49)
        mNewPCSCapacity(i) = SafeStr(wsIn.Cells(52, c).Value)  ' Row 52 (was 50)
        mNewCableTier1(i) = SafeStr(wsIn.Cells(53, c).Value)   ' Row 53 (was 51)
        mNewBreakerType(i) = SafeStr(wsIn.Cells(54, c).Value)  ' Row 54 (was 52)
        mNewBreakerCap(i) = SafeStr(wsIn.Cells(55, c).Value)   ' Row 55 (was 53)
        mNewSensitivity(i) = SafeStr(wsIn.Cells(56, c).Value)  ' Row 56 (was 54)
    Next i

    ' New aggregate
    mNewCableTier2 = SafeStr(wsIn.Range("B59").Value)      ' Row 59 (was 57)
    mNewAggBreakerType = SafeStr(wsIn.Range("B60").Value)   ' Row 60 (was 58)
    mNewAggBreakerCap = SafeStr(wsIn.Range("B61").Value)    ' Row 61 (was 59)
    mNewAggSensitivity = SafeStr(wsIn.Range("B62").Value)   ' Row 62 (was 60)
    mNewMainCable = SafeStr(wsIn.Range("B63").Value)        ' Row 63 (was 61)

    ' Notes
    mCircuitRearrange = (SafeStr(wsIn.Range("B66").Value) = ChrW(&H25CB))  ' Row 66 (was 64)
    mDCExtension = (SafeStr(wsIn.Range("B67").Value) = ChrW(&H25CB))       ' Row 67 (was 65)
    mCableReplace = (SafeStr(wsIn.Range("B68").Value) = ChrW(&H25CB))      ' Row 68 (was 66)
    mReuseMemo = SafeStr(wsIn.Range("B69").Value)                           ' Row 69 (was 67)
End Sub


' ============================================================
' Prepare / clear the output sheet
' ============================================================
Private Function PrepareOutputSheet() As Worksheet
    Dim ws As Worksheet

    On Error Resume Next
    Set ws = ThisWorkbook.Sheets(OUTPUT_SHEET)
    On Error GoTo 0

    If ws Is Nothing Then
        Set ws = ThisWorkbook.Sheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
        ws.Name = OUTPUT_SHEET
    Else
        ws.Cells.Clear
        ' Remove existing shapes
        Dim shp As Shape
        For Each shp In ws.Shapes
            shp.Delete
        Next shp
    End If

    ' Default font
    ws.Cells.Font.Name = FONT_NAME
    ws.Cells.Font.Size = FONT_SIZE

    Set PrepareOutputSheet = ws
End Function


' ============================================================
' Horizontal layout: existing left, new right
' ============================================================
Private Sub DrawHorizontalLayout(ws As Worksheet)
    Dim startRow As Long: startRow = 1
    Dim labelCol As Long: labelCol = 1    ' Column A
    Dim dataStartCol As Long: dataStartCol = 3  ' Column C (after spacer B)

    ' Set column widths for existing side
    ws.Columns(labelCol).ColumnWidth = COL_WIDTH_DATA
    ws.Columns(labelCol + 1).ColumnWidth = COL_WIDTH_SPACER  ' spacer B

    Dim col As Long
    For col = 1 To mExCount
        Dim exDataCol As Long
        exDataCol = dataStartCol + (col - 1) * 2
        ws.Columns(exDataCol).ColumnWidth = COL_WIDTH_DATA
        If col < mExCount Then
            ws.Columns(exDataCol + 1).ColumnWidth = COL_WIDTH_SPACER
        End If
    Next col

    ' Draw existing side
    DrawSide ws, startRow, labelCol, dataStartCol, mExCount, False

    ' Separator column
    Dim sepCol As Long
    sepCol = dataStartCol + mExCount * 2 - 1  ' column after last existing data+spacer
    ws.Columns(sepCol).ColumnWidth = COL_WIDTH_SEPARATOR

    ' New side label and data columns
    Dim newLabelCol As Long
    newLabelCol = sepCol + 1
    ws.Columns(newLabelCol).ColumnWidth = COL_WIDTH_DATA
    ws.Columns(newLabelCol + 1).ColumnWidth = COL_WIDTH_SPACER

    Dim newDataStartCol As Long
    newDataStartCol = newLabelCol + 2

    For col = 1 To mNewCount
        Dim nwDataCol As Long
        nwDataCol = newDataStartCol + (col - 1) * 2
        ws.Columns(nwDataCol).ColumnWidth = COL_WIDTH_DATA
        If col < mNewCount Then
            ws.Columns(nwDataCol + 1).ColumnWidth = COL_WIDTH_SPACER
        End If
    Next col

    ' Draw new side
    DrawSide ws, startRow, newLabelCol, newDataStartCol, mNewCount, True

    ' Title spans entire width
    Dim lastCol As Long
    lastCol = newDataStartCol + (mNewCount - 1) * 2
    Dim titleText As String
    titleText = mCustomer & " (" & mSite & ") " & mType
    ws.Range(ws.Cells(startRow, 1), ws.Cells(startRow, lastCol)).Merge
    SetCellValue ws, startRow, 1, titleText, COLOR_BLACK, True
    ws.Cells(startRow, 1).Font.Size = TITLE_FONT_SIZE
End Sub


' ============================================================
' Vertical layout: existing top (rows 1-28), new bottom (rows 31-58)
' ============================================================
Private Sub DrawVerticalLayout(ws As Worksheet)
    ' --- Existing block ---
    Dim labelCol As Long: labelCol = 1
    Dim dataStartCol As Long: dataStartCol = 3

    ws.Columns(labelCol).ColumnWidth = COL_WIDTH_DATA
    ws.Columns(labelCol + 1).ColumnWidth = COL_WIDTH_SPACER

    Dim col As Long
    For col = 1 To mExCount
        Dim exDataCol As Long
        exDataCol = dataStartCol + (col - 1) * 2
        ws.Columns(exDataCol).ColumnWidth = COL_WIDTH_DATA
        If col < mExCount Then
            ws.Columns(exDataCol + 1).ColumnWidth = COL_WIDTH_SPACER
        End If
    Next col

    DrawSide ws, 1, labelCol, dataStartCol, mExCount, False

    ' Title row 1
    Dim exLastCol As Long
    exLastCol = dataStartCol + (mExCount - 1) * 2
    Dim titleText As String
    titleText = mCustomer & " (" & mSite & ") " & mType
    ws.Range(ws.Cells(1, 1), ws.Cells(1, exLastCol)).Merge
    SetCellValue ws, 1, 1, titleText, COLOR_BLACK, True
    ws.Cells(1, 1).Font.Size = TITLE_FONT_SIZE

    ' --- New block ---
    Dim newStartRow As Long: newStartRow = 31
    Dim newLabelCol As Long: newLabelCol = 1
    Dim newDataStartCol As Long: newDataStartCol = 3

    ' Reuse same columns for new side (they may overlap widths, which is fine)
    For col = 1 To mNewCount
        Dim nwDataCol As Long
        nwDataCol = newDataStartCol + (col - 1) * 2
        ws.Columns(nwDataCol).ColumnWidth = COL_WIDTH_DATA
        If col < mNewCount Then
            ws.Columns(nwDataCol + 1).ColumnWidth = COL_WIDTH_SPACER
        End If
    Next col

    DrawSide ws, newStartRow, newLabelCol, newDataStartCol, mNewCount, True

    ' Title row 31
    Dim newLastCol As Long
    newLastCol = newDataStartCol + (mNewCount - 1) * 2
    ws.Range(ws.Cells(newStartRow, 1), ws.Cells(newStartRow, newLastCol)).Merge
    SetCellValue ws, newStartRow, 1, titleText & " [新設]", COLOR_RED, True
    ws.Cells(newStartRow, 1).Font.Size = TITLE_FONT_SIZE
End Sub


' ============================================================
' Draw one side (existing or new)
' ============================================================
Private Sub DrawSide(ws As Worksheet, startRow As Long, labelCol As Long, _
                     dataStartCol As Long, pcsCount As Long, isNew As Boolean)

    Dim fc As Long  ' default font color for this side
    If isNew Then fc = COLOR_RED Else fc = COLOR_BLACK

    Dim borderColor As Long
    borderColor = fc

    ' Arrays to reference
    Dim panelModel() As String, series() As String, collection() As String
    Dim circuit() As String, estimated() As String, pcsModel() As String
    Dim pcsMethod() As String, pcsCapacity() As String, cableTier1() As String
    Dim breakerType() As String, breakerCap() As String, sensitivity() As String
    Dim series2() As String, collection2() As String, circuit2() As String
    Dim cableTier2 As String, aggBrkType As String, aggBrkCap As String
    Dim aggSens As String, mainCable As String

    If isNew Then
        panelModel = mNewPanelModel: series = mNewSeries: collection = mNewCollection
        circuit = mNewCircuit: pcsModel = mNewPCSModel
        pcsMethod = mNewPCSMethod: pcsCapacity = mNewPCSCapacity
        cableTier1 = mNewCableTier1: breakerType = mNewBreakerType
        breakerCap = mNewBreakerCap: sensitivity = mNewSensitivity
        series2 = mNewSeries2: collection2 = mNewCollection2: circuit2 = mNewCircuit2
        cableTier2 = mNewCableTier2: aggBrkType = mNewAggBreakerType
        aggBrkCap = mNewAggBreakerCap: aggSens = mNewAggSensitivity
        mainCable = mNewMainCable
        ' estimated not applicable for new side
        ReDim estimated(1 To 8)
    Else
        panelModel = mExPanelModel: series = mExSeries: collection = mExCollection
        circuit = mExCircuit: estimated = mExEstimated: pcsModel = mExPCSModel
        pcsMethod = mExPCSMethod: pcsCapacity = mExPCSCapacity
        cableTier1 = mExCableTier1: breakerType = mExBreakerType
        breakerCap = mExBreakerCap: sensitivity = mExSensitivity
        series2 = mExSeries2: collection2 = mExCollection2: circuit2 = mExCircuit2
        cableTier2 = mExCableTier2: aggBrkType = mExAggBreakerType
        aggBrkCap = mExAggBreakerCap: aggSens = mExAggSensitivity
        mainCable = mExMainCable
    End If

    ' Row offsets (0-based from startRow) — 2 rows added for bus space
    Const oTitle As Long = 0     ' Row 1
    Const oPCS As Long = 3       ' Row 4
    Const oPanel As Long = 5     ' Row 6
    Const oStr1 As Long = 6      ' Row 7
    Const oStr2 As Long = 7      ' Row 8
    Const oPanelTotal As Long = 8 ' Row 9
    Const oNote1 As Long = 9     ' Row 10
    Const oNote2 As Long = 10    ' Row 11
    Const oMfr As Long = 11      ' Row 12
    Const oModel As Long = 12    ' Row 13
    Const oCap As Long = 13      ' Row 14
    Const oCableNote As Long = 14 ' Row 15
    Const oCable1 As Long = 15   ' Row 16
    Const oBrkType As Long = 16  ' Row 17
    Const oBrkCap As Long = 17   ' Row 18
    Const oSens As Long = 18     ' Row 19
    ' Bus line gap: rows 20-22 (3 rows for vertical/horizontal bus lines)
    Const oCableNote2 As Long = 19 ' Row 20
    Const oBusGap1 As Long = 20    ' Row 21 (new)
    Const oBusGap2 As Long = 21    ' Row 22 (new)
    Const oCable2 As Long = 22    ' Row 23
    Const oAggBrk As Long = 23   ' Row 24
    Const oAggCap As Long = 24   ' Row 25
    Const oAggSens As Long = 25  ' Row 26
    Const oReuse As Long = 26    ' Row 27
    Const oMain As Long = 27     ' Row 28

    ' ---- Helper: Determine color for new side based on change detection ----
    ' For new side, compare each value with existing side: same = black, different = red
    ' For existing side, always use black

    ' ---- Labels in label column ----
    Dim sideLabel As String
    If isNew Then sideLabel = "【新設側】" Else sideLabel = "【既設側】"

    Dim lblColor As Long: lblColor = fc
    SetCellValue ws, startRow + oPCS, labelCol, sideLabel, lblColor, True
    ' Center-align the side label across data columns using centerContinuous
    ws.Cells(startRow + oPCS, labelCol).HorizontalAlignment = xlCenterAcrossSelection
    SetCellValue ws, startRow + oPanel, labelCol, "パネル型番", lblColor
    SetCellValue ws, startRow + oStr1, labelCol, "ストリング構成", lblColor
    SetCellValue ws, startRow + oStr2, labelCol, "", lblColor
    SetCellValue ws, startRow + oPanelTotal, labelCol, "合計枚数", lblColor
    SetCellValue ws, startRow + oNote1, labelCol, "", lblColor
    SetCellValue ws, startRow + oNote2, labelCol, "", lblColor
    SetCellValue ws, startRow + oMfr, labelCol, "PCSメーカー", lblColor
    SetCellValue ws, startRow + oModel, labelCol, "PCS型番", lblColor
    SetCellValue ws, startRow + oCap, labelCol, "PCS容量", lblColor
    SetCellValue ws, startRow + oCableNote, labelCol, "", lblColor
    SetCellValue ws, startRow + oCable1, labelCol, "ケーブル", lblColor
    SetCellValue ws, startRow + oBrkType, labelCol, "ブレーカ種類", lblColor
    SetCellValue ws, startRow + oBrkCap, labelCol, "ブレーカ容量", lblColor
    SetCellValue ws, startRow + oSens, labelCol, "感度電流", lblColor
    SetCellValue ws, startRow + oCableNote2, labelCol, "", lblColor
    SetCellValue ws, startRow + oCable2, labelCol, "ケーブル(集電盤)", lblColor
    SetCellValue ws, startRow + oAggBrk, labelCol, "集電盤ブレーカ種類", lblColor
    SetCellValue ws, startRow + oAggCap, labelCol, "集電盤ブレーカ容量", lblColor
    SetCellValue ws, startRow + oAggSens, labelCol, "集電盤感度電流", lblColor
    SetCellValue ws, startRow + oReuse, labelCol, "", lblColor
    SetCellValue ws, startRow + oMain, labelCol, "幹線ケーブル", lblColor

    ' Check if any estimated flags exist
    Dim hasEstimated As Boolean: hasEstimated = False
    If Not isNew Then
        Dim chk As Long
        For chk = 1 To pcsCount
            If estimated(chk) = ChrW(&H25CB) Then
                hasEstimated = True
                Exit For
            End If
        Next chk
    End If

    ' Detect PCS count change (for DC line extension logic)
    Dim pcsCountChanged As Boolean
    pcsCountChanged = (mExCount <> mNewCount)

    ' ---- Data columns ----
    Dim idx As Long, dc As Long
    Dim cPanel As Long, cStr As Long, cPCS As Long, cCap As Long
    Dim cCable As Long, cBrk As Long, cBrkCap As Long, cSens As Long
    Dim cBorder As Long
    Dim strCfg1 As String, strCfg2 As String, has2ndType As Boolean
    Dim totalPanels As Long, col1 As Long, col2 As Long
    Dim mfrVal As String, capText As String, phaseSymbol As String
    Dim panelBorderColor As Long, pcsBorderColor As Long, brkBorderColor As Long
    Dim cAggCable As Long, cAggBrk As Long, cAggBrkCap As Long, cAggSens As Long
    Dim cMainCable As Long
    Dim centerIdx As Long, centerDC As Long
    Dim aggRows As Variant, ar As Long

    For idx = 1 To pcsCount
        dc = dataStartCol + (idx - 1) * 2  ' data column for this PCS
        If isNew Then
            ' Compare with existing side (same index, if within range)
            If idx <= mExCount Then
                ' Panel model
                If panelModel(idx) = mExPanelModel(idx) Then cPanel = COLOR_BLACK Else cPanel = COLOR_RED
                ' String config (compare series/circuit)
                If series(idx) = mExSeries(idx) And circuit(idx) = mExCircuit(idx) And _
                   series2(idx) = mExSeries2(idx) And circuit2(idx) = mExCircuit2(idx) Then
                    cStr = COLOR_BLACK
                Else
                    cStr = COLOR_RED
                End If
                ' PCS model
                If pcsModel(idx) = mExPCSModel(idx) Then cPCS = COLOR_BLACK Else cPCS = COLOR_RED
                ' PCS capacity
                If pcsCapacity(idx) = mExPCSCapacity(idx) And pcsMethod(idx) = mExPCSMethod(idx) Then
                    cCap = COLOR_BLACK
                Else
                    cCap = COLOR_RED
                End If
                ' Cable
                If cableTier1(idx) = mExCableTier1(idx) Then cCable = COLOR_BLACK Else cCable = COLOR_RED
                ' Breaker type
                If breakerType(idx) = mExBreakerType(idx) Then cBrk = COLOR_BLACK Else cBrk = COLOR_RED
                ' Breaker capacity
                If breakerCap(idx) = mExBreakerCap(idx) Then cBrkCap = COLOR_BLACK Else cBrkCap = COLOR_RED
                ' Sensitivity
                If sensitivity(idx) = mExSensitivity(idx) Then cSens = COLOR_BLACK Else cSens = COLOR_RED
            Else
                ' New PCS beyond existing count: all red
                cPanel = COLOR_RED: cStr = COLOR_RED: cPCS = COLOR_RED: cCap = COLOR_RED
                cCable = COLOR_RED: cBrk = COLOR_RED: cBrkCap = COLOR_RED: cSens = COLOR_RED
            End If
        Else
            ' Existing side: always black
            cPanel = COLOR_BLACK: cStr = COLOR_BLACK: cPCS = COLOR_BLACK: cCap = COLOR_BLACK
            cCable = COLOR_BLACK: cBrk = COLOR_BLACK: cBrkCap = COLOR_BLACK: cSens = COLOR_BLACK
        End If

        ' Row 4: PCS number (always same color as side label)
        If idx = 1 Then
            SetCellValue ws, startRow + oPCS, dc, 1, lblColor, False, """PCS""0"
        Else
            ws.Cells(startRow + oPCS, dc).Formula = "=" & _
                ws.Cells(startRow + oPCS, dataStartCol + (idx - 2) * 2).Address(False, False) & "+1"
            ws.Cells(startRow + oPCS, dc).NumberFormat = """PCS""0"
            ws.Cells(startRow + oPCS, dc).Font.Color = lblColor
        End If

        ' Row 6: Panel model
        SetCellValue ws, startRow + oPanel, dc, panelModel(idx), cPanel

        ' Row 7-8: String config
        strCfg1 = BuildStringConfig(series(idx), collection(idx), circuit(idx))
        has2ndType = (series2(idx) <> "")

        If has2ndType Then
            SetCellValue ws, startRow + oStr1, dc, strCfg1, cStr
            strCfg2 = BuildStringConfig(series2(idx), collection2(idx), circuit2(idx))
            SetCellValue ws, startRow + oStr2, dc, strCfg2, cStr
        Else
            SetCellValue ws, startRow + oStr1, dc, strCfg1, cStr
        End If

        ' Yellow background for estimated values
        If Not isNew And estimated(idx) = ChrW(&H25CB) Then
            ws.Cells(startRow + oStr1, dc).Interior.Color = COLOR_YELLOW
            ws.Cells(startRow + oStr2, dc).Interior.Color = COLOR_YELLOW
        End If

        If Not isNew And hasEstimated And idx = 1 Then
            SetCellValue ws, startRow + oStr2, labelCol, ChrW(&H203B) & "想定", fc
        End If

        ' Row 9: Panel total count (series * MAX(collection,1) * circuit)
        totalPanels = 0
        If IsNumeric(series(idx)) And series(idx) <> "" And IsNumeric(circuit(idx)) And circuit(idx) <> "" Then
            col1 = 1
            If IsNumeric(collection(idx)) And collection(idx) <> "" Then col1 = CLng(collection(idx))
            totalPanels = CLng(series(idx)) * col1 * CLng(circuit(idx))
        End If
        If IsNumeric(series2(idx)) And series2(idx) <> "" And IsNumeric(circuit2(idx)) And circuit2(idx) <> "" Then
            col2 = 1
            If IsNumeric(collection2(idx)) And collection2(idx) <> "" Then col2 = CLng(collection2(idx))
            totalPanels = totalPanels + CLng(series2(idx)) * col2 * CLng(circuit2(idx))
        End If
        If totalPanels > 0 Then
            SetCellValue ws, startRow + oPanelTotal, dc, totalPanels & "枚", cStr
        End If

        ' Row 10: Note1 - circuit rearrangement (new side only)
        If isNew And mCircuitRearrange Then
            SetCellValue ws, startRow + oNote1, dc, "回路組換", COLOR_RED
        End If

        ' Row 11: Note2 - DC extension (new side, or if PCS count changed)
        If isNew And (mDCExtension Or pcsCountChanged) Then
            SetCellValue ws, startRow + oNote2, dc, "直流線延長", COLOR_RED
        End If

        ' Row 12: PCS manufacturer - VLOOKUP from PCS sheet
        mfrVal = ""
        On Error Resume Next
        If isNew Then
            mfrVal = CStr(Application.WorksheetFunction.VLookup(pcsModel(idx), _
                ThisWorkbook.Sheets("変更後PCS").Range("A:B"), 2, False))
        Else
            mfrVal = CStr(Application.WorksheetFunction.VLookup(pcsModel(idx), _
                ThisWorkbook.Sheets("既設PCS").Range("A:B"), 2, False))
        End If
        If Err.Number <> 0 Then mfrVal = ""
        On Error GoTo 0
        SetCellValue ws, startRow + oMfr, dc, mfrVal, cPCS

        ' Row 13: PCS model
        SetCellValue ws, startRow + oModel, dc, pcsModel(idx), cPCS

        ' Row 14: PCS capacity
        capText = ""
        If pcsMethod(idx) <> "" And pcsCapacity(idx) <> "" Then
            Select Case pcsMethod(idx)
                Case "三相": phaseSymbol = "3" & ChrW(&H3A6)
                Case "単相": phaseSymbol = "1" & ChrW(&H3A6)
                Case Else: phaseSymbol = pcsMethod(idx)
            End Select
            capText = phaseSymbol & " " & pcsCapacity(idx) & "kW"
        End If
        SetCellValue ws, startRow + oCap, dc, capText, cCap

        ' Row 15: Cable note (new side only)
        If isNew And mCableReplace Then
            SetCellValue ws, startRow + oCableNote, dc, "ケーブル張替え", COLOR_RED
        End If

        ' Row 16: Cable type tier 1
        SetCellValue ws, startRow + oCable1, dc, cableTier1(idx), cCable

        ' Row 17: Breaker type
        SetCellValue ws, startRow + oBrkType, dc, breakerType(idx), cBrk

        ' Row 18: Breaker capacity
        If breakerCap(idx) <> "" Then
            SetCellValue ws, startRow + oBrkCap, dc, CLng(breakerCap(idx)), cBrkCap, False, "0""A"""
        End If

        ' Row 19: Sensitivity current
        If sensitivity(idx) <> "" Then
            SetCellValue ws, startRow + oSens, dc, CLng(sensitivity(idx)), cSens, False, "0""mA"""
        End If

        ' Row 20: Cable note tier 2 (new side only)
        If isNew And mCableReplace Then
            SetCellValue ws, startRow + oCableNote2, dc, "ケーブル張替え", COLOR_RED
        End If

        ' Aggregate rows (same for all PCS, only show once)
        If idx = 1 Then
            ' Determine aggregate colors for new side
            If isNew Then
                If cableTier2 = mExCableTier2 Then cAggCable = COLOR_BLACK Else cAggCable = COLOR_RED
                If aggBrkType = mExAggBreakerType Then cAggBrk = COLOR_BLACK Else cAggBrk = COLOR_RED
                If aggBrkCap = mExAggBreakerCap Then cAggBrkCap = COLOR_BLACK Else cAggBrkCap = COLOR_RED
                If aggSens = mExAggSensitivity Then cAggSens = COLOR_BLACK Else cAggSens = COLOR_RED
                If mainCable = mExMainCable Then cMainCable = COLOR_BLACK Else cMainCable = COLOR_RED
            Else
                cAggCable = COLOR_BLACK: cAggBrk = COLOR_BLACK
                cAggBrkCap = COLOR_BLACK: cAggSens = COLOR_BLACK: cMainCable = COLOR_BLACK
            End If

            SetCellValue ws, startRow + oCable2, dc, cableTier2, cAggCable
            SetCellValue ws, startRow + oAggBrk, dc, aggBrkType, cAggBrk
            If aggBrkCap <> "" Then
                SetCellValue ws, startRow + oAggCap, dc, CLng(aggBrkCap), cAggBrkCap, False, "0""A"""
            End If
            If aggSens <> "" Then
                SetCellValue ws, startRow + oAggSens, dc, CLng(aggSens), cAggSens, False, "0""mA"""
            End If

            ' Row 27: Reuse note (new side only)
            If isNew Then
                If mReuseMemo <> "" Then
                    SetCellValue ws, startRow + oReuse, dc, mReuseMemo, COLOR_BLACK
                Else
                    SetCellValue ws, startRow + oReuse, dc, "そのまま流用", COLOR_BLACK
                End If
            End If

            ' Row 28: Main cable
            SetCellValue ws, startRow + oMain, dc, mainCable, cMainCable

            ' Move aggregate data to center PCS column (no merge)
            If pcsCount > 1 Then
                centerIdx = (pcsCount + 1) \ 2
                centerDC = dataStartCol + (centerIdx - 1) * 2

                If centerDC <> dc Then
                    aggRows = Array(oCable2, oAggBrk, oAggCap, oAggSens, oReuse, oMain)
                    For ar = 0 To UBound(aggRows)
                        ws.Cells(startRow + aggRows(ar), centerDC).Value = ws.Cells(startRow + aggRows(ar), dc).Value
                        ws.Cells(startRow + aggRows(ar), centerDC).Font.Color = ws.Cells(startRow + aggRows(ar), dc).Font.Color
                        ws.Cells(startRow + aggRows(ar), centerDC).Font.Name = FONT_NAME
                        ws.Cells(startRow + aggRows(ar), centerDC).Font.Size = FONT_SIZE
                        ws.Cells(startRow + aggRows(ar), centerDC).HorizontalAlignment = xlCenter
                        ws.Cells(startRow + aggRows(ar), centerDC).ShrinkToFit = True
                        ws.Cells(startRow + aggRows(ar), centerDC).NumberFormat = ws.Cells(startRow + aggRows(ar), dc).NumberFormat
                        ws.Cells(startRow + aggRows(ar), dc).Value = ""
                    Next ar
                End If

                ' Border around collection breaker block (oAggBrk to oAggSens)
                Dim firstDC As Long: firstDC = dataStartCol
                Dim lastDC As Long: lastDC = dataStartCol + (pcsCount - 1) * 2
                ' Determine border color
                Dim aggBorderColor As Long
                If isNew Then
                    If cAggBrk = COLOR_RED Or cAggBrkCap = COLOR_RED Or cAggSens = COLOR_RED Then
                        aggBorderColor = COLOR_RED
                    Else
                        aggBorderColor = COLOR_BLACK
                    End If
                Else
                    aggBorderColor = COLOR_BLACK
                End If
                ApplyBlockBorder ws, startRow + oAggBrk, firstDC, startRow + oAggSens, lastDC, aggBorderColor
            End If
        End If

        ' ---- Borders around individual blocks ----
        If isNew Then
            ' Panel block: red if panel/string changed
            If cPanel = COLOR_RED Or cStr = COLOR_RED Then panelBorderColor = COLOR_RED Else panelBorderColor = COLOR_BLACK
            ' PCS block: red if PCS changed
            If cPCS = COLOR_RED Or cCap = COLOR_RED Then pcsBorderColor = COLOR_RED Else pcsBorderColor = COLOR_BLACK
            ' Breaker block: red if breaker changed
            If cBrk = COLOR_RED Or cBrkCap = COLOR_RED Or cSens = COLOR_RED Then brkBorderColor = COLOR_RED Else brkBorderColor = COLOR_BLACK
        Else
            panelBorderColor = COLOR_BLACK: pcsBorderColor = COLOR_BLACK: brkBorderColor = COLOR_BLACK
        End If

        ' Panel block: rows 6-9 (oPanel to oPanelTotal)
        ApplyBlockBorder ws, startRow + oPanel, dc, startRow + oPanelTotal, dc, panelBorderColor
        ' PCS block: rows 12-14 (oMfr to oCap)
        ApplyBlockBorder ws, startRow + oMfr, dc, startRow + oCap, dc, pcsBorderColor
        ' Breaker block: rows 16-19 (oCable1 to oSens) — cable included in bordered block
        ApplyBlockBorder ws, startRow + oCable1, dc, startRow + oSens, dc, brkBorderColor

    Next idx

    ' Setup dropdowns
    SetupDropdowns ws, startRow, dataStartCol, pcsCount

    ' Draw cable lines
    DrawCableLines ws, startRow, labelCol, dataStartCol, pcsCount, isNew
End Sub


' ============================================================
' Build string configuration text
' ============================================================
Private Function BuildStringConfig(series As String, collection As String, circuit As String) As String
    If series = "" And circuit = "" Then
        BuildStringConfig = ""
        Exit Function
    End If

    Dim result As String
    result = series & "直"

    If collection <> "" Then
        result = result & collection & "集電"
    End If

    result = result & circuit & "回路"
    BuildStringConfig = result
End Function


' ============================================================
' Draw cable lines (vertical lines between cable and breaker rows)
' ============================================================
Private Sub DrawCableLines(ws As Worksheet, startRow As Long, labelCol As Long, _
                           dataStartCol As Long, pcsCount As Long, isNew As Boolean)

    ' Updated row offsets (matching DrawSide)
    Const oPanelTotal As Long = 8  ' Row 9
    Const oMfr As Long = 11       ' Row 12
    Const oCableNote As Long = 14  ' Row 15
    Const oCable1 As Long = 15    ' Row 16
    Const oSens As Long = 18      ' Row 19
    Const oCable2 As Long = 22    ' Row 23
    Const oAggBrk As Long = 23    ' Row 24
    Const oAggSens As Long = 25   ' Row 26
    Const oMain As Long = 27      ' Row 28

    ' Determine line color based on change detection
    Dim lineColor As Long
    If isNew Then lineColor = COLOR_RED Else lineColor = COLOR_BLACK

    ' For new side, DC lines (panel to PCS) are red if PCS count changed
    Dim dcLineColor As Long
    If isNew And (mExCount <> mNewCount) Then
        dcLineColor = COLOR_RED
    ElseIf isNew Then
        dcLineColor = COLOR_BLACK  ' no PCS count change = reuse DC lines
    Else
        dcLineColor = COLOR_BLACK
    End If

    ' Aggregate line colors
    Dim aggLineColor As Long
    If isNew Then
        ' Red if any aggregate value changed
        If mNewCableTier2 <> mExCableTier2 Or mNewAggBreakerType <> mExAggBreakerType Or _
           mNewAggBreakerCap <> mExAggBreakerCap Or mNewAggSensitivity <> mExAggSensitivity Then
            aggLineColor = COLOR_RED
        Else
            aggLineColor = COLOR_BLACK
        End If
    Else
        aggLineColor = COLOR_BLACK
    End If

    Dim mainLineColor As Long
    If isNew Then
        If mNewMainCable <> mExMainCable Then mainLineColor = COLOR_RED Else mainLineColor = COLOR_BLACK
    Else
        mainLineColor = COLOR_BLACK
    End If

    Dim idx As Long, dc As Long
    Dim perPCSLineColor As Long
    Dim rPanelBot As Range, rPCSTop As Range
    Dim xDC As Double, yDC1 As Double, yDC2 As Double
    Dim lnDC As Shape
    Dim rCapBot As Range, rCable1Top As Range
    Dim xCN As Double, yCN1 As Double, yCN2 As Double
    Dim lnCN As Shape
    Dim rSensBot As Range, rCable2Top As Range
    Dim xSB As Double, ySB1 As Double, ySB2 As Double
    Dim lnSB As Shape
    Dim centerIdx2 As Long, centerDC2 As Long
    Dim r1 As Range, r2 As Range
    Dim x1 As Double, y1V As Double, y2V As Double
    Dim ln2 As Shape
    Dim rAggBot As Range, rMainTop As Range
    Dim xM As Double, yM1 As Double, yM2 As Double
    Dim lnMain As Shape

    For idx = 1 To pcsCount
        dc = dataStartCol + (idx - 1) * 2

        ' Per-PCS line color (AC side: breaker to bus)
        If isNew Then
            If idx <= mExCount Then
                ' Check if breaker values changed
                If mNewBreakerType(idx) <> mExBreakerType(idx) Or _
                   mNewBreakerCap(idx) <> mExBreakerCap(idx) Or _
                   mNewSensitivity(idx) <> mExSensitivity(idx) Then
                    perPCSLineColor = COLOR_RED
                Else
                    perPCSLineColor = COLOR_BLACK
                End If
            Else
                perPCSLineColor = COLOR_RED
            End If
        Else
            perPCSLineColor = COLOR_BLACK
        End If

        ' DC vertical line: panel block bottom (row 9) to PCS block top (row 12)
        Set rPanelBot = ws.Cells(startRow + oPanelTotal, dc)
        Set rPCSTop = ws.Cells(startRow + oMfr, dc)
        xDC = rPanelBot.Left + rPanelBot.Width / 2
        yDC1 = rPanelBot.Top + rPanelBot.Height
        yDC2 = rPCSTop.Top

        If yDC2 > yDC1 Then
            Set lnDC = ws.Shapes.AddLine(xDC, yDC1, xDC, yDC2)
            With lnDC.Line
                .ForeColor.RGB = dcLineColor
                .Weight = 1
            End With
        End If

        ' AC vertical line: PCS cap bottom (row 14) to cable/breaker block top (row 16)
        Set rCapBot = ws.Cells(startRow + oCableNote, dc)
        Set rCable1Top = ws.Cells(startRow + oCable1, dc)
        xCN = rCapBot.Left + rCapBot.Width / 2
        yCN1 = rCapBot.Top
        yCN2 = rCable1Top.Top

        If yCN2 > yCN1 Then
            Set lnCN = ws.Shapes.AddLine(xCN, yCN1, xCN, yCN2)
            With lnCN.Line
                .ForeColor.RGB = perPCSLineColor
                .Weight = 1
            End With
        End If

        ' For single PCS: direct vertical line from breaker bottom to aggregate cable
        If pcsCount = 1 Then
            Set rSensBot = ws.Cells(startRow + oSens, dc)
            Set rCable2Top = ws.Cells(startRow + oCable2, dc)
            xSB = rSensBot.Left + rSensBot.Width / 2
            ySB1 = rSensBot.Top + rSensBot.Height
            ySB2 = rCable2Top.Top

            If ySB2 > ySB1 Then
                Set lnSB = ws.Shapes.AddLine(xSB, ySB1, xSB, ySB2)
                With lnSB.Line
                    .ForeColor.RGB = aggLineColor
                    .Weight = 1
                End With
            End If
        End If

        ' Line between cable tier 2 and aggregate breaker (center column)
        If idx = 1 Then
            centerIdx2 = (pcsCount + 1) \ 2
            centerDC2 = dataStartCol + (centerIdx2 - 1) * 2

            Set r1 = ws.Cells(startRow + oCable2, centerDC2)
            Set r2 = ws.Cells(startRow + oAggBrk, centerDC2)
            x1 = r1.Left + r1.Width / 2
            y1V = r1.Top + r1.Height
            y2V = r2.Top

            If y2V > y1V Then
                Set ln2 = ws.Shapes.AddLine(x1, y1V, x1, y2V)
                With ln2.Line
                    .ForeColor.RGB = aggLineColor
                    .Weight = 1
                End With
            End If

            ' Line from aggregate breaker bottom to main cable
            Set rAggBot = ws.Cells(startRow + oAggSens, centerDC2)
            Set rMainTop = ws.Cells(startRow + oMain, centerDC2)
            xM = rAggBot.Left + rAggBot.Width / 2
            yM1 = rAggBot.Top + rAggBot.Height
            yM2 = rMainTop.Top

            If yM2 > yM1 Then
                Set lnMain = ws.Shapes.AddLine(xM, yM1, xM, yM2)
                With lnMain.Line
                    .ForeColor.RGB = mainLineColor
                    .Weight = 1
                End With
            End If
        End If
    Next idx

    ' Draw horizontal bus line connecting all PCS to aggregate panel
    Dim busY As Double
    Dim firstR As Range, lastR As Range
    Dim centerPCSIdx As Long, centerPCSDC As Long
    Dim busIdx As Long, busDC As Long
    Dim busR As Range, bx As Double, by1 As Double
    Dim lnBus As Shape
    Dim hx1 As Double, hx2 As Double
    Dim firstBusR As Range, lastBusR As Range
    Dim lnHBus As Shape
    Dim centerBusR As Range, cx As Double
    Dim aggCableR As Range, cy2 As Double
    Dim lnCenter As Shape

    If pcsCount > 1 Then
        ' Bus Y position: midpoint between breaker bottom and aggregate cable
        Set firstR = ws.Cells(startRow + oSens, dataStartCol)
        Set lastR = ws.Cells(startRow + oCable2, dataStartCol)
        busY = firstR.Top + firstR.Height + (lastR.Top - firstR.Top - firstR.Height) / 2

        centerPCSIdx = (pcsCount + 1) \ 2
        centerPCSDC = dataStartCol + (centerPCSIdx - 1) * 2

        ' Vertical lines from each PCS breaker bottom to bus
        For busIdx = 1 To pcsCount
            busDC = dataStartCol + (busIdx - 1) * 2

            Set busR = ws.Cells(startRow + oSens, busDC)
            bx = busR.Left + busR.Width / 2
            by1 = busR.Top + busR.Height

            Set lnBus = ws.Shapes.AddLine(bx, by1, bx, busY)
            With lnBus.Line
                .ForeColor.RGB = aggLineColor
                .Weight = 1
            End With
        Next busIdx

        ' Horizontal bus line
        Set firstBusR = ws.Cells(startRow + oSens, dataStartCol)
        Set lastBusR = ws.Cells(startRow + oSens, dataStartCol + (pcsCount - 1) * 2)
        hx1 = firstBusR.Left + firstBusR.Width / 2
        hx2 = lastBusR.Left + lastBusR.Width / 2

        Set lnHBus = ws.Shapes.AddLine(hx1, busY, hx2, busY)
        With lnHBus.Line
            .ForeColor.RGB = aggLineColor
            .Weight = 1
        End With

        ' Vertical line from bus center down to aggregate cable row
        Set centerBusR = ws.Cells(startRow + oSens, centerPCSDC)
        cx = centerBusR.Left + centerBusR.Width / 2

        Set aggCableR = ws.Cells(startRow + oCable2, centerPCSDC)
        cy2 = aggCableR.Top

        Set lnCenter = ws.Shapes.AddLine(cx, busY, cx, cy2)
        With lnCenter.Line
            .ForeColor.RGB = aggLineColor
            .Weight = 1
        End With
    End If
End Sub


' ============================================================
' Setup data validation dropdowns on output sheet
' ============================================================
Private Sub SetupDropdowns(ws As Worksheet, startRow As Long, _
                           dataStartCol As Long, pcsCount As Long)

    Const oCable1 As Long = 15   ' Row 16
    Const oBrkType As Long = 16  ' Row 17
    Const oBrkCap As Long = 17   ' Row 18
    Const oSens As Long = 18     ' Row 19
    Const oCable2 As Long = 22   ' Row 23
    Const oAggBrk As Long = 23   ' Row 24
    Const oAggCap As Long = 24   ' Row 25
    Const oAggSens As Long = 25  ' Row 26
    Const oMain As Long = 27     ' Row 28

    Dim idx As Long
    For idx = 1 To pcsCount
        Dim dc As Long
        dc = dataStartCol + (idx - 1) * 2

        ' Breaker type (Row 16) - reference breaker master
        AddDropdown ws.Cells(startRow + oBrkType, dc), _
            "=ブレーカマスタ!$A$2:$A$3"

        ' Breaker capacity (Row 17)
        AddDropdown ws.Cells(startRow + oBrkCap, dc), _
            "=ブレーカマスタ!$C$2:$C$8"

        ' Sensitivity current (Row 18)
        AddDropdown ws.Cells(startRow + oSens, dc), _
            "=ブレーカマスタ!$G$2:$G$5"

        ' Cable type tier 1 (Row 15)
        AddDropdown ws.Cells(startRow + oCable1, dc), _
            "=ケーブルマスタ!$A$2:$A$20"

        ' Aggregate rows: on center column (no merge)
        If idx = 1 Then
            ' Calculate center column for aggregate dropdowns
            Dim centerAggIdx As Long
            centerAggIdx = (pcsCount + 1) \ 2
            Dim centerAggDC As Long
            centerAggDC = dataStartCol + (centerAggIdx - 1) * 2

            AddDropdown ws.Cells(startRow + oCable2, centerAggDC), "=ケーブルマスタ!$A$2:$A$20"
            AddDropdown ws.Cells(startRow + oAggBrk, centerAggDC), "=ブレーカマスタ!$A$2:$A$3"
            AddDropdown ws.Cells(startRow + oAggCap, centerAggDC), "=ブレーカマスタ!$E$2:$E$10"
            AddDropdown ws.Cells(startRow + oAggSens, centerAggDC), "=ブレーカマスタ!$G$2:$G$5"
            AddDropdown ws.Cells(startRow + oMain, centerAggDC), "=ケーブルマスタ!$C$2:$C$20"
        End If
    Next idx
End Sub


' ============================================================
' Helper: Add data validation dropdown to a cell
' ============================================================
Private Sub AddDropdown(rng As Range, formula As String)
    On Error Resume Next
    With rng.Validation
        .Delete
        .Add Type:=xlValidateList, AlertStyle:=xlValidAlertStop, _
             Operator:=xlBetween, Formula1:=formula
        .IgnoreBlank = True
        .InCellDropdown = True
        .ShowInput = False
        .ShowError = True
    End With
    On Error GoTo 0
End Sub


' ============================================================
' Helper: Set cell value with formatting
' ============================================================
Private Sub SetCellValue(ws As Worksheet, r As Long, c As Long, val As Variant, _
                         fontColor As Long, Optional isBold As Boolean = False, _
                         Optional numFormat As String = "", _
                         Optional bgColor As Long = -1)

    With ws.Cells(r, c)
        .Value = val
        .Font.Name = FONT_NAME
        .Font.Size = FONT_SIZE
        .Font.Color = fontColor
        .Font.Bold = isBold
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .ShrinkToFit = True
        .WrapText = False

        If numFormat <> "" Then
            .NumberFormat = numFormat
        End If

        If bgColor >= 0 Then
            .Interior.Color = bgColor
        End If
    End With
End Sub


' ============================================================
' Helper: Apply thin border around a block of cells
' ============================================================
Private Sub ApplyBlockBorder(ws As Worksheet, r1 As Long, c1 As Long, _
                             r2 As Long, c2 As Long, borderColor As Long)

    Dim rng As Range
    Set rng = ws.Range(ws.Cells(r1, c1), ws.Cells(r2, c2))

    ' Only outer borders (no inside horizontal lines per user request)
    Dim edge As Variant
    Dim edges As Variant
    edges = Array(xlEdgeLeft, xlEdgeTop, xlEdgeBottom, xlEdgeRight)

    Dim i As Long
    For i = 0 To UBound(edges)
        On Error Resume Next
        With rng.Borders(edges(i))
            .LineStyle = xlContinuous
            .Color = borderColor
            .Weight = xlThin
        End With
        On Error GoTo 0
    Next i
End Sub


' ============================================================
' Helper: Merge range across data columns (skipping spacers)
' ============================================================
Private Sub MergeDataRange(ws As Worksheet, r As Long, firstCol As Long, _
                           lastCol As Long, fontColor As Long)
    On Error Resume Next
    Dim rng As Range
    Set rng = ws.Range(ws.Cells(r, firstCol), ws.Cells(r, lastCol))
    rng.Merge
    rng.Font.Color = fontColor
    On Error GoTo 0
End Sub


' ============================================================
' Helper: Safe string conversion (handles Empty, Null, Error)
' ============================================================
Private Function SafeStr(val As Variant) As String
    If IsError(val) Or IsNull(val) Or IsEmpty(val) Then
        SafeStr = ""
    Else
        SafeStr = CStr(val)
    End If
End Function


' ============================================================
' Estimate string configuration - assigned to the "推定" button
' ============================================================
Public Sub EstimateExisting()
    EstimateStringConfigCore True
End Sub

Public Sub EstimateNew()
    EstimateStringConfigCore False
End Sub

Private Sub EstimateStringConfigCore(ByVal isExisting As Boolean)
    On Error GoTo ErrHandler

    Dim wsIn As Worksheet
    Set wsIn = ThisWorkbook.Sheets("入力")

    ' Determine row numbers and PCS sheet based on side
    Dim pcsCountRow As Long, panelCountRow As Long
    Dim panelModelRow As Long, seriesRow As Long, collectionRow As Long, circuitRow As Long
    Dim series2Row As Long, collection2Row As Long, circuit2Row As Long
    Dim estimatedRow As Long, pcsModelRow As Long
    Dim pcsSheetName As String
    Dim maxPCS As Long

    If isExisting Then
        pcsCountRow = 9
        panelCountRow = 10
        panelModelRow = 13
        seriesRow = 14
        collectionRow = 15
        circuitRow = 16
        series2Row = 17
        collection2Row = 18
        circuit2Row = 19
        estimatedRow = 21
        pcsModelRow = 22
        pcsSheetName = "既設PCS"
        maxPCS = 12
    Else
        pcsCountRow = 38
        panelCountRow = 39
        panelModelRow = 42
        seriesRow = 43
        collectionRow = 44
        circuitRow = 45
        series2Row = 46
        collection2Row = 47
        circuit2Row = 48
        estimatedRow = 0  ' new side does not have estimated row
        pcsModelRow = 50
        pcsSheetName = "変更後PCS"
        maxPCS = 8
    End If

    ' Read PCS count and panel count
    Dim pcsCount As Long
    pcsCount = CLng(wsIn.Cells(pcsCountRow, 2).Value)
    If pcsCount < 1 Or pcsCount > maxPCS Then
        MsgBox "PCS台数が不正です。", vbExclamation, "エラー"
        Exit Sub
    End If

    Dim totalPanels As Long
    totalPanels = 0
    If IsNumeric(wsIn.Cells(panelCountRow, 2).Value) And wsIn.Cells(panelCountRow, 2).Value <> "" Then
        totalPanels = CLng(wsIn.Cells(panelCountRow, 2).Value)
    End If

    If totalPanels <= 0 Then
        MsgBox "パネル枚数(合計)が入力されていません。", vbExclamation, "エラー"
        Exit Sub
    End If

    ' Check that no collection (集電) values are entered
    Dim chkIdx As Long
    For chkIdx = 1 To pcsCount
        Dim chkCol As Long
        chkCol = chkIdx + 1
        If SafeStr(wsIn.Cells(collectionRow, chkCol).Value) <> "" Then
            MsgBox "集電数が既に入力されています（PCS" & chkIdx & "）。" & vbCrLf & _
                   "推定機能は集電なしの場合のみ対応しています。", vbExclamation, "エラー"
            Exit Sub
        End If
    Next chkIdx

    ' Read panel model and PCS model for each PCS
    Dim panelModels() As String, pcsModels() As String
    ReDim panelModels(1 To pcsCount)
    ReDim pcsModels(1 To pcsCount)

    Dim j As Long
    For j = 1 To pcsCount
        Dim cc As Long
        cc = j + 1
        panelModels(j) = SafeStr(wsIn.Cells(panelModelRow, cc).Value)
        pcsModels(j) = SafeStr(wsIn.Cells(pcsModelRow, cc).Value)

        If panelModels(j) = "" Then
            MsgBox "PCS" & j & "のパネル型番が入力されていません。", vbExclamation, "エラー"
            Exit Sub
        End If
        If pcsModels(j) = "" Then
            MsgBox "PCS" & j & "のPCS型番が入力されていません。", vbExclamation, "エラー"
            Exit Sub
        End If
    Next j

    ' Check if all PCS have same panel model and PCS model (for even distribution)
    Dim allSamePanel As Boolean: allSamePanel = True
    Dim allSamePCS As Boolean: allSamePCS = True
    For j = 2 To pcsCount
        If panelModels(j) <> panelModels(1) Then allSamePanel = False
        If pcsModels(j) <> pcsModels(1) Then allSamePCS = False
    Next j

    ' Lookup PV Vmp
    Dim wsPV As Worksheet
    Set wsPV = ThisWorkbook.Sheets("PV")

    Dim wsPCS As Worksheet
    Set wsPCS = ThisWorkbook.Sheets(pcsSheetName)

    ' For simplicity, handle uniform case (all same panel/PCS) and per-PCS case
    Dim panelsPerPCS As Long
    panelsPerPCS = totalPanels \ pcsCount
    Dim panelRemainder As Long
    panelRemainder = totalPanels Mod pcsCount

    If panelRemainder <> 0 And allSamePanel And allSamePCS Then
        ' Cannot evenly distribute panels
        MsgBox "パネル枚数(" & totalPanels & ")をPCS台数(" & pcsCount & ")で均等に割り切れません。" & vbCrLf & _
               "個別PCSごとの推定を試みます。", vbInformation, "情報"
    End If

    ' Process each PCS
    Dim resultMsg As String
    resultMsg = "推定結果:" & vbCrLf & vbCrLf
    Dim foundAll As Boolean: foundAll = True

    ' All variable declarations for the loop (VBA requires Dim outside For)
    Dim vmp As Double
    Dim ratedV As Variant
    Dim maxCirc As Variant
    Dim dblRatedV As Double
    Dim lngMaxCirc As Long
    Dim targetSeries As Long
    Dim thisPCSPanels As Long
    Dim foundSingle As Boolean
    Dim foundDouble As Boolean
    Dim bestS As Long, bestC As Long
    Dim bestS1 As Long, bestC1 As Long, bestS2 As Long, bestC2 As Long
    Dim offset As Long
    Dim offsets As Variant
    Dim foundExistingSeries As Boolean
    Dim exSeries As Long
    Dim exCirc As Long
    Dim oi As Long
    Dim tryS As Long, tryC As Long
    Dim s1 As Long, s2 As Long, c1 As Long
    Dim remPanels As Long
    Dim c2 As Long
    Dim fillCol As Long

    For j = 1 To pcsCount

        ' Lookup Vmp from PV sheet
        On Error Resume Next
        vmp = Application.WorksheetFunction.VLookup(panelModels(j), _
            wsPV.Range("A:C"), 3, False)
        If Err.Number <> 0 Then
            On Error GoTo 0
            MsgBox "パネル型番「" & panelModels(j) & "」がPVシートに見つかりません。", vbExclamation, "エラー"
            Exit Sub
        End If
        On Error GoTo 0

        ' Lookup rated voltage and max circuits from PCS sheet
        On Error Resume Next
        ratedV = Application.WorksheetFunction.VLookup(pcsModels(j), _
            wsPCS.Range("A:H"), 7, False)
        If Err.Number <> 0 Then
            On Error GoTo 0
            MsgBox "PCS型番「" & pcsModels(j) & "」が" & pcsSheetName & "シートに見つかりません。", vbExclamation, "エラー"
            Exit Sub
        End If
        On Error GoTo 0

        On Error Resume Next
        maxCirc = Application.WorksheetFunction.VLookup(pcsModels(j), _
            wsPCS.Range("A:H"), 8, False)
        If Err.Number <> 0 Then
            On Error GoTo 0
            MsgBox "PCS型番「" & pcsModels(j) & "」の入力回路数が" & pcsSheetName & "シートに見つかりません。", vbExclamation, "エラー"
            Exit Sub
        End If
        On Error GoTo 0

        ' Check for unknown values
        If CStr(ratedV) = "不明" Or Not IsNumeric(ratedV) Then
            MsgBox "PCS" & j & "（" & pcsModels(j) & "）の定格入力電圧が不明です。", vbExclamation, "エラー"
            Exit Sub
        End If
        If CStr(maxCirc) = "不明" Or Not IsNumeric(maxCirc) Then
            MsgBox "PCS" & j & "（" & pcsModels(j) & "）の入力回路数が不明です。", vbExclamation, "エラー"
            Exit Sub
        End If

        dblRatedV = CDbl(ratedV)
        lngMaxCirc = CLng(maxCirc)

        ' Calculate target series (ceiling: rated voltage / Vmp, rounded UP)
        ' e.g., 250V / 32.7V = 7.65 -> 8 series (not 7.65 rounded to 8, but always ceil)
        targetSeries = -Int(-(dblRatedV / vmp))  ' Ceiling function in VBA

        ' Determine panels for this PCS
        If allSamePanel And allSamePCS And panelRemainder = 0 Then
            thisPCSPanels = panelsPerPCS
        Else
            ' For uneven distribution, allocate remainder to first PCS units
            If j <= panelRemainder Then
                thisPCSPanels = panelsPerPCS + 1
            Else
                thisPCSPanels = panelsPerPCS
            End If
        End If

        ' Initialize search variables for this PCS
        foundDouble = False

        ' Step A': For new side, try existing series first to avoid circuit rearrangement
        foundExistingSeries = False
        If Not isExisting Then
            ' Read existing series from row 14
            exSeries = 0
            If IsNumeric(wsIn.Cells(14, j + 1).Value) And wsIn.Cells(14, j + 1).Value <> "" Then
                exSeries = CLng(wsIn.Cells(14, j + 1).Value)
            End If

            If exSeries > 0 Then
                ' Try using existing series count
                If thisPCSPanels Mod exSeries = 0 Then
                    exCirc = thisPCSPanels \ exSeries
                    If exCirc >= 1 And exCirc <= lngMaxCirc Then
                        bestS = exSeries
                        bestC = exCirc
                        foundExistingSeries = True
                        foundSingle = True
                    End If
                End If
            End If
        End If

        ' Step A: 1 type, even distribution (only try ±1 from target)
        offsets = Array(0, 1, -1)

        If Not foundExistingSeries Then
            foundSingle = False
        End If

        If Not foundSingle Then
        For oi = 0 To UBound(offsets)
            tryS = targetSeries + CLng(offsets(oi))
            If tryS > 0 Then
                If thisPCSPanels Mod tryS = 0 Then
                    tryC = thisPCSPanels \ tryS
                    If tryC >= 1 And tryC <= lngMaxCirc Then
                        bestS = tryS
                        bestC = tryC
                        foundSingle = True
                        Exit For
                    End If
                End If
            End If
        Next oi
        End If  ' Not foundSingle

        If foundSingle Then
            ' Fill in single-type config
            fillCol = j + 1
            wsIn.Cells(seriesRow, fillCol).Value = bestS
            wsIn.Cells(collectionRow, fillCol).Value = 1
            wsIn.Cells(circuitRow, fillCol).Value = bestC
            ' Clear 2nd type
            wsIn.Cells(series2Row, fillCol).Value = ""
            wsIn.Cells(collection2Row, fillCol).Value = ""
            wsIn.Cells(circuit2Row, fillCol).Value = ""
            ' Set estimated flag
            If isExisting And estimatedRow > 0 Then
                wsIn.Cells(estimatedRow, fillCol).Value = ChrW(&H25CB)
            End If
            resultMsg = resultMsg & "PCS" & j & ": " & bestS & "直" & bestC & "回路" & vbCrLf
        Else
            ' Step B: 2 types, even distribution (s1 from target-1 to target+1)
            For s1 = targetSeries - 1 To targetSeries + 1
                If s1 <= 0 Then GoTo NextS1
                For s2 = s1 + 1 To targetSeries + 1
                    If s2 <= 0 Then GoTo NextS2
                    For c1 = 1 To lngMaxCirc - 1
                        remPanels = thisPCSPanels - s1 * c1
                        If remPanels > 0 And remPanels Mod s2 = 0 Then
                            c2 = remPanels \ s2
                            If c2 >= 1 And (c1 + c2) <= lngMaxCirc Then
                                bestS1 = s1: bestC1 = c1
                                bestS2 = s2: bestC2 = c2
                                foundDouble = True
                                GoTo Found2Type
                            End If
                        End If
                    Next c1
NextS2:
                Next s2
NextS1:
            Next s1

Found2Type:
            If foundDouble Then
                fillCol = j + 1
                wsIn.Cells(seriesRow, fillCol).Value = bestS1
                wsIn.Cells(collectionRow, fillCol).Value = 1
                wsIn.Cells(circuitRow, fillCol).Value = bestC1
                wsIn.Cells(series2Row, fillCol).Value = bestS2
                wsIn.Cells(collection2Row, fillCol).Value = 1
                wsIn.Cells(circuit2Row, fillCol).Value = bestC2
                ' Set estimated flag
                If isExisting And estimatedRow > 0 Then
                    wsIn.Cells(estimatedRow, fillCol).Value = ChrW(&H25CB)
                End If
                resultMsg = resultMsg & "PCS" & j & ": " & bestS1 & "直" & bestC1 & "回路 + " & _
                            bestS2 & "直" & bestC2 & "回路" & vbCrLf
            Else
                ' No solution found
                foundAll = False
                resultMsg = resultMsg & "PCS" & j & ": 推定できませんでした" & vbCrLf & _
                            "  (パネル" & thisPCSPanels & "枚, 目標直列" & targetSeries & _
                            ", 最大回路" & lngMaxCirc & ")" & vbCrLf
            End If
        End If
    Next j

    ' After finding result (single or double), set circuit rearrangement flag
    If Not isExisting And Not foundExistingSeries Then
        wsIn.Range("B66").Value = ChrW(&H25CB)  ' Row 66 = 回路組換 in v2
    End If

    ' Show results
    If foundAll Then
        MsgBox resultMsg & vbCrLf & "※想定として入力シートに反映しました。", vbInformation, "推定完了"
    Else
        MsgBox resultMsg & vbCrLf & "一部のPCSで推定できませんでした。", vbExclamation, "推定結果"
    End If

    Exit Sub

ErrHandler:
    MsgBox "推定中にエラーが発生しました: " & Err.Description & vbCrLf & _
           "エラー番号: " & Err.Number, vbCritical, "エラー"
End Sub
