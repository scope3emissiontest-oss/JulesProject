import { useState } from 'react';

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('invoice');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setMessage('');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', documentType);

      // The backend URL should be configured in an environment variable
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

      const response = await fetch(`${backendUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload file.');
      }

      setMessage(data.message);

    } catch (error) {
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h2>Upload Document</h2>
      <form onSubmit={handleUpload}>
        <div>
          <label>
            Document Type:
            <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
              <option value="invoice">Invoice</option>
              <option value="financial_statement">Financial Statement</option>
            </select>
          </label>
        </div>
        <div>
          <input type="file" onChange={handleFileChange} />
        </div>
        <button type="submit" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {message && <p style={{ color: 'green' }}>{message}</p>}
      </form>
    </div>
  );
}
