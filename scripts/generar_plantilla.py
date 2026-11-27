"""Genera plantillas/plantilla-importacion.xlsx con la hoja de alumnos e instrucciones."""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.datavalidation import DataValidation

COLUMNAS = [
    ("grado", "Número de grado: 1 a 6 en primaria, 1 a 3 en secundaria", 8),
    ("grupo", "Letra o nombre del grupo, por ejemplo A", 8),
    ("nombre", "Nombre(s) del alumno", 18),
    ("apellido_paterno", "Apellido paterno", 18),
    ("apellido_materno", "Apellido materno (opcional)", 18),
    ("tutor1_nombre", "Nombre completo del primer tutor", 26),
    ("tutor1_correo", "Correo del primer tutor; ahí llega la invitación", 28),
    ("tutor1_parentesco", "madre, padre o tutor", 14),
    ("tutor2_nombre", "Segundo tutor (opcional)", 26),
    ("tutor2_correo", "Correo del segundo tutor (opcional)", 28),
    ("tutor2_parentesco", "madre, padre o tutor (opcional)", 14),
]

wb = Workbook()
ws = wb.active
ws.title = "alumnos"
header_fill = PatternFill("solid", fgColor="1F4E79")
for i, (col, _, width) in enumerate(COLUMNAS, start=1):
    c = ws.cell(row=1, column=i, value=col)
    c.font = Font(bold=True, color="FFFFFF")
    c.fill = header_fill
    c.alignment = Alignment(horizontal="center")
    ws.column_dimensions[c.column_letter].width = width

ejemplos = [
    [3, "A", "Sofía", "Ramírez", "López", "Laura López Díaz", "laura.lopez@ejemplo.com", "madre", "Jorge Ramírez Soto", "jorge.ramirez@ejemplo.com", "padre"],
    [3, "A", "Mateo", "Hernández", "", "Ana Torres Ruiz", "ana.torres@ejemplo.com", "madre", "", "", ""],
]
for r in ejemplos:
    ws.append(r)
ws.freeze_panes = "A2"

dv = DataValidation(type="list", formula1='"madre,padre,tutor"', allow_blank=True)
ws.add_data_validation(dv)
dv.add("H2:H2000")
dv.add("K2:K2000")
dv_grado = DataValidation(type="whole", operator="between", formula1="1", formula2="6", allow_blank=False)
ws.add_data_validation(dv_grado)
dv_grado.add("A2:A2000")

ins = wb.create_sheet("instrucciones")
ins.column_dimensions["A"].width = 22
ins.column_dimensions["B"].width = 70
ins.append(["Cómo llenar esta plantilla"])
ins["A1"].font = Font(bold=True, size=14)
ins.append([])
pasos = [
    "1. Una fila por alumno en la hoja 'alumnos'. Borre las dos filas de ejemplo.",
    "2. No cambie los nombres de las columnas de la primera fila.",
    "3. Si un alumno tiene dos tutores, llene también las columnas tutor2.",
    "4. Si dos hermanos tienen el mismo tutor, repita el mismo correo: se crea una sola cuenta.",
    "5. Guarde como .xlsx y súbalo en Configuración > Importar Excel. Verá una vista previa antes de guardar.",
    "6. Si vuelve a subir el archivo corregido, no se duplican alumnos.",
]
for p in pasos:
    ins.append([p])
ins.append([])
ins.append(["Columna", "Qué poner"])
ins.cell(row=ins.max_row, column=1).font = Font(bold=True)
ins.cell(row=ins.max_row, column=2).font = Font(bold=True)
for col, desc, _ in COLUMNAS:
    ins.append([col, desc])

wb.save("plantillas/plantilla-importacion.xlsx")
print("ok")
