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

      const suggestionMap = {
        spring: '这套穿搭适合春季早晚温差较大的时候穿着，轻薄外套搭配舒适内搭，展现活力满满的状态。',
        summer: '夏季穿搭以清爽为主，这套搭配适合日常出行，透气舒适又不失时尚感。',
        autumn: '秋季穿搭层次丰富，这套搭配既保暖又时尚，适合上班通勤或休闲出行。',
        winter: '冬季穿搭以保暖为主，这套搭配注重层次感和时尚度，在寒冷天气中也能保持优雅。'
      };

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
          ai_suggestion: suggestionMap[season] || '这是一套时尚的穿搭方案。'
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

  return router;
};
