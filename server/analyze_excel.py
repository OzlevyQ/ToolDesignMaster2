#!/usr/bin/env python3
import sys
import os
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import base64
from io import BytesIO
import json
import numpy as np
from pathlib import Path

def generate_plot(df, column, plot_type='histogram'):
    """יוצר גרף עבור עמודה ומחזיר אותו כמחרוזת base64"""
    plt.figure(figsize=(10, 6))
    
    if plot_type == 'histogram' and pd.api.types.is_numeric_dtype(df[column]):
        sns.histplot(df[column].dropna(), kde=True)
        plt.title(f'התפלגות של {column}')
        plt.xlabel(column)
        plt.ylabel('תדירות')
    
    elif plot_type == 'barplot' and not pd.api.types.is_numeric_dtype(df[column]):
        value_counts = df[column].value_counts().head(10)
        sns.barplot(x=value_counts.index, y=value_counts.values)
        plt.title(f'הערכים השכיחים ביותר עבור {column}')
        plt.xticks(rotation=45)
        plt.ylabel('ספירה')
    
    elif plot_type == 'boxplot' and pd.api.types.is_numeric_dtype(df[column]):
        sns.boxplot(y=df[column].dropna())
        plt.title(f'תיבה של {column}')
        plt.ylabel(column)
    
    elif plot_type == 'correlation' and len(df.select_dtypes(include=[np.number]).columns) > 1:
        corr_matrix = df.select_dtypes(include=[np.number]).corr()
        sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', vmin=-1, vmax=1)
        plt.title('מטריצת מתאמים')
    
    plt.tight_layout()
    
    # שמירת הגרף כתמונת base64
    buffer = BytesIO()
    plt.savefig(buffer, format='png')
    buffer.seek(0)
    image_png = buffer.getvalue()
    buffer.close()
    plt.close()
    
    return base64.b64encode(image_png).decode('utf-8')

def summarize(df, generate_plots=True):
    """מנתח DataFrame ומחזיר סיכום מפורט וגרפים אופציונליים"""
    summaries = []
    plots = {}
    
    # מידע כללי על ה-DataFrame
    general_info = {
        "type": "text",
        "text": f"Dataset dimensions: {df.shape[0]} rows × {df.shape[1]} columns"
    }
    summaries.append(general_info)
    
    # מידע על עמודות
    for col in df.columns:
        series = df[col]
        dtype = str(series.dtype)
        missing = int(series.isna().sum())
        missing_pct = (missing / len(df)) * 100
        
        if pd.api.types.is_numeric_dtype(series):
            desc = series.describe()
            summary = {
                "type": "text",
                "text": (
                    f"Column '{col}' ({dtype}): {missing} missing ({missing_pct:.1f}%), "
                    f"mean={desc['mean']:.2f}, median={desc['50%']:.2f}, "
                    f"std={desc['std']:.2f}, min={desc['min']:.2f}, max={desc['max']:.2f}"
                )
            }
            
            if generate_plots and missing < len(df):
                # הוספת היסטוגרמה
                plots[f"{col}_histogram"] = generate_plot(df, col, 'histogram')
                # הוספת boxplot
                plots[f"{col}_boxplot"] = generate_plot(df, col, 'boxplot')
        else:
            # עבור משתנים קטגוריאליים
            top = series.value_counts().head(5).to_dict()
            top_str = ', '.join(f"{k}({v})" for k, v in top.items())
            
            summary = {
                "type": "text",
                "text": f"Column '{col}' ({dtype}): {missing} missing ({missing_pct:.1f}%), top values: {top_str}"
            }
            
            if generate_plots and missing < len(df) and len(top) > 1:
                # בר פלוט לקטגוריות
                plots[f"{col}_barplot"] = generate_plot(df, col, 'barplot')
    
        summaries.append(summary)
    
    # הוספת מטריצת מתאמים אם יש מספיק עמודות מספריות
    if generate_plots and len(df.select_dtypes(include=[np.number]).columns) > 1:
        corr_plot = generate_plot(df, None, 'correlation')
        plots["correlation_matrix"] = corr_plot
    
    # יצירת פלט עם טקסט וגרפים
    result = {
        "summaries": summaries,
        "plots": plots
    }
    
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: Missing Excel file path")
        sys.exit(1)
    
    path = sys.argv[1]
    
    try:
        # ניסיון לטעון את קובץ ה-Excel
        df = pd.read_excel(path)
        
        # ניתוח הנתונים
        analysis_result = summarize(df)
        
        # המרה ל-JSON ושליחה לפלט הסטנדרטי
        print(json.dumps(analysis_result))
        
    except Exception as e:
        error_result = {
            "error": str(e),
            "summaries": [{"type": "text", "text": f"Error analyzing Excel file: {str(e)}"}],
            "plots": {}
        }
        print(json.dumps(error_result))
        sys.exit(1)