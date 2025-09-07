# Carbon Emissions Backend API

This Flask application processes documents (invoices and financial statements) to calculate carbon emissions using AI-powered data extraction.

## Setup

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
```

### Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up your environment variables in `.env`

3. Run the application:
```bash
python main.py
```

## ChatGPT API Integration

The application now supports real ChatGPT API integration for document processing:

### Features:
- **Real AI Processing**: Uses OpenAI's GPT-3.5-turbo (or GPT-4) to extract structured data from documents
- **Fallback Mode**: Automatically falls back to simulation if API is unavailable
- **Error Handling**: Robust error handling for API failures
- **JSON Validation**: Ensures AI responses are properly formatted

### How it works:
1. Document is uploaded and stored in Supabase
2. File content is sent to ChatGPT API with a structured prompt
3. AI extracts relevant data (items, quantities, units, costs)
4. Data is validated and used for emissions calculations
5. If API fails, falls back to simulation mode

### Configuration Options:
- Change model: Modify `model="gpt-3.5-turbo"` in the code
- Adjust temperature: Change `temperature=0.1` for more/less creative responses
- Set token limits: Modify `max_tokens=1000` as needed

## API Endpoints

- `POST /upload` - Upload documents for processing
- `GET /invoices` - List all invoices
- `GET /financial_statements` - List all financial statements
- `GET /analytics/emissions` - Get emissions data

## File Processing

The system currently supports text-based documents. For PDFs or other formats, additional preprocessing would be needed to extract text content before sending to the AI.
