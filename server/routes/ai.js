const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');

const router = express.Router();

const SECRET_KEY = 'personalweb_secret_key_2024';
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || 'sk-cp-ZQIVnWNwuQLTbVdf7JrYRiMjYZ4CI5Aa86JOd6IeE6joKIbZKvFoUqg5XJCd5nD5k4FjZncW2r8nBNPgFiVEIV7p0OGLGHFxvQpLrR0rA_yoYC7X2rvLqng';
const MINIMAX_API_URL = 'https://api.minimax.io/v1/image_generation';

const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = (db) => {

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/ai');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.random().toString(36).substring(7) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed'));
  }
});

const uploadVideo = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed'));
  }
});

router.post('/text-to-image', authenticateToken, upload.single('reference_image'), async (req, res) => {
  try {
    const { prompt, aspect_ratio = '1:1' } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const payload = {
      model: 'image-01',
      prompt: prompt,
      aspect_ratio: aspect_ratio,
      response_format: 'base64'
    };

    const response = await axios.post(MINIMAX_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });

    console.log('MiniMax API response:', JSON.stringify(response.data));

    if (response.data && response.data.data && response.data.data.image_base64) {
      const images = response.data.data.image_base64;
      const savedPaths = [];

      const uploadDir = path.join(__dirname, '../../uploads/ai');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      for (let i = 0; i < images.length; i++) {
        const imageBuffer = Buffer.from(images[i], 'base64');
        const filename = `t2i-${Date.now()}-${i}.jpg`;
        const filepath = path.join(__dirname, '../../uploads/ai', filename);
        fs.writeFileSync(filepath, imageBuffer);
        savedPaths.push(`/uploads/ai/${filename}`);
      }

      return res.json({
        success: true,
        data: {
          images: savedPaths,
          prompt: prompt
        }
      });
    }

    return res.status(500).json({ success: false, error: 'Failed to generate image' });

  } catch (error) {
    console.error('MiniMax text-to-image error:', error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      error: error.response?.data?.error?.message || error.message || 'AI generation failed' 
    });
  }
});

router.post('/image-to-image', authenticateToken, upload.single('reference_image'), async (req, res) => {
  try {
    const { prompt, aspect_ratio = '1:1' } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Reference image is required' });
    }

    const referenceImageUrl = `${req.protocol}://${req.get('host')}/uploads/ai/${req.file.filename}`;

    const payload = {
      model: 'image-01',
      prompt: prompt,
      aspect_ratio: aspect_ratio,
      response_format: 'base64',
      subject_reference: [
        {
          type: 'character',
          image_file: referenceImageUrl
        }
      ]
    };

    const response = await axios.post(MINIMAX_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });

    console.log('MiniMax fashion-generate API response:', JSON.stringify(response.data));

    if (response.data && response.data.data && response.data.data.image_base64) {
      const images = response.data.data.image_base64;
      const savedPaths = [];

      const uploadDir = path.join(__dirname, '../../uploads/ai');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      for (let i = 0; i < images.length; i++) {
        const imageBuffer = Buffer.from(images[i], 'base64');
        const filename = `i2i-${Date.now()}-${i}.jpg`;
        const filepath = path.join(__dirname, '../../uploads/ai', filename);
        fs.writeFileSync(filepath, imageBuffer);
        savedPaths.push(`/uploads/ai/${filename}`);
      }

      return res.json({
        success: true,
        data: {
          images: savedPaths,
          reference_image: `/uploads/ai/${req.file.filename}`,
          prompt: prompt
        }
      });
    }

    return res.status(500).json({ success: false, error: 'Failed to generate image' });

  } catch (error) {
    console.error('MiniMax image-to-image error:', error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      error: error.response?.data?.error?.message || error.message || 'AI generation failed' 
    });
  }
});

router.post('/fashion-generate', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const userId = req.user.id;
    console.log('Fashion-generate request body:', req.body);
    console.log('User ID:', userId);
    const { 
      mode = 'custom',
      selected_clothes = [],
      occasion = 'daily',
      season = 'spring',
      prompt = ''
    } = req.body;

    let enhancedPrompt = prompt;
    let selectedClothesData = [];
    
    if (mode === 'custom' && selected_clothes && selected_clothes.length > 0) {
      console.log('Custom mode - selected_clothes:', selected_clothes);
      const placeholders = selected_clothes.map(() => '?').join(',');
      const queryParams = [...selected_clothes, userId];
      selectedClothesData = db.prepare(`
        SELECT wc.*
        FROM wardrobe_clothes wc
        WHERE wc.id IN (${placeholders}) AND wc.user_id = ?
      `).all(...queryParams);
      
      console.log('Custom mode - selectedClothesData:', selectedClothesData);
      
      if (selectedClothesData.length > 0) {
        const clothingDescriptions = selectedClothesData.map(item => {
          const parts = [];
          if (item.color) parts.push(item.color);
          if (item.sub_category) parts.push(item.sub_category);
          if (item.brand) parts.push(item.brand);
          return parts.join(' ');
        }).filter(p => p);
        
        const clothingDesc = clothingDescriptions.join(', ');
        if (prompt) {
          enhancedPrompt = `${prompt}, ${clothingDesc}, 时尚穿搭`;
        } else {
          enhancedPrompt = `${clothingDesc}, 时尚穿搭`;
        }
      }
    } else if (mode === 'random') {
      console.log('Random mode - season:', season);
      const categories = db.prepare(`
        SELECT id FROM wardrobe_categories WHERE parent_category IS NULL ORDER BY sort_order
      `).all();
      
      if (categories.length === 0) {
        return res.status(400).json({ success: false, error: '衣橱为空，请先添加服饰' });
      }
      
      const randomClothes = [];
      for (const cat of categories.slice(0, 4)) {
        const item = db.prepare(`
          SELECT * FROM wardrobe_clothes 
          WHERE user_id = ? AND category_id = ? AND season LIKE ?
          ORDER BY RANDOM() LIMIT 1
        `).get(userId, cat.id, `%${season}%`);
        
        if (item) randomClothes.push(item);
      }
      
      if (randomClothes.length === 0) {
        for (const cat of categories.slice(0, 4)) {
          const item = db.prepare(`
            SELECT * FROM wardrobe_clothes 
            WHERE user_id = ? AND category_id = ?
            ORDER BY RANDOM() LIMIT 1
          `).get(userId, cat.id);
          
          if (item) randomClothes.push(item);
        }
      }
      
      if (randomClothes.length === 0) {
        return res.status(400).json({ success: false, error: '衣橱为空，请先添加服饰' });
      }
      
      selectedClothesData = randomClothes;
      
      const clothingDescriptions = randomClothes.map(item => {
        const parts = [];
        if (item.color) parts.push(item.color);
        if (item.sub_category) parts.push(item.sub_category);
        if (item.brand) parts.push(item.brand);
        return parts.join(' ');
      }).filter(p => p);
      
      const clothingDesc = clothingDescriptions.join(', ');
      const seasonMap = {
        spring: '春季',
        summer: '夏季',
        autumn: '秋季',
        winter: '冬季'
      };
      const occasionMap = {
        daily: '日常',
        date: '约会',
        commute: '通勤',
        formal: '正式',
        sports: '运动',
        outdoor: '户外'
      };
      if (prompt) {
        enhancedPrompt = `${prompt}, ${seasonMap[season] || '春季'}${occasionMap[occasion] || '日常'}风格, ${clothingDesc}, 时尚穿搭`;
      } else {
        enhancedPrompt = `${seasonMap[season] || '春季'}${occasionMap[occasion] || '日常'}风格, ${clothingDesc}, 时尚穿搭`;
      }
    }
    
    if (!enhancedPrompt) {
      const seasonMap = {
        spring: '春季',
        summer: '夏季',
        autumn: '秋季',
        winter: '冬季'
      };
      const occasionMap = {
        daily: '日常',
        date: '约会',
        commute: '通勤',
        formal: '正式',
        sports: '运动',
        outdoor: '户外'
      };
      enhancedPrompt = `${seasonMap[season] || '春季'}${occasionMap[occasion] || '日常'}风格穿搭，时尚简约`;
    }

    const fashionPrompt = `Fashion photography, ${enhancedPrompt}`;

    const payload = {
      model: 'image-01',
      prompt: fashionPrompt,
      aspect_ratio: '3:4',
      response_format: 'base64'
    };

    if (selectedClothesData.length > 0 && selectedClothesData[0].image_url) {
      payload.subject_reference = [{
        type: 'character',
        image_file: `${req.protocol}://${req.get('host')}${selectedClothesData[0].image_url}`
      }];
    }

    console.log('Fashion-generate payload:', JSON.stringify(payload));

    const response = await axios.post(MINIMAX_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });

    console.log('MiniMax fashion-generate API response:', JSON.stringify(response.data));

    if (response.data && response.data.data && response.data.data.image_base64) {
      const images = response.data.data.image_base64;
      const savedPaths = [];

      const uploadDir = path.join(__dirname, '../../uploads/ai');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      for (let i = 0; i < images.length; i++) {
        const imageBuffer = Buffer.from(images[i], 'base64');
        const filename = `fashion-${Date.now()}-${i}.jpg`;
        const filepath = path.join(__dirname, '../../uploads/ai', filename);
        fs.writeFileSync(filepath, imageBuffer);
        savedPaths.push(`/uploads/ai/${filename}`);
      }
      
      let aiSuggestion = '';
      try {
        const firstImagePath = path.join(__dirname, '../../uploads/ai', path.basename(savedPaths[0]));
        if (fs.existsSync(firstImagePath)) {
          const base64 = fs.readFileSync(firstImagePath, { encoding: 'base64' });
          const ext = 'jpg';
          const mimeType = 'jpeg';
          
          const visionPrompt = `请描述这张穿搭图片的整体风格、颜色搭配、适合场合等方面的特点，用50字左右的简洁中文描述。`;
          
          const visionMessages = [
            {
              role: 'user',
              content: [
                { image: `data:image/${mimeType};base64,${base64}` },
                { text: visionPrompt }
              ]
            }
          ];
          
          const visionPayload = {
            model: 'qwen-vl-max',
            input: {
              messages: visionMessages
            },
            parameters: {
              n: 1
            }
          };
          
          console.log('Getting AI fashion suggestion...');
          
          const visionResponse = await axios.post(QWEN_VL_API_URL, visionPayload, {
            headers: {
              'Authorization': `Bearer ${QWEN_VL_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 60000
          });
          
          console.log('Fashion vision response:', visionResponse.data);
          
          if (visionResponse.data && visionResponse.data.output && visionResponse.data.output.choices) {
            const visionChoices = visionResponse.data.output.choices;
            let visionText = '';
            
            if (Array.isArray(visionChoices) && visionChoices.length > 0) {
              const firstChoice = visionChoices[0];
              if (Array.isArray(firstChoice) && firstChoice.length > 0) {
                const content = firstChoice[0]?.message?.content;
                if (Array.isArray(content)) {
                  visionText = content[0]?.text || '';
                } else if (typeof content === 'string') {
                  visionText = content;
                }
              } else if (typeof firstChoice === 'object') {
                const content = firstChoice.message?.content;
                if (Array.isArray(content)) {
                  visionText = content[0]?.text || '';
                } else {
                  visionText = content || '';
                }
              }
            }
            
            console.log('Fashion vision text:', visionText);
            aiSuggestion = visionText.trim();
          }
        }
      } catch (visionErr) {
        console.error('Failed to get AI fashion suggestion:', visionErr.message);
      }

      const itemTypes = ['top', 'bottom', 'shoes', 'bag'];

      return res.json({
        success: true,
        data: {
          outfit: {
            id: null,
            name: 'AI 生成穿搭',
            items: selectedClothesData.map((item, idx) => ({
              clothes_id: item.id,
              type: itemTypes[idx] || 'accessory',
              image_url: item.image_url
            }))
          },
          ai_image_url: savedPaths[0],
          ai_suggestion: aiSuggestion || '这是一套时尚的穿搭方案。'
        }
      });
    }

    return res.status(500).json({ success: false, error: 'Failed to generate fashion image' });

  } catch (error) {
    console.error('MiniMax fashion-generate error:', error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      error: error.response?.data?.error?.message || error.message || 'AI generation failed' 
    });
  }
});

router.post('/video-generate', authenticateToken, uploadVideo.fields([
  { name: 'first_frame_image', maxCount: 1 },
  { name: 'last_frame_image', maxCount: 1 },
  { name: 'subject_image', maxCount: 1 }
]), async (req, res) => {
  try {
    const { prompt, model: modelVal, duration, resolution, mode } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ success: false, error: '请输入描述文字' });
    }

    const model = modelVal || 'MiniMax-Hailuo-2.3';
    
    if (model === 'S2V-01' && (!req.files || !req.files['subject_image'])) {
      return res.status(400).json({ success: false, error: 'S2V-01模型需要上传人物参考图片' });
    }

    const payload = {
      prompt,
      model: model,
      duration: parseInt(duration) || 6,
      resolution: resolution || '1080P'
    };

    if (mode === 'image' && req.files && req.files['first_frame_image']) {
      const firstFramePath = `/uploads/ai/${req.files['first_frame_image'][0].filename}`;
      payload.first_frame_image = `${req.protocol}://${req.get('host')}${firstFramePath}`;
    } else if (mode === 'start_end' && req.files && req.files['first_frame_image'] && req.files['last_frame_image']) {
      const firstFramePath = `/uploads/ai/${req.files['first_frame_image'][0].filename}`;
      const lastFramePath = `/uploads/ai/${req.files['last_frame_image'][0].filename}`;
      payload.first_frame_image = `${req.protocol}://${req.get('host')}${firstFramePath}`;
      payload.last_frame_image = `${req.protocol}://${req.get('host')}${lastFramePath}`;
    } else if (mode === 'subject' && req.files && req.files['subject_image']) {
      const subjectImages = req.files['subject_image'];
      const imageUrls = subjectImages.map(file => {
        return `${req.protocol}://${req.get('host')}/uploads/ai/${file.filename}`;
      });
      console.log('Subject image URLs:', imageUrls);
      payload.subject_reference = [{
        type: 'character',
        image: imageUrls
      }];
    }

    console.log('Video generate payload:', payload);

    const response = await axios.post('https://api.minimax.io/v1/video_generation', payload, {
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Video generation response:', response.data);

    if (response.data && response.data.task_id) {
      return res.json({
        success: true,
        data: {
          task_id: response.data.task_id
        }
      });
    } else {
      return res.status(500).json({ success: false, error: '视频生成任务创建失败' });
    }
  } catch (error) {
    console.error('MiniMax video-generate error:', error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      error: error.response?.data?.error?.message || error.message || '视频生成失败' 
    });
  }
});

router.get('/video-status', authenticateToken, async (req, res) => {
  try {
    const { task_id } = req.query;
    
    if (!task_id) {
      return res.status(400).json({ success: false, error: '缺少task_id参数' });
    }

    const response = await axios.get('https://api.minimax.io/v1/query/video_generation', {
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`
      },
      params: { task_id }
    });

    console.log('Video status response:', response.data);

    const status = response.data.status;
    
    if (status === 'Success') {
      const fileId = response.data.file_id;
      const fileResponse = await axios.get('https://api.minimax.io/v1/files/retrieve', {
        headers: {
          'Authorization': `Bearer ${MINIMAX_API_KEY}`
        },
        params: { file_id: fileId }
      });

      const downloadUrl = fileResponse.data.file.download_url;

      return res.json({
        success: true,
        data: {
          status: 'Success',
          video_url: downloadUrl
        }
      });
    } else if (status === 'Fail') {
      return res.json({
        success: true,
        data: {
          status: 'Fail',
          error_message: response.data.error_message || '视频生成失败'
        }
      });
    } else {
      return res.json({
        success: true,
        data: {
          status: status || 'Processing'
        }
      });
    }
  } catch (error) {
    console.error('MiniMax video-status error:', error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      error: error.response?.data?.error?.message || error.message || '查询状态失败' 
    });
  }
});

const QWEN_API_KEY = 'sk-4198b57923694e9682c9586c3371c1cd';
const QWEN_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

const uploadQwen = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed'));
  }
});

router.post('/qwen-generate', authenticateToken, uploadQwen.array('images', 6), async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ success: false, error: '请输入描述文字' });
    }

    const messages = [];
    const imageContents = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const base64 = fs.readFileSync(file.path, { encoding: 'base64' });
        const ext = path.extname(file.originalname).toLowerCase().slice(1);
        const mimeType = ext === 'jpg' ? 'jpeg' : ext;
        imageContents.push({
          image: `data:image/${mimeType};base64,${base64}`
        });
      }
    }

    imageContents.push({ text: prompt });

    messages.push({
      role: 'user',
      content: imageContents
    });

    const payload = {
      model: 'qwen-image-2.0-pro',
      input: {
        messages: messages
      },
      parameters: {
        n: 1,
        size: '1024*1024',
        watermark: false
      }
    };

    console.log('Qwen generate request, prompt:', prompt, ', images:', req.files?.length || 0);

    const response = await axios.post(QWEN_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 180000
    });

    console.log('Qwen response:', response.data);

    if (response.data && response.data.output && response.data.output.choices) {
      const images = [];
      const results = response.data.output.choices[0]?.message?.content || [];
      
      for (const item of results) {
        if (item.image) {
          images.push({ url: item.image });
        }
      }
      
      return res.json({
        success: true,
        data: { images }
      });
    } else {
      return res.status(500).json({ success: false, error: '生成失败' });
    }
  } catch (error) {
    console.error('Qwen generate error:', error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || error.message || '千问生成失败' 
    });
  }
});

router.post('/qwen-wardrobe', authenticateToken, upload.none(), async (req, res) => {
  try {
    const { prompt, images } = req.body;
    
    console.log('Qwen wardrobe request, body:', req.body);
    console.log('Qwen wardrobe request, prompt:', prompt, ', images:', images);
    
    if (!prompt) {
      return res.status(400).json({ success: false, error: '请输入描述文字' });
    }

    let imageUrlsArray = [];
    if (images) {
      imageUrlsArray = Array.isArray(images) ? images : [images];
    }

    console.log('Qwen wardrobe imageUrlsArray:', imageUrlsArray);

    if (imageUrlsArray.length === 0) {
      return res.status(400).json({ success: false, error: '请选择服饰图片' });
    }

    const messages = [];
    const imageContents = [];

    for (const url of imageUrlsArray) {
      try {
        console.log('Processing image:', url);
        
        let imagePath;
        if (url.startsWith('/uploads/')) {
          const uploadBasePaths = [
            path.join(__dirname, '..', 'uploads'),
            '/www/wwwroot/zybh_jparm/uploads',
            '/www/wwwroot/zybh_jparm/Personal0303/uploads'
          ];
          
          let foundPath = null;
          for (const basePath of uploadBasePaths) {
            const testPath = path.join(basePath, url.replace('/uploads/', ''));
            if (fs.existsSync(testPath)) {
              foundPath = testPath;
              break;
            }
          }
          
          if (!foundPath) {
            imagePath = path.join(__dirname, '..', url);
          } else {
            imagePath = foundPath;
          }
        } else if (url.startsWith('http')) {
          const response = await axios.get(url, { responseType: 'arraybuffer' });
          const base64 = Buffer.from(response.data).toString('base64');
          const ext = path.extname(url).toLowerCase().slice(1) || 'jpg';
          const mimeType = ext === 'jpg' ? 'jpeg' : ext;
          imageContents.push({
            image: `data:image/${mimeType};base64,${base64}`
          });
          console.log('Image fetched from URL, length:', base64.length);
          continue;
        } else {
          imagePath = path.join(__dirname, '..', 'uploads', url);
        }

        const absolutePath = path.resolve(imagePath);
        console.log('Reading from path:', absolutePath);
        
        if (!fs.existsSync(absolutePath)) {
          console.error('File not found:', absolutePath);
          continue;
        }
        
        const base64 = fs.readFileSync(absolutePath, { encoding: 'base64' });
        const ext = path.extname(absolutePath).toLowerCase().slice(1) || 'jpg';
        const mimeType = ext === 'jpg' ? 'jpeg' : ext;
        imageContents.push({
          image: `data:image/${mimeType};base64,${base64}`
        });
        console.log('Image read successfully, length:', base64.length);
      } catch (err) {
        console.error('Failed to process image:', url, err.message);
      }
    }

    if (imageContents.length === 0) {
      return res.status(400).json({ success: false, error: '图片加载失败' });
    }

    imageContents.push({ text: prompt });

    messages.push({
      role: 'user',
      content: imageContents
    });

    const payload = {
      model: 'qwen-image-2.0-pro',
      input: {
        messages: messages
      },
      parameters: {
        n: 1,
        size: '1024*1024',
        watermark: false
      }
    };

    console.log('Qwen wardrobe request, prompt:', prompt, ', images:', imageContents.length);

    const response = await axios.post(QWEN_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 180000
    });

    console.log('Qwen wardrobe response:', response.data);

    if (response.data && response.data.output && response.data.output.choices) {
      const generatedImages = [];
      const results = response.data.output.choices[0]?.message?.content || [];
      
      for (const item of results) {
        if (item.image) {
          generatedImages.push({ url: item.image });
        }
      }
      
      let outfitSuggestion = '';
      if (generatedImages.length > 0) {
        try {
          const firstImage = generatedImages[0].url;
          
          const visionPrompt = `请描述这张穿搭图片的整体风格、颜色搭配、适合场合等方面的特点，用50字左右的简洁中文描述。`;
          
          const visionMessages = [
            {
              role: 'user',
              content: [
                { image: firstImage },
                { text: visionPrompt }
              ]
            }
          ];
          
          const visionPayload = {
            model: 'qwen-vl-max',
            input: {
              messages: visionMessages
            },
            parameters: {
              n: 1
            }
          };
          
          console.log('Getting outfit suggestion...');
          
          const visionResponse = await axios.post(QWEN_VL_API_URL, visionPayload, {
            headers: {
              'Authorization': `Bearer ${QWEN_VL_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 60000
          });
          
          console.log('Vision response:', visionResponse.data);
          
          if (visionResponse.data && visionResponse.data.output && visionResponse.data.output.choices) {
            const visionChoices = visionResponse.data.output.choices;
            let visionText = '';
            
            if (Array.isArray(visionChoices) && visionChoices.length > 0) {
              const firstChoice = visionChoices[0];
              if (Array.isArray(firstChoice) && firstChoice.length > 0) {
                const content = firstChoice[0]?.message?.content;
                if (Array.isArray(content)) {
                  visionText = content[0]?.text || '';
                } else if (typeof content === 'string') {
                  visionText = content;
                }
              } else if (typeof firstChoice === 'object') {
                const content = firstChoice.message?.content;
                if (Array.isArray(content)) {
                  visionText = content[0]?.text || '';
                } else if (typeof content === 'string') {
                  visionText = content;
                }
              }
            }
            
            console.log('Vision text:', visionText);
            outfitSuggestion = visionText.trim();
          }
        } catch (visionErr) {
          console.error('Failed to get outfit suggestion:', visionErr.message);
        }
      }
      
      return res.json({
        success: true,
        data: { 
          images: generatedImages,
          suggestion: outfitSuggestion
        }
      });
    } else {
      return res.status(500).json({ success: false, error: '生成失败' });
    }
  } catch (error) {
    console.error('Qwen wardrobe error:', error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || error.message || '千问生成失败' 
    });
  }
});

const QWEN_VL_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
const QWEN_VL_API_KEY = 'sk-4198b57923694e9682c9586c3371c1cd';

const uploadVl = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed'));
  }
});

router.post('/recognize-clothing', authenticateToken, uploadVl.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '请上传图片' });
    }

    const imagePath = req.file.path;
    const absolutePath = path.resolve(imagePath);
    
    if (!fs.existsSync(absolutePath)) {
      return res.status(400).json({ success: false, error: '图片文件不存在' });
    }
    
    const base64 = fs.readFileSync(absolutePath, { encoding: 'base64' });
    const ext = path.extname(absolutePath).toLowerCase().slice(1) || 'jpg';
    const mimeType = ext === 'jpg' ? 'jpeg' : ext;
    
    const imageContent = {
      image: `data:image/${mimeType};base64,${base64}`
    };

    const prompt = `请分析这张服装图片，并返回JSON格式的识别结果。分类(category)可选值：上装、下装、套装、鞋子、配件、包袋、帽子、围巾、手套、眼饰、珠宝。子分类(sub_category)参考：上装(T恤、衬衫、卫衣、毛衣、针织衫、风衣、大衣、羽绒服、西装、夹克、马甲)、下装(牛仔裤、休闲裤、运动裤、短裤、裙子、阔腿裤)、套装(休闲套装、正装套装、运动套装)、鞋子(运动鞋、休闲鞋、正装鞋、拖鞋、靴子)、配件(腰带、领带、领结、袖扣)、包袋(单肩包、双肩包、手提包、钱包、行李箱)、帽子(棒球帽、渔夫帽、礼帽、毛线帽)、围巾(围巾、披肩)、手套(皮质手套、针织手套)、眼饰(墨镜、近视镜)、珠宝(项链、手链、戒指、耳饰)。颜色(color)可选值：黑色、白色、灰色、红色、橙色、黄色、绿色、蓝色、紫色、粉色、棕色、驼色、藏青色、军绿色、酒红色、玫红色、海军蓝。请按以下JSON格式返回：{"category":"分类名称","sub_category":"子分类名称","color":"主颜色名称"}，只返回JSON，不要其他文字。`;

    const messages = [
      {
        role: 'user',
        content: [imageContent, { text: prompt }]
      }
    ];

    const payload = {
      model: 'qwen-vl-max',
      input: {
        messages: messages
      },
      parameters: {
        n: 1
      }
    };

    console.log('Clothing recognition request, image:', req.file.originalname);

    const response = await axios.post(QWEN_VL_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${QWEN_VL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    console.log('Clothing recognition response:', response.data);

    if (response.data && response.data.output && response.data.output.choices) {
      const choices = response.data.output.choices;
      let resultText = '';
      
      if (Array.isArray(choices) && choices.length > 0) {
        const firstChoice = choices[0];
        if (Array.isArray(firstChoice) && firstChoice.length > 0) {
          const content = firstChoice[0]?.message?.content;
          if (Array.isArray(content)) {
            resultText = content[0]?.text || '';
          } else if (typeof content === 'string') {
            resultText = content;
          }
        } else if (typeof firstChoice === 'object') {
          const content = firstChoice.message?.content || firstChoice.text;
          if (Array.isArray(content)) {
            resultText = content[0]?.text || '';
          } else if (typeof content === 'string') {
            resultText = content;
          }
        }
      }
      
      console.log('Result text:', resultText);
      
      let parsedResult = null;
      try {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        }
      } catch (parseErr) {
        console.error('Failed to parse AI response:', parseErr);
      }

      if (parsedResult) {
        return res.json({
          success: true,
          data: {
            category: parsedResult.category || '',
            sub_category: parsedResult.sub_category || '',
            color: parsedResult.color || ''
          }
        });
      } else {
        return res.json({
          success: true,
          data: {
            category: '',
            sub_category: '',
            color: ''
          }
        });
      }
    } else {
      return res.status(500).json({ success: false, error: '识别失败' });
    }
  } catch (error) {
    console.error('Clothing recognition error:', error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || error.message || 'AI识别失败' 
    });
  }
});

  return router;
};
