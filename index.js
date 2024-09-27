const express = require("express");
const app = express();
const rangeParser = require('range-parser');
const multer = require('multer');
const path = require('path');
const PORT = 4000 || process.env.NODE_ENV;
const fs = require('fs');

//povezivanje s bazom:
require('dotenv').config();
const Pool = require('pg').Pool;
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'deardiary_zmop',
    password: process.env.DB_PASSWORD,
    port: 5432,
    ssl: true
});

//videi:
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const saveDirectory = path.join(__dirname, '/videos');
        if (!fs.existsSync(saveDirectory)) {
            fs.mkdirSync(saveDirectory);
        }
        cb(null, saveDirectory);
    },
    filename: (req, file, cb) => {
        cb(null, `video_${Date.now()}.mp4`);
    },
});

const upload = multer({ storage: storage });



//view
app.set('view engine', 'ejs');
app.set('views', __dirname);

//videi
app.use('/videos', express.static(path.join(__dirname, 'videos')));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "static")));
app.get('/main', (req, res) => {
    res.render('index');
});



app.post('/saveVideo', upload.single('video'), (req, res) => {
    const name = req.body.name;
    const title = req.body.title;
    const videoFilename = req.file.filename;

    pool.query(
        'INSERT INTO video (username, title, video_url) VALUES ($1, $2, $3) RETURNING video_id',
        [name, title, videoFilename],
        (dbError, result) => {
            if (dbError) {
                console.error(dbError);
                res.status(500).send('Error saving video details to the database.');
            } else {
                const id = result.rows[0].video_id;
                console.log('Inserted record ID:', id);
                //res.redirect(`/`)
                res.redirect(`/push/${title}/${name}`)
            }
        }
    );
});


app.get('/push/:title/:username', (req, res) => {
    const username = req.params.username;
    const title = req.params.title;
    res.render('push', { title: title,username: username});

});


app.get("/video/:filename", function (req, res) {
    const range = req.headers.range;
    if (!range) {
        res.status(400).send("Requires Range header");
    }

    const videoPath = path.join(__dirname, 'videos', req.params.filename);

    const videoSize = fs.statSync(videoPath).size;
    const CHUNK_SIZE = 10 ** 6; // 1MB
    const start = Number(range.replace(/\D/g, ""));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

    // Create headers
    const contentLength = end - start + 1;
    const headers = {
        "Content-Range": `bytes ${start}-${end}/${videoSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": contentLength,
        "Content-Type": "video/mp4",
    };

    res.writeHead(206, headers);

    const videoStream = fs.createReadStream(videoPath, { start, end });

    videoStream.pipe(res);
});

app.get('/', (req, res) => {
    pool.query('SELECT * FROM video order by currentDate desc', (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).send('Error fetching videos from the database.');
        } else {
            res.render('main', { videos: result.rows });
        }
    });
});

// PUSH NOTIFICATIONS
const publicVapidKey='BKXZuJixx_mc_e5_-nWKSpHr1Dn7HR4F2ljky6gh_z16y5nXqCuXqQ1jNQInEAfPZrIOqaCpa8wHIm9jwgjcSQ4';
const privateVApidKey = 'qoh6ZFgPNa6neARwEqSa9zKzQrPwB9gV7KMnJTkj8mM'

//push
const webpush = require('web-push');

webpush.setVapidDetails('mailto:test@test.com', publicVapidKey, privateVApidKey)
app.post('/subscribe', (req,res) =>{
    const subscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/ePldqMQhydU:APA91bEeGZJQKa0HaCbY_A2ezSh4qvID4yg6tkqQDri62RU-N4x8PAeKKn9KDbL5f_sZECBt9LO_vI5tXkCanY3ohOYZ4hvfQk0Vx8vQmFFP6sdNJeLoNlJ55CwPFsepLTCy5pNZ5zSG',
        expirationTime: null,
            keys: {
            p256dh: 'BGTExA03qZqgC18-FVDfdLoa6oq85TfEz7Xri5QZrZcJcF46R1Gy1P4oDTdYn6D7EkuZA0-0hwcPKYnyufA6uhY',
                auth: 'XqFzhcBFKRkFOUPSmZuzWA'
        }
    }

    res.status(201).json({});

    const payload = JSON.stringify({title:'Notification from Dear Diary...'});
    webpush.sendNotification(subscription,payload).catch(err => console.error(err));
})



app.listen(PORT, () => console.log(`Connected to Port: ${PORT}`));