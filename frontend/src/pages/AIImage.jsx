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

const VIDEO_MODELS = [
  { value: 'MiniMax-Hailuo-2.3', label: 'Hailuo 2.3' },
  { value: 'MiniMax-Hailuo-02', label: 'Hailuo 02' },
  { value: 'S2V-01', label: 'S2V-01 (人物)' },
];

const VIDEO_DURATIONS = [
  { value: 5, label: '5秒' },
  { value: 6, label: '6秒' },
  { value: 10, label: '10秒' },
];

const VIDEO_RESOLUTIONS = [
  { value: '720P', label: '720P' },
  { value: '1080P', label: '1080P' },
];

export default function AIImage() {
  const [activeTab, setActiveTab] = useState('image');

  const [mode, setMode] = useState('text');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [referenceImage, setReferenceImage] = useState(null);
  const [referencePreview, setReferencePreview] = useState(null);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const [videoMode, setVideoMode] = useState('text');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoModel, setVideoModel] = useState('MiniMax-Hailuo-2.3');
  const [videoDuration, setVideoDuration] = useState(6);
  const [videoResolution, setVideoResolution] = useState('1080P');

  const handleVideoModelChange = (model) => {
    setVideoModel(model);
    if (model === 'S2V-01') {
      setVideoMode('subject');
    }
  };
  const [videoFirstFrame, setVideoFirstFrame] = useState(null);
  const [videoFirstFramePreview, setVideoFirstFramePreview] = useState(null);
  const [videoLastFrame, setVideoLastFrame] = useState(null);
  const [videoLastFramePreview, setVideoLastFramePreview] = useState(null);
  const [videoSubjectImages, setVideoSubjectImages] = useState([]);
  const [videoSubjectPreviews, setVideoSubjectPreviews] = useState([]);
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [videoTaskId, setVideoTaskId] = useState('');
  const [videoStatus, setVideoStatus] = useState('');
  const videoFirstFrameRef = useRef(null);
  const videoLastFrameRef = useRef(null);
  const videoSubjectRef = useRef(null);

  const [qwenPrompt, setQwenPrompt] = useState('');
  const [qwenImages, setQwenImages] = useState([]);
  const [qwenReferenceImages, setQwenReferenceImages] = useState([]);
  const [qwenReferencePreviews, setQwenReferencePreviews] = useState([]);
  const [qwenLoading, setQwenLoading] = useState(false);
  const [qwenError, setQwenError] = useState('');
  const qwenFileRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReferenceImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setReferencePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleVideoFirstFrameSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFirstFrame(file);
      const reader = new FileReader();
      reader.onload = (e) => setVideoFirstFramePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleVideoLastFrameSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoLastFrame(file);
      const reader = new FileReader();
      reader.onload = (e) => setVideoLastFramePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleVideoSubjectSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setVideoSubjectImages(files);
      const readers = files.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
      });
      Promise.all(readers).then(previews => {
        setVideoSubjectPreviews(previews);
      });
    }
  };

  const removeVideoSubjectImage = (index) => {
    const newImages = videoSubjectImages.filter((_, i) => i !== index);
    const newPreviews = videoSubjectPreviews.filter((_, i) => i !== index);
    setVideoSubjectImages(newImages);
    setVideoSubjectPreviews(newPreviews);
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

  const handleVideoGenerate = async () => {
    if (!videoPrompt.trim()) {
      setVideoError('请输入描述文字');
      return;
    }

    setVideoLoading(true);
    setVideoError('');
    setGeneratedVideo(null);
    setVideoTaskId('');
    setVideoStatus('');

    try {
      const formData = new FormData();
      formData.append('prompt', videoPrompt);
      formData.append('model', videoModel);
      formData.append('duration', videoDuration);
      formData.append('resolution', videoResolution);
      formData.append('mode', videoMode);

      if (videoMode === 'image' && videoFirstFrame) {
        formData.append('first_frame_image', videoFirstFrame);
      } else if (videoMode === 'start_end' && videoFirstFrame && videoLastFrame) {
        formData.append('first_frame_image', videoFirstFrame);
        formData.append('last_frame_image', videoLastFrame);
      } else if (videoMode === 'subject' && videoSubjectImages.length > 0) {
        videoSubjectImages.forEach(file => {
          formData.append('subject_image', file);
        });
      }

      const response = await axios.post('/api/ai/video-generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });

      if (response.data.success) {
        setVideoTaskId(response.data.data.task_id);
        setVideoStatus('pending');
        pollVideoStatus(response.data.data.task_id);
      } else {
        setVideoError(response.data.error || '生成失败');
        setVideoLoading(false);
      }
    } catch (err) {
      setVideoError(err.response?.data?.error || err.message || '生成失败，请稍后重试');
      setVideoLoading(false);
    }
  };

  const pollVideoStatus = async (taskId) => {
    const poll = async () => {
      try {
        const response = await axios.get(`/api/ai/video-status?task_id=${taskId}`);
        if (response.data.success) {
          const status = response.data.data.status;
          setVideoStatus(status);
          
          if (status === 'Success') {
            setGeneratedVideo(response.data.data.video_url);
            setVideoLoading(false);
          } else if (status === 'Fail') {
            setVideoError(response.data.data.error_message || '视频生成失败');
            setVideoLoading(false);
          } else {
            setTimeout(poll, 10000);
          }
        }
      } catch (err) {
        console.error('Poll error:', err);
        setTimeout(poll, 10000);
      }
    };
    poll();
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

  const handleVideoClear = () => {
    setVideoPrompt('');
    setVideoFirstFrame(null);
    setVideoFirstFramePreview(null);
    setVideoLastFrame(null);
    setVideoLastFramePreview(null);
    setVideoSubjectImage(null);
    setVideoSubjectPreview(null);
    setGeneratedVideo(null);
    setVideoError('');
    setVideoTaskId('');
    setVideoStatus('');
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

  const handleVideoDownload = async (videoUrl) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-video-${Date.now()}.mp4`;
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
        <h1 className="page-title">AI 生成</h1>
        <p className="page-subtitle">使用 MiniMax AI 生成图片和视频</p>
      </div>

      <div className="tab-container">
        <div className="tab-buttons">
          <button 
            className={`tab-btn ${activeTab === 'image' ? 'active' : ''}`}
            onClick={() => setActiveTab('image')}
          >
            AI生图
          </button>
          <button 
            className={`tab-btn ${activeTab === 'video' ? 'active' : ''}`}
            onClick={() => setActiveTab('video')}
          >
            AI视频
          </button>
          <button 
            className={`tab-btn ${activeTab === 'qwen' ? 'active' : ''}`}
            onClick={() => setActiveTab('qwen')}
          >
            千问生图
          </button>
        </div>

        {activeTab === 'image' && (
          <div className="tab-content">
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
        )}

        {activeTab === 'video' && (
          <div className="tab-content">
            <div className="ai-image-container">
              <div className="ai-image-controls">
                <div className="mode-selector">
                  <button 
                    className={`mode-btn ${videoMode === 'text' ? 'active' : ''}`}
                    onClick={() => setVideoMode('text')}
                  >
                    文生视频
                  </button>
                  <button 
                    className={`mode-btn ${videoMode === 'image' ? 'active' : ''}`}
                    onClick={() => setVideoMode('image')}
                  >
                    图生视频
                  </button>
                  <button 
                    className={`mode-btn ${videoMode === 'start_end' ? 'active' : ''}`}
                    onClick={() => setVideoMode('start_end')}
                  >
                    首尾帧
                  </button>
                  <button 
                    className={`mode-btn ${videoMode === 'subject' ? 'active' : ''}`}
                    onClick={() => setVideoMode('subject')}
                  >
                    人物参考
                  </button>
                </div>

                <div className="prompt-section">
                  <label className="input-label">描述文字</label>
                  <textarea
                    className="prompt-input"
                    placeholder="请描述你想要的视频内容..."
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    rows={4}
                  />
                </div>

                {videoMode === 'image' && (
                  <div className="reference-section">
                    <label className="input-label">首帧图片</label>
                    <div 
                      className="reference-upload"
                      onClick={() => videoFirstFrameRef.current?.click()}
                    >
                      {videoFirstFramePreview ? (
                        <img src={videoFirstFramePreview} alt="First Frame" className="reference-preview" />
                      ) : (
                        <div className="upload-placeholder">
                          <span className="upload-icon">📁</span>
                          <span>点击上传首帧图片</span>
                        </div>
                      )}
                    </div>
                    <input
                      ref={videoFirstFrameRef}
                      type="file"
                      accept="image/*"
                      onChange={handleVideoFirstFrameSelect}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}

                {videoMode === 'start_end' && (
                  <>
                    <div className="reference-section">
                      <label className="input-label">首帧图片</label>
                      <div 
                        className="reference-upload"
                        onClick={() => videoFirstFrameRef.current?.click()}
                      >
                        {videoFirstFramePreview ? (
                          <img src={videoFirstFramePreview} alt="First Frame" className="reference-preview" />
                        ) : (
                          <div className="upload-placeholder">
                            <span className="upload-icon">📁</span>
                            <span>点击上传首帧图片</span>
                          </div>
                        )}
                      </div>
                      <input
                        ref={videoFirstFrameRef}
                        type="file"
                        accept="image/*"
                        onChange={handleVideoFirstFrameSelect}
                        style={{ display: 'none' }}
                      />
                    </div>
                    <div className="reference-section">
                      <label className="input-label">尾帧图片</label>
                      <div 
                        className="reference-upload"
                        onClick={() => videoLastFrameRef.current?.click()}
                      >
                        {videoLastFramePreview ? (
                          <img src={videoLastFramePreview} alt="Last Frame" className="reference-preview" />
                        ) : (
                          <div className="upload-placeholder">
                            <span className="upload-icon">📁</span>
                            <span>点击上传尾帧图片</span>
                          </div>
                        )}
                      </div>
                      <input
                        ref={videoLastFrameRef}
                        type="file"
                        accept="image/*"
                        onChange={handleVideoLastFrameSelect}
                        style={{ display: 'none' }}
                      />
                    </div>
                  </>
                )}

                {videoMode === 'subject' && (
                  <div className="reference-section">
                    <label className="input-label">人物参考图 (可上传多张)</label>
                    <div className="multi-image-upload">
                      {videoSubjectPreviews.map((preview, index) => (
                        <div key={index} className="image-preview-item">
                          <img src={preview} alt={`Subject ${index + 1}`} className="reference-preview" />
                          <button 
                            type="button" 
                            className="remove-image-btn"
                            onClick={() => removeVideoSubjectImage(index)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {videoSubjectPreviews.length < 5 && (
                        <div 
                          className="reference-upload add-more"
                          onClick={() => videoSubjectRef.current?.click()}
                        >
                          <div className="upload-placeholder">
                            <span className="upload-icon">+</span>
                            <span>添加图片</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <input
                      ref={videoSubjectRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleVideoSubjectSelect}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}

                <div className="aspect-section">
                  <label className="input-label">模型</label>
                  <div className="aspect-buttons">
                    {VIDEO_MODELS.map((model) => (
                      <button
                        key={model.value}
                        className={`aspect-btn ${videoModel === model.value ? 'active' : ''}`}
                        onClick={() => handleVideoModelChange(model.value)}
                      >
                        {model.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="aspect-section">
                  <label className="input-label">时长</label>
                  <div className="aspect-buttons">
                    {VIDEO_DURATIONS.map((duration) => (
                      <button
                        key={duration.value}
                        className={`aspect-btn ${videoDuration === duration.value ? 'active' : ''}`}
                        onClick={() => setVideoDuration(duration.value)}
                      >
                        {duration.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="aspect-section">
                  <label className="input-label">分辨率</label>
                  <div className="aspect-buttons">
                    {VIDEO_RESOLUTIONS.map((resolution) => (
                      <button
                        key={resolution.value}
                        className={`aspect-btn ${videoResolution === resolution.value ? 'active' : ''}`}
                        onClick={() => setVideoResolution(resolution.value)}
                      >
                        {resolution.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="action-buttons">
                  <button className="clear-btn" onClick={handleVideoClear}>
                    清空
                  </button>
                  <button 
                    className="generate-btn" 
                    onClick={handleVideoGenerate}
                    disabled={videoLoading}
                  >
                    {videoLoading ? '生成中...' : '开始生成'}
                  </button>
                </div>

                {videoError && <div className="error-message">{videoError}</div>}
                {videoTaskId && !videoError && (
                  <div className="info-message">
                    任务ID: {videoTaskId} | 状态: {videoStatus}
                  </div>
                )}
              </div>

              <div className="ai-image-results">
                {videoLoading && (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>AI 正在生成视频，请稍候...</p>
                    <p style={{ fontSize: '12px', color: '#666' }}>视频生成可能需要几分钟时间</p>
                  </div>
                )}

                {!videoLoading && generatedVideo && (
                  <div className="generated-images">
                    <h3>生成结果</h3>
                    <div className="video-container">
                      <video 
                        src={generatedVideo} 
                        controls 
                        className="generated-video"
                      />
                      <button 
                        className="download-btn"
                        onClick={() => handleVideoDownload(generatedVideo)}
                      >
                        下载视频
                      </button>
                    </div>
                  </div>
                )}

                {!videoLoading && !generatedVideo && !videoError && (
                  <div className="empty-results">
                    <div className="empty-icon">🎬</div>
                    <p>输入描述文字，选择模型和参数</p>
                    <p>点击"开始生成"创建视频</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'qwen' && (
          <div className="tab-content">
            <div className="ai-image-container">
              <div className="ai-image-controls">
                <div className="prompt-section">
                  <label className="input-label">描述文字</label>
                  <textarea
                    className="prompt-input"
                    placeholder="描述你想要生成的图片内容...（如：图1中的女生穿着图2中的黑色裙子按图3的姿势坐下）"
                    value={qwenPrompt}
                    onChange={(e) => setQwenPrompt(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="reference-section">
                  <label className="input-label">参考图片 (可选，最多6张，需要公开URL)</label>
                  <div className="multi-image-upload">
                    {qwenReferencePreviews.map((preview, index) => (
                      <div key={index} className="image-preview-item">
                        <img src={preview} alt={`Reference ${index + 1}`} className="reference-preview" />
                        <button 
                          type="button" 
                          className="remove-image-btn"
                          onClick={() => {
                            const newImages = qwenReferenceImages.filter((_, i) => i !== index);
                            const newPreviews = qwenReferencePreviews.filter((_, i) => i !== index);
                            setQwenReferenceImages(newImages);
                            setQwenReferencePreviews(newPreviews);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {qwenReferencePreviews.length < 6 && (
                      <div 
                        className="reference-upload add-more"
                        onClick={() => qwenFileRef.current?.click()}
                      >
                        <div className="upload-placeholder">
                          <span className="upload-icon">+</span>
                          <span>添加图片</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={qwenFileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      if (files.length > 0) {
                        const combinedImages = [...qwenReferenceImages, ...files].slice(0, 6);
                        setQwenReferenceImages(combinedImages);
                        const readers = files.map(file => {
                          return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (e) => resolve(e.target.result);
                            reader.readAsDataURL(file);
                          });
                        });
                        Promise.all(readers).then(previews => {
                          setQwenReferencePreviews([...qwenReferencePreviews, ...previews]);
                        });
                      }
                      e.target.value = '';
                    }}
                    style={{ display: 'none' }}
                  />
                </div>

                <div className="button-group">
                  <button 
                    className="generate-btn" 
                    onClick={async () => {
                      if (!qwenPrompt.trim()) {
                        setQwenError('请输入描述文字');
                        return;
                      }

                      setQwenLoading(true);
                      setQwenError('');
                      setQwenImages([]);

                      try {
                        const formData = new FormData();
                        formData.append('prompt', qwenPrompt);

                        if (qwenReferenceImages.length > 0) {
                          qwenReferenceImages.forEach(file => {
                            formData.append('images', file);
                          });
                        }

                        const response = await axios.post('/api/ai/qwen-generate', formData, {
                          headers: { 'Content-Type': 'multipart/form-data' },
                          timeout: 180000
                        });

                        if (response.data.success) {
                          setQwenImages(response.data.data.images);
                        } else {
                          setQwenError(response.data.error || '生成失败');
                        }
                      } catch (err) {
                        setQwenError(err.response?.data?.error || err.message || '生成失败，请稍后重试');
                      } finally {
                        setQwenLoading(false);
                      }
                    }}
                    disabled={qwenLoading}
                  >
                    {qwenLoading ? '生成中...' : '开始生成'}
                  </button>
                  <button className="clear-btn" onClick={() => {
                    setQwenPrompt('');
                    setQwenImages([]);
                    setQwenReferenceImages([]);
                    setQwenReferencePreviews([]);
                    setQwenError('');
                  }}>
                    清空
                  </button>
                </div>

                {qwenError && <div className="error-message">{qwenError}</div>}
              </div>

              <div className="ai-image-results">
                {qwenLoading && (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>正在生成图片，请稍候...</p>
                  </div>
                )}

                {!qwenLoading && qwenImages.length > 0 && (
                  <div className="image-grid">
                    {qwenImages.map((img, index) => (
                      <div key={index} className="result-image-container">
                        <img 
                          src={img.url || img} 
                          alt={`Generated ${index + 1}`} 
                          className="result-image"
                        />
                        <button 
                          className="download-btn"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = img.url || img;
                            link.download = `qwen-image-${Date.now()}.png`;
                            link.click();
                          }}
                        >
                          下载
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {!qwenLoading && qwenImages.length === 0 && !qwenError && (
                  <div className="empty-results">
                    <div className="empty-icon">🎨</div>
                    <p>输入描述文字，上传参考图片</p>
                    <p>点击"开始生成"创建图片</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
