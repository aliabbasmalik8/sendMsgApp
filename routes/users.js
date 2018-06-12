var express = require('express');
var router = express.Router();
var request=require('request');
var path = require('path');
var formidable = require('formidable');
var fs = require('fs');
var timediff = require('timediff');
var jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
var config=require('../config');
var userDB=require('../DataBase/user');

var admin = require("firebase-admin");
var serviceAccount = require("../quipu-e8617-firebase-adminsdk-4c05p-a2f302ce7f.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://quipu-e8617.firebaseio.com"
  });
/* GET users listing. */
router.post('/signup', function(req, res, next) {
  userDB.data.addUser(req,function (err,msg,newUser) {
    if(err)res.send(err);
     else res.send(msg);
  });
});

router.post('/signIn',function(req,res,next){
  userDB.data.logIn(req,function (err,msg,logInUser) {
      if(err)res.send(msg);
      else{
          res.send(msg);
      }
  })
});

router.post('/',authenticate,function (req,res,next) {
  userDB.data.findUser(function (err,msg,users) {
    if(err)res.send(err);
    res.send(msg);
  });
});

router.post('/updateFcmKey',authenticate,function(req,res,next){
  userDB.data.updateFcmKey(req,function (err,updateRecord) {
    if(err) res.send(err);
    res.send(updateRecord);
  });
});

router.post('/sendMessage',authenticate,function (req,res,next) {
    sendMessage(req,res,next);
});

function sendMessage(req,res,next) {
    userDB.data.getFcmKey(req,function (err,msg,recipientRecord) {
        if(err)return res.send(msg);
        else{
            registrationToken=recipientRecord.fcmKey;
            var message = {
                android: {
                    ttl: 3600 * 1000, // 1 hour in milliseconds
                    priority: 'high',
                    notification: {
                      title: req.body.title,
                      body: req.body.message,
                    //   icon: 'stock_ticker_update',
                    //   color: '#f45342'
                    }
                  },
                token: registrationToken
              };
              admin.messaging().send(message)
              .then((response) => {
                // Response is a message ID string.
                console.log('Successfully sent message:', response);
                res.send('sent message successfully');
              })
              .catch((error) => {
                console.log('Error sending message:', error);
                res.send('something bad happen while sending message');
              });
        }
    })
};

router.post('/sendMessageWithTime',authenticate,function (req,res,next) {
    var diff=timediff(Date.parse(req.body.date1),Date.parse(req.body.date2),"s");
    setTimeout(sendMessage(req,res,next),diff);
});

router.post('/uploadAndSendFileUrl',function(req, res){
    // create an incoming form object
    var form = new formidable.IncomingForm();
    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = true;
    // store all uploads in the /uploads directory
    form.uploadDir = path.join(__dirname, '../upload');
    // every time a file has been uploaded successfully, rename it to it's orignal name
    form.on('file', function(field, file) {
        // fs.rename(file.path, path.join(form.uploadDir, file.name),function (err) {
        //
        // });
        userDB.data.getFcmKey(req,function (err,msg,recipientRecord) {
            if(err)return res.send(msg);
            else{
                var fileUrl= 'http://' + req.headers.host +'/users/download/'+file.name;
                var message = {
                    android: {
                        ttl: 3600 * 1000, // 1 hour in milliseconds
                        priority: 'high',
                        notification: {
                          title: 'file',
                          body: fileUrl,
                        //   icon: 'stock_ticker_update',
                        //   color: '#f45342'
                        }
                      },
                    token: recipientRecord.fcmKey
                  };
                  admin.messaging().send(message)
                    .then((response) => {
                        console.log('Successfully sent message:', response);
                    })
                    .catch((error) => {
                        console.log('Error sending message:', error);
                    });
            }
        });
    });
    // log any errors that occur
    form.on('error', function(err) {
        console.log('An error has occured: \n' + err);
    });
    // once all the files have been uploaded, send a response to the client
    form.on('end', function() {
        res.end('success');
    });
    // parse the incoming request containing the form data
    form.parse(req);
});

router.post('/uploadAndSendFileUrlTimely',authenticate,function(req, res){
    // create an incoming form object
    var form = new formidable.IncomingForm();
    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = true;
    // store all uploads in the /uploads directory
    form.uploadDir = path.join(__dirname, '../upload');
    // every time a file has been uploaded successfully, rename it to it's orignal name
    form.on('file', function(field, file) {
        // fs.rename(file.path, path.join(form.uploadDir, file.name),function (err) {
        //
        // });
        userDB.data.getFcmKey(req,function (err,msg,recipientRecord) {
            if(err)return res.send(msg);
            else{
                var diff=timediff(Date.parse(req.body.date1),Date.parse(req.body.date2),"s");
                var fileUrl= 'http://' + req.headers.host +'/users/download/'+file.name;
                setTimeout(sendFileUrl(recipientRecord.fcmKey,fileUrl,function (msg,sendingRes) {
                    console.log(msg+sendingRes);
                }),diff);
            }
        });
    });
    // log any errors that occur
    form.on('error', function(err) {
        console.log('An error has occured: \n' + err);
    });
    // once all the files have been uploaded, send a response to the client
    form.on('end', function() {
        res.end('success');
    });
    // parse the incoming request containing the form data
    form.parse(req);
});

function sendFileUrl(fcmKey,fileUrl,callback) {
    var message = {
        android: {
            ttl: 3600 * 1000, // 1 hour in milliseconds
            priority: 'high',
            notification: {
              title: 'file',
              body: fileUrl,
            //   icon: 'stock_ticker_update',
            //   color: '#f45342'
            }
          },
        token: fcmKey
      };
      admin.messaging().send(message)
      .then((response) => {
        // Response is a message ID string.
        console.log('Successfully sent message:', response);
        callback('sent message successfully',response);
      })
      .catch((error) => {
        console.log('Error sending message:', error);
        callback('something bad happen while sending message',error);
      });
};

router.get('/download/:fileurl',function(req, res){
    var file='upload/'+req.params.fileurl;
    res.download(file,function(err){
        if(err){
            console.log("Downloading Error")
        }else{
            deleteFile(file);
        }
    }); // Set disposition and send it.
});

function deleteFile (file) { 
    fs.unlink(file, function (err) {
        if (err) {
            console.error(err.toString());
        } else {
            console.warn(file + ' deleted');
        }
    });
}

function authenticate(req,res,next) {
    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    // decode token
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, config.secret, function(err, decoded) {
            if (err) {
                return res.json({ success: false, message: 'Failed to authenticate token.' });
            } else {
                // if everything is good, save to request for use in other routes
                req.decoded = decoded;
                next();
            }
        });
    } else {
        // if there is no token. return an error
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });
    }
}

module.exports = router;
