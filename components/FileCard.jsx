import React from 'react';

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function FileCard({ file }) {
  const ext = file.filename?.split('.').pop()?.toUpperCase() || 'FILE';

  const handleDownload = (e) => {
    e.preventDefault();
    const token = localStorage.getItem('xro_token');
    fetch(file.download_url, {
      headers: { 'Authorization': `Bearer ${token}` },
    }).then(res => {
      if (!res.ok) throw new Error('Download failed');
      return res.blob();
    }).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }).catch(() => {});
  };

  return (
    <div className="file-card">
      <div className="file-card-icon">{ext}</div>
      <div className="file-card-info">
        <span className="file-card-name">{file.filename}</span>
        <span className="file-card-size">{formatSize(file.size_bytes)}</span>
      </div>
      <button className="file-card-download" onClick={handleDownload}>
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Download
      </button>
    </div>
  );
}
