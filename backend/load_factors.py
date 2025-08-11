import csv
import sys

def generate_sql_insert_statements():
    """
    Reads the scope_3.csv file and generates SQL INSERT statements
    to populate the emission_factors table.
    """
    csv_file_path = 'defra_factors_2025_v2/scope_3.csv'

    try:
        with open(csv_file_path, mode='r', encoding='utf-8-sig') as infile:
            reader = csv.DictReader(infile)

            print("-- SQL INSERT statements for emission_factors table")

            for row in reader:
                factor_id = row.get('ID', '').replace("'", "''")
                scope = row.get('Scope', '').replace("'", "''")
                level_1 = row.get('Level 1', '').replace("'", "''")
                level_2 = row.get('Level 2', '').replace("'", "''")
                level_3 = row.get('Level 3', '').replace("'", "''")
                level_4 = row.get('Level 4', '').replace("'", "''")
                uom = row.get('UOM', '').replace("'", "''")
                ghg_unit = row.get('GHG/Unit', '').replace("'", "''")

                conversion_factor_str = row.get('GHG Conversion Factor 2025')

                if conversion_factor_str and conversion_factor_str.strip():
                    try:
                        conversion_factor = float(conversion_factor_str)
                    except (ValueError, TypeError):
                        conversion_factor = 'NULL'
                else:
                    conversion_factor = 'NULL'

                sql_statement = f"""
                INSERT INTO emission_factors (factor_id, scope, level_1, level_2, level_3, level_4, uom, ghg_unit, conversion_factor)
                VALUES ('{factor_id}', '{scope}', '{level_1}', '{level_2}', '{level_3}', '{level_4}', '{uom}', '{ghg_unit}', {conversion_factor});
                """
                print(sql_statement.strip())

    except FileNotFoundError:
        print(f"Error: The file {csv_file_path} was not found.", file=sys.stderr)
    except Exception as e:
        print(f"An error occurred: {e}", file=sys.stderr)

if __name__ == "__main__":
    generate_sql_insert_statements()
