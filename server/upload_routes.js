import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Keep original filename but make it safe
    const safeName = file.originalname.replace(/[^a-zA-Z0-9-.]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

// Create multer upload middleware
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: function (req, file, cb) {
    // Accept only Excel files
    const filetypes = /xlsx|xls/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed!'));
    }
  }
});

export function registerUploadRoutes(app) {
  const router = express.Router();

  // GET uploaded files list
  router.get('/files', (req, res) => {
    fs.readdir(uploadsDir, (err, files) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to list files' });
      }
      
      const filesList = files.map(filename => {
        return {
          name: filename,
          path: `/uploads/${filename}`,
          fullPath: path.join(uploadsDir, filename),
          size: fs.statSync(path.join(uploadsDir, filename)).size,
        };
      });
      
      res.json(filesList);
    });
  });

  // POST file upload endpoint
  router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.json({
      success: true,
      file: {
        name: req.file.originalname,
        filename: req.file.filename,
        path: `/uploads/${req.file.filename}`,
        fullPath: req.file.path,
        size: req.file.size,
      }
    });
  });

  // Serve static files from uploads directory
  app.use('/uploads', express.static(uploadsDir));

  // Register routes
  app.use('/api', router);
  
  console.log('📁 File upload routes registered');
}