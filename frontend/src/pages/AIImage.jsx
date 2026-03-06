import { useState, useRef } from 'react';
import axios from 'axios';
import './AIImage.css';

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (方形)' },
  { value: '16:9', label: '16:9 (横版)' },
  { value: '9:16', label: '9:16 (竖版)' },
  { value: '3:4', label: '3:4 (竖版)' },
  { value: '4:3', label: '4:3 (横版)' },
];

const PRESET_PROMPTS = [
  '春天的花朵，粉色浪漫，户外自然光',
  '未来城市，科技感，赛博朋克风格',
  '可爱的小猫，萌宠，温馨治愈',
  '日落海滩，浪漫唯美，风景大片',
  '时尚穿搭，街头潮流，酷女孩',
];

export default function AIImage() {
  const [mode, setMode] = useState('text');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [referenceImage, setReferenceImage] = useState(null);
  const [referencePreview, setReferencePreview] = useState(null);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReferenceImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setReferencePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('请输入描述文字');
      return;
    }

    setLoading(true);
    setError('');
    setGeneratedImages([]);

    try {
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('aspect_ratio', aspectRatio);

      let endpoint = '/api/ai/text-to-image';
      if (mode === 'image' && referenceImage) {
        formData.append('reference_image', referenceImage);
        endpoint = '/api/ai/image-to-image';
      }

      const response = await axios.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000
      });

      if (response.data.success) {
        setGeneratedImages(response.data.data.images || []);
      } else {
        setError(response.data.error || '生成失败');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || '生成失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetClick = (preset) => {
    setPrompt(preset);
  };

  const handleClear = () => {
    setPrompt('');
    setReferenceImage(null);
    setReferencePreview(null);
    setGeneratedImages([]);
    setError('');
  };

  const handleDownload = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <div className="ai-image-page">
      <div className="page-header">
        <h1 className="page-title">AI 图像生成</h1>
        <p className="page-subtitle">使用 MiniMax AI 生成精美图片</p>
      </div>

      <div className="ai-image-container">
        <div className="ai-image-controls">
          <div className="mode-selector">
            <button 
              className={`mode-btn ${mode === 'text' ? 'active' : ''}`}
              onClick={() => setMode('text')}
            >
              文生图
            </button>
            <button 
              className={`mode-btn ${mode === 'image' ? 'active' : ''}`}
              onClick={() => setMode('image')}
            >
              图生图
            </button>
          </div>

          <div className="prompt-section">
            <label className="input-label">描述文字</label>
            <textarea
              className="prompt-input"
              placeholder="请描述你想要的图片内容..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
            <div className="preset-prompts">
              {PRESET_PROMPTS.map((preset, index) => (
                <button
                  key={index}
                  className="preset-btn"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {mode === 'image' && (
            <div className="reference-section">
              <label className="input-label">参考图片</label>
              <div 
                className="reference-upload"
                onClick={() => fileInputRef.current?.click()}
              >
                {referencePreview ? (
                  <img src={referencePreview} alt="Reference" className="reference-preview" />
                ) : (
                  <div className="upload-placeholder">
                    <span className="upload-icon">📁</span>
                    <span>点击上传参考图片</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
            </div>
          )}

          <div className="aspect-section">
            <label className="input-label">图片比例</label>
            <div className="aspect-buttons">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.value}
                  className={`aspect-btn ${aspectRatio === ratio.value ? 'active' : ''}`}
                  onClick={() => setAspectRatio(ratio.value)}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>

          <div className="action-buttons">
            <button className="clear-btn" onClick={handleClear}>
              清空
            </button>
            <button 
              className="generate-btn" 
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? '生成中...' : '开始生成'}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="ai-image-results">
          {loading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>AI 正在生成图片，请稍候...</p>
            </div>
          )}

          {!loading && generatedImages.length > 0 && (
            <div className="generated-images">
              <h3>生成结果</h3>
              <div className="images-grid">
                {generatedImages.map((img, index) => (
                  <div key={index} className="generated-image-item">
                    <img src={img} alt={`Generated ${index + 1}`} />
                    <button 
                      className="download-btn"
                      onClick={() => handleDownload(img)}
                    >
                      下载
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && generatedImages.length === 0 && !error && (
            <div className="empty-results">
              <div className="empty-icon">🎨</div>
              <p>输入描述文字，选择图片比例</p>
              <p>点击"开始生成"创建精美图片</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
