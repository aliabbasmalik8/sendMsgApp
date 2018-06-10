var User   = require('../models/user'); // get our mongoose model
var jwt    = require('jsonwebtoken'); // used to create, sign, and verify tokens
var config=require('../config');
var bcrypt   = require('bcrypt-nodejs');

var methods={
    addUser:function (req,callback) {
        User.findOne({username:req.body.username},function (err,user) {
            if(err)return callback(err,{message:'error occur while fetching data'},null);
            if(user){return callback(null,{ message: 'username already exist.' },null);}
            else{
                User.findOne({email:req.body.email},function (err,user) {
                    if(err)return callback(err,{message:'error occur while fetching data'},null);
                    if(user){return callback(null, { message: 'email already exist.' },null);}
                    else{
                        var newUser=new User();
                        newUser.username=req.body.username;
                        newUser.email=req.body.email;
                        newUser.password=req.body.password;
                        //newUser.fcmKey=req.body.fcmKey;
                        newUser.save(function (err) {
                            if(err) return callback(err,{message:"error occur while save record"},null)
                            const payload = {
                                expiresInMinutes:1440,
                                username: req.body.username
                            };
                            var token = jwt.sign(payload,config.secret)
                            return callback(null,{
                                success: true,
                                message: 'Enjoy your token!',
                                token: token
                            },newUser);
                            //return callback(null,{message:'user successfully added.'},newUser);
                        });
                    }
                });
            }
        });
    },
    
    logIn:function (req,callback) {
        User.findOne({email:req.body.email},function (err,user) {
            if(err)return callback(err,{message:'error occur while fetching data'},null);
            if(!user){
                return callback(err,{ success: false, message: 'Authentication failed. User not found.' },null);
            }else if(user){
                bcrypt.compare(req.body.password, user.password, function(err, isMatch) {
                    if(err) return callback(err, { message: 'error occur while fetching data.' },null);
                    else if(isMatch){
                        const payload = {
                            expiresInMinutes:1440,
                            username: req.body.username
                        };
                        var token = jwt.sign(payload,config.secret)
                        return callback(null,{
                            success: true,
                            message: 'Enjoy your token!',
                            token: token
                        },user);
                    }else{
                        return callback(null, { message: 'Incorrect password.' },null);
                    }
                });
            }
        });
    },

    findUser:function (callback) {
        User.find({},callback);
    },
    
    updateFcmKey:function (req,callback) {
        User.findOneAndUpdate({email:req.body.email},{fcmKey:req.body.fcmKey},function (err,res) {
            if(err)return callback(err,{message:"error occure while updating key fcm key"},res);
            return callback(err,{message:"update fcm key"},res);
        });
    },

    getFcmKey:function (req,callback) {
        User.findOne({email:req.body.recipientEmail},function (err,recipientRecord) {
           if(err)return callback(err,{message:'error occure while fetching fcmkey'},null)
           else if(recipientRecord.fcmKey){
               return callback(null,{message:'fcm key find'},recipientRecord);
           }else{
               return callback(err,{message:'fcm key not find'},null);
           }
        });
    }
};

exports.data=methods;