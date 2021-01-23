const http = require('http');
const fs = require('fs');
const dbConnection = require('./db');
const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.urlencoded({extended:false}));

app.set('views', path.join(__dirname,'public'));
app.set('view engine','ejs');

app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2'],
    maxAge:  3600 * 1000 // 1hr
}));

const ifNotLoggedin = (req, res, next) => {
    if(!req.session.isLoggedIn){
        return res.render('login');
    }
    next();
}

const ifLoggedin = (req,res,next) => {
    if(req.session.isLoggedIn){
        return res.redirect('/home');
    }
    next();
}

app.get('/', ifNotLoggedin, (req,res,next) => {
    dbConnection.execute("SELECT `username` FROM `ase_team` WHERE `id`=?",[req.session.userID])
    .then(([rows]) => {
        res.render('home',{
            name:rows[0].name
        });
    });
    
});
/*
const server = http.createServer((request, response) => {
    response.writeHead(200, {"Content-Type": "text/html"});
    fs.readFile('public/home.ejs', null, function (error, data) {
      if (error) {
          response.writeHead(404);
          respone.write('Whoops! File not found!');
      } else {
          response.write(data);
      }
      response.end();
  });
});*/

const port = process.env.PORT || 1337;
app.listen(port);
console.log("Server running at http://localhost:%d", port); 

