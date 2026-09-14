import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { removeBackground } from '@imgly/background-removal';
import './styles.css';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const HIGH_QUALITY_CONFIG = {
  model: 'isnet',
  device: 'cpu',
  rescale: false,
  output: { format: 'image/png', quality: 1 },
};

async function restoreOriginalResolution(originalFile, segmentedBlob) {
  try {
    const original = await createImageBitmap(originalFile);
    const segmented = await createImageBitmap(segmentedBlob);
    const canvas = document.createElement('canvas');
    const maskCanvas = document.createElement('canvas');
    canvas.width = original.width; canvas.height = original.height;
    maskCanvas.width = original.width; maskCanvas.height = original.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(original, 0, 0);
    maskContext.drawImage(segmented, 0, 0, original.width, original.height);
    original.close(); segmented.close();
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const mask = maskContext.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    for (let index = 3; index < pixels.data.length; index += 4) {
      pixels.data[index] = mask.data[index];
      if (pixels.data[index] <= 8) pixels.data[index] = 0;
    }
    context.putImageData(pixels, 0, 0);
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1)) || segmentedBlob;
  } catch {
    return segmentedBlob;
  }
}

function App() {
  const inputRef = useRef(null);
  const [page, setPage] = useState(() => ['privacy', 'terms', 'contact'].includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : 'home');
  const [file, setFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Ready to process your image.');
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  const selectFile = useCallback((selectedFile) => {
    setError('');
    if (!selectedFile) return;
    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      setError('Unsupported file format. Please choose JPG, PNG, or WEBP.'); return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('This file is too large. The maximum size is 10 MB.'); return;
    }
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(selectedFile); setOriginalUrl(URL.createObjectURL(selectedFile)); setResultUrl(''); setProgress(0); setStatus('Image ready to process.');
  }, [originalUrl, resultUrl]);

  useEffect(() => {
    const handlePaste = (event) => {
      const image = [...(event.clipboardData?.items || [])].find((item) => item.kind === 'file' && ACCEPTED_TYPES.includes(item.type));
      if (image) { event.preventDefault(); selectFile(image.getAsFile()); }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [selectFile]);

  const loadFromUrl = async (event) => {
    event.preventDefault(); const sourceUrl = imageUrl.trim(); if (!sourceUrl) return;
    let parsedUrl;
    try { parsedUrl = new URL(sourceUrl); if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('url'); }
    catch { setError('Enter a valid image URL starting with http:// or https://.'); return; }
    setIsLoadingUrl(true); setError('');
    try {
      const response = await fetch(parsedUrl.href); if (!response.ok) throw new Error('fetch');
      const blob = await response.blob(); const extension = parsedUrl.pathname.match(/\.(jpe?g|png|webp)$/i)?.[1]?.toLowerCase();
      const extensionType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : extension ? `image/${extension}` : '';
      const type = ACCEPTED_TYPES.includes(blob.type) ? blob.type : extensionType;
      if (!ACCEPTED_TYPES.includes(type)) throw new Error('type'); if (blob.size > MAX_FILE_SIZE) throw new Error('size');
      const filename = `image-from-url.${type === 'image/jpeg' ? 'jpg' : type.split('/')[1]}`;
      selectFile(new File([blob], filename, { type }));
    } catch (urlError) {
      setError(urlError.message === 'size' ? 'This image is too large. The maximum size is 10 MB.' : urlError.message === 'type' ? 'The URL is not a JPG, PNG, or WEBP image.' : 'Could not fetch this image. Make sure it is public and allows CORS access.');
    } finally { setIsLoadingUrl(false); }
  };

  const processImage = async () => {
    if (!file || isProcessing) return;
    setIsProcessing(true); setError(''); setProgress(0); setStatus('Loading the AI model in your browser…');
    try {
      const output = await removeBackground(file, { ...HIGH_QUALITY_CONFIG, progress: (key, current, total) => { const percent = total ? Math.min(99, Math.round((current / total) * 100)) : 0; setProgress(percent); setStatus(key?.includes('fetch') ? 'Downloading the full-quality AI model…' : 'Removing background with high precision…'); } });
      const refinedOutput = await restoreOriginalResolution(file, output);
      setResultUrl(URL.createObjectURL(refinedOutput)); setProgress(100); setStatus('Done! High-quality transparent PNG is ready.');
    } catch (processingError) { console.error(processingError); setError('Could not process this image. Please try another image.'); setStatus('Something went wrong while processing.'); }
    finally { setIsProcessing(false); }
  };

  const reset = () => { if (originalUrl) URL.revokeObjectURL(originalUrl); if (resultUrl) URL.revokeObjectURL(resultUrl); setFile(null); setOriginalUrl(''); setResultUrl(''); setProgress(0); setError(''); setImageUrl(''); setStatus('Ready to process your image.'); if (inputRef.current) inputRef.current.value = ''; };
  const navigate = (nextPage) => { setPage(nextPage); window.history.pushState({}, '', nextPage === 'home' ? '/' : `#${nextPage}`); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return <div className="site-shell"><div className="ambient ambient-one" /><div className="ambient ambient-two" /><div className="ambient ambient-three" /><nav className="top-nav"><button className="brand" onClick={() => navigate('home')} aria-label="Remove Background home"><img src="/logo.png" alt="Platka logo" /><span>Remove Background</span></button><div className="nav-links"><button onClick={() => navigate('home')} className={page === 'home' ? 'active' : ''}>Remove Background</button><button onClick={() => navigate('privacy')}>Privacy Policy</button><button onClick={() => navigate('terms')}>Terms & Conditions</button><button onClick={() => navigate('contact')}>Contact</button></div></nav>{page === 'home' ? <Home {...{ inputRef, file, originalUrl, resultUrl, isDragging, setIsDragging, isProcessing, progress, status, error, imageUrl, setImageUrl, isLoadingUrl, selectFile, loadFromUrl, processImage, reset }} /> : <InfoPage page={page} navigate={navigate} />}<footer className="site-footer"><div className="footer-brand"><img src="/logo.png" alt="Platka logo" /><span>Remove Background</span></div><p>Private, fast, and free. Your images never leave your browser.</p><div className="footer-links"><button onClick={() => navigate('privacy')}>Privacy Policy</button><button onClick={() => navigate('terms')}>Terms & Conditions</button><button onClick={() => navigate('contact')}>Contact</button></div><small>© 2026 Platka Software Digital. All rights reserved.</small></footer></div>;
}

function Home({ inputRef, file, originalUrl, resultUrl, isDragging, setIsDragging, isProcessing, progress, status, error, imageUrl, setImageUrl, isLoadingUrl, selectFile, loadFromUrl, processImage, reset }) {
  return <main className="home-page"><section className="hero"><div className="hero-logo"><img src="/logo.png" alt="Platka logo" /></div><p className="eyebrow">PRIVATE · FAST · FREE</p><h1>Remove Background<br /><span>Images</span></h1><p className="subtitle">Remove image backgrounds automatically, right in your browser.</p><div className="quality-badge">✦ Full precision AI · Lossless PNG · Local processing</div></section><section className="tool-card">{!file ? <><div className={`drop-zone ${isDragging ? 'dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); selectFile(event.dataTransfer.files?.[0]); }} onClick={() => inputRef.current?.click()} role="button" tabIndex="0" onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click(); }}><div className="upload-icon">↑</div><h2>Drag & drop an image here</h2><p>or click to browse from your device</p><span className="file-hint">JPG · PNG · WEBP <b>•</b> Max. 10 MB</span><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectFile(event.target.files?.[0])} hidden /></div><div className="source-options"><span className="source-divider"><i /> or <i /></span><p className="paste-tip">Paste an image from your clipboard with <kbd>Ctrl</kbd> + <kbd>V</kbd></p><form className="url-form" onSubmit={loadFromUrl}><input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Paste an image URL" aria-label="Image URL" /><button type="submit" disabled={isLoadingUrl}>{isLoadingUrl ? 'Loading…' : 'Use URL'}</button></form></div></> : <><div className="preview-grid"><PreviewCard title="Original image" src={originalUrl} /><PreviewCard title="Transparent result" src={resultUrl} empty={!resultUrl} /></div><div className="file-row"><span className="file-name">{file.name}</span><button className="text-button" onClick={reset} disabled={isProcessing}>Choose another</button></div>{isProcessing && <div className="progress-area" aria-live="polite"><div className="progress-label"><span>{status}</span><span>{progress}%</span></div><div className="progress-track"><div className="progress-bar" style={{ width: `${Math.max(progress, 3)}%` }} /></div></div>}{!isProcessing && !resultUrl && <p className="status-text">{status}</p>}{resultUrl ? <a className="primary-button" href={resultUrl} download={`${file.name.replace(/\.[^/.]+$/, '')}-no-bg.png`}>↓&nbsp; Download PNG</a> : <button className="primary-button" onClick={processImage} disabled={isProcessing}>✦&nbsp; Remove Background</button>}</>}{error && <div className="error-message" role="alert">!&nbsp; {error}</div>}</section><p className="privacy-note">🔒 &nbsp;All processing happens locally in your browser. Your images are never uploaded.</p></main>;
}

function PreviewCard({ title, src, empty }) {
  const [dimensions, setDimensions] = useState(null);
  const ratio = dimensions ? `${dimensions.width} / ${dimensions.height}` : '1 / 1';
  return <div className="preview-card"><div className="card-title"><span>{title}</span>{empty ? <span className="waiting">Waiting for result</span> : <span className="ready-dot">●</span>}</div><div className={`image-frame ${empty ? 'empty-frame' : ''} ${src && !empty ? 'checkerboard' : ''}`} style={{ aspectRatio: ratio }}>{src ? <button className="preview-open" type="button" onClick={() => window.open(src, '_blank', 'noopener,noreferrer')} title="Open full-size preview"><img src={src} alt={title} onLoad={(event) => setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} /></button> : <div className="empty-state"><span>✦</span><small>Your result will appear here</small></div>}</div>{src && <small className="preview-hint">Click to view full size</small>}</div>;
}

function InfoPage({ page, navigate }) {
  const content = { privacy: { title: 'Privacy Policy', eyebrow: 'YOUR PRIVACY MATTERS', body: <><p>Last updated: September 14, 2026</p><p>Remove Background Images is operated by Platka Software Digital. This tool processes images locally in your browser using WebAssembly and ONNX technology. Your images are not uploaded to, stored on, or transmitted through our servers.</p><h2>Information we collect</h2><p>We do not collect your uploaded images. We may receive basic, anonymous website analytics only when enabled by the hosting platform. We do not sell personal information or use your images to train models.</p><h2>Third-party services</h2><p>The application may download public model files from its delivery infrastructure during the first use. Processing remains on your device. External image URLs are fetched directly by your browser and are subject to the source website’s privacy policy and CORS rules.</p><h2>Contact</h2><p>Questions about privacy can be sent to <a href="mailto:platkasoftwaredigital@gmail.com">platkasoftwaredigital@gmail.com</a>.</p></> }, terms: { title: 'Terms & Conditions', eyebrow: 'SIMPLE, FAIR TERMS', body: <><p>Last updated: September 14, 2026</p><p>By using Remove Background Images, you agree to use the service responsibly and comply with applicable laws. You retain all rights to images you process.</p><h2>Use of the service</h2><p>The tool is provided free of charge on an “as is” basis. Results are generated automatically and may not be perfect. You are responsible for reviewing the result before publishing or using it commercially.</p><h2>Limitations</h2><p>We do not guarantee uninterrupted availability, exact results, or compatibility with every image. Because processing takes place in your browser, performance depends on your device and browser.</p><h2>Contact</h2><p>For questions, contact <a href="mailto:platkasoftwaredigital@gmail.com">platkasoftwaredigital@gmail.com</a>.</p></> }, contact: { title: 'Contact', eyebrow: 'WE WOULD LOVE TO HEAR FROM YOU', body: <><p>Need help, have feedback, or want to discuss a digital product? Reach out to Platka Software Digital.</p><div className="contact-details"><p><strong>Email</strong><br /><a href="mailto:platkasoftwaredigital@gmail.com">platkasoftwaredigital@gmail.com</a></p><p><strong>Phone</strong><br /><a href="tel:+6281111102880">081111102880</a></p><p><strong>Official websites</strong><br /><a href="https://platkadigital.com" target="_blank" rel="noreferrer">platkadigital.com</a><br /><a href="https://platka.io" target="_blank" rel="noreferrer">platka.io</a></p></div></> } }[page];
  return <main className="info-page"><p className="eyebrow">{content.eyebrow}</p><h1>{content.title}</h1><article>{content.body}</article><button className="primary-button narrow" onClick={() => navigate('home')}>← Back to Remove Background</button></main>;
}

createRoot(document.getElementById('root')).render(<App />);
