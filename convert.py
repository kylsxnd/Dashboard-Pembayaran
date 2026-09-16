import pandas as pd
import json
import os
import math

# Pastikan nama file Excel kamu sesuai di sini
excel_file = "Monitoring QC & Administrasi Tanaman .xlsx"
xls = pd.ExcelFile(excel_file)
os.makedirs("data_json", exist_ok=True)

for sheet_name in xls.sheet_names:
    df = pd.read_excel(xls, sheet_name=sheet_name, header=None)
    
    # Bersihkan nilai NaN / NaT agar aman dari error JSON
    df = df.where(pd.notnull(df), None)
    
    raw_rows = df.values.tolist()
    rows = []
    for r in raw_rows:
        cleaned_row = []
        for val in r:
            if isinstance(val, float) and math.isnan(val):
                cleaned_row.append(None)
            else:
                cleaned_row.append(val)
        if any(v is not None for v in cleaned_row):
            rows.append(cleaned_row)
            
    file_name = sheet_name.lower().replace(' ', '_') + '.json'
    file_path = os.path.join("data_json", file_name)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump({"rows": rows}, f, ensure_ascii=False, default=str)

print("BERHASIL TOTAL! Semua sheet sukses dikonversi tanpa error.")