import React, { useState } from 'react';

export default function FileUpload() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus('Please select a file first.');
      return;
    }

    try {
      setUploading(true);
      setStatus('Requesting Presigned URL from backend...');

      // Step 1: Request Presigned URL from Node.js Backend
      const response = await fetch('http://localhost:5000/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get upload URL');
      }

      const { uploadUrl } = data;
      setStatus('Uploading directly to S3...');

      // Step 2: Direct PUT Request to AWS S3
      const s3Response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type, // MUST match the file type requested
        },
        body: file, // Binary file payload
      });

      if (s3Response.ok) {
        setStatus('Upload successful! File safely landed in S3.');
      } else {
        throw new Error('Failed to upload file to S3.');
      }
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2>Direct-to-S3 Media Upload</h2>
      <input type="file" onChange={handleFileChange} disabled={uploading} />
      <button 
        onClick={handleUpload} 
        disabled={!file || uploading}
        style={{ marginLeft: '10px' }}
      >
        {uploading ? 'Uploading...' : 'Upload File'}
      </button>

      {status && <p style={{ marginTop: '15px', fontWeight: 'bold' }}>{status}</p>}
    </div>
  );
}