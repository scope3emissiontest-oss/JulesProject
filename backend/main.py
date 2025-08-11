import os
import time
import json
from threading import Thread
from flask import Flask, request, jsonify
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Initialize Supabase client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

# A placeholder for the Supabase client
supabase: Client = None

if supabase_url and supabase_key:
    try:
        supabase = create_client(supabase_url, supabase_key)
    except Exception as e:
        print(f"Failed to create Supabase client: {e}")
        # In a real app, you might want to handle this more gracefully
        pass

def simulate_gpt_call(file_content: bytes) -> dict:
    """
    Simulates a call to a GPT model to extract data from a document.
    In a real application, this function would contain the logic to call
    a GPT model (e.g., OpenAI's API) with a specific prompt.
    """
    print("Simulating GPT call...")
    # Simulate a delay to represent the time it takes for the AI to process the document
    time.sleep(5)

    # Dummy response for an invoice
    dummy_invoice_data = {
        "items": [
            {"description": "Business Travel - Flight", "quantity": 1, "unit": "passenger.km", "cost": 500.00},
            {"description": "Hotel Stay - 2 nights", "quantity": 2, "unit": "nights", "cost": 300.00}
        ],
        "total_amount": 800.00
    }

    print("GPT simulation complete.")
    return dummy_invoice_data

def calculate_emissions(document_id, table_name):
    """
    Calculates the emissions for a given document.
    """
    print(f"Calculating emissions for document: {document_id}")
    try:
        # This is a work around for the sandbox since it doesn't have a running event loop
        if supabase is None:
            local_supabase_url = os.environ.get("SUPABASE_URL")
            local_supabase_key = os.environ.get("SUPABASE_KEY")
            local_supabase: Client = create_client(local_supabase_url, local_supabase_key)
        else:
            local_supabase = supabase

        # 1. Fetch the extracted data from the document
        doc_response = local_supabase.table(table_name).select("extracted_data, user_id").eq("id", document_id).single().execute()

        if not doc_response.data:
            print(f"Error: Document with id {document_id} not found.")
            return

        extracted_data = doc_response.data.get('extracted_data')
        user_id = doc_response.data.get('user_id')

        if not extracted_data or 'items' not in extracted_data:
            print(f"Error: No items found in extracted data for document {document_id}")
            return

        for item in extracted_data['items']:
            description = item.get('description')
            quantity = item.get('quantity')
            unit = item.get('unit')

            if not description or not quantity or not unit:
                print(f"Skipping item due to missing data: {item}")
                continue

            # 2. Find a matching emission factor
            # This is a simplified matching logic. A more sophisticated approach
            # would be needed for a real application.
            # We will try to find a factor where level_1, level_2, level_3 or level_4 contains the description

            # For simplicity, we'll just use a LIKE query on level_3
            ef_response = local_supabase.table("emission_factors").select("*").ilike('level_3', f'%{description.split(" - ")[-1].strip()}%').eq('uom', unit).execute()

            if not ef_response.data:
                print(f"No emission factor found for: {description} with unit {unit}")
                continue

            # 3. Perform the calculation
            emission_factor = ef_response.data[0]
            conversion_factor = emission_factor.get('conversion_factor')

            if conversion_factor is None:
                print(f"Skipping calculation for {description} due to missing conversion factor.")
                continue

            co2e_emissions = float(quantity) * float(conversion_factor)

            # 4. Save the calculation results
            calculation_data = {
                "invoice_id": document_id if table_name == 'invoices' else None,
                "financial_statement_id": document_id if table_name == 'financial_statements' else None,
                "user_id": user_id,
                "emission_factor_id": emission_factor['id'],
                "activity_data": quantity,
                "co2e_emissions": co2e_emissions
            }

            insert_res = local_supabase.table("emission_calculations").insert(calculation_data).execute()

            if len(insert_res.data) == 0:
                 print(f"Failed to insert emission calculation for item: {description}")
            else:
                print(f"Saved emission calculation for item: {description}")

    except Exception as e:
        print(f"An error occurred during emissions calculation: {e}")

def process_document(file_path, document_id, table_name):
    """
    Processes the uploaded document.
    """
    print(f"Processing document: {file_path}")
    try:
        # This is a work around for the sandbox since it doesn't have a running event loop
        if supabase is None:
            local_supabase_url = os.environ.get("SUPABASE_URL")
            local_supabase_key = os.environ.get("SUPABASE_KEY")
            local_supabase: Client = create_client(local_supabase_url, local_supabase_key)
        else:
            local_supabase = supabase

        # Download the file from Supabase Storage
        file_content = local_supabase.storage.from_("documents").download(file_path)

        # Extract data using the simulated GPT call
        extracted_data = simulate_gpt_call(file_content)

        # Update the database with the extracted data
        data, error = local_supabase.table(table_name).update({
            "extracted_data": extracted_data,
            "status": "processing_emissions"
        }).eq("id", document_id).execute()

        if error:
            print(f"Error updating document {document_id}: {error}")
            local_supabase.table(table_name).update({"status": "failed"}).eq("id", document_id).execute()
            return

        # Calculate emissions
        calculate_emissions(document_id, table_name)

        # Update status to completed
        local_supabase.table(table_name).update({"status": "completed"}).eq("id", document_id).execute()

        print(f"Document {document_id} processed successfully.")

    except Exception as e:
        print(f"An error occurred during document processing: {e}")
        if supabase:
            supabase.table(table_name).update({"status": "failed"}).eq("id", document_id).execute()


@app.route("/upload", methods=["POST"])
def upload_file():
    if not supabase:
        return jsonify({"error": "Supabase client not initialized. Check your .env file."}), 500

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file:
        try:
            # For the purpose of this example, we'll assume the user is authenticated
            # and we have the user's ID. In a real application, you would get the
            # user ID from the session or a JWT.
            # This is a placeholder and should be replaced with actual user management.
            user_id = "8f8b8f8f-8f8f-8f8f-8f8f-8f8f8f8f8f8f"

            # Read the file content and reset the pointer
            file_content = file.read()
            file.seek(0)

            file_path_in_storage = f"{user_id}/{file.filename}"

            # The bucket name is 'documents'
            # The user will need to create a bucket named 'documents' in their Supabase project.
            supabase.storage.from_("documents").upload(file_path_in_storage, file_content)

            # Save file metadata to the database
            document_type = request.form.get('type', 'invoice') # 'invoice' or 'financial_statement'

            table_name = "invoices" if document_type == 'invoice' else "financial_statements"

            insert_response = supabase.table(table_name).insert({
                "user_id": user_id,
                "file_path": file_path_in_storage,
                "status": "processing"
            }).execute()

            if len(insert_response.data) == 0:
                return jsonify({"error": "Failed to insert document metadata."}), 500

            # Get the ID of the inserted document
            document_id = insert_response.data[0]['id']

            # Start a new thread to process the document
            thread = Thread(target=process_document, args=(file_path_in_storage, document_id, table_name))
            thread.start()

            return jsonify({"message": "File upload accepted for processing.", "document_id": document_id}), 202

        except Exception as e:
            # It's good practice to log the exception
            print(f"An error occurred during file upload: {e}")
            return jsonify({"error": "An internal error occurred."}), 500

# --- Invoice Management ---
@app.route("/invoices", methods=["GET"])
def get_invoices():
    if not supabase:
        return jsonify({"error": "Supabase client not initialized."}), 500

    # In a real app, get user_id from auth context
    user_id = "8f8b8f8f-8f8f-8f8f-8f8f-8f8f8f8f8f8f"

    try:
        data, error = supabase.table("invoices").select("*").eq("user_id", user_id).execute()
        if error:
            return jsonify({"error": str(error)}), 500
        return jsonify(data.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/invoices/<uuid:invoice_id>", methods=["GET"])
def get_invoice(invoice_id):
    if not supabase:
        return jsonify({"error": "Supabase client not initialized."}), 500

    try:
        data, error = supabase.table("invoices").select("*").eq("id", str(invoice_id)).single().execute()
        if error:
            return jsonify({"error": str(error)}), 500
        if not data.data:
            return jsonify({"error": "Invoice not found"}), 404
        return jsonify(data.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/invoices/<uuid:invoice_id>", methods=["PUT"])
def update_invoice(invoice_id):
    if not supabase:
        return jsonify({"error": "Supabase client not initialized."}), 500

    try:
        req_data = request.get_json()
        data, error = supabase.table("invoices").update(req_data).eq("id", str(invoice_id)).execute()
        if error:
            return jsonify({"error": str(error)}), 500
        return jsonify(data.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/invoices/<uuid:invoice_id>", methods=["DELETE"])
def delete_invoice(invoice_id):
    if not supabase:
        return jsonify({"error": "Supabase client not initialized."}), 500

    try:
        # Also need to delete the file from storage
        # First, get the file path
        data, error = supabase.table("invoices").select("file_path").eq("id", str(invoice_id)).single().execute()
        if data.data:
            file_path = data.data['file_path']
            supabase.storage.from_("documents").remove([file_path])

        # Then delete the record from the database
        data, error = supabase.table("invoices").delete().eq("id", str(invoice_id)).execute()
        if error:
            return jsonify({"error": str(error)}), 500
        return jsonify({"message": "Invoice deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- Financial Statements Management ---
@app.route("/financial_statements", methods=["GET"])
def get_financial_statements():
    if not supabase:
        return jsonify({"error": "Supabase client not initialized."}), 500

    user_id = "8f8b8f8f-8f8f-8f8f-8f8f-8f8f8f8f8f8f"

    try:
        data, error = supabase.table("financial_statements").select("*").eq("user_id", user_id).execute()
        if error:
            return jsonify({"error": str(error)}), 500
        return jsonify(data.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/financial_statements/<uuid:statement_id>", methods=["GET"])
def get_financial_statement(statement_id):
    if not supabase:
        return jsonify({"error": "Supabase client not initialized."}), 500

    try:
        data, error = supabase.table("financial_statements").select("*").eq("id", str(statement_id)).single().execute()
        if error:
            return jsonify({"error": str(error)}), 500
        if not data.data:
            return jsonify({"error": "Financial statement not found"}), 404
        return jsonify(data.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/financial_statements/<uuid:statement_id>", methods=["PUT"])
def update_financial_statement(statement_id):
    if not supabase:
        return jsonify({"error": "Supabase client not initialized."}), 500

    try:
        req_data = request.get_json()
        data, error = supabase.table("financial_statements").update(req_data).eq("id", str(statement_id)).execute()
        if error:
            return jsonify({"error": str(error)}), 500
        return jsonify(data.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/financial_statements/<uuid:statement_id>", methods=["DELETE"])
def delete_financial_statement(statement_id):
    if not supabase:
        return jsonify({"error": "Supabase client not initialized."}), 500

    try:
        # Also need to delete the file from storage
        data, error = supabase.table("financial_statements").select("file_path").eq("id", str(statement_id)).single().execute()
        if data.data:
            file_path = data.data['file_path']
            supabase.storage.from_("documents").remove([file_path])

        data, error = supabase.table("financial_statements").delete().eq("id", str(statement_id)).execute()
        if error:
            return jsonify({"error": str(error)}), 500
        return jsonify({"message": "Financial statement deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- Analytics API ---
@app.route("/analytics/emissions", methods=["GET"])
def get_emissions_data():
    if not supabase:
        return jsonify({"error": "Supabase client not initialized."}), 500

    user_id = "8f8b8f8f-8f8f-8f8f-8f8f-8f8f8f8f8f8f"

    try:
        data, error = supabase.table("emission_calculations").select("*").eq("user_id", user_id).execute()
        if error:
            return jsonify({"error": str(error)}), 500
        return jsonify(data.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # The user should configure the host and port as needed.
    app.run(host='0.0.0.0', port=5000, debug=True)
