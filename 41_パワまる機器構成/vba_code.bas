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
' Vertical layout: existing top (rows 1-25), new bottom (rows 28-52)
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
    Dim newStartRow As Long: newStartRow = 29
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

    ' Title row 28
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

    Dim fc As Long  ' font color
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

    ' Row offsets (0-based from startRow)
    Const oTitle As Long = 0     ' Row 1
    Const oPCS As Long = 3       ' Row 4
    Const oPanel As Long = 5     ' Row 6
    Const oStr1 As Long = 6      ' Row 7
    Const oStr2 As Long = 7       ' Row 8
    Const oPanelTotal As Long = 8  ' Row 9  -- NEW
    Const oNote1 As Long = 9      ' Row 10
    Const oNote2 As Long = 10     ' Row 11
    Const oMfr As Long = 11       ' Row 12
    Const oModel As Long = 12     ' Row 13
    Const oCap As Long = 13       ' Row 14
    Const oCableNote As Long = 14  ' Row 15
    Const oCable1 As Long = 15    ' Row 16
    Const oBrkType As Long = 16   ' Row 17
    Const oBrkCap As Long = 17    ' Row 18
    Const oSens As Long = 18      ' Row 19
    Const oCableNote2 As Long = 19 ' Row 20
    Const oCable2 As Long = 20    ' Row 21
    Const oAggBrk As Long = 21    ' Row 22
    Const oAggCap As Long = 22    ' Row 23
    Const oAggSens As Long = 23   ' Row 24
    Const oReuse As Long = 24     ' Row 25
    Const oMain As Long = 25      ' Row 26

    ' ---- Labels in label column ----
    Dim sideLabel As String
    If isNew Then sideLabel = "【新設側】" Else sideLabel = "【既設側】"

    SetCellValue ws, startRow + oPCS, labelCol, sideLabel, fc, True
    SetCellValue ws, startRow + oPanel, labelCol, "パネル型番", fc
    SetCellValue ws, startRow + oStr1, labelCol, "ストリング構成", fc
    SetCellValue ws, startRow + oStr2, labelCol, "", fc
    SetCellValue ws, startRow + oPanelTotal, labelCol, "合計枚数", fc
    SetCellValue ws, startRow + oNote1, labelCol, "", fc
    SetCellValue ws, startRow + oNote2, labelCol, "", fc
    SetCellValue ws, startRow + oMfr, labelCol, "PCSメーカー", fc
    SetCellValue ws, startRow + oModel, labelCol, "PCS型番", fc
    SetCellValue ws, startRow + oCap, labelCol, "PCS容量", fc
    SetCellValue ws, startRow + oCableNote, labelCol, "", fc
    SetCellValue ws, startRow + oCable1, labelCol, "ケーブル", fc
    SetCellValue ws, startRow + oBrkType, labelCol, "ブレーカ種類", fc
    SetCellValue ws, startRow + oBrkCap, labelCol, "ブレーカ容量", fc
    SetCellValue ws, startRow + oSens, labelCol, "感度電流", fc
    SetCellValue ws, startRow + oCableNote2, labelCol, "", fc
    SetCellValue ws, startRow + oCable2, labelCol, "ケーブル(集電盤)", fc
    SetCellValue ws, startRow + oAggBrk, labelCol, "集電盤ブレーカ種類", fc
    SetCellValue ws, startRow + oAggCap, labelCol, "集電盤ブレーカ容量", fc
    SetCellValue ws, startRow + oAggSens, labelCol, "集電盤感度電流", fc
    SetCellValue ws, startRow + oReuse, labelCol, "", fc
    SetCellValue ws, startRow + oMain, labelCol, "幹線ケーブル", fc

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

    ' ---- Data columns ----
    Dim idx As Long
    For idx = 1 To pcsCount
        Dim dc As Long
        dc = dataStartCol + (idx - 1) * 2  ' data column for this PCS

        ' Row 4: PCS number
        If idx = 1 Then
            SetCellValue ws, startRow + oPCS, dc, 1, fc, False, """PCS""0"
        Else
            ' Formula: =prev+1
            ws.Cells(startRow + oPCS, dc).Formula = "=" & _
                ws.Cells(startRow + oPCS, dataStartCol + (idx - 2) * 2).Address(False, False) & "+1"
            ws.Cells(startRow + oPCS, dc).NumberFormat = """PCS""0"
            ws.Cells(startRow + oPCS, dc).Font.Color = fc
        End If

        ' Row 6: Panel model
        SetCellValue ws, startRow + oPanel, dc, panelModel(idx), fc

        ' Row 7-8: String config
        Dim strCfg1 As String
        strCfg1 = BuildStringConfig(series(idx), collection(idx), circuit(idx))

        ' Check if 2nd type exists
        Dim has2ndType As Boolean
        has2ndType = (series2(idx) <> "")

        If has2ndType Then
            ' Two-type config: line 1 = first type, line 2 = second type
            SetCellValue ws, startRow + oStr1, dc, strCfg1, fc
            Dim strCfg2 As String
            strCfg2 = BuildStringConfig(series2(idx), collection2(idx), circuit2(idx))
            SetCellValue ws, startRow + oStr2, dc, strCfg2, fc
        Else
            ' Single-type config
            SetCellValue ws, startRow + oStr1, dc, strCfg1, fc
            ' oStr2: show estimated label if applicable
            If Not isNew And estimated(idx) = ChrW(&H25CB) Then
                ' Estimated label is handled via the label column below
            End If
        End If

        ' Yellow background for estimated values
        If Not isNew And estimated(idx) = ChrW(&H25CB) Then
            ws.Cells(startRow + oStr1, dc).Interior.Color = COLOR_YELLOW
            ws.Cells(startRow + oStr2, dc).Interior.Color = COLOR_YELLOW
        End If

        ' Set estimated label in label column (only once, not per-PCS)
        If Not isNew And hasEstimated And idx = 1 Then
            SetCellValue ws, startRow + oStr2, labelCol, ChrW(&H203B) & "想定", fc
        End If

        ' Row: Panel total count
        Dim totalPanels As Long
        totalPanels = 0
        If IsNumeric(series(idx)) And series(idx) <> "" And IsNumeric(circuit(idx)) And circuit(idx) <> "" Then
            totalPanels = CLng(series(idx)) * CLng(circuit(idx))
        End If
        If IsNumeric(series2(idx)) And series2(idx) <> "" And IsNumeric(circuit2(idx)) And circuit2(idx) <> "" Then
            totalPanels = totalPanels + CLng(series2(idx)) * CLng(circuit2(idx))
        End If
        If totalPanels > 0 Then
            SetCellValue ws, startRow + oPanelTotal, dc, totalPanels & "枚", fc
        End If

        ' Row: Note1 - circuit rearrangement (new side only)
        If isNew And mCircuitRearrange Then
            SetCellValue ws, startRow + oNote1, dc, "回路組換", fc
        End If

        ' Row 10: Note2 - DC extension (new side only)
        If isNew And mDCExtension Then
            SetCellValue ws, startRow + oNote2, dc, "直流線延長", fc
        End If

        ' Row 11: PCS manufacturer (blank for manual entry)
        SetCellValue ws, startRow + oMfr, dc, "", fc

        ' Row 12: PCS model
        SetCellValue ws, startRow + oModel, dc, pcsModel(idx), fc

        ' Row 13: PCS capacity (e.g., "3Φ 20kW")
        Dim capText As String: capText = ""
        If pcsMethod(idx) <> "" And pcsCapacity(idx) <> "" Then
            Dim phaseSymbol As String
            Select Case pcsMethod(idx)
                Case "三相": phaseSymbol = "3" & ChrW(&H3A6)
                Case "単相": phaseSymbol = "1" & ChrW(&H3A6)
                Case Else: phaseSymbol = pcsMethod(idx)
            End Select
            capText = phaseSymbol & " " & pcsCapacity(idx) & "kW"
        End If
        SetCellValue ws, startRow + oCap, dc, capText, fc

        ' Row 14: Cable note (new side only)
        If isNew And mCableReplace Then
            SetCellValue ws, startRow + oCableNote, dc, "ケーブル張替え", fc
        End If

        ' Row 15: Cable type tier 1
        SetCellValue ws, startRow + oCable1, dc, cableTier1(idx), fc

        ' Row 16: Breaker type
        SetCellValue ws, startRow + oBrkType, dc, breakerType(idx), fc

        ' Row 17: Breaker capacity
        If breakerCap(idx) <> "" Then
            SetCellValue ws, startRow + oBrkCap, dc, CLng(breakerCap(idx)), fc, False, "0""A"""
        End If

        ' Row 18: Sensitivity current (conditional)
        If sensitivity(idx) <> "" Then
            SetCellValue ws, startRow + oSens, dc, CLng(sensitivity(idx)), fc, False, "0""mA"""
        End If

        ' Row 19: Cable note tier 2 (new side only)
        If isNew And mCableReplace Then
            SetCellValue ws, startRow + oCableNote2, dc, "ケーブル張替え", fc
        End If

        ' Rows 20-23: Aggregate (same for all PCS, only show in first column)
        If idx = 1 Then
            SetCellValue ws, startRow + oCable2, dc, cableTier2, fc
            SetCellValue ws, startRow + oAggBrk, dc, aggBrkType, fc
            If aggBrkCap <> "" Then
                SetCellValue ws, startRow + oAggCap, dc, CLng(aggBrkCap), fc, False, "0""A"""
            End If
            If aggSens <> "" Then
                SetCellValue ws, startRow + oAggSens, dc, CLng(aggSens), fc, False, "0""mA"""
            End If

            ' Row 24: Reuse note (new side only)
            If isNew Then
                If mReuseMemo <> "" Then
                    SetCellValue ws, startRow + oReuse, dc, mReuseMemo, fc
                Else
                    SetCellValue ws, startRow + oReuse, dc, "そのまま流用", fc
                End If
            End If

            ' Row 25: Main cable
            SetCellValue ws, startRow + oMain, dc, mainCable, fc

            ' Place aggregate data at center PCS column (no merge)
            ' Value is already set in first column (idx=1 block above)
            ' Move value to center column if multiple PCS
            If pcsCount > 1 Then
                Dim centerIdx As Long
                centerIdx = (pcsCount + 1) \ 2  ' center PCS index (1-based)
                Dim centerDC As Long
                centerDC = dataStartCol + (centerIdx - 1) * 2

                If centerDC <> dc Then  ' dc is first column
                    Dim aggRows As Variant
                    aggRows = Array(oCable2, oAggBrk, oAggCap, oAggSens, oReuse, oMain)
                    Dim ar As Long
                    For ar = 0 To UBound(aggRows)
                        ' Move value from first to center
                        ws.Cells(startRow + aggRows(ar), centerDC).Value = ws.Cells(startRow + aggRows(ar), dc).Value
                        ws.Cells(startRow + aggRows(ar), centerDC).Font.Color = fc
                        ws.Cells(startRow + aggRows(ar), centerDC).Font.Name = FONT_NAME
                        ws.Cells(startRow + aggRows(ar), centerDC).Font.Size = FONT_SIZE
                        ws.Cells(startRow + aggRows(ar), centerDC).HorizontalAlignment = xlCenter
                        ws.Cells(startRow + aggRows(ar), centerDC).ShrinkToFit = True
                        ws.Cells(startRow + aggRows(ar), centerDC).NumberFormat = ws.Cells(startRow + aggRows(ar), dc).NumberFormat
                        ' Clear first column
                        ws.Cells(startRow + aggRows(ar), dc).Value = ""
                    Next ar
                End If

                ' Apply border around collection breaker block (rows 22-24)
                Dim firstDC As Long: firstDC = dataStartCol
                Dim lastDC As Long: lastDC = dataStartCol + (pcsCount - 1) * 2
                ApplyBlockBorder ws, startRow + oAggBrk, firstDC, startRow + oAggSens, lastDC, borderColor
            End If
        End If

        ' ---- Borders around individual blocks (not one big border) ----
        ' Panel block: rows 6-9 (oPanel to oPanelTotal)
        ApplyBlockBorder ws, startRow + oPanel, dc, startRow + oPanelTotal, dc, borderColor
        ' PCS block: rows 12-14 (oMfr to oCap)
        ApplyBlockBorder ws, startRow + oMfr, dc, startRow + oCap, dc, borderColor
        ' Breaker block: rows 17-19 (oBrkType to oSens)
        ApplyBlockBorder ws, startRow + oBrkType, dc, startRow + oSens, dc, borderColor

    Next idx

    ' Setup dropdowns
    SetupDropdowns ws, startRow, dataStartCol, pcsCount

    ' Draw cable lines
    DrawCableLines ws, startRow, labelCol, dataStartCol, pcsCount, fc
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
                           dataStartCol As Long, pcsCount As Long, lineColor As Long)

    Const oPanelTotal As Long = 8  ' Row 9
    Const oMfr As Long = 11       ' Row 12
    Const oCableNote As Long = 14  ' Row 15
    Const oBrkType As Long = 16  ' Row 17
    Const oSens As Long = 18     ' Row 19
    Const oCable2 As Long = 20   ' Row 21
    Const oAggBrk As Long = 21   ' Row 22

    Dim idx As Long
    For idx = 1 To pcsCount
        Dim dc As Long
        dc = dataStartCol + (idx - 1) * 2

        ' DC vertical line: panel block bottom (row 9) to PCS block top (row 12)
        Dim rPanelBot As Range, rPCSTop As Range
        Set rPanelBot = ws.Cells(startRow + oPanelTotal, dc)
        Set rPCSTop = ws.Cells(startRow + oMfr, dc)

        Dim xDC As Double, yDC1 As Double, yDC2 As Double
        xDC = rPanelBot.Left + rPanelBot.Width / 2
        yDC1 = rPanelBot.Top + rPanelBot.Height
        yDC2 = rPCSTop.Top

        If yDC2 > yDC1 Then
            Dim lnDC As Shape
            Set lnDC = ws.Shapes.AddLine(xDC, yDC1, xDC, yDC2)
            With lnDC.Line
                .ForeColor.RGB = lineColor
                .Weight = 1
            End With
        End If

        ' Vertical line: PCS block bottom (row 14) to breaker cable note (row 15)
        ' then cable (row 16) to breaker block top (row 17)
        Dim rCapBot As Range, rCableNote As Range
        Set rCapBot = ws.Cells(startRow + oCableNote, dc)
        Set rCableNote = ws.Cells(startRow + oBrkType, dc)

        Dim xCN As Double, yCN1 As Double, yCN2 As Double
        xCN = rCapBot.Left + rCapBot.Width / 2
        yCN1 = rCapBot.Top
        yCN2 = rCableNote.Top

        If yCN2 > yCN1 Then
            Dim lnCN As Shape
            Set lnCN = ws.Shapes.AddLine(xCN, yCN1, xCN, yCN2)
            With lnCN.Line
                .ForeColor.RGB = lineColor
                .Weight = 1
            End With
        End If

        ' Vertical line: breaker block bottom (oSens row 19) to cable2 row (row 21)
        ' For single PCS, draw direct line; for multi-PCS, bus logic handles this
        If pcsCount = 1 Then
            Dim rSensBot As Range, rCable2Top As Range
            Set rSensBot = ws.Cells(startRow + oSens, dc)
            Set rCable2Top = ws.Cells(startRow + oCable2, dc)

            Dim xSB As Double, ySB1 As Double, ySB2 As Double
            xSB = rSensBot.Left + rSensBot.Width / 2
            ySB1 = rSensBot.Top + rSensBot.Height
            ySB2 = rCable2Top.Top

            If ySB2 > ySB1 Then
                Dim lnSB As Shape
                Set lnSB = ws.Shapes.AddLine(xSB, ySB1, xSB, ySB2)
                With lnSB.Line
                    .ForeColor.RGB = lineColor
                    .Weight = 1
                End With
            End If
        End If

        ' Line between cable tier 2 and aggregate breaker
        ' Use center column instead of first column
        If idx = 1 Then
            Dim centerIdx2 As Long
            centerIdx2 = (pcsCount + 1) \ 2
            Dim centerDC2 As Long
            centerDC2 = dataStartCol + (centerIdx2 - 1) * 2

            Dim r1 As Range, r2 As Range
            Set r1 = ws.Cells(startRow + oCable2, centerDC2)
            Set r2 = ws.Cells(startRow + oAggBrk, centerDC2)

            Dim x1 As Double, y1 As Double, y2 As Double
            x1 = r1.Left + r1.Width / 2
            y1 = r1.Top + r1.Height
            y2 = r2.Top

            If y2 > y1 Then
                Dim ln2 As Shape
                Set ln2 = ws.Shapes.AddLine(x1, y1, x1, y2)
                With ln2.Line
                    .ForeColor.RGB = lineColor
                    .Weight = 1
                End With
            End If
        End If
    Next idx

    ' Draw horizontal bus line connecting all PCS to aggregate panel
    If pcsCount > 1 Then
        ' Vertical lines from each PCS sensitivity row bottom to bus line
        Dim busY As Double
        Dim firstR As Range, lastR As Range
        Set firstR = ws.Cells(startRow + 18, dataStartCol)  ' oSens row
        Set lastR = ws.Cells(startRow + 20, dataStartCol)   ' oCable2 row
        busY = firstR.Top + firstR.Height + (lastR.Top - firstR.Top - firstR.Height) / 2

        ' Center column for aggregate
        Dim centerPCSIdx As Long
        centerPCSIdx = (pcsCount + 1) \ 2
        Dim centerPCSDC As Long
        centerPCSDC = dataStartCol + (centerPCSIdx - 1) * 2

        Dim busIdx As Long
        For busIdx = 1 To pcsCount
            Dim busDC As Long
            busDC = dataStartCol + (busIdx - 1) * 2

            Dim busR As Range
            Set busR = ws.Cells(startRow + 18, busDC)  ' oSens
            Dim bx As Double
            bx = busR.Left + busR.Width / 2
            Dim by1 As Double
            by1 = busR.Top + busR.Height

            ' Vertical line from PCS sens bottom to bus
            Dim lnBus As Shape
            Set lnBus = ws.Shapes.AddLine(bx, by1, bx, busY)
            With lnBus.Line
                .ForeColor.RGB = lineColor
                .Weight = 1
            End With
        Next busIdx

        ' Horizontal bus line
        Dim hx1 As Double, hx2 As Double
        Dim firstBusR As Range, lastBusR As Range
        Set firstBusR = ws.Cells(startRow + 18, dataStartCol)
        Set lastBusR = ws.Cells(startRow + 18, dataStartCol + (pcsCount - 1) * 2)
        hx1 = firstBusR.Left + firstBusR.Width / 2
        hx2 = lastBusR.Left + lastBusR.Width / 2

        Dim lnHBus As Shape
        Set lnHBus = ws.Shapes.AddLine(hx1, busY, hx2, busY)
        With lnHBus.Line
            .ForeColor.RGB = lineColor
            .Weight = 1
        End With

        ' Vertical line from bus center down to aggregate cable row
        Dim centerBusR As Range
        Set centerBusR = ws.Cells(startRow + 18, centerPCSDC)
        Dim cx As Double
        cx = centerBusR.Left + centerBusR.Width / 2

        Dim aggCableR As Range
        Set aggCableR = ws.Cells(startRow + 20, centerPCSDC)  ' oCable2
        Dim cy2 As Double
        cy2 = aggCableR.Top

        Dim lnCenter As Shape
        Set lnCenter = ws.Shapes.AddLine(cx, busY, cx, cy2)
        With lnCenter.Line
            .ForeColor.RGB = lineColor
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
    Const oCable2 As Long = 20   ' Row 21
    Const oAggBrk As Long = 21   ' Row 22
    Const oAggCap As Long = 22   ' Row 23
    Const oAggSens As Long = 23  ' Row 24
    Const oMain As Long = 25     ' Row 26

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

    Dim edge As Variant
    Dim edges As Variant
    edges = Array(xlEdgeLeft, xlEdgeTop, xlEdgeBottom, xlEdgeRight, _
                  xlInsideVertical, xlInsideHorizontal)

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
Public Sub EstimateStringConfig()
    On Error GoTo ErrHandler

    ' Show UserForm for side selection
    Dim frm As frmEstimateSide
    Set frm = New frmEstimateSide
    frm.Show
    Dim sideResult As String
    sideResult = frm.gEstimateSide
    Unload frm

    If sideResult = "cancel" Then Exit Sub
    Dim isExisting As Boolean
    isExisting = (sideResult = "existing")

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

    For j = 1 To pcsCount
        Dim vmp As Double
        Dim ratedV As Variant
        Dim maxCirc As Variant

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
            wsPCS.Range("A:G"), 6, False)
        If Err.Number <> 0 Then
            On Error GoTo 0
            MsgBox "PCS型番「" & pcsModels(j) & "」が" & pcsSheetName & "シートに見つかりません。", vbExclamation, "エラー"
            Exit Sub
        End If
        On Error GoTo 0

        On Error Resume Next
        maxCirc = Application.WorksheetFunction.VLookup(pcsModels(j), _
            wsPCS.Range("A:G"), 7, False)
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

        Dim dblRatedV As Double: dblRatedV = CDbl(ratedV)
        Dim lngMaxCirc As Long: lngMaxCirc = CLng(maxCirc)

        ' Calculate target series
        Dim targetSeries As Long
        targetSeries = CLng(dblRatedV / vmp + 0.5)  ' Round

        ' Determine panels for this PCS
        Dim thisPCSPanels As Long
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

        ' Variable declarations for series/circuit search (must be before Step A')
        Dim foundSingle As Boolean
        Dim foundDouble As Boolean: foundDouble = False
        Dim bestS As Long, bestC As Long
        Dim bestS1 As Long, bestC1 As Long, bestS2 As Long, bestC2 As Long
        Dim offset As Long
        Dim offsets As Variant

        ' Step A': For new side, try existing series first to avoid circuit rearrangement
        Dim foundExistingSeries As Boolean: foundExistingSeries = False
        If Not isExisting Then
            ' Read existing series from row 14
            Dim exSeries As Long
            exSeries = 0
            If IsNumeric(wsIn.Cells(14, j + 1).Value) And wsIn.Cells(14, j + 1).Value <> "" Then
                exSeries = CLng(wsIn.Cells(14, j + 1).Value)
            End If

            If exSeries > 0 Then
                ' Try using existing series count
                If thisPCSPanels Mod exSeries = 0 Then
                    Dim exCirc As Long
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

        ' Step A: 1 type, even distribution
        offsets = Array(0, 1, -1, 2, -2)

        If Not foundExistingSeries Then
            foundSingle = False
        End If

        Dim oi As Long
        If Not foundSingle Then
        For oi = 0 To UBound(offsets)
            Dim tryS As Long
            tryS = targetSeries + CLng(offsets(oi))
            If tryS > 0 Then
                If thisPCSPanels Mod tryS = 0 Then
                    Dim tryC As Long
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
            Dim fillCol As Long
            fillCol = j + 1
            wsIn.Cells(seriesRow, fillCol).Value = bestS
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
            ' Step B: 2 types, even distribution
            Dim s1 As Long, s2 As Long, c1 As Long
            For s1 = targetSeries - 2 To targetSeries + 2
                If s1 <= 0 Then GoTo NextS1
                For s2 = s1 + 1 To targetSeries + 2
                    If s2 <= 0 Then GoTo NextS2
                    For c1 = 1 To lngMaxCirc - 1
                        Dim remPanels As Long
                        remPanels = thisPCSPanels - s1 * c1
                        If remPanels > 0 And remPanels Mod s2 = 0 Then
                            Dim c2 As Long
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
                wsIn.Cells(circuitRow, fillCol).Value = bestC1
                wsIn.Cells(series2Row, fillCol).Value = bestS2
                wsIn.Cells(circuit2Row, fillCol).Value = bestC2
                ' Clear collection rows
                wsIn.Cells(collectionRow, fillCol).Value = ""
                wsIn.Cells(collection2Row, fillCol).Value = ""
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
