import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function InvoiceManagementPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError(null);

        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

        const response = await fetch(`${backendUrl}/invoices`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch invoices.');
        }

        setInvoices(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  const handleDelete = async (invoiceId) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${backendUrl}/invoices/${invoiceId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete invoice.');
        }

        setInvoices(invoices.filter((invoice) => invoice.id !== invoiceId));
        alert('Invoice deleted successfully!');

      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Invoice Management</h2>
      <table>
        <thead>
          <tr>
            <th>File Path</th>
            <th>Status</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>{invoice.file_path}</td>
              <td>{invoice.status}</td>
              <td>{new Date(invoice.created_at).toLocaleString()}</td>
              <td>
                <Link to={`/invoices/${invoice.id}`}>View</Link> |
                <button onClick={() => handleDelete(invoice.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
