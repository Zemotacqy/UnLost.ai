const express = require("express");
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const mongoose = require('mongoose');
const jimp = require('jimp');
const spawn = require('child_process').spawn;
const lost = require('./../models/losts.js');
const found = require('./../models/found.js');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'temp/');
    },
    filename: function (req, file, cb) {
        cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    // reject a file
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 50
    },
    fileFilter: fileFilter
});

async function rearrangeFiles(labelname, files, category) {
    fs.mkdirSync(`uploads/${category}/${labelname}`, {recursive: true, mode: 770});

    await files.forEach((file, i) => {
        fs.renameSync(`${file.path}`, `uploads/${category}/${labelname}/${i}${path.extname(file.originalname)}`);
        jimp.read(`uploads/${category}/${labelname}/${i}${path.extname(file.originalname)}`, function (err, image) {
            if (err) {
              console.log(err);
            } else {
              image
                .resize(96, 96)
                .write(`uploads/${category}/${labelname}/${i}.jpg`);
            }
        });
        fs.unlinkSync(`uploads/${category}/${labelname}/${i}${path.extname(file.originalname)}`);
    });
    
  }


router.post('/uploadlost', upload.array("lostImage", 10), (req, res, next) => {
    if(req.files.size<=0 ) {
        res.status(500).json({
            status: "fail"
        });
    } else {
        const mongooseId = mongoose.Types.ObjectId();
        const labelname = mongooseId;
        
        const newimage = new lost({
            _id: mongooseId,
            label: labelname,

        });

        
        rearrangeFiles(labelname, req.files, 'lost');

        newimage
            .save()
            .then(async (result) => {
                console.log(result);
                // call python script
                const pythonProcess = spawn('python', [`${__dirname}/../scripts/hello.py`]);

                pythonProcess.stdout.on('data', (data) => {
                    console.log(data.toString('utf8'));
                });

                // delete lost images folder
                // await req.files.forEach((file, i) => {
                //     fs.unlink(`uploads/lost/${labelname}/${i}.${path.extname(file.originalname)}`, (err) => {
                //         if (err) throw err;
                //         console.log(`uploads/lost/${labelname}/${i}.${path.extname(file.originalname)} was deleted`);
                //     });
                // });
                // await fs.removeSync(`uploads/lost/${labelname}`);
                
                res.status(200).json({
                    status: "success"
                });
            }).catch(err => {
                console.log(err);
                res.status(500).json({
                    status: "fail"
                });            
            });

        

        /**
         * Delete files from Uploads folder after it has been moved to lostdb folder
         * req.files.forEach((file, i) => {
            fs.unlink(`${file.path}`, (err) => {
                if (err) throw err;
                console.log(`${file.path} was deleted`);
            });
            });
         */
        
    }
});

router.post('/uploadfound', upload.array("foundImage", 10), (req, res, next) => {
    if(req.files.size<=0 ) {
        res.status(500).json({
            status: "fail"
        });
    } else {
        const mongooseId = mongoose.Types.ObjectId();
        const labelname = mongooseId;
        
        const newfimage = new found({
            _id: mongooseId,
            label: labelname

        });

        
        rearrangeFiles(labelname, req.files, 'found');

        newfimage
            .save()
            .then((result) => {
                console.log(result);
                res.status(200).json({
                    status: "success"
                });
            }).catch(err => {
                console.log(err);
                res.status(500).json({
                    status: "fail"
                });            
            });
        
    }
});


module.exports = router;